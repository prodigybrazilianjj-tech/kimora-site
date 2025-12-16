import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export function FAQPreview() {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4 mx-auto max-w-3xl">
        <div className="flex items-baseline justify-between mb-12">
          <h2 className="text-3xl font-display font-bold text-white">FAQ</h2>
        </div>

        <div className="space-y-8 mb-12">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Do I need to load creatine?</h3>
            <p className="text-muted-foreground">No. Just take one 5 g stick daily and let your levels build over time.</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">When should I take it?</h3>
            <p className="text-muted-foreground">Whenever you’ll actually remember it — morning, pre-training, post-training, or with a meal.</p>
          </div>
        </div>

        <Link href="/faq">
          <a className="inline-flex items-center text-primary font-bold hover:text-primary/80 transition-colors uppercase tracking-wider">
            View all FAQs <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </Link>
      </div>
    </section>
  );
}
