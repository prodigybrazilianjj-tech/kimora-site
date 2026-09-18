// server/services/form5000aService.ts
//
// Generates a completed Arizona Form 5000A (Resale Certificate) by filling the
// REAL ADOR fillable PDF (server/assets/AZ5000A.pdf, ADOR 10316 rev. 8/25) and
// stamping the captured fingertip/stylus signature onto the signature line.
// Field map below is for ADOR 10316 rev. 8/25 (the 5/17 revision used 7 =
// vendor, 8/9 = period dates and had no email/phone fields).
// Used by the self-serve wholesale portal so a gym without a cert on hand can
// fill and sign one during onboarding.
//
// Verification of the buyer's TPT license stays a separate, manual step; a
// stored cert is never auto-treated as verified.
//
// If the ADOR asset is missing or can't be filled (or certType is "mtc", which
// the AZ form does not cover), we fall back to the older substitute rendition
// so onboarding never breaks.
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type Form5000AInput = {
  purchaserName: string; // gym / academy legal name
  purchaserAddress?: string; // street (or full single line — parsed if city/state/zip are absent)
  purchaserCity?: string;
  purchaserState?: string;
  purchaserZip?: string;
  purchaserPhone?: string;
  purchaserEmail?: string;
  licenseNumber?: string; // AZ TPT / resale license #
  issuingState?: string; // default AZ
  certType?: string; // "az_5000a" (single state) | "mtc" (multistate)
  natureOfBusiness?: string; // Section C
  description?: string; // Section D — property purchased
  signerName: string; // printed name of the signer
  signerTitle?: string; // e.g., Owner
  signatureDataUrl: string; // "data:image/png;base64,...." (PNG or JPEG)
  signedDate?: string; // display date; caller supplies (sandbox has no clock)
  periodFrom?: string; // Section B period — defaults to signedDate
  periodThrough?: string; // defaults to 12 months after periodFrom
};

export const VENDOR_NAME = "Kimora Co. LLC";
export const DEFAULT_DESCRIPTION =
  "Dietary supplement drink-mix stick packs (creatine + electrolytes) purchased for resale";
export const DEFAULT_NATURE_OF_BUSINESS =
  "Martial arts / fitness gym — retail sales of supplements and merchandise to members";

/** Certificate validity period the site defaults to (ADOR encourages ≤ 12 months). */
export const CERT_PERIOD_MONTHS = 12;

// ── ADOR field map (names as they exist in the fillable PDF) ────────────────
// Text fields
const F_NAME = "1";
const F_LICENSE = "2";
const F_ADDRESS = "3";
const F_CITY = "4";
const F_STATE = "5";
const F_ZIP = "6";
const F_EMAIL = "7"; // Business Email (optional)
const F_PHONE = "8"; // Business Telephone Number (optional)
const F_VENDOR = "9";
const F_PERIOD_FROM = "B.1";
const F_PERIOD_THROUGH = "B.2";
const F_NATURE = "10";
const F_DESCRIPTION = "11";
const F_PRINT_NAME = "12";
const F_TITLE = "13";
const F_DATE = "14";
// Checkboxes
const CB_SINGLE = "chk.b1";
const CB_PERIOD = "chk.b2";
const CB_SECTION_E = ["chk.1", "chk.2", "chk.3", "chk.4", "chk.5", "chk.6"];
// Interactive buttons baked into ADOR's file — removed so they don't print.
const BUTTONS = ["cmdPrintForm", "cmdResetForm"];

// Signature line geometry (PDF points, origin bottom-left, US Letter 612×792).
// "SIGNATURE OF PURCHASER" caption sits at y≈39; the rule runs x 37→330.
const SIG_X = 42;
const SIG_Y = 45;
const SIG_MAX_W = 270;
const SIG_MAX_H = 30;

/**
 * Where the ADOR PDF lives at runtime (same pattern as server/routes/toolRoutes.ts):
 * - prod: esbuild bundles the server to dist/index.cjs and script/build.ts
 *   copies server/assets → dist/assets, next to the bundle.
 * - dev: run straight from the repo.
 */
function assetPath(): string {
  if (process.env.NODE_ENV === "production") {
    return path.resolve(__dirname, "assets", "AZ5000A.pdf");
  }
  return path.resolve(process.cwd(), "server", "assets", "AZ5000A.pdf");
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + months);
  return out;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Best-effort split of a single-line "Street, City, ST 85336" address. */
function splitAddress(line: string): { street: string; city: string; state: string; zip: string } {
  const s = String(line || "").trim();
  const m = s.match(/^(.*?),\s*([^,]+?),?\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (m) return { street: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), zip: m[4] };
  return { street: s, city: "", state: "", zip: "" };
}

function formatPhone(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return formatPhone(d.slice(1));
  return String(raw || "").trim();
}

function stripDataUrl(sig: string): { b64: string; isJpeg: boolean } {
  const m = String(sig || "").match(/^data:image\/(png|jpeg|jpg);base64,([\s\S]*)$/);
  if (!m) return { b64: "", isJpeg: false };
  return { b64: m[2], isJpeg: m[1] !== "png" };
}

export async function generateForm5000APdf(input: Form5000AInput): Promise<Uint8Array> {
  const isMtc = String(input.certType || "").toLowerCase() === "mtc";
  if (!isMtc) {
    try {
      return await fillOfficialForm(input);
    } catch (err) {
      console.error("form5000aService: official ADOR fill failed, using substitute:", (err as any)?.message ?? err);
    }
  }
  return await generateSubstitute5000APdf(input);
}

// ── Official ADOR form ──────────────────────────────────────────────────────
async function fillOfficialForm(input: Form5000AInput): Promise<Uint8Array> {
  const bytes = fs.readFileSync(assetPath());
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const setText = (name: string, value: string, size?: number) => {
    const f = form.getTextField(name);
    if (size) f.setFontSize(size);
    f.setText(String(value ?? ""));
  };

  // ADOR's copy ships with example values in some fields — clear everything first.
  for (const f of form.getFields()) {
    const n = f.getName();
    if (BUTTONS.includes(n)) continue;
    try {
      if (n.startsWith("chk")) form.getCheckBox(n).uncheck();
      else form.getTextField(n).setText("");
    } catch {
      /* ignore parent/unknown fields */
    }
  }
  for (const n of BUTTONS) {
    try {
      form.removeField(form.getField(n));
    } catch {
      /* already gone */
    }
  }

  // Section A — purchaser
  const parsed = splitAddress(input.purchaserAddress || "");
  const street = input.purchaserCity || input.purchaserZip ? String(input.purchaserAddress || "").trim() : parsed.street;
  const city = (input.purchaserCity || parsed.city || "").trim();
  const state = (input.purchaserState || parsed.state || input.issuingState || "AZ").trim().toUpperCase();
  const zip = (input.purchaserZip || parsed.zip || "").trim();

  setText(F_NAME, input.purchaserName, 9);
  setText(F_LICENSE, input.licenseNumber || "", 9);
  setText(F_ADDRESS, street, 9);
  setText(F_CITY, city, 9);
  setText(F_STATE, state, 9);
  setText(F_ZIP, zip, 9);
  setText(F_EMAIL, input.purchaserEmail || "", 9);
  setText(F_PHONE, formatPhone(input.purchaserPhone || ""), 9);
  setText(F_VENDOR, VENDOR_NAME, 9);

  // Section B — period certificate (ADOR encourages ≤ 12 months)
  const signed = input.signedDate ? new Date(input.signedDate) : new Date();
  const from = input.periodFrom ? new Date(input.periodFrom) : signed;
  const through = input.periodThrough ? new Date(input.periodThrough) : addMonths(from, CERT_PERIOD_MONTHS);
  form.getCheckBox(CB_SINGLE).uncheck();
  form.getCheckBox(CB_PERIOD).check();
  setText(F_PERIOD_FROM, fmtDate(from), 8);
  setText(F_PERIOD_THROUGH, fmtDate(through), 8);

  // Sections C + D
  setText(F_NATURE, input.natureOfBusiness || DEFAULT_NATURE_OF_BUSINESS, 9);
  setText(F_DESCRIPTION, input.description || DEFAULT_DESCRIPTION, 9);

  // Section E — TPT-license-exempt buyers; never applies to a licensed gym.
  for (const n of CB_SECTION_E) form.getCheckBox(n).uncheck();

  // Section F — certification
  setText(F_PRINT_NAME, input.signerName || input.purchaserName, 9);
  setText(F_TITLE, input.signerTitle || "Owner", 8);
  setText(F_DATE, input.signedDate || fmtDate(signed), 8);

  form.updateFieldAppearances(font);

  // Signature image on the signature line.
  const page = doc.getPages()[0];
  const { b64, isJpeg } = stripDataUrl(input.signatureDataUrl);
  if (b64) {
    const img = isJpeg ? await doc.embedJpg(b64) : await doc.embedPng(b64);
    const scale = Math.min(SIG_MAX_W / img.width, SIG_MAX_H / img.height, 1);
    page.drawImage(img, {
      x: SIG_X,
      y: SIG_Y,
      width: img.width * scale,
      height: img.height * scale,
    });
  }

  // Provenance footer (small, outside ADOR's layout, left of the form number).
  page.drawText(
    `Completed via kimoraco.com wholesale onboarding · ${input.signedDate || fmtDate(signed)} · pending vendor verification of TPT license`,
    { x: 150, y: 27, size: 6.5, font, color: rgb(0.45, 0.42, 0.4) },
  );

  // Lock it: fields become static content.
  form.flatten();

  doc.setTitle("Arizona Form 5000A — Resale Certificate");
  doc.setProducer("kimoraco.com wholesale onboarding");
  return await doc.save();
}

// ── Substitute rendition (fallback) ─────────────────────────────────────────
const INK = rgb(0.10, 0.08, 0.07);
const GRAY = rgb(0.45, 0.42, 0.40);
const LINE = rgb(0.75, 0.72, 0.70);

export async function generateSubstitute5000APdf(input: Form5000AInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 612;
  const M = 54;

  const draw = (s: string, x: number, yy: number, size = 10, f = font, color = INK) =>
    page.drawText(s || "", { x, y: yy, size, font: f, color });

  const hline = (x1: number, x2: number, yy: number, thickness = 0.5) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color: LINE });

  let y = 792 - 60;

  draw("ARIZONA FORM 5000A", M, y, 15, bold);
  draw("Arizona Resale Certificate", M, y - 18, 11, font, GRAY);
  y -= 42;
  hline(M, W - M, y, 1);
  y -= 24;

  draw("Reason for exemption:", M, y, 10, bold);
  draw("Tangible personal property purchased for resale in the ordinary course of business.", M + 135, y, 9.5);
  y -= 24;

  const isMtc = String(input.certType || "").toLowerCase() === "mtc";
  draw("Certificate type:", M, y, 10, bold);
  draw(
    isMtc ? "Multistate (uniform / MTC) resale certificate" : "Arizona single-state resale certificate (Form 5000A)",
    M + 135,
    y,
    9.5,
  );
  y -= 32;

  const field = (label: string, value: string) => {
    draw(label, M, y, 9, font, GRAY);
    draw(value || "—", M + 165, y, 10, bold);
    hline(M + 160, W - M, y - 3);
    y -= 24;
  };

  const addr = [input.purchaserAddress, input.purchaserCity, [input.purchaserState, input.purchaserZip].filter(Boolean).join(" ")]
    .filter((s) => s && String(s).trim())
    .join(", ");

  draw("PURCHASER (RESELLER)", M, y, 10, bold);
  y -= 18;
  field("Business name", input.purchaserName);
  field("Business address", addr);
  field("Phone", input.purchaserPhone || "");
  field("State TPT / resale license #", input.licenseNumber || "");
  field("Issuing state", (input.issuingState || "AZ").toUpperCase());
  y -= 8;

  draw("VENDOR (SELLER)", M, y, 10, bold);
  y -= 18;
  field("Vendor name", VENDOR_NAME);
  field("Nature of business", input.natureOfBusiness || DEFAULT_NATURE_OF_BUSINESS);
  field("Description of property", input.description || DEFAULT_DESCRIPTION);
  y -= 10;

  draw("CERTIFICATION", M, y, 10, bold);
  y -= 16;
  const certLines = [
    "The undersigned purchaser certifies that the tangible personal property described above is",
    "purchased for resale in the ordinary course of business, and that the purchaser holds a valid",
    "transaction privilege / resale license in the state indicated above. The purchaser understands",
    "that misuse of this certificate may subject the purchaser to tax, penalties, and interest, and",
    "agrees to be liable for any tax due if the property is put to a non-exempt use.",
  ];
  for (const line of certLines) {
    draw(line, M, y, 9.5, font, INK);
    y -= 14;
  }
  y -= 22;

  const rightX = M + 268;
  try {
    const { b64, isJpeg } = stripDataUrl(input.signatureDataUrl);
    if (b64) {
      const img = isJpeg ? await doc.embedJpg(b64) : await doc.embedPng(b64);
      const maxW = 200;
      const maxH = 58;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      page.drawImage(img, { x: M, y: y - maxH + 6, width: img.width * scale, height: img.height * scale });
    }
  } catch {
    /* leave the signature line blank */
  }
  hline(M, M + 236, y - 62, 0.7);
  draw("Authorized signature", M, y - 76, 8.5, font, GRAY);

  draw(input.signerName || "", rightX, y - 6, 10, bold);
  hline(rightX, W - M, y - 9);
  draw("Printed name", rightX, y - 21, 8.5, font, GRAY);

  draw(input.signerTitle || "Owner", rightX, y - 40, 10, bold);
  hline(rightX, W - M, y - 43);
  draw("Title", rightX, y - 55, 8.5, font, GRAY);

  draw(input.signedDate || "", rightX, y - 74, 10, bold);
  hline(rightX, W - M, y - 77);
  draw("Date", rightX, y - 89, 8.5, font, GRAY);

  draw(
    "Completed via kimoraco.com wholesale onboarding · Substitute Arizona Form 5000A rendition · pending vendor verification of the purchaser's TPT license.",
    M,
    46,
    7.5,
    font,
    GRAY,
  );

  return await doc.save();
}
