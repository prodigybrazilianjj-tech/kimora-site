import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-8">
            Refund & Return Policy
          </h1>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong>Effective Date:</strong> January 2025
            </p>

            <p>
              We stand behind our products and want you to feel confident ordering
              from Kimora Co. Please review the policy below before making a purchase.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Returns
            </h2>

            <p>
              Due to the nature of dietary supplements and health regulations,
              opened products are not eligible for return.
            </p>

            <p>
              Unopened and unused products may be returned within{" "}
              <strong>30 days of delivery</strong>, provided they are in their
              original packaging and condition.
            </p>

            <p>
              To initiate a return, please contact us at{" "}
              <strong>support@kimoraco.com</strong> with your order number and
              reason for the return. If your return is approved, we will provide
              instructions for sending the product back.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Return Address
            </h2>

            <p>
              Approved returns may be mailed to:
              <br />
              <br />
              <strong>
                Kimora Co.
                <br />
                PO Box 20024
                <br />
                Sedona, AZ 86341
                <br />
                United States
              </strong>
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Refunds
            </h2>

            <p>
              Once an eligible return is received and inspected, approved refunds
              will be issued to the original payment method. Please allow 5–10
              business days for the refund to appear on your statement.
            </p>

            <p>
              Shipping costs are non-refundable.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Subscriptions
            </h2>

            <p>
              Subscription orders renew automatically unless canceled prior to
              the next billing cycle. Charges that have already been processed
              are non-refundable.
            </p>

            <p>
              You may cancel or modify your subscription at any time before the
              next renewal through your account portal or by contacting support.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Damaged or Incorrect Orders
            </h2>

            <p>
              If your order arrives damaged, defective, or incorrect, please
              contact us within <strong>7 days of delivery</strong>. We will work
              with you to resolve the issue as quickly as possible.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">
              Contact
            </h2>

            <p>
              For all return or refund inquiries, contact us at:
              <br />
              <strong>support@kimoraco.com</strong>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}