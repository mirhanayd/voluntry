import React from "react";
import { adminDb } from "@/lib/firebaseAdmin";
import Link from "next/link";
import { Metadata } from "next";
import { resolveCertificateOrganizerName } from "@/lib/serverProfiles";

type VerifyPageProps = {
  params: Promise<{ certificateId: string }>;
};

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { certificateId } = await params;
  return {
    title: `Verify Certificate - ${certificateId}`,
    description: "Verify the authenticity of a VolunTRY certificate.",
  };
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { certificateId } = await params;

  let certData = null;
  let isValid = false;
  let organizerName = "";

  try {
    const certSnap = await adminDb.collection("certificates").doc(certificateId).get();
    if (certSnap.exists) {
      certData = certSnap.data();
      organizerName = await resolveCertificateOrganizerName(certData ?? {});
      isValid = true;
    }
  } catch (err) {
    console.error("Error verifying certificate:", err);
  }

  // Formatting date
  let issuedDateStr = certData?.issuedAt ?? "";
  try {
    if (issuedDateStr) {
      const d = new Date(issuedDateStr);
      issuedDateStr = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {
    // keep raw string
  }

  return (
    <main style={mainArea}>
      <div style={container}>
        {/* Logo / Brand */}
        <div style={brandContainer}>
          <Link href="/">
            <img src="/logo_2.png" alt="VolunTRY Logo" style={{ height: 40, objectFit: "contain" }} />
          </Link>
        </div>

        {isValid && certData ? (
          <div style={card}>
            <div style={validHeader}>
              <div style={iconValid}>✓</div>
              <h1 style={titleStyle}>Verified Certificate</h1>
              <p style={subtitleStyle}>This is a valid and authentic VolunTRY certificate.</p>
            </div>

            <div style={detailsContainer}>
              <div style={detailRow}>
                <span style={detailLabel}>Certificate ID</span>
                <span style={detailValue}>{certificateId}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Issued To</span>
                <span style={detailValueHighlight}>{certData.studentName}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>University</span>
                <span style={detailValue}>{certData.universityName || "N/A"}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Event</span>
                <span style={detailValueHighlight}>{certData.eventTitle}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Organized By</span>
                <span style={detailValue}>{organizerName}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Event Date</span>
                <span style={detailValue}>{certData.eventDate}</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Points Earned</span>
                <span style={pointBadge}>+{certData.pointValue} pts</span>
              </div>
              <div style={detailRow}>
                <span style={detailLabel}>Issued On</span>
                <span style={detailValue}>{issuedDateStr}</span>
              </div>
            </div>

            <div style={actionsContainer}>
              <Link href={`/api/generate-certificate?certificateId=${certificateId}`} style={btnPrimary}>
                Download PDF
              </Link>
            </div>
          </div>
        ) : (
          <div style={card}>
            <div style={invalidHeader}>
              <div style={iconInvalid}>✕</div>
              <h1 style={titleStyle}>Invalid Certificate</h1>
              <p style={subtitleStyle}>We could not find a certificate matching this ID.</p>
            </div>
            <div style={actionsContainer}>
              <Link href="/" style={btnSecondary}>
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainArea: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "40px 20px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const container: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const brandContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 16,
};

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
};

const validHeader: React.CSSProperties = {
  background: "linear-gradient(135deg, #f0faf5 0%, #e6f6ec 100%)",
  padding: "40px 20px",
  textAlign: "center",
  borderBottom: "1px solid #d1fae5",
};

const invalidHeader: React.CSSProperties = {
  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
  padding: "40px 20px",
  textAlign: "center",
  borderBottom: "1px solid #fecaca",
};

const iconValid: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "#246344",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 32,
  fontWeight: "bold",
  margin: "0 auto 16px",
};

const iconInvalid: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "#dc2626",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 32,
  fontWeight: "bold",
  margin: "0 auto 16px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 24,
  fontWeight: 700,
  color: "#111827",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: "#4b5563",
};

const detailsContainer: React.CSSProperties = {
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const detailRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingBottom: 16,
  borderBottom: "1px solid #f3f4f6",
};

const detailLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const detailValue: React.CSSProperties = {
  fontSize: 16,
  color: "#374151",
};

const detailValueHighlight: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#111827",
};

const pointBadge: React.CSSProperties = {
  display: "inline-block",
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  padding: "4px 12px",
  alignSelf: "flex-start",
};

const actionsContainer: React.CSSProperties = {
  padding: "24px",
  background: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "center",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-block",
  background: "#246344",
  color: "#ffffff",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 16,
  transition: "background 0.2s",
  textAlign: "center",
  width: "100%",
};

const btnSecondary: React.CSSProperties = {
  display: "inline-block",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 16,
  transition: "background 0.2s",
  textAlign: "center",
  width: "100%",
};
