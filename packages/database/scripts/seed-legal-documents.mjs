import pg from "pg";

const connectionString = required("DATABASE_URL");
const documents = [
  {
    id: required("LEGAL_TERMS_DOCUMENT_ID"),
    documentType: "TERMS_OF_SERVICE",
    version: required("LEGAL_TERMS_DOCUMENT_VERSION"),
    contentUrl: required("LEGAL_TERMS_DOCUMENT_URL"),
  },
  {
    id: required("LEGAL_PRIVACY_DOCUMENT_ID"),
    documentType: "PRIVACY_POLICY",
    version: required("LEGAL_PRIVACY_DOCUMENT_VERSION"),
    contentUrl: required("LEGAL_PRIVACY_DOCUMENT_URL"),
  },
];

for (const document of documents) {
  validateDocument(document);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query("BEGIN");

  for (const document of documents) {
    const existingById = await client.query(
      `
        SELECT document_type, version, content_url
        FROM legal_documents
        WHERE id = $1
      `,
      [document.id],
    );
    const existing = existingById.rows[0];

    if (existing) {
      if (
        existing.document_type !== document.documentType ||
        existing.version !== document.version ||
        existing.content_url !== document.contentUrl
      ) {
        throw new Error(`Legal document id ${document.id} already exists with different metadata.`);
      }
      continue;
    }

    const existingVersion = await client.query(
      `
        SELECT id
        FROM legal_documents
        WHERE document_type = $1 AND version = $2
      `,
      [document.documentType, document.version],
    );
    if (existingVersion.rows[0]) {
      throw new Error(
        `${document.documentType} version ${document.version} already exists under another id.`,
      );
    }

    await client.query(
      `
        INSERT INTO legal_documents (id, document_type, version, content_url, published_at)
        VALUES ($1, $2, $3, $4, now())
      `,
      [document.id, document.documentType, document.version, document.contentUrl],
    );
  }

  await client.query("COMMIT");
  console.log("Ensured current Terms of Service and Privacy Policy documents.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

function required(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) throw new Error(`${name} is required.`);
  return value.trim();
}

function validateDocument(document) {
  if (document.id.length > 128 || document.version.length > 128) {
    throw new Error(`The ${document.documentType} id and version must be at most 128 characters.`);
  }

  let url;
  try {
    url = new URL(document.contentUrl);
  } catch {
    throw new Error(`The ${document.documentType} content URL is invalid.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`The ${document.documentType} content URL must use HTTP or HTTPS.`);
  }
}
