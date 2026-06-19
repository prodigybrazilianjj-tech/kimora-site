import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            Refund &amp; Return Policy
          </h1>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong>Effective Date:</strong> April 27, 2026
              <br />
              <strong>Last Updated:</strong> April 27, 2026
            </p>

            <p>
              We stand behind our products and want you to feel confident
              ordering from Kimora Co. Please review the policy below before
              placing an order. By making a purchase, you agree to these
              terms.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Return Eligibility
            </h2>
            <p>
              Due to the nature of dietary supplements and health regulations,
              <strong> opened products are not eligible for return.</strong>
            </p>
            <p>
              Unopened and unused products in their original packaging may be
              returned within <strong>30 days of delivery</strong>.
            </p>
            <p>
              We do not charge restocking fees.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              How to Initiate a Return
            </h2>
            <p>
              Email <strong>support@kimoraco.com</strong> with your order number
              and the reason for the return. If your return is approved, we
              will email you return instructions and the return address.
            </p>
            <p>
              Returns sent without prior authorization may not be processed.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Return Shipping
            </h2>
            <p>
              For change-of-mind returns, you are responsible for return
              shipping costs. We recommend using a trackable shipping service
              — Kimora is not responsible for items lost in return transit.
            </p>
            <p>
              For damaged, defective, or incorrect orders, Kimora will provide
              a prepaid return label or arrange replacement at our expense.
              See “Damaged, Defective, or Incorrect Orders” below.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
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

            <h2 className="text-foreground font-bold text-lg mt-8">
              Refund Processing
            </h2>
            <p>
              Once an approved return is received and inspected, refunds will
              be issued to the original payment method. Please allow 5–10
              business days for the refund to appear on your statement,
              depending on your bank or card issuer.
            </p>
            <p>
              Refunds reflect the actual amount paid. If a promotional code,
              discount, or gift card was applied to the original order, the
              refund will be issued at the discounted amount paid, not the
              full retail price. Original shipping charges are non-refundable.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Subscription Orders
            </h2>
            <p>
              Subscription orders renew automatically at the cadence you
              selected (for example, every 30, 60, or 90 days). To stop the
              next shipment, cancel at least <strong>48 hours before</strong>{" "}
              the renewal date through your account dashboard or by emailing
              support@kimoraco.com.
            </p>
            <p>
              Charges that have already been processed and orders that have
              already shipped are non-refundable based solely on
              cancellation. Once shipped, a subscription order is treated like
              any other order under this policy — unopened products may be
              returned within 30 days of delivery, opened products are not
              eligible.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Damaged, Defective, or Incorrect Orders
            </h2>
            <p>
              If your order arrives damaged, defective, or incorrect, contact
              us within <strong>7 days of delivery</strong> at
              support@kimoraco.com.
            </p>
            <p>
              Please include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your order number</li>
              <li>A description of the issue</li>
              <li>
                Photos of the damaged, defective, or incorrect product and the
                shipping package (required for damage claims)
              </li>
            </ul>
            <p>
              We will respond within 2 business days and resolve the issue by
              sending a replacement, providing a prepaid return label for
              replacement, or issuing a refund — at our discretion based on
              the situation.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Wrong Addresses &amp; Refused Packages
            </h2>
            <p>
              You are responsible for providing an accurate shipping address
              at checkout. Orders shipped to an incorrect address you provided
              are not eligible for refund or replacement, although we will
              assist where reasonably possible.
            </p>
            <p>
              If a package is refused at delivery or returned to us as
              undeliverable, we will refund the product cost (excluding
              original shipping) once the package is received back at our
              warehouse, provided the products are unopened and in
              resalable condition.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Bundles, Free Gifts &amp; Promotional Items
            </h2>
            <p>
              When returning a bundle or order that included a free gift or
              promotional item, the free or promotional item must also be
              returned in unopened, original condition. If it is not returned,
              its retail value will be deducted from your refund.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              Wholesale &amp; Ambassador Orders
            </h2>
            <p>
              Returns and refunds for wholesale, gym partnership, and
              ambassador orders are handled under the terms of the applicable
              partnership agreement, not this policy. Contact your account
              representative or support@kimoraco.com for assistance.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">
              International Orders
            </h2>
            <p>
              Kimora currently ships within the United States only. This
              policy applies to orders shipped to U.S. addresses.
            </p>

            <h2 className="text-foreground font-bold text-lg mt-8">Contact</h2>
            <p>
              For all return or refund inquiries:
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
