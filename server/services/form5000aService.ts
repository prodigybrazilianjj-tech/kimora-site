// server/services/form5000aService.ts
//
// Generates a completed Arizona Form 5000A (Resale Certificate) PDF from
// structured fields + a captured fingertip/stylus signature. Used by the
// self-serve wholesale portal so a gym without a cert on hand can fill and
// sign one during onboarding.
//
// This renders a clean, complete resale certificate containing every element
// ADOR's 5000A requires (purchaser + vendor identity, TPT/resale license,
// reason = resale, description of property, certification language, signature,
// printed name, title, date). It is a substitute rendition — not a pixel copy
// of the ADOR PDF. Verification of the buyer's TPT license stays a separate,
// manual step; a stored cert is never auto-treated as verified.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type Form5000AInput = {
  purchaserName: string; // gym / academy legal name
  purchaserAddress?: string; // street, city, state, zip (single line is fine)
  purchaserPhone?: string;
  licenseNumber?: string; // AZ TPT / resale license #
  issuingState?: string; // default AZ
  certType?: string; // "az_5000a" (single state) | "mtc" (multistate)
  description?: string; // property purchased
  signerName: string; // printed name of the signer
  signerTitle?: string; // e.g., Owner
  signatureDataUrl: string; // "data:image/png;base64,...." (PNG)
  signedDate?: string; // display date; caller supplies (sandbox has no clock)
};

const INK = rgb(0.10, 0.08, 0.07);
const GRAY = rgb(0.45, 0.42, 0.40);
const LINE = rgb(0.75, 0.72, 0.70);

export async function generateForm5000APdf(input: Form5000AInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 612;
  const M = 54;

  const draw = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    f = font,
    color = INK,
  ) => page.drawText(s || "", { x, y: yy, size, font: f, color });

  const hline = (x1: number, x2: number, yy: number, thickness = 0.5) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color: LINE });

  let y = 792 - 60;

  // Header
  draw("ARIZONA FORM 5000A", M, y, 15, bold);
  draw("Arizona Resale Certificate", M, y - 18, 11, font, GRAY);
  y -= 42;
  hline(M, W - M, y, 1);
  y -= 24;

  // Reason + certificate type
  draw("Reason for exemption:", M, y, 10, bold);
  draw(
    "Tangible personal property purchased for resale in the ordinary course of business.",
    M + 135,
    y,
    9.5,
  );
  y -= 24;

  const isMtc = String(input.certType || "").toLowerCase() === "mtc";
  draw("Certificate type:", M, y, 10, bold);
  draw(
    isMtc
      ? "Multistate (uniform / MTC) resale certificate"
      : "Arizona single-state resale certificate (Form 5000A)",
    M + 135,
    y,
    9.5,
  );
  y -= 32;

  // Field helper
  const field = (label: string, value: string) => {
    draw(label, M, y, 9, font, GRAY);
    draw(value || "—", M + 165, y, 10, bold);
    hline(M + 160, W - M, y - 3);
    y -= 24;
  };

  // Purchaser
  draw("PURCHASER (RESELLER)", M, y, 10, bold);
  y -= 18;
  field("Business name", input.purchaserName);
  field("Business address", input.purchaserAddress || "");
  field("Phone", input.purchaserPhone || "");
  field("State TPT / resale license #", input.licenseNumber || "");
  field("Issuing state", (input.issuingState || "AZ").toUpperCase());
  y -= 8;

  // Vendor
  draw("VENDOR (SELLER)", M, y, 10, bold);
  y -= 18;
  field("Vendor name", "Kimora Co. LLC");
  field(
    "Description of property",
    input.description ||
      "Dietary supplement drink-mix stick packs (creatine + electrolytes)",
  );
  y -= 10;

  // Certification language
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

  // Signature image (left) + printed name / title / date (right)
  const rightX = M + 268;
  try {
    const b64 = String(input.signatureDataUrl || "").replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    if (b64) {
      const png = await doc.embedPng(b64);
      const maxW = 200;
      const maxH = 58;
      const scale = Math.min(maxW / png.width, maxH / png.height, 1);
      page.drawImage(png, {
        x: M,
        y: y - maxH + 6,
        width: png.width * scale,
        height: png.height * scale,
      });
    }
  } catch {
    // If the signature can't be embedded, leave the signature line blank.
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

  // Footer
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
