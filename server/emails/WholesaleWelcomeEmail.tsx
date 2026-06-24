import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface WholesaleWelcomeEmailProps {
  siteUrl: string;
  supportEmail: string;
  businessName: string;
  contactName: string;
}

/**
 * Sent for in-person / on-the-spot wholesale orders, where the gym has already
 * been approved by a rep and an invoice is being sent immediately. (Online
 * applicants who haven't been approved get WholesaleApplicantEmail instead.)
 */
export function WholesaleWelcomeEmail({
  siteUrl,
  supportEmail,
  businessName,
  contactName,
}: WholesaleWelcomeEmailProps) {
  const preview = `You're approved — welcome to Kimora Co. wholesale.`;

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Wholesale partner</Text>

      <Text style={styles.h1}>
        You're all set{contactName ? `, ${contactName}` : ""}.
      </Text>

      <Text style={styles.p}>
        Thanks for partnering with Kimora Co. —{" "}
        <strong style={{ color: "#ffffff" }}>{businessName}</strong> is now set up
        as a wholesale account. Your invoice for today's order is on its way to your
        inbox.
      </Text>

      <Text style={styles.muted}>
        Welcome to the team. Let's get your members fueled.
      </Text>

      <Hr style={styles.divider} />

      <Section style={{ marginBottom: "24px", padding: "16px 18px", backgroundColor: "#141414", borderRadius: "10px", border: "1px solid #1f1f1f" }}>
        <Text style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
          What happens next
        </Text>
        <Text style={{ margin: "0 0 6px", fontSize: "13px", color: styles.TEXT_MUTED }}>
          1. Pay the invoice we just sent — card or Apple Pay.
        </Text>
        <Text style={{ margin: "0 0 6px", fontSize: "13px", color: styles.TEXT_MUTED }}>
          2. We get your shelf stocked.
        </Text>
        <Text style={{ margin: "0", fontSize: "13px", color: styles.TEXT_MUTED }}>
          3. After payment you'll get a personal reorder link — restock anytime in a couple clicks.
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
