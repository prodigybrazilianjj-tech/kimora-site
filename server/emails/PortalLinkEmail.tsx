import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface PortalLinkEmailProps {
  siteUrl: string;
  supportEmail: string;
  portalUrl: string;
  expiresMinutes?: number;
}

export function PortalLinkEmail({
  siteUrl,
  supportEmail,
  portalUrl,
  expiresMinutes = 15,
}: PortalLinkEmailProps) {
  const preview = "Your secure Kimora subscription management link.";

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Subscription management</Text>

      <Text style={styles.h1}>Manage your subscription.</Text>

      <Text style={styles.p}>
        Here's your secure link to manage your Kimora subscription. From there
        you can pause, cancel, or change your delivery frequency.
      </Text>

      <Hr style={styles.divider} />

      <Section style={{ marginBottom: "24px", padding: "16px 18px", backgroundColor: "#141414", borderRadius: "10px", border: "1px solid #1f1f1f" }}>
        <Text style={{ margin: "0 0 12px", fontSize: "13px", color: styles.TEXT_MUTED }}>
          This link expires in {expiresMinutes} minutes and can only be used once.
        </Text>
        <Link href={portalUrl} style={styles.button}>
          Open subscription portal
        </Link>
      </Section>

      <Text style={styles.muted}>
        Didn't request this? You can safely ignore this email — nothing has changed.
      </Text>

      <Text style={styles.muted}>
        Need help? Reply to this email or reach us at{" "}
        <Link href={`mailto:${supportEmail}`} style={{ color: styles.PRIMARY }}>
          {supportEmail}
        </Link>
        .
      </Text>

    </KimoraEmailLayout>
  );
}
