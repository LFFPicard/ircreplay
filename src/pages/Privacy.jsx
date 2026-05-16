function Privacy() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-gray-300">

        <div>
          <h1 className="text-2xl font-bold text-green-400 font-mono">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mt-1">Last updated: May 2026</p>
        </div>

        <div className="h-px bg-gray-700" />

        <p className="text-sm leading-relaxed">
          This Privacy Policy explains how Gary Thwaites (&ldquo;I&rdquo;, &ldquo;me&rdquo;, or &ldquo;my&rdquo;) collects and uses information when you use IRCReplay.app (the &ldquo;Service&rdquo;).
        </p>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">1. Free Tier — No Data Collected</h2>
          <p className="text-sm leading-relaxed">
            The free tier of IRCReplay processes your log files entirely in your browser using JavaScript. Your log files are never uploaded to any server. No account is required. I collect no personal data from free tier users beyond standard Cloudflare access logs (IP address, request path, timestamp) which are retained for security purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">2. Pro Tier — What I Collect</h2>
          <p className="text-sm leading-relaxed">
            If you create an account and subscribe to Pro, I collect and store the following:
          </p>
          <ul className="text-sm leading-relaxed space-y-1 pl-4 list-disc list-inside text-gray-400">
            <li>Your email address and account details via Clerk (authentication provider)</li>
            <li>Session files you explicitly save to cloud storage, stored in Cloudflare R2</li>
            <li>Subscription status and billing history via Paddle (payment processor)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">3. How I Use Your Data</h2>
          <p className="text-sm leading-relaxed">
            Your data is used solely to provide the Service — to authenticate you, store your sessions, and manage your subscription. I do not sell, share, or use your data for advertising or analytics.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">4. Third Party Processors</h2>
          <p className="text-sm leading-relaxed">
            The Service uses the following third party processors, each with their own privacy policies:
          </p>
          <ul className="text-sm leading-relaxed space-y-1 pl-4 list-disc list-inside text-gray-400">
            <li>Clerk — authentication and user management</li>
            <li>Paddle — payment processing and subscription management</li>
            <li>Cloudflare — hosting, CDN, and cloud storage</li>
            <li>Resend — transactional email</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">5. Share Links</h2>
          <p className="text-sm leading-relaxed">
            If you choose to share a session via a share link, the content of that session becomes accessible to anyone with the link. Share links are not indexed by search engines. You can delete a shared session at any time from your Dashboard.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">6. Data Retention</h2>
          <p className="text-sm leading-relaxed">
            Cloud-stored sessions are retained until you delete them or close your account. If you cancel your Pro subscription, your sessions are retained for 30 days before deletion. You can download your sessions as JSON files at any time from the Dashboard.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">7. Your Rights</h2>
          <p className="text-sm leading-relaxed">
            Under UK GDPR you have the right to access, correct, or delete your personal data. To exercise these rights contact me at the address below. You can delete your cloud-stored sessions directly from the Dashboard at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">8. Cookies</h2>
          <p className="text-sm leading-relaxed">
            The Service uses only functional cookies necessary for authentication (provided by Clerk). No tracking or advertising cookies are used.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-gray-200 font-semibold">9. Contact</h2>
          <p className="text-sm leading-relaxed">
            For privacy-related requests or questions contact Gary Thwaites via the IRCReplay.app website.
          </p>
        </section>

      </div>
    </div>
  )
}

export default Privacy
