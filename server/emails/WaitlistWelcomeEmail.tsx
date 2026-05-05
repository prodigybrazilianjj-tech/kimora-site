import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface WaitlistWelcomeEmailProps {
  siteUrl: string;
  supportEmail: string;
  firstName?: string | null;
}

export function WaitlistWelcomeEmail({
  siteUrl,
  supportEmail,
  firstName,
}: WaitlistWelcomeEmailProps) {
  const preview = "You're on the Kimora list. We'll let you know first.";

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Early access</Text>

      <Text style={styles.h1}>
        {firstName ? `You're in, ${firstName}.` : "You're in."}
      </Text>

      <Text style={styles.p}>
        You've joined the Kimora waitlist. We're still dialing in the formula —
        flavor, texture, and everything in between — and you'll be among the
        first to know when we're ready.
      </Text>

      <Text style={styles.muted}>
        We're building creatine + electrolytes in a single daily stick.
        Clean formula, three flavors, nothing artificial. Built for people
        who train with intent.
      </Text>

      <Hr style={styles.divider} />

      <Section style={{ marginBottom: "24px", padding: "16px 18px", backgroundColor: "#0a1a16", borderRadius: "10px", border: `1px solid #0f3028` }}>
        <Text style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
          Creatine · Electrolytes · Daily
        </Text>
        <Text style={{ margin: "0", fontSize: "12px", color: styles.TEXT_MUTED }}>
          5g creatine monohydrate + balanced electrolytes. Naturally sweetened. Nothing artificial.
        </Text>
      </Section>

      <Link href={siteUrl} style={styles.button}>
        Visit Kimora Co
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
