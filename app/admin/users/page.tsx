"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface UserRow {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  universityName?: string;
  departmentName?: string;
  studentNumber?: string;
  points?: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Add-user form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    universityName: "",
    departmentName: "",
    studentNumber: "",
  });
  const [formError, setFormError] = useState("");

  // ── Fetch users (role === "student") ──────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "student"))
      );
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          fullName: data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          ...data,
        } as UserRow;
      });
      rows.sort((a, b) => (a.firstName || a.fullName).localeCompare(b.firstName || b.fullName));
      setUsers(rows);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showToast("Failed to fetch users.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Approve pending user ─────────────────────────────────────────────────
  const handleApprove = async (uid: string) => {
    const confirmed = await confirm({
      title: "Approve User",
      message: "Approve this user? They will be able to access the system.",
      confirmLabel: "Approve",
    });
    if (!confirmed) return;
    try {
      await updateDoc(doc(db, "users", uid), { status: "approved" });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, status: "approved" } : u))
      );
      showToast("User approved.", "success");
    } catch (err) {
      console.error("Failed to approve user:", err);
      showToast("Failed to approve user.", "error");
    }
  };

  // ── Delete user doc from Firestore ───────────────────────────────────────
  const handleDelete = async (uid: string) => {
    const confirmed = await confirm({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      // TODO: Firebase Auth account deletion requires Admin SDK (server-side)
      // Currently only removing Firestore document
      await deleteDoc(doc(db, "users", uid));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      showToast(
        "User data removed. Note: Auth account requires manual deletion from Firebase Console.",
        "warning"
      );
    } catch (err) {
      console.error("Failed to delete user:", err);
      showToast("Failed to delete user.", "error");
    }
  };

  // ── Add user manually (Firestore doc only) ──────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError("First name, last name and email are required.");
      return;
    }
    try {
      // WARNING: This user has no Firebase Auth account - they cannot log in until Auth account is created
      const id = crypto.randomUUID();
      await setDoc(doc(db, "users", id), {
        uid: id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        role: "student",
        status: "approved",
        universityName: form.universityName.trim(),
        departmentName: form.departmentName.trim(),
        studentNumber: form.studentNumber.trim(),
        points: 0,
        createdAt: new Date().toISOString(),
      });
      setForm({ firstName: "", lastName: "", email: "", universityName: "", departmentName: "", studentNumber: "" });
      setShowForm(false);
      fetchUsers();
      showToast("User created.", "success");
    } catch (err) {
      console.error("Failed to add user:", err);
      setFormError("Failed to add user.");
      showToast("Failed to add user.", "error");
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const visible =
    filter === "all" ? users : users.filter((u) => u.status === filter);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={page}>
      <h1 style={heading}>User Management</h1>
      <p style={sub}>Manage student accounts and approve pending registrations</p>

      {/* Toolbar */}
      <div style={toolbar}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "pending", "approved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...filterBtn,
                background: filter === f ? "#246344" : "#fff",
                color: filter === f ? "#fff" : "#374151",
                border: filter === f ? "1px solid #246344" : "1px solid #d1d5db",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && (
                <span style={badge}>
                  {users.filter((u) => u.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={addBtn}>
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} style={formCard}>
          {formError && <div style={errBox}>{formError}</div>}
          <div style={formRow}>
            <input
              placeholder="First Name *"
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              style={input}
            />
            <input
              placeholder="Last Name *"
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              style={input}
            />
            <input
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              style={input}
            />
          </div>
          <div style={formRow}>
            <input
              placeholder="University"
              value={form.universityName}
              onChange={(e) => setForm((p) => ({ ...p, universityName: e.target.value }))}
              style={input}
            />
            <input
              placeholder="Department"
              value={form.departmentName}
              onChange={(e) => setForm((p) => ({ ...p, departmentName: e.target.value }))}
              style={input}
            />
            <input
              placeholder="Student Number"
              value={form.studentNumber}
              onChange={(e) => setForm((p) => ({ ...p, studentNumber: e.target.value }))}
              style={input}
            />
          </div>
          <button type="submit" style={{ ...addBtn, alignSelf: "flex-end" }}>
            Save User
          </button>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={5} />
      ) : visible.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No users found.</p>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {["Name", "Email", "University", "Department", "Student #", "Status", "Points", "Actions"].map(
                  (h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.uid}>
                  <td style={td}>{u.fullName}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.universityName || "—"}</td>
                  <td style={td}>{u.departmentName || "—"}</td>
                  <td style={td}>{u.studentNumber || "—"}</td>
                  <td style={td}>
                    <StatusBadge status={u.status} />
                  </td>
                  <td style={td}>{u.points ?? 0}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {u.status === "pending" && (
                      <button
                        onClick={() => handleApprove(u.uid)}
                        style={approveBtn}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.uid)}
                      style={delBtn}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Inline styles (minimal, login-themed) ────────────────────────────────── */

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

const toolbar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
  flexWrap: "wrap",
  gap: 8,
};

const filterBtn: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: "0.82rem",
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.15s",
};

const badge: React.CSSProperties = {
  background: "#fff",
  color: "#246344",
  fontSize: "0.72rem",
  fontWeight: 700,
  borderRadius: 10,
  padding: "1px 7px",
};

const addBtn: React.CSSProperties = {
  padding: "7px 16px",
  fontSize: "0.82rem",
  fontWeight: 600,
  background: "#246344",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const formCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.25rem",
  marginBottom: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const formRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const input: React.CSSProperties = {
  flex: 1,
  minWidth: 140,
  padding: "8px 12px",
  fontSize: "0.85rem",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  outline: "none",
  color: "#111827",
};

const errBox: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  color: "#b91c1c",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: "0.82rem",
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

const delBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: "0.78rem",
  fontWeight: 600,
  background: "#fff",
  color: "#b91c1c",
  border: "1px solid #fca5a5",
  borderRadius: 4,
  cursor: "pointer",
};
