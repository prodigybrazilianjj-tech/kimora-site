import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            Terms of Service
          </h1>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
            <p>
              <strong>Effective Date:</strong> April 27, 2026
              <br />
              <strong>Last Updated:</strong> April 27, 2026
            </p>

            <p>
              These Terms of Service (“Terms”) govern your access to and use of
              kimoraco.com and the products and services offered by Kimora Co.
              (“Kimora,” “we,” “us,” or “our”). By accessing the site, creating
              an account, or placing an order, you agree to these Terms. If you
              do not agree, do not use our site.
            </p>

            <p>
              <strong>
                These Terms include a binding arbitration provision and class
                action waiver in the “Dispute Resolution” section. Please read
                them carefully.
              </strong>
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">Eligibility</h2>
            <p>
              You must be at least 18 years old (or the age of majority in your
              state of residence) to use our site or purchase our products. By
              using our site, you represent and warrant that you meet this
              requirement.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Accounts &amp; Registration
            </h2>
            <p>
              You may need to create an account to place orders or manage
              subscriptions. You agree to provide accurate, current, and
              complete information, and to keep your login credentials
              confidential. You are responsible for all activity that occurs
              under your account.
            </p>

            <p>
              We may suspend or terminate accounts that violate these Terms,
              engage in fraudulent activity, or pose a risk to other users or
              to Kimora.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Products &amp; Supplements
            </h2>
            <p>
              Kimora products are dietary supplements. They are not intended to
              diagnose, treat, cure, or prevent any disease. Statements about
              our products have not been evaluated by the U.S. Food and Drug
              Administration. Consult a qualified healthcare professional
              before starting any supplement, especially if you are pregnant,
              nursing, taking medication, or have a medical condition.
            </p>

            <p>
              We reserve the right to limit quantities, refuse orders, and
              discontinue products at any time. Product images are
              representative and may differ slightly from the product
              delivered.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Orders, Pricing &amp; Payments
            </h2>
            <p>
              All prices are listed in U.S. dollars and are subject to change
              without notice. We reserve the right to correct pricing or
              product description errors and to cancel orders affected by such
              errors.
            </p>

            <p>
              Payments are processed by Stripe. By placing an order, you
              authorize us (and Stripe) to charge your selected payment method
              for the order total, including any taxes, shipping, and other
              applicable fees. Kimora does not store your full payment card
              number.
            </p>

            <p>
              Order confirmation does not constitute acceptance. We may decline
              or cancel orders for reasons including suspected fraud,
              unavailable inventory, pricing errors, or violations of these
              Terms.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Subscriptions &amp; Auto-Renewal
            </h2>
            <p>
              Kimora offers subscription products that automatically renew
              monthly until you cancel.
            </p>

            <p>
              <strong>By subscribing, you authorize Kimora to charge your
              payment method on the renewal date for each renewal at the
              then-current price plus applicable taxes and shipping.</strong>{" "}
              You will receive an email reminder before each shipment. Renewal
              prices may differ from any introductory or promotional price
              you initially paid.
            </p>

            <p>
              <strong>Cancellation.</strong> You may cancel your subscription
              at any time through your account dashboard, by clicking the
              manage-subscription link in any subscription email, or by
              emailing support@kimoraco.com. To stop the next shipment, cancel at
              least 48 hours before the renewal date. Cancellation takes
              effect at the end of the current billing cycle; previously
              shipped orders are not refundable based solely on cancellation.
            </p>

            <p>
              <strong>Skipping, changing flavor, or modifying a shipment.</strong>{" "}
              You may skip a shipment or change your subscription flavor through
              your account dashboard, subject to the same 48-hour cutoff before
              the next renewal. Flavor changes apply to your next shipment.
            </p>

            <p>
              These auto-renewal terms are intended to comply with the
              California Automatic Renewal Law, the federal Restore Online
              Shoppers’ Confidence Act (ROSCA), and similar state laws.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Shipping &amp; Delivery
            </h2>
            <p>
              We currently ship within the United States. Estimated delivery
              times are provided at checkout and are estimates only — actual
              delivery times may vary. Risk of loss and title for products
              pass to you upon delivery to the carrier.
            </p>

            <p>
              You are responsible for providing an accurate shipping address.
              Kimora is not responsible for orders delayed, lost, or damaged
              due to incorrect addresses, carrier issues, or theft after
              delivery confirmation.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Returns &amp; Refunds
            </h2>
            <p>
              Our return and refund policy is described on our{" "}
              <a href="/refunds" className="underline">
                Refunds
              </a>{" "}
              page and is incorporated into these Terms by reference. Please
              review it before placing an order.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Promotional Codes &amp; Discounts
            </h2>
            <p>
              Promotional codes (including gym partnership codes such as
              MAT15) are limited to one use per customer unless otherwise
              stated, may not be combined with other offers unless explicitly
              permitted, have no cash value, and may be modified or revoked at
              any time. Promotional pricing applies only to the initial
              qualifying purchase unless we expressly state otherwise.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Email &amp; SMS Communications
            </h2>
            <p>
              By providing your email address or phone number and opting in,
              you consent to receive transactional and marketing communications
              from Kimora and its service providers. You may unsubscribe from
              marketing emails at any time using the unsubscribe link in any
              email.
            </p>

            <p>
              <strong>SMS messaging.</strong> If you opt in to SMS messages,
              you agree to receive recurring marketing and transactional text
              messages from Kimora at the phone number provided. Consent is
              not a condition of any purchase. Message frequency varies.
              Message and data rates may apply. Reply STOP to unsubscribe at
              any time, or HELP for help. You can also email support@kimoraco.com
              to opt out.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              User Content &amp; Reviews
            </h2>
            <p>
              If you submit reviews, photos, comments, or other content to
              Kimora (including via our site, social media, or in response to
              our requests), you grant Kimora a worldwide, non-exclusive,
              royalty-free, transferable, sublicensable license to use,
              reproduce, modify, publish, and display that content in
              connection with our products and brand.
            </p>

            <p>
              You represent that any content you submit is your own, accurate,
              and does not infringe the rights of any third party. We may
              remove or refuse to publish content that violates these Terms or
              that we determine is inappropriate, in our sole discretion.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Intellectual Property
            </h2>
            <p>
              All content on kimoraco.com — including text, graphics, logos,
              images, product designs, packaging, and software — is the
              property of Kimora Co. or our licensors and is protected by U.S.
              and international copyright, trademark, and other intellectual
              property laws. You may not copy, reproduce, distribute, modify,
              or create derivative works from our content without our prior
              written permission.
            </p>

            <p>
              “Kimora,” the Kimora logo, and our product names and packaging
              trade dress are trademarks of Kimora Co. All other trademarks
              are the property of their respective owners.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Prohibited Uses
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use our site for any unlawful purpose or in violation of these Terms</li>
              <li>Reverse engineer, scrape, or extract data from our site without permission</li>
              <li>Interfere with the security or operation of our site</li>
              <li>Use any automated tool (bot, crawler, scraper) to access our site without our express written consent</li>
              <li>Resell our products without an authorized wholesale or retail agreement</li>
              <li>Misrepresent your identity or affiliation</li>
              <li>Impersonate Kimora or any of our employees, ambassadors, or partners</li>
              <li>Submit false, misleading, or fraudulent reviews or content</li>
            </ul>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Third-Party Links &amp; Services
            </h2>
            <p>
              Our site may contain links to third-party websites or services.
              Kimora does not control, endorse, or assume responsibility for
              any third-party site, service, or content. Your use of
              third-party services is subject to their own terms and policies.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Disclaimer of Warranties
            </h2>
            <p>
              Our site and products are provided “as is” and “as available”
              without warranties of any kind, express or implied, including
              warranties of merchantability, fitness for a particular purpose,
              and non-infringement. Kimora does not warrant that our site will
              be uninterrupted, secure, or error-free, or that defects will be
              corrected.
            </p>

            <p>
              Some jurisdictions do not allow the exclusion of certain
              warranties, so some of the above exclusions may not apply to
              you.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Kimora and its
              affiliates, officers, employees, agents, and partners will not
              be liable for any indirect, incidental, special, consequential,
              or punitive damages, or any loss of profits or revenues, whether
              incurred directly or indirectly, arising out of your access to
              or use of our site or products.
            </p>

            <p>
              Our total liability to you for any claim arising out of or
              relating to these Terms, our site, or our products will not
              exceed the greater of (a) the amount you paid Kimora in the 12
              months preceding the claim, or (b) one hundred U.S. dollars
              (US$100).
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless Kimora and our
              affiliates, officers, employees, agents, and partners from any
              claims, damages, liabilities, losses, costs, or expenses
              (including reasonable attorneys’ fees) arising out of your
              violation of these Terms, your misuse of our site or products,
              or your violation of any law or third-party right.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Dispute Resolution &amp; Arbitration
            </h2>
            <p>
              <strong>Please read this section carefully. It affects your
              legal rights.</strong>
            </p>

            <p>
              Any dispute, claim, or controversy arising out of or relating to
              these Terms, our site, or our products will be resolved by
              binding individual arbitration administered by the American
              Arbitration Association (AAA) under its Consumer Arbitration
              Rules. The arbitration will be conducted in Maricopa County,
              Arizona, or remotely if you prefer, before a single neutral
              arbitrator. Judgment on the arbitrator’s award may be entered in
              any court of competent jurisdiction.
            </p>

            <p>
              <strong>Class Action Waiver.</strong> You and Kimora agree that
              each may bring claims against the other only in your or our
              individual capacity and not as a plaintiff or class member in
              any purported class or representative proceeding.
            </p>

            <p>
              <strong>Exceptions.</strong> Either party may bring a claim in
              small claims court if it qualifies, and either party may seek
              injunctive or equitable relief in court for the protection of
              intellectual property rights.
            </p>

            <p>
              <strong>30-Day Right to Opt Out.</strong> You may opt out of
              this arbitration agreement within 30 days of first agreeing to
              these Terms by emailing support@kimoraco.com with the subject line
              “Arbitration Opt-Out” and your full name. Opting out will not
              affect any other provision of these Terms.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Governing Law &amp; Venue
            </h2>
            <p>
              These Terms are governed by the laws of the State of Arizona,
              without regard to its conflict-of-law principles. Subject to the
              Dispute Resolution section above, any judicial proceeding will
              be brought in the state or federal courts located in Maricopa
              County, Arizona, and you consent to personal jurisdiction and
              venue there.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. The “Last Updated”
              date above reflects the most recent revision. Material changes
              will be posted on this page and, where appropriate,
              communicated by email. Your continued use of our site after the
              effective date of an update constitutes acceptance of the
              updated Terms.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Termination
            </h2>
            <p>
              We may suspend or terminate your access to our site or services
              at any time, with or without notice, for any reason, including
              violation of these Terms. The provisions of these Terms that by
              their nature should survive termination (including
              Intellectual Property, Limitation of Liability, Indemnification,
              and Dispute Resolution) will survive.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Severability &amp; Entire Agreement
            </h2>
            <p>
              If any provision of these Terms is found to be unenforceable,
              the remaining provisions will remain in full force and effect.
              These Terms, together with our Privacy Policy and Refunds
              policy, constitute the entire agreement between you and Kimora
              regarding our site and products and supersede any prior
              agreements.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">Contact</h2>
            <p>
              Questions about these Terms:
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
