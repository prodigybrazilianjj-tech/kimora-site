import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { LegalBody } from "@/components/LegalBody";
import { REFUNDS_POLICY } from "@/lib/legal";

/**
 * The policy text lives in client/src/lib/legal.ts and the renderer in
 * components/LegalBody.tsx. Neither is here.
 *
 * Not a tidy-up. shared/prerender.ts renders the SAME array this page renders,
 * so the crawler-visible policy and the reader-visible policy cannot drift
 * apart. Keeping the prose in JSX here and a copy over there is the
 * arrangement playbook finding #38 names as a defect, on the one kind of copy
 * where drift is worst.
 */
export default function Refunds() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            {REFUNDS_POLICY.heading}
          </h1>

          <LegalBody blocks={REFUNDS_POLICY.blocks} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
