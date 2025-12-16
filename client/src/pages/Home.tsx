import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { ProductLineup } from "@/components/sections/ProductLineup";
import { Benefits } from "@/components/sections/Benefits";
import { Formula } from "@/components/sections/Formula";
import { Comparison } from "@/components/sections/Comparison";
import { About } from "@/components/sections/About";
import { FAQPreview } from "@/components/sections/FAQPreview";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <ProductLineup />
        <Benefits />
        <Formula />
        <Comparison />
        <About />
        <FAQPreview />
      </main>
      <Footer />
    </div>
  );
}
