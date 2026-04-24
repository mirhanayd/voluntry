"use client";

import React, { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useToast } from "@/hooks/useToast";

/* ── Props ─────────────────────────────────────────────────────────────────── */

interface ImageUploadProps {
  currentImageURL?: string;
  storagePath: string;
  onUploadComplete: (downloadURL: string) => void;
  shape?: "circle" | "square";
  size?: number;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function ImageUpload({
  currentImageURL,
  storagePath,
  onUploadComplete,
  shape = "circle",
  size = 120,
}: ImageUploadProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewURL, setPreviewURL] = useState<string | undefined>(
    currentImageURL
  );

  /* Update preview when prop changes */
  React.useEffect(() => {
    setPreviewURL(currentImageURL);
  }, [currentImageURL]);

  const handleClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so same file can be re-selected
    e.target.value = "";

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Only JPEG, PNG, and WebP images are allowed", "error");
      return;
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be smaller than 5MB", "error");
      return;
    }

    // Upload
    setUploading(true);
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setPreviewURL(downloadURL);
      onUploadComplete(downloadURL);
    } catch (err) {
      console.error("Image upload failed:", err);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  /* ── Styles ────────────────────────────────────────────────────────────── */

  const borderRadius = shape === "circle" ? "50%" : 10;

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    borderRadius,
    cursor: uploading ? "wait" : "pointer",
    overflow: "hidden",
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    borderRadius,
  };

  const placeholderStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#e5e7eb",
    borderRadius,
    color: "#9ca3af",
    gap: 4,
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius,
    opacity: 0,
    transition: "opacity 0.2s ease",
  };

  const spinnerSize = Math.max(28, size * 0.3);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        style={wrapperStyle}
        onClick={handleClick}
        title="Click to upload image"
        onMouseEnter={(e) => {
          const overlay = e.currentTarget.querySelector(
            "[data-overlay]"
          ) as HTMLElement;
          if (overlay) overlay.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          const overlay = e.currentTarget.querySelector(
            "[data-overlay]"
          ) as HTMLElement;
          if (overlay && !uploading) overlay.style.opacity = "0";
        }}
      >
        {previewURL ? (
          <img src={previewURL} alt="Profile" style={imageStyle} />
        ) : (
          <div style={placeholderStyle}>
            {/* Camera icon */}
            <svg
              width={size * 0.28}
              height={size * 0.28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span style={{ fontSize: Math.max(10, size * 0.09), fontWeight: 500 }}>
              Upload
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div
          data-overlay=""
          style={{
            ...overlayStyle,
            opacity: uploading ? 1 : undefined,
          }}
        >
          {uploading ? (
            <div
              style={{
                width: spinnerSize,
                height: spinnerSize,
                border: "3px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "img-upload-spin 0.7s linear infinite",
              }}
            />
          ) : (
            <svg
              width={size * 0.22}
              height={size * 0.22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Keyframe injection (once) */}
      <style>{`
        @keyframes img-upload-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
