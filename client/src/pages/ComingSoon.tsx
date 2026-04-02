import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const launchAt = useMemo(() => {
    const configured =
      (typeof import.meta !== "undefined" &&
        (import.meta as any)?.env?.VITE_LAUNCH_AT) ||
      "";
    const parsed = configured ? new Date(configured) : null;

    if (parsed && !Number.isNaN(parsed.getTime())) return parsed;

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 14);
    fallback.setHours(9, 0, 0, 0);
    return fallback;
  }, []);

  const [timeLeftMs, setTimeLeftMs] = useState(
    Math.max(0, launchAt.getTime() - Date.now())
  );

  useEffect(() => {
    const tick = () => {
      setTimeLeftMs(Math.max(0, launchAt.getTime() - Date.now()));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [launchAt]);

  const countdown = useMemo(() => {
    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, "0");

    return {
      days: pad(days),
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
    };
  }, [timeLeftMs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Something went wrong");
      }

      setSubmitted(true);
      setEmail("");
    } catch (err: any) {
      alert(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#040404] text-white">

      {/* BACKGROUND ENSO */}
      <img
        src="/assets/products/enso_tentacle.png"
        alt=""
        className="pointer-events-none absolute left-1/2 top-[-4rem] hidden w-[48rem] -translate-x-1/2 opacity-[0.035] lg:block"
      />

      {/* HEADER */}
      <header className="relative z-20 border-b border-white/6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/assets/products/enso_tentacle.png"
              alt="Kimora logo"
              className="h-10 w-auto"
            />
            <span className="text-sm font-semibold tracking-[0.22em]">
              KIMORA CO.
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6">

        {/* HERO */}
        <section className="py-20">
          <h1 className="text-7xl font-bold tracking-tight">
            KIMORA
          </h1>

          <p className="mt-4 text-2xl text-white/80 uppercase tracking-widest">
            Creatine — Finally Done Right.
          </p>

          <p className="mt-4 text-sm text-zinc-500 uppercase tracking-widest">
            Built for BJJ · MMA · Muay Thai · Lifters
          </p>

          <p className="mt-8 max-w-xl text-lg text-zinc-300">
            Most people know they should take creatine.
            Almost nobody does it consistently.
          </p>

          <p className="mt-4 max-w-xl text-lg text-zinc-400">
            Kimora fixes that.
          </p>

          <p className="mt-4 max-w-xl text-lg text-zinc-400">
            Single-serve creatine + electrolytes — no scooping, no mixing, no mess.
            Just tear, pour, and go.
          </p>

          {/* WAITLIST */}
          <div className="mt-10 border border-white/10 rounded-xl p-6 max-w-xl">

            <h3 className="text-2xl font-semibold">
              First Drop Coming Soon
            </h3>

            <div className="mt-4 flex gap-4 text-sm text-zinc-400">
              <span>{countdown.days}d</span>
              <span>{countdown.hours}h</span>
              <span>{countdown.minutes}m</span>
              <span>{countdown.seconds}s</span>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 p-4 bg-black border border-white/10 rounded-lg"
              />

              <button className="px-6 bg-primary text-white font-bold rounded-lg">
                {submitting ? "Submitting..." : "Get First Access"}
              </button>
            </form>

            {submitted && (
              <p className="mt-4 text-green-400">
                You’re on the list.
              </p>
            )}

            <p className="mt-2 text-xs text-zinc-500">
              First batch will be limited.
            </p>

          </div>
        </section>

        {/* WHY */}
        <section className="mt-24 max-w-2xl">
          <h2 className="text-3xl font-semibold">
            Why Kimora Exists
          </h2>

          <p className="mt-6 text-zinc-400">
            In jiu-jitsu, nothing works if you’re inconsistent.
          </p>

          <p className="mt-4 text-zinc-400">
            You don’t get stronger from one lift.
            You don’t get better from one roll.
          </p>

          <p className="mt-4 text-zinc-300">
            Kimora removes the friction so you actually follow through.
          </p>

          <p className="mt-4 text-zinc-400">
            No scoops. No chalky drinks. No forgetting.
          </p>

          <p className="mt-4 text-zinc-400">
            Just a system that works.
          </p>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="py-12 bg-black border-t border-white/5 text-center">
        <img
          src="/assets/products/enso_tentacle.png"
          alt=""
          className="mx-auto mb-4 h-10 opacity-60"
        />

        <p className="text-white/40">KIMORA CO.</p>

        <p className="text-xs mt-2 text-white/30 tracking-widest">
          OUT-TRAIN. OUT-SMART. OUT-LAST.
        </p>

        <div className="mt-6 text-sm text-white/40 flex flex-col items-center gap-2">
          <a
            href="mailto:support@kimoraco.com"
            className="hover:text-white transition-colors"
          >
            support@kimoraco.com
          </a>

          <a
            href="https://instagram.com/kimoracreatine"
            target="_blank"
            className="hover:text-white transition-colors"
          >
            @kimoracreatine
          </a>

          <div className="flex gap-4 text-xs mt-2">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/wholesale">Wholesale</Link>
          </div>
        </div>

        <p className="text-xs text-white/20 max-w-xl mx-auto mt-6">
          These statements have not been evaluated by the Food and Drug
          Administration. This product is not intended to diagnose, treat, cure,
          or prevent any disease.
        </p>
      </footer>
    </div>
  );
}