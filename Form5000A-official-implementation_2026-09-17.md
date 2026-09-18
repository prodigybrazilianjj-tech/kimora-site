# Official ADOR Form 5000A in wholesale onboarding — 2026-09-17

**What changed:** the "Fill & sign a 5000A" path on `/wholesale/apply` now fills the REAL fillable ADOR form (ADOR 10316, rev. **8/25** — current on azdor.gov as of 9/17/2026) instead of drawing a substitute rendition. The substitute renderer is kept as a fallback (asset missing, fill error, or certType `mtc`).

## Files
- `server/assets/AZ5000A.pdf` — NEW. Clean ADOR download (rev 8/25, https://azdor.gov/sites/default/files/2023-03/FORMS_TPT_5000A_10316_0.pdf). The generator still clears every field before filling, so an older/pre-filled copy would also be safe.
- `server/services/form5000aService.ts` — REWRITTEN. `generateForm5000APdf()` → `fillOfficialForm()`: loads the asset, clears all fields, removes the Print/Reset buttons, fills fields 1–14 + `chk.b2` (period certificate), stamps the signature PNG/JPEG on the signature line (x 42, y 45, max 270×30 pt), adds a small provenance footer, `form.flatten()`. Exports `CERT_PERIOD_MONTHS = 12`, `VENDOR_NAME`, `DEFAULT_DESCRIPTION`, `DEFAULT_NATURE_OF_BUSINESS`, and `generateSubstitute5000APdf()` (old renderer). Asset path mirrors `toolRoutes.ts`: `__dirname/assets` in production, `server/assets` in dev.
- `server/routes/wholesaleRoutes.ts` — `POST /api/wholesale/cert-submit` form mode: passes city/state/zip/natureOfBusiness + the applicant email (form's Business Email line); period = today → +12 months; **if the client sent no `expiresAt`, expiresAt = the period "through" date**, so the tax gate stops honoring the cert automatically when the form period ends.
- `client/src/pages/Wholesaleapply.tsx` — cert form: "Business address" → "Street address" + new "ZIP code" input; city/state reuse the application's own fields; `natureOfBusinessFor(form)` fills Section C from `businessType`.
- `script/build.ts` — copies `server/assets` → `dist/assets` next to the bundle (same as `server/tools`).

## Field map (ADOR names, rev 8/25)
1 name · 2 TPT # · 3 street · 4 city · 5 state · 6 zip · **7 business email · 8 business phone · 9 vendor** ("Kimora Co. LLC") · chk.b1 single / chk.b2 period · **B.1 from · B.2 through** · 10 nature of business · 11 description · chk.1–6 Section E (never checked) · 12 printed name · 13 title · 14 date. Signature line is NOT a field — image stamped at x 42 / y 45.

⚠️ Rev 5/17 had 7 = vendor, 8/9 = period dates, no email/phone. If ADOR revises again, re-dump the field names (pypdf `get_fields()`) before swapping the asset.

## Verified (container, tsx + pdf-lib 1.17)
Filled render looks correct; 0 form fields remain after flatten; Print/Reset buttons gone. Syntax-checked all three TS files with esbuild. **NOT typechecked** (`tsc` exceeds the cowork shell limit on the mounted FS).

## Alex's handoff
1. `npm run check`
2. Local smoke test: apply as a gym, choose "Fill & sign a 5000A", open the stored PDF in `/tools/wholesale-certs`.
3. Commit + push + deploy on Render. Confirm `dist/assets/AZ5000A.pdf` exists after build.
4. Ask the accountant whether an on-screen signature on the 5000A is acceptable for good-faith acceptance.
