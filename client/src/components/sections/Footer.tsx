import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="py-12 bg-black border-t border-white/5">
      <div className="container px-4 mx-auto text-center">
        <p className="text-3xl font-display font-bold text-white/20 tracking-[0.2em] mb-8">
          OUT-TRAIN. OUT-SMART. OUT-LAST.
        </p>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-sm text-muted-foreground">
          <span>Kimora Co. © 2025</span>

          <Link href="/terms">
            <a className="hover:text-white transition-colors">
              Terms
            </a>
          </Link>

          <Link href="/privacy">
            <a className="hover:text-white transition-colors">
              Privacy
            </a>
          </Link>

          <Link href="/refunds">
            <a className="hover:text-white transition-colors">
              Refunds
            </a>
          </Link>

          <a
            href="mailto:alex@kimoraco.com"
            className="hover:text-white transition-colors"
          >
            alex@kimoraco.com
          </a>
        </div>

        {/* FDA Disclaimer */}
        <p className="text-xs text-white/20 max-w-2xl mx-auto leading-relaxed">
          These statements have not been evaluated by the Food and Drug Administration.
          This product is not intended to diagnose, treat, cure, or prevent any disease.
          Always consult your healthcare provider before starting any new supplement.
        </p>
      </div>
    </footer>
  );
}

