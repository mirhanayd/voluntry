"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface OrgRow {
  uid: string;
  organizationName: string;
  organizationType: string;
  contactName: string;
  email: string;
  role: string;
  status: string;
}

const ORG_TYPES = ["Municipality", "University", "NGO"];

const emptyForm = {
  organizationName: "",
  organizationType: "Municipality",
  contactName: "",
  email: "",
  password: "",
};

export default function OrganizerManagementPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  // ── Fetch organizers ────────────────────────────────────────────────────
  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "organizer"))
      );
      const rows = snap.docs.map(
        (d) => ({ uid: d.id, ...d.data() } as OrgRow)
      );
      rows.sort((a, b) =>
        (a.organizationName || "").localeCompare(b.organizationName || "")
      );
      setOrgs(rows);
    } catch (err) {
      console.error("Failed to fetch organizers:", err);
      showToast("Failed to fetch organizers.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  // ── Open modal for Add / Edit ───────────────────────────────────────────
  const openAdd = () => {
    setEditingUid(null);
    setForm({ ...emptyForm });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (o: OrgRow) => {
    setEditingUid(o.uid);
    setForm({
      organizationName: o.organizationName || "",
      organizationType: o.organizationType || "Municipality",
      contactName: o.contactName || "",
      email: o.email || "",
      password: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  // ── Save (Add or Edit) ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const isEdit = Boolean(editingUid);

    if (
      !form.organizationName.trim() ||
      !form.contactName.trim() ||
      !form.email.trim()
    ) {
      setFormError("Organization name, contact name, and email are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingUid) {
        // ── EDIT ──
        await updateDoc(doc(db, "users", editingUid), {
          organizationName: form.organizationName.trim(),
          organizationType: form.organizationType,
          contactName: form.contactName.trim(),
          email: form.email.trim(),
        });
      } else {
        // ── ADD ──
        if (!form.password || form.password.length < 6) {
          setFormError("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }

        // 1. Create Auth account via API route
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            displayName: form.contactName.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Auth creation failed");

        // 2. Write Firestore doc
        await setDoc(doc(db, "users", data.uid), {
          uid: data.uid,
          organizationName: form.organizationName.trim(),
          organizationType: form.organizationType,
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          role: "organizer",
          status: "approved",
          points: 0,
          createdAt: new Date().toISOString(),
        });
      }

      setModalOpen(false);
      await fetchOrgs();
      showToast(isEdit ? "Organizer updated." : "Organizer created.", "success");
    } catch (err: unknown) {
      console.error("Save failed:", err);
      const message = err instanceof Error ? err.message : "Operation failed.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete organizer ───────────────────────────────────────────────────
  const handleDelete = async (uid: string) => {
    const confirmed = await confirm({
      title: "Delete Organizer",
      message: "Delete this organizer? The Auth account will be disabled.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      // Disable auth account
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      });
      setOrgs((prev) => prev.filter((o) => o.uid !== uid));
      showToast("Organizer deleted and auth disabled.", "warning");
    } catch (err) {
      console.error("Failed to delete organizer:", err);
      showToast("Failed to delete organizer.", "error");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={page}>
      <h1 style={heading}>Organizer Management</h1>
      <p style={sub}>View, add, edit, and remove organizer accounts</p>

      {/* Toolbar */}
      <div style={toolbar}>
        <span style={{ fontSize: "0.84rem", color: "#6b7280" }}>
          {orgs.length} organizer{orgs.length !== 1 ? "s" : ""}
        </span>
        <button onClick={openAdd} style={primaryBtn}>
          + Add Organizer
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : orgs.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No organizers found.</p>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {[
                  "Organization",
                  "Type",
                  "Contact",
                  "Email",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.uid}>
                  <td style={td}>{o.organizationName || "—"}</td>
                  <td style={td}>{o.organizationType || "—"}</td>
                  <td style={td}>{o.contactName || "—"}</td>
                  <td style={td}>{o.email}</td>
                  <td style={td}>
                    <span
                      style={{
                        ...chip,
                        background: "rgba(36,99,68,0.1)",
                        color: "#246344",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button onClick={() => openEdit(o)} style={editBtn}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(o.uid)} style={delBtn}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div style={overlay} onClick={() => setModalOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>
              {editingUid ? "Edit Organizer" : "Add Organizer"}
            </h2>

            {formError && <div style={errBox}>{formError}</div>}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder="Organization Name *"
                value={form.organizationName}
                onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
                style={input}
              />

              <select
                value={form.organizationType}
                onChange={(e) => setForm((p) => ({ ...p, organizationType: e.target.value }))}
                style={input}
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                placeholder="Contact Name *"
                value={form.contactName}
                onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                style={input}
              />

              <input
                placeholder="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                style={input}
                disabled={!!editingUid}
              />

              {!editingUid && (
                <input
                  placeholder="Password (min 6 chars) *"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  style={input}
                />
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ ...primaryBtn, background: "#fff", color: "#374151", border: "1px solid #d1d5db" }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={primaryBtn}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const page: React.CSSProperties = {
  flex: 1, padding: "2.5rem 2rem", background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", minHeight: "100vh", overflowX: "auto",
};
const heading: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 4px" };
const sub: React.CSSProperties = { fontSize: "0.88rem", color: "#6b7280", margin: "0 0 1.5rem" };
const toolbar: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8,
};
const primaryBtn: React.CSSProperties = {
  padding: "7px 16px", fontSize: "0.82rem", fontWeight: 600,
  background: "#246344", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
};
const editBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600,
  background: "#fff", color: "#246344", border: "1px solid #246344", borderRadius: 4, cursor: "pointer", marginRight: 6,
};
const delBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600,
  background: "#fff", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: 4, cursor: "pointer",
};
const tableWrap: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflowX: "auto" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" };
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: "0.76rem",
  color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #f3f4f6", color: "#111827" };
const chip: React.CSSProperties = {
  display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.76rem", fontWeight: 600, textTransform: "capitalize",
};
const input: React.CSSProperties = {
  padding: "9px 12px", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: 6, outline: "none", color: "#111827", width: "100%", boxSizing: "border-box",
};
const errBox: React.CSSProperties = {
  background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 6, padding: "8px 12px", fontSize: "0.82rem", marginBottom: 4,
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: "1.75rem", width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
};
