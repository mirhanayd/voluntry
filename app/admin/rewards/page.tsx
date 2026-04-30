"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface RewardRow {
  docId: string;
  id?: string;
  title: string;
  sponsorName: string;
  description: string;
  pointCost: number;
  stock: number;
  imageURL: string;
  isActive: boolean;
}

interface RewardDoc {
  id?: string;
  title?: string;
  sponsorName?: string;
  description?: string;
  pointCost?: number;
  stock?: number;
  imageURL?: string;
  isActive?: boolean;
}

interface RewardForm {
  title: string;
  sponsorName: string;
  description: string;
  pointCost: string;
  stock: string;
  imageURL: string;
}

const emptyForm: RewardForm = {
  title: "",
  sponsorName: "",
  description: "",
  pointCost: "",
  stock: "",
  imageURL: "",
};

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "rewards"));
      const rows = snap.docs.map((rewardDoc) => {
        const data = rewardDoc.data() as RewardDoc;

        return {
          docId: rewardDoc.id,
          id: data.id,
          title: data.title || "Untitled Reward",
          sponsorName: data.sponsorName || "Unknown Sponsor",
          description: data.description || "",
          pointCost: Number(data.pointCost ?? 0),
          stock: Number(data.stock ?? 0),
          imageURL: data.imageURL || "",
          isActive: Boolean(data.isActive),
        } as RewardRow;
      });

      rows.sort((a, b) => a.title.localeCompare(b.title));
      setRewards(rows);
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
      showToast("Failed to fetch rewards.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchRewards();
  }, [fetchRewards]);

  const closeModal = () => {
    setModalOpen(false);
    setFormError("");
    setForm(emptyForm);
  };

  const handleDeactivate = async (docId: string) => {
    const confirmed = await confirm({
      title: "Deactivate Reward",
      message: "Deactivate this reward? It will no longer be available to students.",
      confirmLabel: "Deactivate",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "rewards", docId), { isActive: false });
      setRewards((prev) =>
        prev.map((reward) =>
          reward.docId === docId ? { ...reward, isActive: false } : reward
        )
      );
      showToast("Reward deactivated.", "warning");
    } catch (error) {
      console.error("Failed to deactivate reward:", error);
      showToast("Failed to deactivate reward.", "error");
    }
  };

  const handleDelete = async (docId: string) => {
    const confirmed = await confirm({
      title: "Delete Reward",
      message: "Delete this reward permanently? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "rewards", docId));
      setRewards((prev) => prev.filter((reward) => reward.docId !== docId));
      showToast("Reward deleted.", "warning");
    } catch (error) {
      console.error("Failed to delete reward:", error);
      showToast("Failed to delete reward.", "error");
    }
  };

  const handleAddReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (
      !form.title.trim() ||
      !form.sponsorName.trim() ||
      !form.description.trim() ||
      !form.pointCost.trim() ||
      !form.stock.trim() ||
      !form.imageURL.trim()
    ) {
      setFormError("All fields are required.");
      return;
    }

    const pointCost = Number(form.pointCost);
    const stock = Number(form.stock);

    if (!Number.isFinite(pointCost) || pointCost <= 0) {
      setFormError("Point cost must be a positive number.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setFormError("Stock must be zero or a positive number.");
      return;
    }

    setSaving(true);

    try {
      const newReward = {
        title: form.title.trim(),
        sponsorName: form.sponsorName.trim(),
        description: form.description.trim(),
        pointCost,
        stock,
        imageURL: form.imageURL.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const rewardRef = await addDoc(collection(db, "rewards"), newReward);
      await updateDoc(rewardRef, { id: rewardRef.id });

      closeModal();
      await fetchRewards();
      showToast("Reward created.", "success");
    } catch (error) {
      console.error("Failed to add reward:", error);
      setFormError("Could not add reward. Please try again.");
      showToast("Could not add reward. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={page}>
      <h1 style={heading}>Rewards Management</h1>
      <p style={subheading}>Manage available rewards for students.</p>

      <div style={toolbar}>
        <span style={countText}>
          {rewards.length} reward{rewards.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => setModalOpen(true)} style={addButton}>
          Add New Reward
        </button>
      </div>

      {loading ? (
        <p style={statusText}>Loading rewards...</p>
      ) : rewards.length === 0 ? (
        <p style={statusText}>No rewards found.</p>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Title</th>
                <th style={th}>Sponsor</th>
                <th style={th}>Point Cost</th>
                <th style={th}>Stock</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.docId}>
                  <td style={td}>{reward.title}</td>
                  <td style={td}>{reward.sponsorName}</td>
                  <td style={td}>{reward.pointCost}</td>
                  <td style={td}>{reward.stock}</td>
                  <td style={td}>
                    <span
                      style={{
                        ...statusChip,
                        background: reward.isActive
                          ? "rgba(22,163,74,0.1)"
                          : "rgba(239,68,68,0.1)",
                        color: reward.isActive ? "#166534" : "#b91c1c",
                      }}
                    >
                      {reward.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => void handleDeactivate(reward.docId)}
                      disabled={!reward.isActive}
                      style={{
                        ...deactivateButton,
                        opacity: reward.isActive ? 1 : 0.5,
                        cursor: reward.isActive ? "pointer" : "not-allowed",
                      }}
                    >
                      {reward.isActive ? "Deactivate" : "Inactive"}
                    </button>
                    <button
                      onClick={() => void handleDelete(reward.docId)}
                      style={deleteButton}
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

      {modalOpen && (
        <div style={overlay} onClick={() => !saving && closeModal()}>
          <div style={modal} onClick={(event) => event.stopPropagation()}>
            <h2 style={modalTitle}>Add Reward</h2>
            <form onSubmit={handleAddReward}>
              {formError && <div style={errorBox}>{formError}</div>}

              <label style={label}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                style={input}
              />

              <label style={label}>Sponsor Name</label>
              <input
                type="text"
                value={form.sponsorName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sponsorName: event.target.value }))
                }
                style={input}
              />

              <label style={label}>Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                style={textarea}
              />

              <div style={row}>
                <div style={fieldCol}>
                  <label style={label}>Point Cost</label>
                  <input
                    type="number"
                    min={1}
                    value={form.pointCost}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, pointCost: event.target.value }))
                    }
                    style={input}
                  />
                </div>
                <div style={fieldCol}>
                  <label style={label}>Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, stock: event.target.value }))
                    }
                    style={input}
                  />
                </div>
              </div>

              <label style={label}>Image URL</label>
              <input
                type="text"
                value={form.imageURL}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageURL: event.target.value }))
                }
                style={input}
              />

              <div style={buttonRow}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={saveButton}>
                  {saving ? "Saving..." : "Create Reward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const page: CSSProperties = {
  flex: 1,
  padding: "2.5rem 2rem",
  background: "#f9fafb",
  minHeight: "100vh",
  overflowX: "auto",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const heading: CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 0.25rem",
};

const subheading: CSSProperties = {
  fontSize: "0.9rem",
  color: "#6b7280",
  margin: "0 0 1.25rem",
};

const toolbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const countText: CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280",
};

const addButton: CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "#246344",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.82rem",
  padding: "8px 14px",
  cursor: "pointer",
};

const statusText: CSSProperties = {
  color: "#9ca3af",
  fontSize: "0.9rem",
};

const tableWrap: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflowX: "auto",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.84rem",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "11px 14px",
  fontWeight: 600,
  fontSize: "0.76rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "11px 14px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};

const statusChip: CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: "0.76rem",
  fontWeight: 600,
};

const deactivateButton: CSSProperties = {
  border: "none",
  borderRadius: 5,
  background: "#f59e0b",
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "4px 10px",
  marginRight: 6,
};

const deleteButton: CSSProperties = {
  border: "1px solid #fca5a5",
  borderRadius: 5,
  background: "#fff",
  color: "#b91c1c",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "4px 10px",
  cursor: "pointer",
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
  padding: "1rem",
};

const modal: CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  padding: "1.1rem",
  boxShadow: "0 20px 40px rgba(0,0,0,0.16)",
};

const modalTitle: CSSProperties = {
  margin: "0 0 0.8rem",
  fontSize: "1.06rem",
  color: "#111827",
};

const errorBox: CSSProperties = {
  marginBottom: "0.8rem",
  padding: "8px 10px",
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: 8,
  fontSize: "0.82rem",
};

const label: CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: "0.78rem",
  color: "#374151",
  fontWeight: 600,
};

const input: CSSProperties = {
  width: "100%",
  marginBottom: "0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 10px",
  fontSize: "0.85rem",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: 92,
  resize: "vertical",
};

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "0.75rem",
};

const fieldCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const buttonRow: CSSProperties = {
  marginTop: "0.25rem",
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.55rem",
};

const cancelButton: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  fontSize: "0.8rem",
  padding: "8px 12px",
  cursor: "pointer",
};

const saveButton: CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "#246344",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.8rem",
  padding: "8px 12px",
  cursor: "pointer",
};
