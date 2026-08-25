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
      a: "No. Loading—around 20g a day for a week—reaches muscle saturation faster and is more likely to upset your stomach. The research is consistent that a standard daily dose gets to the same place in roughly three to four weeks. One stick is 5g of creatine monohydrate."
    },
    {
      q: "When should I take it?",
      a: "Consistency matters more than timing. Creatine works by being present in the muscle, not by being in your bloodstream at a clever moment—so take it at whatever hour you'll actually take it every day. Morning, pre-training, post-training, with dinner. The best time is the one you don't skip."
    },
    {
      q: "Can I stack this with pre-workout or other electrolyte drinks?",
      a: "Yes. Kimora contains no stimulants, so there's nothing to double up on if you also take a pre-workout. It contains sodium, potassium and magnesium; if you're training in real heat and want more on top of that, there's no interaction to avoid."
    },
    {
      q: "Will creatine make me bloated or 'puffy'?",
      a: "Creatine draws water into the muscle cell. That's intracellular, and it's the mechanism the research describes rather than a side effect. The 'puffy' look people report is generally associated with aggressive loading rather than a standard daily dose. Kimora uses micronized creatine monohydrate."
    },
    {
      q: "Do I have to be a fighter to use Kimora?",
      a: "No. We built it around combat sports—high intensity, weight management, training most days—but creatine monohydrate is one of the most studied supplements in sports nutrition, and none of that research is specific to fighters. If you lift or run, it's the same compound."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to main site
          </Link>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6">
            FAQ
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            A few quick answers from the mats, the gym, and between rounds.
          </p>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-foreground/10">
                <AccordionTrigger className="text-lg font-bold text-foreground hover:text-primary-strong transition-colors text-left">
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
