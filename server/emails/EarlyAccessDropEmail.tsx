import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface EarlyAccessDropEmailProps {
  siteUrl: string;
  supportEmail: string;
  firstName?: string | null;
  launchUrl: string;
  discountCode?: string | null;
  windowText: string;
}

export function EarlyAccessDropEmail({
  siteUrl,
  supportEmail,
  firstName,
  launchUrl,
  discountCode,
  windowText,
}: EarlyAccessDropEmailProps) {
  const preview = "Early access is live. You're first.";

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Early access — live now</Text>

      <Text style={styles.h1}>
        {firstName ? `It's time, ${firstName}.` : "It's time."}
      </Text>

      <Text style={styles.p}>{windowText}</Text>

      <Text style={styles.muted}>
        Three flavors. One daily habit. Creatine + electrolytes in a single
        stick — clean formula, nothing artificial, naturally sweetened.
      </Text>

      {discountCode ? (
        <>
          <Hr style={styles.divider} />
          <Section style={{ marginBottom: "24px", padding: "18px 20px", backgroundColor: "#0a1a16", borderRadius: "10px", border: `1px solid #0f3028`, textAlign: "center" as const }}>
            <Text style={{ margin: "0 0 6px", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: styles.TEXT_MUTED }}>
              Your early access code
            </Text>
            <Text style={{ margin: "0 0 4px", fontSize: "28px", fontWeight: "800", letterSpacing: "0.12em", color: "#ffffff", fontFamily: "monospace" }}>
              {discountCode}
            </Text>
            <Text style={{ margin: "0", fontSize: "12px", color: styles.TEXT_MUTED }}>
              Apply at checkout · One-time use
            </Text>
          </Section>
        </>
      ) : null}

      <Link href={launchUrl} style={styles.button}>
        Shop now
      </Link>

      <Text style={{ ...styles.muted, marginTop: "24px" }}>
        Questions? Reply to this email or reach us at{" "}
        <Link href={`mailto:${supportEmail}`} style={{ color: styles.PRIMARY }}>
          {supportEmail}
        </Link>
        .
      </Text>

    </KimoraEmailLayout>
  );
}
