"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const DEPARTMENT_OPTIONS = [
  "All",
  "Engineering",
  "Health",
  "Law & Social Sciences",
  "Architecture & Design",
  "Business & Economics",
  "Education",
  "Communication",
  "Science",
];

export default function CreateEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    maxParticipants: "",
    pointValue: "",
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    field: string,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDepartmentToggle = (dept: string) => {
    if (dept === "All") {
      setDepartments((prev) =>
        prev.includes("All") ? [] : ["All"]
      );
      return;
    }
    setDepartments((prev) => {
      const without = prev.filter((d) => d !== "All");
      if (without.includes(dept)) {
        return without.filter((d) => d !== dept);
      }
      return [...without, dept];
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "Please enter an event title.";
    if (!form.description.trim()) return "Please enter a description.";
    if (!form.date) return "Please select a date.";
    if (!form.time) return "Please select a time.";
    if (!form.location.trim()) return "Please enter a location.";
    const maxP = parseInt(form.maxParticipants);
    if (!maxP || maxP < 1) return "Maximum participants must be at least 1.";
    const pv = parseInt(form.pointValue);
    if (!pv || pv < 10 || pv > 200)
      return "Point value must be between 10 and 200.";
    if (departments.length === 0)
      return "Please select at least one department restriction.";
    if (!imageFile) return "Please upload an event image.";
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
      // 1. Create Firestore doc first to get the ID
      const docRef = await addDoc(collection(db, "events"), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        maxParticipants: parseInt(form.maxParticipants),
        pointValue: parseInt(form.pointValue),
        departmentRestriction: departments,
        imageURL: "", // placeholder, updated after upload
        organizerId: user!.uid,
        organizerName: user!.displayName || "Organizer",
        status: "pending_approval",
        createdAt: new Date().toISOString(),
        currentParticipants: 0,
      });

      // 2. Upload image to Firebase Storage
      const storageRef = ref(storage, `events/${docRef.id}/cover`);
      await uploadBytes(storageRef, imageFile!);
      const downloadURL = await getDownloadURL(storageRef);

      // 3. Update the doc with the image URL
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "events", docRef.id), {
        imageURL: downloadURL,
      });

      router.push("/organizer/events");
    } catch (err: any) {
      console.error("Failed to create event:", err);
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={page}>
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <h1 style={heading}>Create Event</h1>
      <p style={sub}>Fill in the details to submit a new event for approval</p>

      <div style={card}>
        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Title */}
          <div style={fieldGroup}>
            <label style={label}>Event Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Beach Cleanup Drive"
              required
              style={input}
            />
          </div>

          {/* Description */}
          <div style={fieldGroup}>
            <label style={label}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the event, its goals, and what volunteers will do..."
              required
              style={{ ...input, minHeight: 100, resize: "vertical" }}
            />
          </div>

          {/* Date + Time row */}
          <div style={row}>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={label}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
                style={input}
              />
            </div>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={label}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => handleChange("time", e.target.value)}
                required
                style={input}
              />
            </div>
          </div>

          {/* Location */}
          <div style={fieldGroup}>
            <label style={label}>Location / Address</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g. Famagusta City Beach"
              required
              style={input}
            />
          </div>

          {/* Max Participants + Point Value row */}
          <div style={row}>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={label}>Maximum Participants</label>
              <input
                type="number"
                min={1}
                value={form.maxParticipants}
                onChange={(e) =>
                  handleChange("maxParticipants", e.target.value)
                }
                placeholder="e.g. 50"
                required
                style={input}
              />
            </div>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={label}>Point Value (10–200)</label>
              <input
                type="number"
                min={10}
                max={200}
                value={form.pointValue}
                onChange={(e) => handleChange("pointValue", e.target.value)}
                placeholder="e.g. 50"
                required
                style={input}
              />
            </div>
          </div>

          {/* Department Restriction */}
          <div style={fieldGroup}>
            <label style={label}>Department Restriction</label>
            <p style={hint}>
              Select which departments can participate. Choose &quot;All&quot; to
              allow everyone.
            </p>
            <div style={checkboxGrid}>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <label key={dept} style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={departments.includes(dept)}
                    onChange={() => handleDepartmentToggle(dept)}
                    style={{ marginRight: 6, accentColor: "#246344" }}
                  />
                  {dept}
                </label>
              ))}
            </div>
          </div>

          {/* Event Image */}
          <div style={fieldGroup}>
            <label style={label}>Event Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{
                ...input,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  marginTop: 8,
                  maxHeight: 180,
                  borderRadius: 8,
                  objectFit: "cover",
                  border: "1px solid #e5e7eb",
                }}
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating Event..." : "Submit for Approval"}
          </button>
        </form>
      </div>
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
  overflowY: "auto",
};

const heading: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 0.25rem",
};

const sub: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#6b7280",
  margin: "0 0 1.5rem",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "2rem",
  maxWidth: 680,
};

const errorBox: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  color: "#b91c1c",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: "0.85rem",
  marginBottom: "1rem",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const fieldGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
};

const label: React.CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "#374151",
};

const hint: React.CSSProperties = {
  fontSize: "0.76rem",
  color: "#9ca3af",
  margin: "0 0 4px",
};

const input: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "0.88rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  outline: "none",
  color: "#111827",
  backgroundColor: "#ffffff",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const checkboxGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 8,
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontSize: "0.84rem",
  color: "#374151",
  cursor: "pointer",
};

const submitBtn: React.CSSProperties = {
  marginTop: 8,
  padding: "12px",
  backgroundColor: "#246344",
  color: "#ffffff",
  fontSize: "0.92rem",
  fontWeight: 600,
  border: "none",
  borderRadius: 8,
  transition: "background-color 0.2s",
  width: "100%",
};
