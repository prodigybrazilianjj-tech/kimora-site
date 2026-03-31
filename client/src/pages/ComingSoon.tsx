import { useEffect, useMemo, useState } from "react";

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
      {/* background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.18),transparent_30%),radial-gradient(circle_at_70%_60%,rgba(234,179,8,0.12),transparent_25%)] pointer-events-none" />

      {/* HEADER */}
      <header className="relative z-20 border-b border-white/6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/assets/products/transparentlogo.png"
              className="h-9 invert brightness-[2]"
            />
            <span className="text-sm tracking-[0.2em] uppercase">
              KIMORA CO.
            </span>
          </div>

          <span className="text-xs text-zinc-400">
            FIRST DROP COMING SOON
          </span>
        </div>
      </header>

      {/* HERO */}
      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-6 pt-10 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* LEFT */}
          <div>
            <h1 className="text-5xl sm:text-6xl font-black leading-[0.9]">
              OUT-TRAIN.
              <br />
              OUT-SMART.
              <br />
              OUT-LAST.
            </h1>

            <p className="mt-6 text-zinc-300 text-lg max-w-lg">
              Creatine + electrolytes for performance, hydration, and recovery —
              built for fighters and everyday high performers.
            </p>

            {/* countdown */}
            <div className="mt-10 bg-white/[0.04] border border-white/10 p-6 rounded-2xl backdrop-blur">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-3xl font-bold">{countdown.days}</div>
                  <div className="text-xs text-zinc-500">DAYS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{countdown.hours}</div>
                  <div className="text-xs text-zinc-500">HOURS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{countdown.minutes}</div>
                  <div className="text-xs text-zinc-500">MINUTES</div>
                </div>
                <div className="text-orange-400">
                  <div className="text-3xl font-bold">{countdown.seconds}</div>
                  <div className="text-xs">SECONDS</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3"
                />
                <button className="bg-white text-black px-5 rounded-xl font-semibold">
                  Get Access
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT (FIXED HERO IMAGE) */}
          <div className="relative flex justify-center items-center">
            <div className="absolute w-[500px] h-[500px] bg-orange-500/20 blur-[120px] rounded-full" />

            <img
              src="/assets/products/strawberry-guava/pouch.png"
              alt="Kimora Co Strawberry Guava"
              className="relative w-full max-w-[420px] object-contain drop-shadow-[0_50px_90px_rgba(0,0,0,0.6)] rotate-[-2deg] hover:rotate-0 transition duration-500"
            />
          </div>
        </section>

        {/* FLAVORS (UNCHANGED) */}
        <section className="mx-auto max-w-7xl px-6 py-16 space-y-16">
          <h2 className="text-4xl font-semibold">Three signature flavors</h2>

          <div>
            <img src="/assets/products/strawberry-guava/pouchandstick.png" />
          </div>

          <div>
            <img src="/assets/products/raspberry-dragonfruit/pouchandstick.png" />
          </div>

          <div>
            <img src="/assets/products/lemon-yuzu/pouchandstick.png" />
          </div>
        </section>
      </main>
    </div>
  );
}