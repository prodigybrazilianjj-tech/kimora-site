import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Add your Privacy Policy here. (We can write these next.)
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
