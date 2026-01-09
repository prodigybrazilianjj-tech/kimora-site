import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl font-display font-bold text-white mb-8">
            Terms of Service
          </h1>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
            <p><strong>Effective Date:</strong> January 2025</p>

            <p>
              Welcome to Kimora Co. By accessing or purchasing from kimoraco.com,
              you agree to the following Terms of Service.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">Use of Our Website</h2>
            <p>
              You agree to use this website for lawful purposes only and not to
              misuse or exploit any content without permission.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">Products & Supplements</h2>
            <p>
              Our products are not intended to diagnose, treat, cure, or prevent
              any disease. Always consult a healthcare professional.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">Orders & Payments</h2>
            <p>
              Payments are processed securely through Stripe. Prices are listed
              in USD.
            </p>

            <h2 className="text-white font-bold text-lg mt-8">Contact</h2>
            <p>alex@kimoraco.com</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

