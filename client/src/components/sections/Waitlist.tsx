import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("submitting");

    try {
      const response = await fetch("https://formspree.io/f/xovnojzg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <section id="waitlist" className="py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-bottom-right scale-110 pointer-events-none" />
      
      <div className="container relative z-10 px-4 mx-auto text-center max-w-2xl">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
          Don't Miss The Drop
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Daily creatine you’ll actually remember to take. Join the waitlist for launch updates and early access pricing.
        </p>

        {status === "success" ? (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-8 flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-2xl font-display font-bold text-white">You're on the list!</h3>
            <p className="text-muted-foreground mt-2">We'll keep you posted on the launch.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary/50 text-lg px-6"
              required
            />
            <Button 
              type="submit" 
              disabled={status === "submitting"}
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg"
            >
              {status === "submitting" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Join the Waitlist"
              )}
            </Button>
          </form>
        )}
        
        {status === "error" && (
          <p className="text-destructive mt-4">Something went wrong. Please try again.</p>
        )}
      </div>
    </section>
  );
}
