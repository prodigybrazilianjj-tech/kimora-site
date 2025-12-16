import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";

export default function FAQ() {
  const faqs = [
    {
      q: "Do I need to load Kimora?",
      a: "No loading phase is necessary. While loading (taking 20g/day for a week) can saturate muscles slightly faster, it often causes bloating and digestive discomfort. Taking one 5g stick of Kimora daily will fully saturate your muscles within 3-4 weeks without the side effects."
    },
    {
      q: "When should I take it?",
      a: "Consistency matters more than timing. Take it whenever you can consistently build it into your routine—morning, pre-workout, post-workout, or with dinner. Many users find taking it with a meal helps absorption."
    },
    {
      q: "Can I stack this with pre-workout or other electrolyte drinks?",
      a: "Absolutely. Kimora is stimulant-free, so it stacks perfectly with your favorite pre-workout. The electrolytes in Kimora are balanced for daily hydration, so you can also combine it with other hydration products if you're training in extreme heat, but for most sessions, Kimora alone is sufficient."
    },
    {
      q: "Will creatine make me bloated or 'puffy'?",
      a: "Creatine pulls water into your muscle cells (intracellular hydration), which is exactly what you want for performance and recovery. It does not cause subcutaneous water retention (bloating under the skin) unless you take low-quality creatine or load it aggressively. Kimora uses premium micronized creatine to minimize any digestive issues."
    },
    {
      q: "Do I have to be a fighter to use Kimora?",
      a: "Not at all. While we built this with combat sports demands in mind (high intensity, weight management needs, cognitive stress), the benefits of creatine and electrolytes apply to anyone who lifts, runs, or wants to improve their cognitive function and physical performance."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <Link href="/">
            <a className="inline-flex items-center text-muted-foreground hover:text-white mb-8 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to main site
            </a>
          </Link>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
            FAQ
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            A few quick answers from the mats, the gym, and between rounds.
          </p>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-white/10">
                <AccordionTrigger className="text-lg font-bold text-white hover:text-primary transition-colors text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
      <Footer />
    </div>
  );
}
