"use client";

import { useState, useRef } from "react";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { DEPARTMENT_OPTIONS } from "@/constants/index";
import { asString, getOrganizerDisplayName } from "@/lib/profileNames";

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
  const [coverURL, setCoverURL] = useState<string>("");
  const [galleryURLs, setGalleryURLs] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState<{ id: string }[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

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

  // storagePath uses a temp timestamp — image is already uploaded via ImageUpload
  const [storagePath] = useState(() => `events/temp_${Date.now()}/cover.jpg`);

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
    if (!coverURL) return "Please upload an event cover image.";
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
      const organizerSnap = await getDoc(doc(db, "users", user!.uid));
      const organizerData = organizerSnap.exists() ? organizerSnap.data() : null;
      const organizerName = getOrganizerDisplayName(
        organizerData,
        user!.displayName || "Organization"
      );
      const organizerAvatarURL = asString(organizerData?.avatarURL);

      // Create Firestore doc with coverURL (image already uploaded via ImageUpload)
      await addDoc(collection(db, "events"), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        maxParticipants: parseInt(form.maxParticipants),
        pointValue: parseInt(form.pointValue),
        departmentRestriction: departments,
        coverURL,
        galleryURLs,
        organizerId: user!.uid,
        organizerName,
        organizerAvatarURL,
        status: "pending_approval",
        createdAt: new Date().toISOString(),
        currentParticipants: 0,
      });

      showToast("Event submitted for approval!", "success");
      router.push("/organizer/events");
    } catch (err: unknown) {
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
            <div style={{ ...fieldGroup, flex: 1, minWidth: 140 }}>
              <label style={label}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
                style={input}
              />
            </div>
            <div style={{ ...fieldGroup, flex: 1, minWidth: 140 }}>
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
            <div style={{ ...fieldGroup, flex: 1, minWidth: 140 }}>
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
            <div style={{ ...fieldGroup, flex: 1, minWidth: 140 }}>
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

          {/* Event Cover Image */}
          <div style={fieldGroup}>
            <label style={label}>Event Cover Image</label>
            <ImageUpload
              shape="square"
              size={300}
              storagePath={storagePath}
              currentImageURL={coverURL || undefined}
              onUploadComplete={(downloadURL) => {
                setCoverURL(downloadURL);
                showToast("Cover image uploaded", "success");
              }}
            />
          </div>

          {/* Additional Photos (optional) */}
          <div style={fieldGroup}>
            <label style={label}>Additional Photos (optional)</label>
            <p style={hint}>Add up to 5 photos for the event gallery.</p>
            
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {galleryURLs.map((url, idx) => (
                <div key={`gallery-${idx}`} style={thumbnailWrapper}>
                  <img src={url} alt={`Gallery ${idx + 1}`} style={thumbnailImage} />
                  <button
                    type="button"
                    onClick={() => setGalleryURLs(prev => prev.filter((_, i) => i !== idx))}
                    style={removeBtn}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              {uploadingGallery.map((u) => (
                <div key={u.id} style={thumbnailWrapper}>
                  <div style={uploadingOverlay}>
                    <div style={spinnerStyle} />
                  </div>
                </div>
              ))}

              {galleryURLs.length + uploadingGallery.length < 5 && (
                <>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    style={addPhotoBtn}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>Add Photo</span>
                  </button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      e.target.value = ""; // clear input
                      
                      const availableSlots = 5 - galleryURLs.length - uploadingGallery.length;
                      if (availableSlots <= 0) {
                        showToast("You can only upload up to 5 gallery images.", "error");
                        return;
                      }

                      const filesToUpload = files.slice(0, availableSlots);
                      if (files.length > availableSlots) {
                        showToast(`Only ${availableSlots} more image(s) can be uploaded.`, "info");
                      }

                      const validFiles = filesToUpload.filter(f => {
                        const isValidType = ["image/jpeg", "image/png", "image/webp"].includes(f.type);
                        const isValidSize = f.size <= 5 * 1024 * 1024;
                        if (!isValidType) showToast(`${f.name} is not a valid image type.`, "error");
                        if (!isValidSize) showToast(`${f.name} exceeds 5MB.`, "error");
                        return isValidType && isValidSize;
                      });

                      for (let i = 0; i < validFiles.length; i++) {
                        const file = validFiles[i];
                        const uploadId = Math.random().toString(36).substring(7);
                        setUploadingGallery(prev => [...prev, { id: uploadId }]);
                        
                        try {
                          const path = `events/temp_${Date.now()}/gallery/${i}_${uploadId}.jpg`;
                          const storageRef = ref(storage, path);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          setGalleryURLs(prev => [...prev, url]);
                        } catch (err) {
                          console.error("Gallery upload error:", err);
                          showToast(`Failed to upload ${file.name}`, "error");
                        } finally {
                          setUploadingGallery(prev => prev.filter(p => p.id !== uploadId));
                        }
                      }
                    }}
                  />
                </>
              )}
            </div>
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
  flexWrap: "wrap",
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

const thumbnailWrapper: React.CSSProperties = {
  position: "relative",
  width: 80,
  height: 80,
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  flexShrink: 0,
};

const thumbnailImage: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const removeBtn: React.CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  width: 20,
  height: 20,
  backgroundColor: "rgba(0,0,0,0.6)",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  fontSize: "0.65rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const addPhotoBtn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: 80,
  height: 80,
  borderRadius: 8,
  border: "1px dashed #d1d5db",
  backgroundColor: "#f9fafb",
  color: "#6b7280",
  fontSize: "0.75rem",
  cursor: "pointer",
  gap: 4,
};

const uploadingOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.7)",
};

const spinnerStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "3px solid #e5e7eb",
  borderTopColor: "#246344",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};
