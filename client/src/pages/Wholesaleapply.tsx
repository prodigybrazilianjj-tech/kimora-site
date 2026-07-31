import { useMemo, useRef, useState } from "react";
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

  // ✅ now required
  phone: string;

  websiteOrInstagram: string;
  city: string;
  state: string;

  businessType: "gym" | "bjj" | "performance" | "trainer" | "retail" | "other";
  businessTypeOther: string;

  // ✅ now required (keep as string for input UX)
  memberCount: string;

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

// Downscale big phone photos before upload so we stay under the ~6MB cert cap.
async function compressImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
  const maxDim = 1600;
  let width = img.width;
  let height = img.height;
  if (width > maxDim || height > maxDim) {
    const s = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
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

  // ── Resale certificate (optional) ──────────────────────────────────────────
  const [certMode, setCertMode] = useState<"none" | "upload" | "form">("none");
  const [cert, setCert] = useState({
    licenseNumber: "",
    issuingState: "AZ",
    certType: "az_5000a" as "az_5000a" | "mtc",
    purchaserAddress: "",
    signerTitle: "Owner",
    expiresAt: "",
    fileData: "",
    fileName: "",
    fileMime: "",
  });
  const [sigEmpty, setSigEmpty] = useState(true);
  const [certError, setCertError] = useState<string | null>(null);
  const [certWarn, setCertWarn] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  function updateCert<K extends keyof typeof cert>(key: K, value: (typeof cert)[K]) {
    setCert((c) => ({ ...c, [key]: value }));
  }

  function sigPos(e: any) {
    const c = sigCanvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  }
  function sigStart(e: any) {
    e.preventDefault();
    drawingRef.current = true;
    lastPtRef.current = sigPos(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }
  function sigMove(e: any) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const c = sigCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = sigPos(e);
    const last = lastPtRef.current || p;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#12100e";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPtRef.current = p;
    if (sigEmpty) setSigEmpty(false);
  }
  function sigEnd() {
    drawingRef.current = false;
    lastPtRef.current = null;
  }
  function sigClear() {
    const c = sigCanvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, c.width, c.height);
    }
    setSigEmpty(true);
  }

  async function onCertFile(file: File | null) {
    setCertError(null);
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        const dataUrl = await fileToDataUrl(file);
        setCert((c) => ({ ...c, fileData: dataUrl, fileName: file.name, fileMime: "application/pdf" }));
      } else if (file.type.startsWith("image/")) {
        const dataUrl = await compressImage(file);
        setCert((c) => ({ ...c, fileData: dataUrl, fileName: file.name, fileMime: "image/jpeg" }));
      } else {
        setCertError("Use a JPG, PNG, or PDF.");
      }
    } catch {
      setCertError("Couldn't read that file — try another.");
    }
  }

  const emailNormalized = useMemo(() => normalizeEmail(form.email), [form.email]);
  const phoneDigits = useMemo(() => onlyDigits(form.phone), [form.phone]);

  const memberCountNum = useMemo(() => {
    const digits = onlyDigits(form.memberCount);
    if (!digits) return NaN;
    return Number(digits);
  }, [form.memberCount]);

  const requiredOk = useMemo(() => {
    if (!form.businessName.trim()) return false;
    if (!form.contactName.trim()) return false;
    if (!emailNormalized || !isValidEmail(emailNormalized)) return false;

    // ✅ now required
    if (!phoneDigits || phoneDigits.length < 10) return false;

    if (!form.city.trim()) return false;
    if (!form.state.trim()) return false;

    if (form.businessType === "other" && !form.businessTypeOther.trim()) return false;

    // ✅ now required
    if (!Number.isFinite(memberCountNum) || memberCountNum < 1) return false;

    return true;
  }, [form, emailNormalized, phoneDigits, memberCountNum]);

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

      // ✅ new required
      phone: true,
      memberCount: true,

      city: true,
      state: true,
      businessTypeOther: true,
    }));

    if (!requiredOk || submitting) return;

    // Resale cert is optional; if a mode is chosen it must be complete.
    setCertError(null);
    if (certMode === "upload" && !cert.fileData) {
      setCertError("Attach your certificate file, or choose “Skip for now.”");
      return;
    }
    if (certMode === "form") {
      if (!cert.licenseNumber.trim()) {
        setCertError("Enter your resale / TPT license number, or choose “Skip for now.”");
        return;
      }
      if (sigEmpty) {
        setCertError("Add your signature, or choose “Skip for now.”");
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        ...form,
        email: emailNormalized,
        phone: phoneDigits, // ✅ required, always send digits
        memberCount: memberCountNum, // ✅ required, always send number
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

      // Application saved — attach the resale cert if one was provided.
      if (certMode !== "none") {
        try {
          const certBody: any = {
            email: emailNormalized,
            businessName: form.businessName.trim(),
            mode: certMode,
            certType: cert.certType,
            licenseNumber: cert.licenseNumber.trim() || undefined,
            issuingState: (cert.issuingState || "AZ").trim().toUpperCase(),
            expiresAt: cert.expiresAt || undefined,
          };
          if (certMode === "upload") {
            certBody.fileData = cert.fileData;
            certBody.fileMime = cert.fileMime || undefined;
            certBody.fileName = cert.fileName || undefined;
          } else {
            certBody.signatureDataUrl =
              sigCanvasRef.current?.toDataURL("image/png") || "";
            certBody.purchaserAddress = cert.purchaserAddress || undefined;
            certBody.purchaserPhone = phoneDigits || undefined;
            certBody.signerName = form.contactName.trim() || undefined;
            certBody.signerTitle = cert.signerTitle || "Owner";
          }
          const cres = await fetch("/api/wholesale/cert-submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(certBody),
          });
          if (!cres.ok) setCertWarn(true);
        } catch {
          setCertWarn(true);
        }
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
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Application received ✅
            </h1>

            <p className="text-foreground/70 mb-2">
              Thanks — we’ll review your wholesale request and follow up by email.
            </p>

            <p className="text-xs text-foreground/45 mb-8">
              If you don’t see a reply within 1–2 business days, email{" "}
              <a
                href="mailto:support@kimoraco.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                support@kimoraco.com
              </a>
              .
            </p>

            {certWarn ? (
              <p className="text-xs text-amber-300/80 mb-6">
                Heads up — your application saved, but we couldn’t attach your certificate. No worries: we’ll collect it before your first order.
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/wholesale">
                <Button variant="secondary" className="bg-foreground/10 hover:bg-foreground/20 text-foreground">
                  Back to Wholesale
                </Button>
              </Link>

              <Link href="/shop">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider">
                  Shop Retail
                </Button>
              </Link>
            </div>

            <div className="mt-10 rounded-2xl border border-foreground/10 bg-muted p-6 text-left">
              <div className="text-xs uppercase tracking-wider text-foreground/45 mb-2">
                What happens next
              </div>
              <ul className="text-sm text-foreground/75 space-y-2 list-disc pl-5">
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
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Wholesale Application
            </h1>
            <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">
              Built for gyms that take training seriously.
            </p>

            <p className="mt-3 text-sm text-foreground/55 max-w-2xl mx-auto">
              Fill this out and we’ll confirm fit + send wholesale tiers, MOQ, and ordering details.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link href="/wholesale">
                <Button variant="secondary" className="bg-foreground/10 hover:bg-foreground/20 text-foreground">
                  Back
                </Button>
              </Link>
              <Button
                onClick={() => setLocation("/shop")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
              >
                Shop Retail
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 md:p-8">
            {submitError ? (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
                {submitError}
                <div className="mt-2 text-xs text-red-200/80">
                  If you’d rather, email your request to{" "}
                  <a
                    className="underline underline-offset-4 hover:text-foreground"
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
                <Label className="text-sm text-foreground mb-2 block" htmlFor="businessName">
                  Business name <span className="text-foreground/40">*</span>
                </Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  onBlur={() => markTouched("businessName")}
                  className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                  placeholder="e.g., Apex Jiu-Jitsu"
                />
                {showErr("businessName") && !form.businessName.trim() ? (
                  <p className="text-xs text-red-200 mt-2">Business name is required.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-foreground mb-2 block" htmlFor="contactName">
                  Contact name <span className="text-foreground/40">*</span>
                </Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  onBlur={() => markTouched("contactName")}
                  className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                  placeholder="Your name"
                />
                {showErr("contactName") && !form.contactName.trim() ? (
                  <p className="text-xs text-red-200 mt-2">Contact name is required.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-foreground mb-2 block" htmlFor="email">
                  Email <span className="text-foreground/40">*</span>
                </Label>
                <Input
                  id="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                  placeholder="owner@gym.com"
                />
                {showErr("email") && (!emailNormalized || !isValidEmail(emailNormalized)) ? (
                  <p className="text-xs text-red-200 mt-2">Enter a valid email.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-foreground mb-2 block" htmlFor="phone">
                  Phone <span className="text-foreground/40">*</span>
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  onBlur={() => markTouched("phone")}
                  className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                  placeholder="(555) 555-5555"
                />
                {showErr("phone") && (!phoneDigits || phoneDigits.length < 10) ? (
                  <p className="text-xs text-red-200 mt-2">Phone number is required.</p>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-foreground mb-2 block" htmlFor="websiteOrInstagram">
                  Website / Instagram (optional)
                </Label>
                <Input
                  id="websiteOrInstagram"
                  value={form.websiteOrInstagram}
                  onChange={(e) => update("websiteOrInstagram", e.target.value)}
                  className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                  placeholder="https://… or @handle"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-foreground mb-2 block" htmlFor="city">
                    City <span className="text-foreground/40">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    onBlur={() => markTouched("city")}
                    className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                    placeholder="Sedona"
                  />
                  {showErr("city") && !form.city.trim() ? (
                    <p className="text-xs text-red-200 mt-2">City is required.</p>
                  ) : null}
                </div>

                <div>
                  <Label className="text-sm text-foreground mb-2 block" htmlFor="state">
                    State <span className="text-foreground/40">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    onBlur={() => markTouched("state")}
                    className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                    placeholder="AZ"
                  />
                  {showErr("state") && !form.state.trim() ? (
                    <p className="text-xs text-red-200 mt-2">State is required.</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-foreground/10 my-8" />

            {/* Business type + retail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-foreground mb-2">Business type</div>
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
                          ? "border-primary bg-primary/15 text-primary-foreground"
                          : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {form.businessType === "other" ? (
                  <div className="mt-3">
                    <Label className="text-sm text-foreground mb-2 block" htmlFor="businessTypeOther">
                      Please specify <span className="text-foreground/40">*</span>
                    </Label>
                    <Input
                      id="businessTypeOther"
                      value={form.businessTypeOther}
                      onChange={(e) => update("businessTypeOther", e.target.value)}
                      onBlur={() => markTouched("businessTypeOther")}
                      className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                      placeholder="e.g., CrossFit box"
                    />
                    {showErr("businessTypeOther") && !form.businessTypeOther.trim() ? (
                      <p className="text-xs text-red-200 mt-2">This field is required.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <Label className="text-sm text-foreground mb-2 block" htmlFor="memberCount">
                  Approx members / active clients <span className="text-foreground/40">*</span>
                </Label>
                <Input
                  id="memberCount"
                  value={form.memberCount}
                  onChange={(e) => update("memberCount", e.target.value)}
                  onBlur={() => markTouched("memberCount")}
                  className="h-12 bg-background border-foreground/10 text-foreground placeholder:text-foreground/40"
                  placeholder="e.g., 150"
                />
                {showErr("memberCount") &&
                (!Number.isFinite(memberCountNum) || memberCountNum < 1) ? (
                  <p className="text-xs text-red-200 mt-2">Approx member count is required.</p>
                ) : null}

                <div className="mt-4 text-sm text-foreground mb-2">Retail setup</div>
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
                          ? "border-primary bg-primary/15 text-primary-foreground"
                          : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-foreground/10 my-8" />

            {/* Interested in */}
            <div>
              <div className="text-sm text-foreground mb-3">Interested in</div>
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
                      ? "border-primary bg-primary/15 text-primary-foreground"
                      : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                  ].join(" ")}
                >
                  <div className="font-semibold">On-shelf wholesale</div>
                  <div className="text-xs text-foreground/60 mt-1">Stock Kimora in your gym</div>
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
                      ? "border-primary bg-primary/15 text-primary-foreground"
                      : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                  ].join(" ")}
                >
                  <div className="font-semibold">Coach / affiliate</div>
                  <div className="text-xs text-foreground/60 mt-1">Coaches promote to members</div>
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
                      ? "border-primary bg-primary/15 text-primary-foreground"
                      : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                  ].join(" ")}
                >
                  <div className="font-semibold">Events / sponsorship</div>
                  <div className="text-xs text-foreground/60 mt-1">Tournament + gym events</div>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-8">
              <Label className="text-sm text-foreground mb-2 block" htmlFor="notes">
                Notes (optional)
              </Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="w-full min-h-[120px] rounded-xl bg-background border border-foreground/10 text-foreground p-4 placeholder:text-foreground/40"
                placeholder="Tell us about your gym, your members, and how you plan to sell Kimora…"
              />
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-foreground/10 my-8" />

            {/* Resale certificate (optional) */}
            <div>
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-foreground font-semibold">Resale certificate</div>
                <div className="text-xs text-foreground/45">Optional</div>
              </div>
              <p className="mt-1 text-sm text-foreground/60">
                Add your Arizona resale / TPT certificate to buy wholesale tax-free. No cert yet?
                Skip it — we’ll collect it before your first order.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  ["none", "Skip for now"],
                  ["upload", "Upload my cert"],
                  ["form", "Fill & sign a 5000A"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setCertError(null);
                      setCertMode(value as "none" | "upload" | "form");
                    }}
                    className={[
                      "rounded-xl border px-3 py-3 text-sm transition-colors",
                      certMode === value
                        ? "border-primary bg-primary/15 text-primary-foreground"
                        : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {certMode === "upload" ? (
                <div className="mt-4">
                  <Label className="text-sm text-foreground mb-2 block" htmlFor="certFile">
                    Certificate file (JPG, PNG, or PDF)
                  </Label>
                  <input
                    id="certFile"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => onCertFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-foreground/70 file:mr-4 file:rounded-lg file:border-0 file:bg-foreground/10 file:px-4 file:py-2 file:text-foreground hover:file:bg-foreground/20"
                  />
                  {cert.fileName ? (
                    <p className="mt-2 text-xs text-foreground/60">Attached: {cert.fileName}</p>
                  ) : null}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-foreground/70 mb-1 block" htmlFor="certLicU">
                        License / TPT # (optional)
                      </Label>
                      <Input
                        id="certLicU"
                        value={cert.licenseNumber}
                        onChange={(e) => updateCert("licenseNumber", e.target.value)}
                        className="h-11 bg-background border-foreground/10 text-foreground"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-foreground/70 mb-1 block" htmlFor="certStU">
                        Issuing state
                      </Label>
                      <Input
                        id="certStU"
                        value={cert.issuingState}
                        onChange={(e) => updateCert("issuingState", e.target.value)}
                        className="h-11 bg-background border-foreground/10 text-foreground"
                        placeholder="AZ"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {certMode === "form" ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-foreground/70 mb-1 block" htmlFor="certLic">
                        Resale / TPT license # <span className="text-foreground/40">*</span>
                      </Label>
                      <Input
                        id="certLic"
                        value={cert.licenseNumber}
                        onChange={(e) => updateCert("licenseNumber", e.target.value)}
                        className="h-11 bg-background border-foreground/10 text-foreground"
                        placeholder="AZ TPT license number"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-foreground/70 mb-1 block" htmlFor="certSt">
                        Issuing state
                      </Label>
                      <Input
                        id="certSt"
                        value={cert.issuingState}
                        onChange={(e) => updateCert("issuingState", e.target.value)}
                        className="h-11 bg-background border-foreground/10 text-foreground"
                        placeholder="AZ"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs text-foreground/70 mb-1 block" htmlFor="certAddr">
                        Business address
                      </Label>
                      <Input
                        id="certAddr"
                        value={cert.purchaserAddress}
                        onChange={(e) => updateCert("purchaserAddress", e.target.value)}
                        className="h-11 bg-background border-foreground/10 text-foreground"
                        placeholder="Street, City, State ZIP"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["az_5000a", "Arizona (single state)"],
                      ["mtc", "Multistate (MTC)"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateCert("certType", value as "az_5000a" | "mtc")}
                        className={[
                          "rounded-xl border px-3 py-2.5 text-sm transition-colors",
                          cert.certType === value
                            ? "border-primary bg-primary/15 text-primary-foreground"
                            : "border-foreground/10 bg-muted text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-foreground/70">
                        Signature <span className="text-foreground/40">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={sigClear}
                        className="text-xs text-foreground/50 underline underline-offset-4 hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <canvas
                      ref={sigCanvasRef}
                      width={600}
                      height={180}
                      onPointerDown={sigStart}
                      onPointerMove={sigMove}
                      onPointerUp={sigEnd}
                      onPointerLeave={sigEnd}
                      className="w-full h-[160px] rounded-xl border border-foreground/15 bg-background touch-none"
                    />
                    <p className="mt-1 text-xs text-foreground/45">
                      Sign with your finger or mouse. By signing you certify the information above is
                      accurate and the products are purchased for resale.
                    </p>
                  </div>
                </div>
              ) : null}

              {certError ? <p className="mt-3 text-xs text-red-200">{certError}</p> : null}
            </div>

            {/* Submit */}
            <div className="mt-8 flex flex-col gap-3">
              <Button
                onClick={submit}
                disabled={!requiredOk || submitting}
                className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </Button>

              <Button
                variant="secondary"
                className="h-12 bg-foreground/10 hover:bg-foreground/20 text-foreground"
                onClick={() => setLocation("/wholesale")}
                disabled={submitting}
              >
                Back to Wholesale
              </Button>

              <p className="text-xs text-foreground/45 text-center">
                Prefer email? Send your request to{" "}
                <a
                  href="mailto:alex@kimoraco.com"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  alex@kimoraco.com
                </a>
                .
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-foreground/40">
            By applying, you agree to respect MAP/MSRP guidelines and in-gym retail positioning.
            Wholesale details are provided after approval.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
