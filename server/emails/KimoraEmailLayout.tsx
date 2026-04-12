import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";

const PRIMARY = "#00806a";
const BG_OUTER = "#080808";
const BG_CARD = "#0e0e0e";
const BG_CARD_BORDER = "#1f1f1f";
const TEXT_MAIN = "#e8e8e8";
const TEXT_MUTED = "#888888";
const TEXT_DIM = "#444444";

export interface KimoraEmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  siteUrl: string;
  supportEmail?: string;
}

export function KimoraEmailLayout({
  preview,
  children,
  siteUrl,
  supportEmail = "support@kimoraco.com",
}: KimoraEmailLayoutProps) {
  const artworkUrl = `${siteUrl}/assets/brand/octopus-bear-white.png`;

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>

      <Body style={{ backgroundColor: BG_OUTER, margin: "0", padding: "0", fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 16px" }}>

          {/* Card */}
          <Section style={{ backgroundColor: BG_CARD, borderRadius: "16px", border: `1px solid ${BG_CARD_BORDER}`, overflow: "hidden" }}>

            {/* Header */}
            <Section style={{ position: "relative", backgroundColor: "#0a0a0a", padding: "0", textAlign: "center", borderBottom: `1px solid ${BG_CARD_BORDER}` }}>
              {/* Artwork watermark */}
              <Img
                src={artworkUrl}
                alt=""
                width="320"
                height="182"
                style={{
                  display: "block",
                  margin: "0 auto",
                  opacity: 0.08,
                  maxWidth: "100%",
                }}
              />
              {/* Wordmark overlay — positioned over artwork */}
              <Section style={{ marginTop: "-40px", paddingBottom: "28px" }}>
                <Text style={{ margin: "0", fontSize: "32px", fontWeight: "800", letterSpacing: "0.2em", color: "#ffffff", textTransform: "uppercase" }}>
                  KIMORA
                </Text>
                <Section style={{ margin: "8px auto 0", width: "48px", height: "2px", backgroundColor: PRIMARY }} />
              </Section>
            </Section>

            {/* Body */}
            <Section style={{ padding: "36px 40px 28px" }}>
              {children}
            </Section>

            {/* Footer */}
            <Section style={{ borderTop: `1px solid ${BG_CARD_BORDER}`, padding: "24px 40px" }}>
              <Hr style={{ border: "none", margin: "0 0 16px" }} />
              <Text style={{ margin: "0 0 6px", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: TEXT_DIM, textAlign: "center" }}>
                OUT-TRAIN. OUT-SMART. OUT-LAST.
              </Text>
              <Text style={{ margin: "0", fontSize: "11px", color: TEXT_DIM, textAlign: "center" }}>
                <Link href="https://instagram.com/kimoracreatine" style={{ color: TEXT_DIM, textDecoration: "none" }}>
                  @kimoracreatine
                </Link>
                {"  ·  "}
                <Link href={`mailto:${supportEmail}`} style={{ color: TEXT_DIM, textDecoration: "none" }}>
                  {supportEmail}
                </Link>
              </Text>
              <Text style={{ margin: "12px 0 0", fontSize: "10px", color: "#333333", textAlign: "center", lineHeight: "1.6" }}>
                These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.
              </Text>
            </Section>

          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable style tokens for templates
export const styles = {
  PRIMARY,
  BG_OUTER,
  BG_CARD,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_DIM,
  h1: {
    margin: "0 0 16px",
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.02em",
    lineHeight: "1.1",
  } as React.CSSProperties,
  p: {
    margin: "0 0 14px",
    fontSize: "15px",
    lineHeight: "1.7",
    color: TEXT_MAIN,
  } as React.CSSProperties,
  muted: {
    margin: "0 0 14px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: TEXT_MUTED,
  } as React.CSSProperties,
  button: {
    display: "inline-block",
    padding: "14px 28px",
    borderRadius: "10px",
    backgroundColor: PRIMARY,
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  buttonSecondary: {
    display: "inline-block",
    padding: "14px 28px",
    borderRadius: "10px",
    backgroundColor: "transparent",
    color: TEXT_MAIN,
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    border: "1px solid #2a2a2a",
  } as React.CSSProperties,
  divider: {
    border: "none",
    borderTop: "1px solid #1f1f1f",
    margin: "24px 0",
  } as React.CSSProperties,
  label: {
    margin: "0 0 4px",
    fontSize: "10px",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: TEXT_DIM,
  } as React.CSSProperties,
  value: {
    margin: "0 0 14px",
    fontSize: "14px",
    color: TEXT_MAIN,
  } as React.CSSProperties,
  tag: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: PRIMARY,
  } as React.CSSProperties,
};
