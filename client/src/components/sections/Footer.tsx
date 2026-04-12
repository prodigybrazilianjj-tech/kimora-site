import { Link } from "wouter";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="py-12 bg-black border-t border-white/5">
      <div className="container px-4 mx-auto text-center">
        <p className="text-3xl font-display font-bold text-white/20 tracking-[0.2em] mb-8">
          OUT-TRAIN. OUT-SMART. OUT-LAST.
        </p>

        <div className="flex flex-col items-center gap-4 mb-10 text-sm text-muted-foreground">
          <a
            href="https://instagram.com/kimoracreatine"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kimora on Instagram"
            className="hover:text-white transition-colors"
          >
            <InstagramIcon className="w-5 h-5" />
          </a>

          <span>Kimora Co. © 2025. All rights reserved.</span>

          <a
            href="mailto:support@kimoraco.com"
            className="hover:text-white transition-colors"
          >
            support@kimoraco.com
          </a>

          {/* Legal + Utility Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>

            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>

            <Link
              href="/manage-subscription"
              className="hover:text-white transition-colors"
            >
              Manage Subscription
            </Link>

            <Link href="/refunds" className="hover:text-white transition-colors">
              Refund Policy
            </Link>

            <Link
              href="/wholesale"
              className="hover:text-white transition-colors"
            >
              Wholesale
            </Link>
          </div>
        </div>

        <p className="text-xs text-white/20 max-w-2xl mx-auto leading-relaxed">
          These statements have not been evaluated by the Food and Drug
          Administration. This product is not intended to diagnose, treat, cure,
          or prevent any disease. Always consult your healthcare provider before
          starting any new supplement.
        </p>
      </div>
    </footer>
  );
}
