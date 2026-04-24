"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

interface OrgRequest {
  id: string;
  organizationName: string;
  organizationType: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

export default function OrgRequestsPage() {
  const [requests, setRequests] = useState<OrgRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchRequests = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "organizer_requests"), where("status", "==", "pending"))
      );
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrgRequest));
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(rows);
    } catch (err) {
      console.error("Failed to fetch org requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (req: OrgRequest) => {
    if (!confirm(`Approve "${req.organizationName}"?`)) return;
    setProcessing(req.id);

    try {
      // Call server-side API route (uses Admin SDK — does NOT affect client session)
      const res = await fetch("/api/admin/approve-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: req.email,
          organizationName: req.organizationName,
          organizationType: req.organizationType,
          requestId: req.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve.");
      }

      // Send password reset email from client (uses client auth — admin stays logged in)
      await sendPasswordResetEmail(auth, req.email);

      // Remove from local list
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      showToast(`Organization approved. A password setup email has been sent to ${req.email}.`);
    } catch (err: any) {
      console.error("Approve failed:", err);
      showToast(err.message || "Failed to approve. Please try again.", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: OrgRequest) => {
    if (!confirm(`Reject "${req.organizationName}"?`)) return;
    setProcessing(req.id);

    try {
      await updateDoc(doc(db, "organizer_requests", req.id), {
        status: "rejected",
      });
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      showToast("Request rejected.");
    } catch (err) {
      console.error("Reject failed:", err);
      showToast("Failed to reject. Please try again.", "error");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div style={page}>
      <h1 style={heading}>Organization Requests</h1>
      <p style={sub}>Review and approve pending organization registrations</p>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : requests.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: "#6b7280", margin: 0 }}>No pending requests.</p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {["Organization Name", "Type", "Email", "Phone", "Submitted", "Actions"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td style={td}>{req.organizationName}</td>
                  <td style={td}>{req.organizationType}</td>
                  <td style={td}>{req.email}</td>
                  <td style={td}>{req.phone || "—"}</td>
                  <td style={td}>
                    {new Date(req.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.id}
                      style={approveBtn}
                    >
                      {processing === req.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processing === req.id}
                      style={rejectBtn}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "14px 20px",
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 500,
            color: toast.type === "success" ? "#065f46" : "#991b1b",
            backgroundColor: toast.type === "success" ? "#d1fae5" : "#fee2e2",
            border: `1px solid ${toast.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 9999,
            maxWidth: 420,
            animation: "slideIn 0.3s ease",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

/* ── Styles ── */

const page: React.CSSProperties = {
  flex: 1,
  padding: "2.5rem 2rem",
  background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  minHeight: "100vh",
  overflowX: "auto",
};

const heading: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 4px",
};

const sub: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#6b7280",
  margin: "0 0 1.5rem",
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "3rem",
  textAlign: "center",
};

const tableWrap: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflowX: "auto",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.84rem",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontWeight: 600,
  fontSize: "0.76rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};

const approveBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: "0.78rem",
  fontWeight: 600,
  background: "#246344",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  marginRight: 6,
};

const rejectBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: "0.78rem",
  fontWeight: 600,
  background: "#fff",
  color: "#b91c1c",
  border: "1px solid #fca5a5",
  borderRadius: 4,
  cursor: "pointer",
};
