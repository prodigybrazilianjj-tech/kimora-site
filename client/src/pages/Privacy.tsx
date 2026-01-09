import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-8">
            Privacy Policy
          </h1>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong>Effective Date:</strong> January 2025
            </p>

            <p>
              Kimora Co. (“Kimora,” “we,” “us,” or “our”) respects your privacy and
              is committed to protecting your personal information. This Privacy
              Policy explains how we collect, use, and safeguard your data when
              you visit or make a purchase from kimoraco.com.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Information We Collect
            </h2>
            <p>
              When you interact with our website, we may collect personal
              information such as your name, email address, shipping address,
              billing address, and order details. Payment information is
              processed securely by Stripe — Kimora Co. does not store credit
              card numbers.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              How We Use Your Information
            </h2>
            <p>
              We use your information to process orders, manage subscriptions,
              communicate important updates, and improve our products and
              customer experience. We collect only what is necessary to operate
              our business effectively.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Payment Processing
            </h2>
            <p>
              Payments are handled through Stripe, a secure third-party payment
              processor. Stripe may collect additional information in accordance
              with their own privacy policies.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Sharing of Information
            </h2>
            <p>
              We do not sell, rent, or trade your personal information. We may
              share limited data with trusted service providers only when
              necessary to process payments, ship orders, or maintain website
              functionality.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Cookies & Analytics
            </h2>
            <p>
              We may use cookies or similar technologies to understand website
              usage and improve performance. You can disable cookies through
              your browser settings, though some features may not function
              properly.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Data Security
            </h2>
            <p>
              We take reasonable steps to protect your personal information.
              However, no online system can be guaranteed to be completely
              secure.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Your Rights
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal information at any time by contacting us.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Policy Updates
            </h2>
            <p>
              We may update this Privacy Policy periodically. Changes will be
              posted on this page with an updated effective date.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy, contact us at:
              <br />
              <strong>alex@kimoraco.com</strong>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
