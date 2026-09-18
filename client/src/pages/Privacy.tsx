import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { LegalBody } from "@/components/LegalBody";
import { PRIVACY_POLICY } from "@/lib/legal";

/**
 * Policy text in client/src/lib/legal.ts, renderer in components/LegalBody.tsx.
 * shared/prerender.ts renders the same array, so the crawler-visible policy and
 * the reader-visible policy cannot drift. See legal.ts for why.
 */
export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            {PRIVACY_POLICY.heading}
          </h1>

          <LegalBody blocks={PRIVACY_POLICY.blocks} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
