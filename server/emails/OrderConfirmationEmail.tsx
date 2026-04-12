import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface OrderLineItem {
  qty: number;
  flavor: string;
  purchaseType: "onetime" | "subscribe";
  frequencyWeeks: number | null;
  unitAmount: number | null;
  lineTotal: string | null;
}

export interface OrderConfirmationEmailProps {
  siteUrl: string;
  supportEmail: string;
  shippingName: string;
  orderNumber: string;
  lines: OrderLineItem[];
  subtotal: string;
  total: string;
  shippingAddress: string;
  isSubscription: boolean;
  manageLink: string;
}

export function OrderConfirmationEmail({
  siteUrl,
  supportEmail,
  shippingName,
  orderNumber,
  lines,
  subtotal,
  total,
  shippingAddress,
  isSubscription,
  manageLink,
}: OrderConfirmationEmailProps) {
  const preview = `Your Kimora order is confirmed${shippingName ? `, ${shippingName}` : ""}.`;

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>
        {isSubscription ? "Subscription confirmed" : "Order confirmed"}
      </Text>

      <Text style={styles.h1}>
        {shippingName ? `You're all set, ${shippingName}.` : "You're all set."}
      </Text>

      <Text style={styles.p}>
        Your Kimora order has been confirmed and will ship soon.
        {isSubscription && " Your subscription will renew automatically based on the frequency you selected."}
      </Text>

      {orderNumber ? (
        <Section style={{ marginBottom: "20px" }}>
          <Text style={styles.label}>Order number</Text>
          <Text style={{ ...styles.value, fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.05em" }}>
            {orderNumber}
          </Text>
        </Section>
      ) : null}

      <Hr style={styles.divider} />

      <Text style={{ ...styles.label, marginBottom: "12px" }}>What you ordered</Text>
      {lines.map((l, i) => (
        <Section key={i} style={{ marginBottom: "10px", padding: "12px 14px", backgroundColor: "#141414", borderRadius: "8px", border: "1px solid #1f1f1f" }}>
          <Text style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
            {l.flavor} <span style={{ color: styles.TEXT_MUTED, fontWeight: "400" }}>× {l.qty}</span>
          </Text>
          <Text style={{ margin: "0", fontSize: "12px", color: styles.TEXT_MUTED }}>
            {l.purchaseType === "subscribe" && l.frequencyWeeks
              ? `Subscription — renews every ${l.frequencyWeeks} weeks`
              : "One-time purchase"}
            {l.lineTotal ? `  ·  ${l.lineTotal}` : ""}
          </Text>
        </Section>
      ))}

      <Hr style={styles.divider} />

      <Section style={{ marginBottom: "20px" }}>
        {subtotal ? (
          <Section style={{ display: "flex" as any, justifyContent: "space-between", marginBottom: "6px" }}>
            <Text style={{ ...styles.muted, display: "inline" }}>Subtotal</Text>
            <Text style={{ ...styles.muted, display: "inline" }}>{subtotal}</Text>
          </Section>
        ) : null}
        {total ? (
          <Section style={{ display: "flex" as any, justifyContent: "space-between" }}>
            <Text style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: "#ffffff", display: "inline" }}>Total</Text>
            <Text style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: styles.PRIMARY, display: "inline" }}>{total}</Text>
          </Section>
        ) : null}
      </Section>

      {shippingAddress ? (
        <Section style={{ marginBottom: "24px" }}>
          <Text style={styles.label}>Shipping to</Text>
          <Text style={styles.value}>{shippingAddress}</Text>
        </Section>
      ) : null}

      {isSubscription ? (
        <Section style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#0a1a16", borderRadius: "10px", border: `1px solid #0f3028` }}>
          <Text style={{ margin: "0 0 10px", fontSize: "13px", color: styles.TEXT_MUTED }}>
            Pause, cancel, or change your delivery frequency anytime.
          </Text>
          <Link href={manageLink} style={styles.button}>
            Manage subscription
          </Link>
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
