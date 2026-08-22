import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PRELAUNCH_GATE } from "@/lib/prelaunch";

/**
 * StickyNotifyBar — floating pill that slides up after the visitor has
 * scrolled ~55% of the Home page (approved mockup 2026-07-05). Prelaunch-only:
 * routes to the email capture section. Hides again near the footer and is
 * dismissible for the session.
 */

export function StickyNotifyBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!PRELAUNCH_GATE) return;
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const p = window.scrollY / max;
      setVisible(p > 0.55 && p < 0.94);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!PRELAUNCH_GATE || dismissed) return null;

  const goToCapture = () => {
    const el = document.querySelector("#email-capture");
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div
      className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
        visible ? "translate-y-0" : "translate-y-[140%]"
      }`}
    >
      <div className="flex items-center gap-3 md:gap-4 rounded-full bg-surface-ink text-surface-ink-foreground py-2 pl-5 pr-2 shadow-[0_18px_40px_rgba(0,0,0,0.45)] whitespace-nowrap">
        <span className="text-xs md:text-sm font-semibold">
          Strawberry Guava is coming —{" "}
          <span className="text-primary">get 15% off at launch</span>
        </span>
        <Button
          size="sm"
          onClick={goToCapture}
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider text-xs"
        >
          Notify Me
        </Button>
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="pr-2 text-[rgba(247,240,222,0.6)] hover:text-surface-ink-foreground text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
