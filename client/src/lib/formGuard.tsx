// client/src/lib/formGuard.tsx
//
// Client half of the signup bot defense. The server half — and the reasoning —
// lives in server/botGuard.ts. Both halves must agree on these field names.

import { useRef, useState } from "react";

/**
 * Honeypot field name. Must match HONEYPOT_FIELD in server/botGuard.ts.
 *
 * Not "company"/"website"/"phone" on purpose: browsers autofill those, and an
 * autofilled honeypot would silently drop a real signup.
 */
export const HONEYPOT_FIELD = "contact_reason";

/** Must match FORM_TIMESTAMP_FIELD in server/botGuard.ts. */
export const FORM_TIMESTAMP_FIELD = "formLoadedAt";

export type FormGuard = {
  /** Spread into the JSON body of the submit request. */
  payload: Record<string, unknown>;
  honeypot: string;
  setHoneypot: (value: string) => void;
};

export function useFormGuard(): FormGuard {
  // Captured once at mount — the moment the human first saw the form.
  const loadedAt = useRef(Date.now());
  const [honeypot, setHoneypot] = useState("");

  return {
    payload: {
      [HONEYPOT_FIELD]: honeypot,
      [FORM_TIMESTAMP_FIELD]: loadedAt.current,
    },
    honeypot,
    setHoneypot,
  };
}

/**
 * The hidden input itself.
 *
 * Positioned off-screen rather than display:none — some bots skip hidden
 * inputs, but almost none compute layout. aria-hidden + tabIndex={-1} keep it
 * away from screen readers and keyboard navigation, so no real user can reach
 * it by accident.
 */
export function BotGuardFields({ guard }: { guard: FormGuard }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label htmlFor={HONEYPOT_FIELD}>Reason for contact</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={guard.honeypot}
        onChange={(e) => guard.setHoneypot(e.target.value)}
      />
    </div>
  );
}
