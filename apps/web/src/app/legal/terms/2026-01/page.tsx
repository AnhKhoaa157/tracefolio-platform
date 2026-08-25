import type { Metadata } from "next";

import { LegalPage, LegalSection, TodoNote } from "../../_components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Tracefolio",
  description:
    "Tracefolio's beta Terms of Service: acceptable use, responsibility for uploaded content, public portfolio visibility, and service availability.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal · Terms of Service"
      title="Terms of Service"
      lastUpdated="2026-01"
      betaNotice="Tracefolio is an early, actively-changing MVP/beta product. These Terms describe the current beta only, are written in plain language rather than formal legal drafting, and will be revised as the product matures. They are not a substitute for professional legal advice."
    >
      <LegalSection heading="Acceptable use">
        <p>
          Use Tracefolio to build and share an honest record of your own work. Do not upload or share content
          that is unlawful, that you do not have the right to share, that contains malware, or that is intended
          to harass, impersonate, or defraud someone.
        </p>
        <p>
          Do not attempt to bypass the account limits described below, scrape or access other users&apos;
          private data, or interfere with the normal operation of the service.
        </p>
        <p>We may suspend or restrict an account that violates these Terms.</p>
      </LegalSection>

      <LegalSection heading="Your uploaded and shared content">
        <p>
          You are responsible for everything you write or upload to your Tracefolio account &mdash; your profile,
          Skills, Achievements, and any attached files. By adding content you confirm you have the right to share
          it. Tracefolio does not review content before it is saved and is not responsible for verifying its
          accuracy.
        </p>
        <p>
          The current MVP enforces these account limits: up to 500 active Achievements, 100 Skills, 5 files per
          Achievement, 10 MB per file, and 1 GB of total attachment storage per account.
        </p>
      </LegalSection>

      <LegalSection heading="Public portfolio visibility">
        <p>
          New Achievements are always created as private drafts. An Achievement only becomes public through an
          explicit publish action, and only after at least one Skill has been linked to it. You can unpublish an
          Achievement, or your whole portfolio, at any time.
        </p>
        <p>Anything you choose to publish is intentionally public and viewable by anyone with the link.</p>
      </LegalSection>

      <LegalSection heading="Service availability">
        <p>
          Tracefolio is provided as an MVP/beta service. We do not guarantee uptime, performance, or data
          durability during this period, and features (including these Terms) may change without advance notice.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions about these Terms:</p>
        <TodoNote>Add a real, monitored contact or support address before production launch.</TodoNote>
      </LegalSection>

      <LegalSection heading="Open legal items">
        <TodoNote>
          The governing law and legal jurisdiction for these Terms have not been decided and are not stated here.
        </TodoNote>
        <TodoNote>
          A formal enforcement and appeals process for account suspensions has not yet been defined.
        </TodoNote>
      </LegalSection>
    </LegalPage>
  );
}
