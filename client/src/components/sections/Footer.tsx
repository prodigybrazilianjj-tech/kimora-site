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

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
    </svg>
  );
}

/**
 * Two surfaces. "sand" is the long-standing site footer. "ink" is the closing
 * band for the alternating cream/ink page (ComingSoon) — the cream-page text
 * tokens (--muted-foreground is a warm grey) vanish on #211E1A, so ink uses
 * cream at reduced alpha instead of the token scale.
 */
const TONES = {
  sand: {
    shell: "bg-secondary border-border",
    display: "text-foreground/20",
    body: "text-muted-foreground",
    hover: "hover:text-foreground",
    address: "text-foreground/70",
    fine: "text-foreground/70",
  },
  ink: {
    shell: "bg-surface-ink text-surface-ink-foreground border-[rgba(247,240,222,0.14)]",
    display: "text-[rgba(247,240,222,0.22)]",
    body: "text-[rgba(247,240,222,0.62)]",
    hover: "hover:text-[#F7F0DE]",
    address: "text-[rgba(247,240,222,0.62)]",
    fine: "text-[rgba(247,240,222,0.58)]",
  },
} as const;

export function Footer({ tone = "sand" }: { tone?: keyof typeof TONES }) {
  const t = TONES[tone];

  return (
    <footer className={`py-12 border-t ${t.shell}`}>
      <div className="container px-4 mx-auto text-center">
        <p className={`text-3xl font-display font-bold tracking-[0.18em] mb-8 ${t.display}`}>
          GROW STRONGER. THINK SHARPER.
        </p>

        <div className={`flex flex-col items-center gap-4 mb-10 text-sm ${t.body}`}>
          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com/kimoracreatine"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kimora on Instagram"
              className={`${t.hover} transition-colors`}
            >
              <InstagramIcon className="w-5 h-5" />
            </a>

            <a
              href="https://tiktok.com/@kimora_co"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kimora on TikTok"
              className={`${t.hover} transition-colors`}
            >
              <TikTokIcon className="w-5 h-5" />
            </a>
          </div>

          <span>Kimora Co. © 2026. All rights reserved.</span>

          <span className={`text-xs ${t.address}`}>
            PO Box 20024, Sedona, AZ 86341
          </span>

          <a
            href="mailto:support@kimoraco.com"
            className={`${t.hover} transition-colors`}
          >
            support@kimoraco.com
          </a>

          {/* Legal + Utility Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            <Link href="/terms" className={`${t.hover} transition-colors`}>
              Terms of Service
            </Link>

            <Link href="/privacy" className={`${t.hover} transition-colors`}>
              Privacy Policy
            </Link>

            <Link
              href="/manage-subscription"
              className={`${t.hover} transition-colors`}
            >
              Manage Subscription
            </Link>

            <Link href="/refunds" className={`${t.hover} transition-colors`}>
              Refund Policy
            </Link>

            <Link
              href="/wholesale"
              className={`${t.hover} transition-colors`}
            >
              Wholesale
            </Link>
          </div>
        </div>

        <p className={`text-xs max-w-2xl mx-auto leading-relaxed ${t.fine}`}>
          These statements have not been evaluated by the Food and Drug
          Administration. This product is not intended to diagnose, treat, cure,
          or prevent any disease. Always consult your healthcare provider before
          starting any new supplement.
        </p>
      </div>
    </footer>
  );
}
