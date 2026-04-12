import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface WholesaleApplicantEmailProps {
  siteUrl: string;
  supportEmail: string;
  businessName: string;
  contactName: string;
}

export function WholesaleApplicantEmail({
  siteUrl,
  supportEmail,
  businessName,
  contactName,
}: WholesaleApplicantEmailProps) {
  const preview = `Your Kimora wholesale application has been received.`;

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Wholesale application</Text>

      <Text style={styles.h1}>
        Application received{contactName ? `, ${contactName}` : ""}.
      </Text>

      <Text style={styles.p}>
        We've received your wholesale application for{" "}
        <strong style={{ color: "#ffffff" }}>{businessName}</strong>. Applications
        are typically reviewed within 1–2 business days.
      </Text>

      <Text style={styles.muted}>
        We're selective about wholesale partners to protect brand value and your
        margins. We'll be in touch soon with next steps.
      </Text>

      <Hr style={styles.divider} />

      <Section style={{ marginBottom: "24px", padding: "16px 18px", backgroundColor: "#141414", borderRadius: "10px", border: "1px solid #1f1f1f" }}>
        <Text style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
          What happens next
        </Text>
        <Text style={{ margin: "0 0 6px", fontSize: "13px", color: styles.TEXT_MUTED }}>
          1. We review your application (1–2 business days)
        </Text>
        <Text style={{ margin: "0 0 6px", fontSize: "13px", color: styles.TEXT_MUTED }}>
          2. If approved, we send wholesale pricing and program details
        </Text>
        <Text style={{ margin: "0", fontSize: "13px", color: styles.TEXT_MUTED }}>
          3. Place your first order and get your gym stocked
        </Text>
      </Section>

      <Text style={styles.muted}>
        Questions? Reply to this email or reach us at{" "}
        <Link href={`mailto:${supportEmail}`} style={{ color: styles.PRIMARY }}>
          {supportEmail}
        </Link>
        .
      </Text>

    </KimoraEmailLayout>
  );
}
