import * as React from "react";
import { Section, Text, Hr, Link } from "@react-email/components";
import { KimoraEmailLayout, styles } from "./KimoraEmailLayout";

export interface MarketingWelcomeEmailProps {
  siteUrl: string;
  supportEmail: string;
  discountCode: string;
  shopUrl: string;
}

export function MarketingWelcomeEmail({
  siteUrl,
  supportEmail,
  discountCode,
  shopUrl,
}: MarketingWelcomeEmailProps) {
  const preview = `Here's your 10% off. Built for fighters, worth the habit.`;

  return (
    <KimoraEmailLayout preview={preview} siteUrl={siteUrl} supportEmail={supportEmail}>

      <Text style={{ ...styles.tag, marginBottom: "20px" }}>Welcome to Kimora</Text>

      <Text style={styles.h1}>Your 10% off is inside.</Text>

      <Text style={styles.p}>
        Creatine + electrolytes. Single-serve sticks. Three flavors.
        Built for fighters, lifters, and everyone who trains with intent.
      </Text>

      <Text style={styles.muted}>
        5g creatine monohydrate + balanced electrolytes in every stick.
        Naturally sweetened. Nothing artificial. No scoops, no mess —
        just tear, pour, and go.
      </Text>

      <Hr style={styles.divider} />

      <Section style={{ marginBottom: "28px", padding: "22px 24px", backgroundColor: "#0a1a16", borderRadius: "12px", border: `1px solid #0f3028`, textAlign: "center" as const }}>
        <Text style={{ margin: "0 0 6px", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: styles.TEXT_MUTED }}>
          Your discount code
        </Text>
        <Text style={{ margin: "0 0 4px", fontSize: "34px", fontWeight: "800", letterSpacing: "0.14em", color: "#ffffff", fontFamily: "monospace" }}>
          {discountCode}
        </Text>
        <Text style={{ margin: "0 0 18px", fontSize: "12px", color: styles.TEXT_MUTED }}>
          10% off your first order · Apply at checkout
        </Text>
        <Link href={shopUrl} style={styles.button}>
          Shop now
        </Link>
      </Section>

      <Section style={{ marginBottom: "0" }}>
        {[
          { label: "5g Creatine Monohydrate", desc: "Strength, power, and recovery" },
          { label: "Balanced Electrolytes", desc: "Sodium, potassium, magnesium" },
          { label: "Naturally Sweetened", desc: "No sugar, no artificial sweeteners, no junk" },
        ].map((item) => (
          <Section key={item.label} style={{ marginBottom: "10px", padding: "10px 14px", backgroundColor: "#141414", borderRadius: "8px", border: "1px solid #1f1f1f" }}>
            <Text style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
              {item.label}
            </Text>
            <Text style={{ margin: "0", fontSize: "12px", color: styles.TEXT_MUTED }}>
              {item.desc}
            </Text>
          </Section>
        ))}
      </Section>

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
