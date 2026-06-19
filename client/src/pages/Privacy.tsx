import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            Privacy Policy
          </h1>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong>Effective Date:</strong> April 27, 2026
              <br />
              <strong>Last Updated:</strong> April 27, 2026
            </p>

            <p>
              Kimora Co. (“Kimora,” “we,” “us,” or “our”) respects your privacy.
              This Privacy Policy explains how we collect, use, share, and
              protect personal information when you visit kimoraco.com or
              interact with our products and services.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Information We Collect
            </h2>
            <p>
              We collect information you provide directly and information
              collected automatically through your interactions with our site.
            </p>

            <p>
              <strong>Information you provide:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Name, email address, shipping address, billing address, and
                phone number (if provided)
              </li>
              <li>
                Order details, subscription preferences, and account credentials
              </li>
              <li>
                Customer service communications, survey responses, and product
                reviews
              </li>
              <li>
                SMS subscription consent, if you opt in to receive text messages
              </li>
            </ul>

            <p>
              <strong>Information collected automatically:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                IP address, device type, browser, and operating system
              </li>
              <li>
                Pages visited, time on site, referral source, click and scroll
                behavior
              </li>
              <li>
                Cookies, pixel tags, and similar tracking technologies (see
                “Cookies &amp; Tracking Technologies” below)
              </li>
            </ul>

            <p>
              We do not collect or store credit card numbers. Payment
              information is processed directly by Stripe.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Process and fulfill orders and subscriptions</li>
              <li>
                Communicate about orders, account activity, and customer
                service inquiries
              </li>
              <li>
                Send marketing emails and SMS messages (only if you have opted
                in; you can unsubscribe at any time)
              </li>
              <li>
                Measure and improve our website performance and user experience
              </li>
              <li>
                Run targeted advertising on platforms including Google, Meta
                (Facebook and Instagram), and TikTok
              </li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Cookies &amp; Tracking Technologies
            </h2>
            <p>
              We use cookies and similar technologies (pixels, web beacons,
              SDKs) for three purposes:
            </p>

            <p>
              <strong>Strictly necessary —</strong> required for core site
              functionality such as cart, checkout, and login. These cannot be
              disabled without breaking the site.
            </p>

            <p>
              <strong>Analytics —</strong> help us understand how visitors use
              our site. We use Google Analytics 4. Google may set first-party
              cookies and collect information about your site interactions.
              Review Google’s privacy practices at{" "}
              <a
                href="https://policies.google.com/privacy"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/privacy
              </a>
              .
            </p>

            <p>
              <strong>Advertising —</strong> used to measure ad performance and
              show you relevant ads on third-party platforms. We use:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>TikTok Pixel and Events API.</strong> Collects
                information about your interactions with our site and, when you
                provide it, hashed contact information for ad audience
                matching. See TikTok’s Privacy Policy at{" "}
                <a
                  href="https://www.tiktok.com/legal/page/us/privacy-policy/en"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  tiktok.com/legal/page/us/privacy-policy/en
                </a>
                .
              </li>
              <li>
                <strong>Meta Pixel and Conversions API</strong> (Facebook and
                Instagram), when active. Collects similar information for Meta
                ad targeting and measurement. See Meta’s Privacy Policy at{" "}
                <a
                  href="https://www.facebook.com/privacy/policy"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  facebook.com/privacy/policy
                </a>
                .
              </li>
            </ul>

            <p>
              You can opt out of pixel-based advertising through your browser
              settings, the Network Advertising Initiative (
              <a
                href="https://optout.networkadvertising.org/"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                optout.networkadvertising.org
              </a>
              ), the Digital Advertising Alliance (
              <a
                href="https://optout.aboutads.info/"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                optout.aboutads.info
              </a>
              ), or platform-specific settings (Google Ads Settings, Meta ad
              preferences, TikTok ad settings). We honor Global Privacy Control
              (GPC) signals where applicable.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Service Providers &amp; Third Parties
            </h2>
            <p>
              We share limited information with service providers that help us
              operate Kimora. These include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Stripe</strong> — payment processing
              </li>
              <li>
                <strong>Shopify</strong> — storefront and order management
              </li>
              <li>
                <strong>Klaviyo</strong> — email and SMS marketing
              </li>
              <li>
                <strong>Formspree</strong> — waitlist form processing
              </li>
              <li>
                <strong>Google (Analytics)</strong> — site analytics
              </li>
              <li>
                <strong>TikTok</strong> — advertising and analytics
              </li>
              <li>
                <strong>Meta</strong> — advertising and analytics (when active)
              </li>
              <li>
                <strong>Render</strong> — website hosting
              </li>
              <li>
                <strong>Third-party fulfillment partner</strong> — order
                shipping (when active)
              </li>
            </ul>

            <p>
              These providers may collect, store, and process information on
              our behalf in accordance with their own privacy practices.
            </p>

            <p>
              We do not sell your personal information to third parties for
              monetary value. We may share information when required by law, in
              connection with a legal proceeding, or to protect Kimora, our
              customers, or others.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">Your Rights</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Access</strong> the personal information we hold about
                you
              </li>
              <li>
                <strong>Correct</strong> inaccurate information
              </li>
              <li>
                <strong>Delete</strong> your personal information (subject to
                legal retention requirements)
              </li>
              <li>
                <strong>Opt out</strong> of marketing communications at any
                time
              </li>
              <li>
                <strong>Opt out of “sale” or “sharing”</strong> of personal
                information for cross-context behavioral advertising
                (California, Colorado, Connecticut, Virginia, and other state
                privacy laws)
              </li>
              <li>
                <strong>Limit use of sensitive personal information</strong>
              </li>
              <li>
                <strong>Data portability</strong> (in certain jurisdictions)
              </li>
            </ul>

            <p>
              To exercise any of these rights, email{" "}
              <strong>support@kimoraco.com</strong> or use the unsubscribe links
              in our marketing emails. We respond to verified requests within
              30 days, or as required by applicable law.
            </p>

            <p>
              If you are a resident of the European Economic Area, the United
              Kingdom, or Switzerland, you may have additional rights under the
              General Data Protection Regulation (GDPR), including the right to
              lodge a complaint with your local data protection authority.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Children’s Privacy
            </h2>
            <p>
              Kimora’s products and services are not directed to children under
              13. We do not knowingly collect personal information from
              children under 13. If you believe we have collected information
              from a child under 13, contact us at support@kimoraco.com and we
              will delete it promptly.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Data Retention
            </h2>
            <p>
              We retain personal information for as long as necessary to
              fulfill the purposes described in this Policy, comply with legal
              obligations, resolve disputes, and enforce agreements. When
              information is no longer needed, we delete or anonymize it.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">Data Security</h2>
            <p>
              We use reasonable administrative, technical, and physical
              safeguards to protect personal information. However, no system is
              perfectly secure. If we become aware of a security incident
              affecting your information, we will notify you in accordance with
              applicable law.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              International Data Transfers
            </h2>
            <p>
              Kimora is operated from the United States. If you visit our site
              from outside the U.S., your information may be transferred to,
              stored, and processed in the U.S. or other countries that may not
              provide the same level of data protection as your home country.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Changes to This Policy
            </h2>
            <p>
              We may update this Policy from time to time. The “Last Updated”
              date above reflects the most recent revision. Material changes
              will be communicated through our website or by email.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">Contact</h2>
            <p>
              Questions or requests about this Privacy Policy:
              <br />
              <strong>Kimora Co.</strong>
              <br />
              Email: <strong>support@kimoraco.com</strong>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
