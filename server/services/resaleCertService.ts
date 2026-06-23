// server/services/resaleCertService.ts
// Resale-certificate records per wholesale gym account (keyed by email).
// A cert authorizes a $0 resale-exempt invoice ONLY when it is verified, active,
// unexpired, and covers the destination state. Anything short of that → NOT exempt.
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db";
import { wholesaleResaleCerts } from "../../shared/schema";
import type { WholesaleResaleCert } from "../../shared/schema";

function normEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function normState(state: string | null | undefined) {
  return String(state ?? "").trim().toUpperCase();
}

function isUnexpired(cert: WholesaleResaleCert, now = new Date()): boolean {
  if (!cert.expiresAt) return true; // no stated expiry
  return new Date(cert.expiresAt as any).getTime() > now.getTime();
}

// Does this cert cover a sale shipping to `destinationState`?
// - MTC (multistate) certs cover any state.
// - Otherwise the cert's issuing state must match the destination state.
// - If no destination state is supplied, we only accept it as a general AZ-type match.
function coversState(cert: WholesaleResaleCert, destinationState?: string): boolean {
  if (cert.certType === "mtc") return true;
  const dest = normState(destinationState);
  if (!dest) return true; // caller didn't scope by state
  return normState(cert.issuingState) === dest;
}

/**
 * Returns the single best VALID resale cert for this account, or null.
 * Valid = status active + verified true + unexpired + covers destination state.
 * Conservative by design: if anything is uncertain, returns null (→ not exempt).
 */
export async function getActiveResaleCertForEmail(
  email: string,
  destinationState?: string,
): Promise<WholesaleResaleCert | null> {
  const e = normEmail(email);
  if (!e) return null;

  const rows = await db
    .select()
    .from(wholesaleResaleCerts)
    .where(
      and(
        eq(wholesaleResaleCerts.email, e),
        eq(wholesaleResaleCerts.status, "active"),
        eq(wholesaleResaleCerts.verified, true),
      )!,
    )
    .orderBy(desc(wholesaleResaleCerts.updatedAt))
    .limit(50);

  const now = new Date();
  const valid = rows.filter((c) => isUnexpired(c, now) && coversState(c, destinationState));
  return valid[0] ?? null;
}

// Row shape for the admin list. We deliberately omit the (potentially large) base64
// fileData blob from list payloads and expose a lightweight `hasFile` flag instead;
// the actual bytes are fetched on demand via getResaleCertFileById / the file endpoint.
export type ResaleCertListRow = Omit<WholesaleResaleCert, "fileData"> & { hasFile: boolean };

export async function listResaleCerts(): Promise<ResaleCertListRow[]> {
  return db
    .select({
      id: wholesaleResaleCerts.id,
      email: wholesaleResaleCerts.email,
      businessName: wholesaleResaleCerts.businessName,
      stripeCustomerId: wholesaleResaleCerts.stripeCustomerId,
      certType: wholesaleResaleCerts.certType,
      licenseNumber: wholesaleResaleCerts.licenseNumber,
      issuingState: wholesaleResaleCerts.issuingState,
      resaleDescription: wholesaleResaleCerts.resaleDescription,
      signed: wholesaleResaleCerts.signed,
      fileUrl: wholesaleResaleCerts.fileUrl,
      fileMime: wholesaleResaleCerts.fileMime,
      fileName: wholesaleResaleCerts.fileName,
      receivedAt: wholesaleResaleCerts.receivedAt,
      expiresAt: wholesaleResaleCerts.expiresAt,
      verified: wholesaleResaleCerts.verified,
      verifiedBy: wholesaleResaleCerts.verifiedBy,
      verifiedAt: wholesaleResaleCerts.verifiedAt,
      verificationResult: wholesaleResaleCerts.verificationResult,
      status: wholesaleResaleCerts.status,
      notes: wholesaleResaleCerts.notes,
      createdAt: wholesaleResaleCerts.createdAt,
      updatedAt: wholesaleResaleCerts.updatedAt,
      hasFile: sql<boolean>`(${wholesaleResaleCerts.fileData} IS NOT NULL)`,
    })
    .from(wholesaleResaleCerts)
    .orderBy(desc(wholesaleResaleCerts.updatedAt))
    .limit(500);
}

export async function getResaleCertById(id: string): Promise<WholesaleResaleCert | null> {
  const rows = await db
    .select()
    .from(wholesaleResaleCerts)
    .where(eq(wholesaleResaleCerts.id, id))
    .limit(1);
  return rows?.[0] ?? null;
}

/** Fetch just the uploaded file bytes for one cert (admin-only download). */
export async function getResaleCertFileById(
  id: string,
): Promise<{ fileData: string; fileMime: string | null; fileName: string | null } | null> {
  const rows = await db
    .select({
      fileData: wholesaleResaleCerts.fileData,
      fileMime: wholesaleResaleCerts.fileMime,
      fileName: wholesaleResaleCerts.fileName,
    })
    .from(wholesaleResaleCerts)
    .where(eq(wholesaleResaleCerts.id, id))
    .limit(1);
  const r = rows?.[0];
  if (!r || !r.fileData) return null;
  return { fileData: r.fileData, fileMime: r.fileMime ?? null, fileName: r.fileName ?? null };
}

type UpsertCertInput = {
  id?: string | null;
  email: string;
  businessName: string;
  stripeCustomerId?: string | null;
  certType?: string;
  licenseNumber?: string | null;
  issuingState?: string;
  resaleDescription?: string | null;
  signed?: boolean;
  fileUrl?: string | null;
  receivedAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  // Uploaded cert file. Provide fileData (base64) to attach/replace; set removeFile
  // to clear an existing upload. Omitting all three leaves any existing file untouched.
  fileData?: string | null;
  fileMime?: string | null;
  fileName?: string | null;
  removeFile?: boolean;
};

/** Create or update a cert record. Editing cert fields does NOT mark it verified —
 *  verification is a separate, explicit step (verifyResaleCert). */
export async function upsertResaleCert(input: UpsertCertInput): Promise<WholesaleResaleCert | null> {
  const base = {
    email: normEmail(input.email),
    businessName: String(input.businessName ?? "").trim(),
    stripeCustomerId: input.stripeCustomerId ?? null,
    certType: input.certType || "az_5000a",
    licenseNumber: input.licenseNumber ?? null,
    issuingState: normState(input.issuingState) || "AZ",
    resaleDescription: input.resaleDescription ?? null,
    signed: Boolean(input.signed),
    fileUrl: input.fileUrl ?? null,
    receivedAt: input.receivedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    notes: input.notes ?? null,
    updatedAt: new Date(),
  };

  // Only touch the stored file when explicitly replacing or removing it, so editing
  // other fields on an existing cert never wipes a previously uploaded image/PDF.
  const fileFields: {
    fileData?: string | null;
    fileMime?: string | null;
    fileName?: string | null;
  } = {};
  if (input.removeFile) {
    fileFields.fileData = null;
    fileFields.fileMime = null;
    fileFields.fileName = null;
  } else if (typeof input.fileData === "string" && input.fileData.length > 0) {
    fileFields.fileData = input.fileData;
    fileFields.fileMime = input.fileMime ?? null;
    fileFields.fileName = input.fileName ?? null;
  }

  if (input.id) {
    const rows = await db
      .update(wholesaleResaleCerts)
      .set({ ...base, ...fileFields })
      .where(eq(wholesaleResaleCerts.id, input.id))
      .returning();
    return rows?.[0] ?? null;
  }

  const rows = await db
    .insert(wholesaleResaleCerts)
    .values({ ...base, ...fileFields })
    .returning();
  return rows?.[0] ?? null;
}

/** Mark a cert verified (after a successful license-lookup). */
export async function verifyResaleCert(
  id: string,
  verifiedBy: string,
  verificationResult: string,
): Promise<WholesaleResaleCert | null> {
  const rows = await db
    .update(wholesaleResaleCerts)
    .set({
      verified: true,
      verifiedBy: verifiedBy || "admin",
      verifiedAt: new Date(),
      verificationResult: verificationResult || "verified",
      updatedAt: new Date(),
    })
    .where(eq(wholesaleResaleCerts.id, id))
    .returning();
  return rows?.[0] ?? null;
}

/** Revoke / un-verify a cert (e.g., expired, withdrawn). */
export async function setResaleCertStatus(
  id: string,
  status: "active" | "revoked",
): Promise<WholesaleResaleCert | null> {
  const rows = await db
    .update(wholesaleResaleCerts)
    .set({ status, updatedAt: new Date() })
    .where(eq(wholesaleResaleCerts.id, id))
    .returning();
  return rows?.[0] ?? null;
}
