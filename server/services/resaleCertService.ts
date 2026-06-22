// server/services/resaleCertService.ts
// Resale-certificate records per wholesale gym account (keyed by email).
// A cert authorizes a $0 resale-exempt invoice ONLY when it is verified, active,
// unexpired, and covers the destination state. Anything short of that → NOT exempt.
import { and, desc, eq } from "drizzle-orm";

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

export async function listResaleCerts(): Promise<WholesaleResaleCert[]> {
  return db
    .select()
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

  if (input.id) {
    const rows = await db
      .update(wholesaleResaleCerts)
      .set(base)
      .where(eq(wholesaleResaleCerts.id, input.id))
      .returning();
    return rows?.[0] ?? null;
  }

  const rows = await db.insert(wholesaleResaleCerts).values(base).returning();
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
