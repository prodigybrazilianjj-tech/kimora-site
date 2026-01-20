import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="py-12 bg-black border-t border-white/5">
      <div className="container px-4 mx-auto text-center">
        <p className="text-3xl font-display font-bold text-white/20 tracking-[0.2em] mb-8">
          OUT-TRAIN. OUT-SMART. OUT-LAST.
        </p>

        <div className="flex flex-col items-center gap-4 mb-10 text-sm text-muted-foreground">
          <span>Kimora Co. © 2025. All rights reserved.</span>

          <a
            href="mailto:alex@kimoraco.com"
            className="hover:text-white transition-colors"
          >
            alex@kimoraco.com
          </a>

          {/* Stripe-required legal links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>

            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>

            <Link href="/manage-subscription" className="hover:text-white transition-colors">
              Manage Subscription
            </Link>

            <Link href="/refunds" className="hover:text-white transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>

        <p className="text-xs text-white/20 max-w-2xl mx-auto leading-relaxed">
          These statements have not been evaluated by the Food and Drug Administration.
          This product is not intended to diagnose, treat, cure, or prevent any disease.
          Always consult your healthcare provider before starting any new supplement.
        </p>
      </div>
    </footer>
  );
}
