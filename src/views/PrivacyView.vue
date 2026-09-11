<template>
  <div class="content clearfix">
    <div class="ih-container legal-body">
      <h1>Privacy Policy</h1>
      <p class="legal-updated">Last updated: July 1, 2026</p>
      <p>
        IndyHackers is a volunteer-run community for Indianapolis-area technologists. This
        policy explains what information we collect when you use this website, why we collect
        it, and the choices you have. We aim to collect only what we need to run the community.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> If you create an account or sign in with Google,
          we store your name and email address so we can identify you and, where relevant, grant
          access to member or board tools.
        </li>
        <li>
          <strong>Job postings.</strong> When you submit a job, we store the details you provide
          (title, company, description, salary range, and how to apply) and your contact email so
          we can review and follow up on the listing.
        </li>
        <li>
          <strong>Newsletter.</strong> If you subscribe to our newsletter, your email address is
          stored with our newsletter provider so we can send you issues.
        </li>
        <li>
          <strong>Slack invitations.</strong> If you request a Slack invite, we process your email
          address (and, for spam prevention, your approximate country and a CAPTCHA result) to
          send the invitation.
        </li>
        <li>
          <strong>Usage data.</strong> Like most websites, we collect basic analytics about how
          pages are used (for example, pages visited and general device/browser information).
        </li>
      </ul>

      <h2>How we use your information</h2>
      <p>
        We use the information above to operate the website, review and publish job postings,
        deliver the newsletter, send Slack invitations, prevent abuse and spam, and understand
        which parts of the site are useful so we can improve them. We do not sell your personal
        information.
      </p>

      <h2>Third-party services</h2>
      <p>
        We rely on a small number of third parties to run the community. Your information may be
        processed by them for the purposes described above:
      </p>
      <ul>
        <li>Google Analytics — website usage measurement</li>
        <li>Google — optional sign-in (OAuth) and the embedded event calendar</li>
        <li>Buttondown — newsletter delivery</li>
        <li>Slack — community chat and invitations</li>
        <li>Givebutter — donations, if you choose to give</li>
      </ul>
      <p>Each of these services has its own privacy policy governing how it handles data.</p>

      <h2>Cookies and analytics</h2>
      <p>
        We use cookies and similar technologies to keep you signed in and to measure site usage
        through Google Analytics. You can block or delete cookies in your browser settings, though
        some features (such as staying signed in) may not work as a result.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep information for as long as it is needed to run the community — for example, while
        your account is active or while a job posting is live. You can ask us to remove your
        account, unsubscribe from the newsletter at any time using the link in each issue, or
        request deletion of information we hold about you.
      </p>

      <h2>Your choices</h2>
      <p>
        You may request access to, correction of, or deletion of your personal information by
        emailing us. We will do our best to honor reasonable requests.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email
        <a href="mailto:help@indyhackers.org">help@indyhackers.org</a>.
      </p>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.legal-body {
  padding-top: 4rem;
  padding-bottom: 4rem;
  max-width: 820px;
}

.legal-updated {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.legal-body h2 {
  margin-top: 2rem;
}

.legal-body ul {
  margin-bottom: 1rem;
}

.legal-body li {
  margin-bottom: 0.5rem;
}
</style>
