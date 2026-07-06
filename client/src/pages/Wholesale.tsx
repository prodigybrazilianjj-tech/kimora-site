import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { WholesaleCalculator } from "@/components/WholesaleCalculator";

export default function Wholesale() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Hero */}
          <div className="text-center mb-14">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Kimora Wholesale Program
            </h1>

            <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
              Built for gyms. Backed by discipline.
            </p>

            <p className="mt-3 text-sm text-foreground/55 max-w-3xl mx-auto">
              Kimora is not a mass-market supplement. It’s a daily performance ritual
              designed for athletes who train with intent — and gyms that do the same.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/wholesale/apply">
                <Button className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider">
                  Apply Now
                </Button>
              </Link>

              <Link href="/shop">
                <Button
                  variant="secondary"
                  className="h-12 px-6 bg-foreground/10 hover:bg-foreground/20 text-foreground"
                >
                  Shop Retail
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-foreground/45">
              Applications typically reviewed within 1–2 business days.
            </p>
          </div>

          {/* Why Partner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6">
              <div className="text-foreground font-semibold mb-2">
                Premium product your members trust
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Kimora is formulated for strength, recovery, and mental clarity — without
                fillers, sugar crashes, or gimmicks.
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6">
              <div className="text-foreground font-semibold mb-2">
                Serious margins, simple structure
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Volume-based wholesale pricing with consistent MSRP. We protect brand value
                so your shelf stays strong.
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6">
              <div className="text-foreground font-semibold mb-2">
                Designed for in-gym retail
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Built to move where training happens: gyms, jiu-jitsu academies, performance
                centers, and coaching studios.
              </p>
            </div>
          </div>

          {/* Gated margin calculator — no wholesale numbers in client code */}
          <WholesaleCalculator />

          {/* Program Overview */}
          <div className="rounded-2xl border border-foreground/10 bg-muted p-8 mb-10">
            <h2 className="text-2xl font-display font-bold text-foreground mb-3 text-center">
              Wholesale Program Overview
            </h2>
            <p className="text-sm text-foreground/70 max-w-3xl mx-auto text-center leading-relaxed">
              Our wholesale program is tiered based on order volume and commitment level.
              Wholesale pricing is shared after approval to ensure alignment and protect our
              partners.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-xs uppercase tracking-wider text-foreground/45 mb-2">
                  Program highlights
                </div>
                <ul className="text-sm text-foreground/75 space-y-2 list-disc pl-5">
                  <li>Case-based ordering</li>
                  <li>Volume discounts for committed partners</li>
                  <li>Consistent MSRP across gyms</li>
                  <li>Reorder-friendly structure</li>
                </ul>
              </div>

              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-xs uppercase tracking-wider text-foreground/45 mb-2">
                  Built for
                </div>
                <ul className="text-sm text-foreground/75 space-y-2 list-disc pl-5">
                  <li>Gym owners</li>
                  <li>Jiu-jitsu & martial arts academies</li>
                  <li>Performance centers</li>
                  <li>Personal training studios with retail space</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-8 mb-10">
            <h2 className="text-2xl font-display font-bold text-foreground mb-3 text-center">
              Program Guidelines
            </h2>
            <p className="text-sm text-foreground/70 max-w-3xl mx-auto text-center leading-relaxed">
              To protect our partners and the Kimora brand, we require the following:
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-foreground/10 bg-muted p-6">
                <ul className="text-sm text-foreground/75 space-y-2 list-disc pl-5">
                  <li>In-gym retail only by default</li>
                  <li>MSRP / MAP adherence (minimum advertised price)</li>
                  <li>Minimum order quantities</li>
                  <li>No subscription stacking with wholesale pricing</li>
                </ul>
              </div>

              <div className="rounded-xl border border-foreground/10 bg-muted p-6">
                <div className="text-sm text-foreground/80 leading-relaxed">
                  Not a fit for online arbitrage or marketplace reselling. We’re building
                  a long-term brand — and protecting your margins.
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="rounded-2xl border border-foreground/10 bg-muted p-8 mb-10">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
              FAQ
            </h2>

            <div className="space-y-5">
              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-foreground font-semibold mb-1">What is the retail price?</div>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Kimora maintains a consistent MSRP across channels. Exact wholesale
                  pricing is shared after approval.
                </p>
              </div>

              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-foreground font-semibold mb-1">Is there a minimum order?</div>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Yes — wholesale orders are structured in case quantities to ensure proper
                  margins and efficient fulfillment.
                </p>
              </div>

              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-foreground font-semibold mb-1">Can I sell Kimora online?</div>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Wholesale approval is for in-gym retail by default. Online resale requires
                  prior written approval.
                </p>
              </div>

              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-foreground font-semibold mb-1">Do you offer exclusivity?</div>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Not at this time. We focus on partner quality rather than saturation.
                </p>
              </div>

              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-foreground font-semibold mb-1">How fast do orders ship?</div>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Most wholesale orders ship within 5–10 business days depending on inventory.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Bottom */}
          <div className="text-center rounded-2xl border border-foreground/10 bg-foreground/5 p-10">
            <h2 className="text-2xl font-display font-bold text-foreground">
              Ready to partner with Kimora?
            </h2>
            <p className="mt-3 text-sm text-foreground/70 max-w-2xl mx-auto">
              If you run a serious gym and want a premium product with protected margins,
              apply for wholesale access.
            </p>

            <div className="mt-6 flex justify-center">
              <Link href="/wholesale/apply">
                <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider">
                  Apply Now
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-foreground/45">
              Questions? Email{" "}
              <a
                href="mailto:alex@kimoraco.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                alex@kimoraco.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
