"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";

const ORG_TYPES = [
  "Municipality",
  "University",
  "Non-Governmental Organization (NGO)",
  "Foundation",
  "Public Institution",
  "Association",
  "Other",
];

const ORG_TYPE_OPTIONS = ORG_TYPES.map((type) => ({ id: type, name: type }));

/* ── Organization Registration Page ──────────────────────────────────────────── */

export default function OrganizationRegisterPage() {
  const [form, setForm] = useState({
    organizationName: "",
    organizationType: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.organizationName.trim()) return "Please enter the organization name.";
    if (!form.organizationType) return "Please select the organization type.";
    if (!form.email.trim()) return "Please enter the official email address.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Please enter a valid email address.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "organizer_requests"), {
        organizationName: form.organizationName.trim(),
        organizationType: form.organizationType,
        email: form.email.trim(),
        phone: form.phone.trim() || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <img src="/logo.png" alt="VolunTRY" style={{ height: "64px", objectFit: "contain" }} />
        </div>

        {success ? (
          /* ── Success Message ── */
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "20px" }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#246344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 12 15 16 10" />
              </svg>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
              Request Submitted!
            </h2>
            <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6, margin: "0 0 8px" }}>
              Your registration request has been submitted successfully.
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5, margin: "0 0 24px" }}>
              You will receive an email with your login credentials once approved by the admin.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                backgroundColor: "#246344",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                textDecoration: "none",
                transition: "background-color 0.2s",
              }}
            >
              Back to Login
            </Link>
          </div>
        ) : (
          /* ── Registration Form ── */
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: "0 0 4px", textAlign: "center" }}>
              Organization Registration
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", margin: "0 0 28px" }}>
              Register your organization to create volunteer events
            </p>

            {error && (
              <div style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "14px",
                marginBottom: "16px",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Organization Name */}
              <div style={fieldGroup}>
                <label style={labelStyle}>Organization Name</label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => handleChange("organizationName", e.target.value)}
                  placeholder="e.g. Famagusta Municipality"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#246344")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
              </div>

              {/* Organization Type */}
              <div style={fieldGroup}>
                <label style={labelStyle}>Organization Type</label>
                <SearchableDropdown
                  options={ORG_TYPE_OPTIONS}
                  value={form.organizationType}
                  onChange={(id) => handleChange("organizationType", id)}
                  placeholder="Select organization type"
                  displayKey="name"
                />
              </div>

              {/* Email */}
              <div style={fieldGroup}>
                <label style={labelStyle}>Official Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="info@organization.org"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#246344")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
              </div>

              {/* Phone */}
              <div style={fieldGroup}>
                <label style={labelStyle}>
                  Phone Number <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+90 XXX XXX XX XX"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#246344")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = "#1a4a32";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = "#246344";
                }}
              >
                {loading ? "Submitting..." : "Submit Registration Request"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280", marginTop: "20px" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#246344", fontWeight: 600, textDecoration: "none" }}>
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────────── */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Segoe UI', sans-serif",
  padding: "32px 16px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "480px",
  padding: "40px 36px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
};

const fieldGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "14px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  transition: "border-color 0.2s",
  color: "#111827",
  backgroundColor: "#ffffff",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "8px",
  padding: "12px",
  backgroundColor: "#246344",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  border: "none",
  borderRadius: "8px",
  transition: "background-color 0.2s",
  width: "100%",
};

