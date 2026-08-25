import { strict as assert } from "node:assert";
import test from "node:test";

import type { AuthConfig } from "./config";
import { GitHubOAuthClient } from "./github";

const config: AuthConfig = {
  githubClientId: "client-id",
  githubClientSecret: "client-secret",
  sessionSecret: "test-session-secret-01234567890123456789",
  appUrl: new URL("http://localhost:3000"),
  isProduction: false,
};

test("GitHub OAuth client exchanges code and fetches identity without returning the provider token", async () => {
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
  const responses = [
    new Response(JSON.stringify({ access_token: "provider-token" }), { status: 200 }),
    new Response(
      JSON.stringify({
        id: 12345,
        login: "github-user",
        name: "GitHub User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
        email: null,
      }),
      { status: 200 },
    ),
    new Response(
      JSON.stringify([{ email: "user@example.com", primary: true, verified: true }]),
      { status: 200 },
    ),
  ];
  const fetchMock: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    const response = responses.shift();
    if (!response) throw new Error("unexpected request");
    return response;
  };

  const identity = await new GitHubOAuthClient(config, fetchMock).getIdentity("oauth-code");

  assert.deepEqual(identity, {
    providerAccountId: "12345",
    login: "github-user",
    displayName: "GitHub User",
    avatarUrl: "https://avatars.githubusercontent.com/u/12345",
    email: "user@example.com",
    emailVerified: true,
  });
  assert.equal("accessToken" in identity, false);
  assert.equal(requests[0]?.url, "https://github.com/login/oauth/access_token");
  assert.equal(requests[1]?.init?.headers instanceof Headers, false);
  assert.equal(requests[1]?.init?.headers && String((requests[1]?.init?.headers as Record<string, string>).Authorization), "Bearer provider-token");
  assert.equal(requests[2]?.url, "https://api.github.com/user/emails");
});
