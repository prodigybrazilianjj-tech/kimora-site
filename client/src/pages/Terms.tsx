import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { LegalBody } from "@/components/LegalBody";
import { TERMS_POLICY } from "@/lib/legal";

/**
 * Policy text in client/src/lib/legal.ts, renderer in components/LegalBody.tsx.
 * shared/prerender.ts renders the same array, so the crawler-visible policy and
 * the reader-visible policy cannot drift. See legal.ts for why.
 *
 * The container div previously carried
 * `space-y-6 text-muted-foreground leading-relaxed text-sm` where /refunds and
 * /privacy carried `space-y-6 text-sm text-muted-foreground leading-relaxed` —
 * the same four classes in a different order, which Tailwind resolves
 * identically. LegalBody uses the latter ordering for all three. Noted so the
 * diff does not read as a style change.
 *
 * The `<Link>` import moved to LegalBody too: the one internal cross-reference
 * on this page (/refunds, "incorporated into these Terms by reference") is now
 * a link span in the data, so the page no longer needs wouter directly.
 */
export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            {TERMS_POLICY.heading}
          </h1>

          <LegalBody blocks={TERMS_POLICY.blocks} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
