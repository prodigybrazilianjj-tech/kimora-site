import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface ShippingNotificationEmailProps {
  siteUrl: string;
  supportEmail: string;
  name: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
}

export function ShippingNotificationEmail({
  siteUrl,
  supportEmail,
  name,
  orderId,
  carrier,
  trackingNumber,
  trackingUrl,
}: ShippingNotificationEmailProps) {
  const preview = `Your Kimora order is on the way${name ? `, ${name}` : ""}.`;

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Shipped</Text>

      <Text style={styles.h1}>
        {name ? `On the way, ${name}.` : "Your order is on the way."}
      </Text>

      <Text style={styles.p}>
        Your Kimora order has shipped. Keep an eye on your tracking link below.
      </Text>

      <Hr style={styles.divider} />

      {orderId ? (
        <Section style={{ marginBottom: "16px" }}>
          <Text style={styles.label}>Order</Text>
          <Text style={{ ...styles.value, fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.05em" }}>
            {orderId}
          </Text>
        </Section>
      ) : null}

      {trackingNumber ? (
        <Section style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#141414", borderRadius: "10px", border: "1px solid #1f1f1f" }}>
          <Text style={styles.label}>
            Tracking{carrier ? ` · ${carrier}` : ""}
          </Text>
          <Text style={{ margin: "0 0 14px", fontSize: "14px", fontFamily: "monospace", letterSpacing: "0.05em", color: "#ffffff" }}>
            {trackingNumber}
          </Text>
          {trackingUrl ? (
            <Link href={trackingUrl} style={styles.button}>
              Track package
            </Link>
          ) : null}
        </Section>
      ) : null}

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
