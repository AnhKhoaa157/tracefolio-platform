import type { Metadata } from "next";

import { LegalPage, LegalSection, TodoNote } from "../../_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Tracefolio",
  description:
    "Tracefolio's beta Privacy Policy: GitHub sign-in data, portfolio content, attachments, session cookies, analytics, public visibility, and account deletion.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal · Privacy Policy"
      title="Privacy Policy"
      lastUpdated="2026-01"
      betaNotice="Tracefolio is an early, actively-changing MVP/beta product. This Privacy Policy describes the current beta only, is written in plain language rather than formal legal drafting, and will be revised as the product matures. It is not a substitute for professional legal advice."
    >
      <LegalSection heading="Identity and profile data from GitHub">
        <p>
          When you sign in with GitHub, we receive your GitHub account identifier, username, display name, avatar
          URL, and &mdash; if GitHub shares it with us &mdash; your email address. We use this to create and
          identify your Tracefolio account. We do not receive or store your GitHub password.
        </p>
      </LegalSection>

      <LegalSection heading="Portfolio content you create">
        <p>
          Your profile (headline, bio, location, links), the Skills you add, and the Achievements you write
          (including context, contribution, impact, and dates) are stored so Tracefolio can build your portfolio.
        </p>
      </LegalSection>

      <LegalSection heading="Attachments">
        <p>
          Files you attach to an Achievement are stored along with their filename, file type, size, and a
          checksum, up to the current limits of 5 files per Achievement, 10 MB per file, and 1 GB of total
          storage per account.
        </p>
      </LegalSection>

      <LegalSection heading="Session cookies">
        <p>
          Signing in sets a session cookie that identifies your signed-in browser session so Tracefolio can keep
          you signed in. We store a hash of the session token, not the raw value, along with its expiry and
          last-seen time. This cookie is required for the product to work; Tracefolio does not use separate
          marketing or advertising cookies.
        </p>
      </LegalSection>

      <LegalSection heading="Analytics and audit data">
        <p>
          We keep internal audit records of account-level actions (what happened, when, and which request caused
          it) for security and accountability, and internal product-analytics events (such as which routes or
          features are used) to help us improve Tracefolio. This data is used internally and is not sold to
          third parties.
        </p>
      </LegalSection>

      <LegalSection heading="Public visibility">
        <p>
          Your profile and Achievements are private by default. Content only becomes visible to other people
          once you take an explicit publish action for that Achievement or for your portfolio. Anything you
          publish is intentionally public and can be viewed by anyone with the link.
        </p>
      </LegalSection>

      <LegalSection heading="Account deletion requests">
        <p>
          Tracefolio&apos;s account model supports marking an account for deletion ahead of a scheduled removal.
          A self-service &ldquo;delete my account&rdquo; option is not yet available in the product during this
          beta.
        </p>
        <TodoNote>Add a real, monitored contact address for deletion requests before production launch.</TodoNote>
        <TodoNote>
          The exact data-retention period following a deletion request has not yet been defined.
        </TodoNote>
      </LegalSection>

      <LegalSection heading="Open legal items">
        <TodoNote>
          A published list of infrastructure providers and subprocessors (hosting, database, file storage,
          sign-in provider) has not yet been prepared.
        </TodoNote>
        <TodoNote>
          The legal jurisdiction and any specific data-protection framework this policy is written to comply
          with have not been decided and are not claimed here.
        </TodoNote>
      </LegalSection>
    </LegalPage>
  );
}
