import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OMark } from "@/components/OMark";

/**
 * The site header, per the approved design: an ink bar with the wordmark left,
 * the section nav centred, and a gold call to action on the right. The active
 * link carries a gold underline.
 *
 * It is ink rather than cream on purpose — it sits above the ink hero and reads
 * as one surface with it, then stays dark over the cream bands further down.
 *
 * `position` exists because the two pages sit differently in flow. The
 * pre-launch page is sticky and takes up space. The homepage's header is fixed
 * and overlays the hero — thirteen pages already compensate for that with
 * `pt-32`, so it stays fixed rather than dragging them all into a reflow.
 */

export interface NavLink {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface NavCta {
  label: string;
  href?: string;
  onClick?: () => void;
}

const POSITION = {
  sticky: "sticky top-0",
  fixed: "fixed top-0 left-0 right-0",
} as const;

const LINK_BASE =
  "relative text-xs font-semibold uppercase tracking-[0.16em] transition-colors";

function NavItem({ link, onNavigate }: { link: NavLink; onNavigate?: () => void }) {
  const inner = (
    <span className="relative inline-block py-1">
      {link.label}
      {link.active ? (
        <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded bg-primary" />
      ) : null}
    </span>
  );

  const cls = cn(
    LINK_BASE,
    link.active
      ? "text-surface-ink-foreground"
      : "text-[rgba(247,240,222,0.68)] hover:text-surface-ink-foreground"
  );

  const handle = () => {
    link.onClick?.();
    onNavigate?.();
  };

  if (link.href) {
    return (
      <Link href={link.href} onClick={handle} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handle} className={cls}>
      {inner}
    </button>
  );
}

const CTA_CLS =
  "rounded-md bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90";

function Cta({ cta, onNavigate }: { cta: NavCta; onNavigate?: () => void }) {
  const handle = () => {
    cta.onClick?.();
    onNavigate?.();
  };

  if (cta.href) {
    return (
      <Link href={cta.href} onClick={handle} className={CTA_CLS}>
        {cta.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handle} className={CTA_CLS}>
      {cta.label}
    </button>
  );
}

export function SiteHeader({
  position = "sticky",
  links = [],
  cta,
  onWordmarkClick,
}: {
  position?: keyof typeof POSITION;
  links?: NavLink[];
  cta?: NavCta;
  /** Home intercepts this to scroll to top rather than re-navigate. */
  onWordmarkClick?: (e: React.MouseEvent) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={cn(
        POSITION[position],
        "z-50 border-b border-[rgba(247,240,222,0.10)] bg-surface-ink/95 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-8 lg:px-10">
        <Link
          href="/"
          onClick={onWordmarkClick}
          className="font-wordmark text-3xl font-bold leading-none tracking-[0.16em] text-surface-ink-foreground transition-colors hover:text-surface-ink-foreground sm:text-4xl"
        >
          KIM
          <OMark className="bg-surface-ink-foreground" tracking={0.16} />
          RA
        </Link>

        {links.length > 0 ? (
          <nav className="hidden items-center gap-9 md:flex">
            {links.map((link) => (
              <NavItem key={link.label} link={link} />
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-3">
          {cta ? (
            <div className="hidden md:block">
              <Cta cta={cta} />
            </div>
          ) : null}

          {links.length > 0 ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-surface-ink-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="border-l border-[rgba(247,240,222,0.12)] bg-surface-ink"
              >
                <div className="mt-10 flex flex-col items-start gap-7">
                  {links.map((link) => (
                    <NavItem key={link.label} link={link} onNavigate={closeMobile} />
                  ))}

                  {cta ? (
                    <div className="mt-2">
                      <Cta cta={cta} onNavigate={closeMobile} />
                    </div>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </motion.header>
  );
}

/** The height the fixed header occupies, for pages that must clear it. */
export const HEADER_CLEARANCE = "pt-[88px] sm:pt-[96px]";
