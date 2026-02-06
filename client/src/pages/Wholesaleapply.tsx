import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;

  websiteOrInstagram: string;
  city: string;
  state: string;

  businessType: "gym" | "bjj" | "performance" | "trainer" | "retail" | "other";
  businessTypeOther: string;

  memberCount: string; // keep as string for input UX
  retailSetup: "front_desk" | "pro_shop" | "supplement_wall" | "not_sure";

  interestedIn: {
    onShelf: boolean;
    coachAffiliate: boolean;
    eventSponsorship: boolean;
  };

  notes: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}

export default function WholesaleApply() {
  const [, setLocation] = useLocation();

  const [form, setForm] = useState<FormState>({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",

    websiteOrInstagram: "",
    city: "",
    state: "",

    businessType: "gym",
    businessTypeOther: "",

    memberCount: "",
    retailSetup: "front_desk",

    interestedIn: {
      onShelf: true,
      coachAffiliate: false,
      eventSponsorship: false,
    },

    notes: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const emailNormalized = useMemo(() => normalizeEmail(form.email), [form.email]);

  const requiredOk = useMemo(() => {
    if (!form.businessName.trim()) return false;
    if (!form.contactName.trim()) return false;
    if (!emailNormalized || !isValidEmail(emailNormalized)) return false;
    if (!form.city.trim()) return false;
    if (!form.state.trim()) return false;
    if (form.businessType === "other" && !form.businessTypeOther.trim()) return false;
    return true;
  }, [form, emailNormalized]);

  function markTouched(key: string) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitError(null);

    // touch required fields to show errors
    setTouched((t) => ({
      ...t,
      businessName: true,
      contactName: true,
      email: true,
      city: true,
      state: true,
      businessTypeOther: true,
    }));

    if (!requiredOk || submitting) return;

    setSubmitting(true);

    try {
      const payload = {
        ...form,
        email: emailNormalized,
        phone: form.phone ? onlyDigits(form.phone) : "",
        memberCount: form.memberCount ? Number(onlyDigits(form.memberCount)) : null,
      };

      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data: any = isJson ? await res.json().catch(() => ({})) : {};
      const text = !isJson ? await res.text().catch(() => "") : "";

      if (!res.ok) {
        const msg =
          data?.message ||
          data?.error ||
          text ||
          "Something went wrong submitting your application.";
        throw new Error(msg);
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <main className="pt-32 pb-24">
          <div className="container mx-auto max-w-2xl px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Application received ✅
            </h1>

            <p className="text-white/70 mb-2">
              Thanks — we’ll review your wholesale request and follow up by email.
            </p>

            <p className="text-xs text-white/45 mb-8">
              If you don’t see a reply within 1–2 business days, email{" "}
              <a
                href="mailto:alex@kimoraco.com"
                className="underline underline-offset-4 hover:text-white"
              >
                alex@kimoraco.com
              </a>
              .
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/wholesale">
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                  Back to Wholesale
                </Button>
              </Link>

              <Link href="/shop">
                <Button className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider">
                  Shop Retail
                </Button>
              </Link>
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-6 text-left">
              <div className="text-xs uppercase tracking-wider text-white/45 mb-2">
                What happens next
              </div>
              <ul className="text-sm text-white/75 space-y-2 list-disc pl-5">
                <li>We confirm fit (in-gym retail, partner alignment, MAP/MSRP adherence).</li>
                <li>We send your wholesale tiers + ordering details.</li>
                <li>We help you launch strong with a first order plan.</li>
              </ul>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const showErr = (key: string) => touched[key];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white">
              Wholesale Application
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl mx-auto">
              Built for gyms that take training seriously.
            </p>

            <p className="mt-3 text-sm text-white/55 max-w-2xl mx-auto">
              Fill this out and we’ll confirm fit + send wholesale tiers, MOQ, and ordering details.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link href="/wholesale">
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                  Back
                </Button>
              </Link>
              <Button
                onClick={() => setLocation("/shop")}
                className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
              >
                Shop Retail
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            {submitError ? (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
                {submitError}
                <div className="mt-2 text-xs text-red-200/80">
                  If you’d rather, email your request to{" "}
                  <a
                    className="underline underline-offset-4 hover:text-white"
                    href="mailto:alex@kimoraco.com"
                  >
                    alex@kimoraco.com
                  </a>
                  .
                </div>
              </div>
            ) : null}

            {/* Business */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm text-white mb-2 block" htmlFor="businessName">
                  Business name <span className="text-white/40">*</span>
                </Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  onBlur={() => markTouched("businessName")}
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                  placeholder="e.g., Apex Jiu-Jitsu"
                />
                {showErr("businessName") && !form.businessName.trim() ? (
                  <p className="text-xs text-red-200 mt-2">Business name is required.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-white mb-2 block" htmlFor="contactName">
                  Contact name <span className="text-white/40">*</span>
                </Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  onBlur={() => markTouched("contactName")}
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                  placeholder="Your name"
                />
                {showErr("contactName") && !form.contactName.trim() ? (
                  <p className="text-xs text-red-200 mt-2">Contact name is required.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-white mb-2 block" htmlFor="email">
                  Email <span className="text-white/40">*</span>
                </Label>
                <Input
                  id="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                  placeholder="owner@gym.com"
                />
                {showErr("email") && (!emailNormalized || !isValidEmail(emailNormalized)) ? (
                  <p className="text-xs text-red-200 mt-2">Enter a valid email.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-white mb-2 block" htmlFor="phone">
                  Phone (optional)
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                  placeholder="(555) 555-5555"
                />
              </div>

              <div>
                <Label className="text-sm text-white mb-2 block" htmlFor="websiteOrInstagram">
                  Website / Instagram (optional)
                </Label>
                <Input
                  id="websiteOrInstagram"
                  value={form.websiteOrInstagram}
                  onChange={(e) => update("websiteOrInstagram", e.target.value)}
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                  placeholder="https://… or @handle"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-white mb-2 block" htmlFor="city">
                    City <span className="text-white/40">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    onBlur={() => markTouched("city")}
                    className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                    placeholder="Sedona"
                  />
                  {showErr("city") && !form.city.trim() ? (
                    <p className="text-xs text-red-200 mt-2">City is required.</p>
                  ) : null}
                </div>

                <div>
                  <Label className="text-sm text-white mb-2 block" htmlFor="state">
                    State <span className="text-white/40">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    onBlur={() => markTouched("state")}
                    className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                    placeholder="AZ"
                  />
                  {showErr("state") && !form.state.trim() ? (
                    <p className="text-xs text-red-200 mt-2">State is required.</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-white/10 my-8" />

            {/* Business type + retail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-white mb-2">Business type</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["gym", "Gym"],
                    ["bjj", "Jiu-jitsu / Martial Arts"],
                    ["performance", "Performance Center"],
                    ["trainer", "Coach / Trainer"],
                    ["retail", "Retail Store"],
                    ["other", "Other"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update("businessType", value as FormState["businessType"])}
                      className={[
                        "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                        form.businessType === value
                          ? "border-primary bg-primary/15 text-white"
                          : "border-white/10 bg-black/30 text-white/70 hover:text-white hover:bg-white/5",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {form.businessType === "other" ? (
                  <div className="mt-3">
                    <Label className="text-sm text-white mb-2 block" htmlFor="businessTypeOther">
                      Please specify <span className="text-white/40">*</span>
                    </Label>
                    <Input
                      id="businessTypeOther"
                      value={form.businessTypeOther}
                      onChange={(e) => update("businessTypeOther", e.target.value)}
                      onBlur={() => markTouched("businessTypeOther")}
                      className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                      placeholder="e.g., CrossFit box"
                    />
                    {showErr("businessTypeOther") && !form.businessTypeOther.trim() ? (
                      <p className="text-xs text-red-200 mt-2">This field is required.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-white mb-2 block" htmlFor="memberCount">
                  Approx members / active clients (optional)
                </Label>
                <Input
                  id="memberCount"
                  value={form.memberCount}
                  onChange={(e) => update("memberCount", e.target.value)}
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                  placeholder="e.g., 150"
                />

                <div className="mt-4 text-sm text-white mb-2">Retail setup</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["front_desk", "Front desk"],
                    ["pro_shop", "Pro shop"],
                    ["supplement_wall", "Supplement wall"],
                    ["not_sure", "Not sure yet"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update("retailSetup", value as FormState["retailSetup"])}
                      className={[
                        "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                        form.retailSetup === value
                          ? "border-primary bg-primary/15 text-white"
                          : "border-white/10 bg-black/30 text-white/70 hover:text-white hover:bg-white/5",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-white/10 my-8" />

            {/* Interested in */}
            <div>
              <div className="text-sm text-white mb-3">Interested in</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      interestedIn: { ...f.interestedIn, onShelf: !f.interestedIn.onShelf },
                    }))
                  }
                  className={[
                    "rounded-xl border px-4 py-4 text-left text-sm transition-colors",
                    form.interestedIn.onShelf
                      ? "border-primary bg-primary/15 text-white"
                      : "border-white/10 bg-black/30 text-white/70 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="font-semibold">On-shelf wholesale</div>
                  <div className="text-xs text-white/60 mt-1">
                    Stock Kimora in your gym
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      interestedIn: {
                        ...f.interestedIn,
                        coachAffiliate: !f.interestedIn.coachAffiliate,
                      },
                    }))
                  }
                  className={[
                    "rounded-xl border px-4 py-4 text-left text-sm transition-colors",
                    form.interestedIn.coachAffiliate
                      ? "border-primary bg-primary/15 text-white"
                      : "border-white/10 bg-black/30 text-white/70 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="font-semibold">Coach / affiliate</div>
                  <div className="text-xs text-white/60 mt-1">
                    Coaches promote to members
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      interestedIn: {
                        ...f.interestedIn,
                        eventSponsorship: !f.interestedIn.eventSponsorship,
                      },
                    }))
                  }
                  className={[
                    "rounded-xl border px-4 py-4 text-left text-sm transition-colors",
                    form.interestedIn.eventSponsorship
                      ? "border-primary bg-primary/15 text-white"
                      : "border-white/10 bg-black/30 text-white/70 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="font-semibold">Events / sponsorship</div>
                  <div className="text-xs text-white/60 mt-1">
                    Tournament + gym events
                  </div>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-8">
              <Label className="text-sm text-white mb-2 block" htmlFor="notes">
                Notes (optional)
              </Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="w-full min-h-[120px] rounded-xl bg-background border border-white/10 text-white p-4 placeholder:text-white/40"
                placeholder="Tell us about your gym, your members, and how you plan to sell Kimora…"
              />
            </div>

            {/* Submit */}
            <div className="mt-8 flex flex-col gap-3">
              <Button
                onClick={submit}
                disabled={!requiredOk || submitting}
                className="h-12 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </Button>

              <Button
                variant="secondary"
                className="h-12 bg-white/10 hover:bg-white/20 text-white"
                onClick={() => setLocation("/wholesale")}
                disabled={submitting}
              >
                Back to Wholesale
              </Button>

              <p className="text-xs text-white/45 text-center">
                Prefer email? Send your request to{" "}
                <a
                  href="mailto:alex@kimoraco.com"
                  className="underline underline-offset-4 hover:text-white"
                >
                  alex@kimoraco.com
                </a>
                .
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-white/40">
            By applying, you agree to respect MAP/MSRP guidelines and in-gym retail
            positioning. Wholesale details are provided after approval.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
