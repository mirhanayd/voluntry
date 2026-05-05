"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

type DirectoryRole = "student" | "organizer";

interface DirectoryEntry {
  id: string;
  role: DirectoryRole;
  name: string;
  details: string;
  email: string;
  initials: string;
  searchText: string;
  avatarURL?: string;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function buildDirectoryEntry(id: string, data: DocumentData): DirectoryEntry | null {
  const role = asString(data.role);
  const status = asString(data.status);

  if (status !== "approved" || (role !== "student" && role !== "organizer")) {
    return null;
  }

  const email = asString(data.email);
  const fullName =
    asString(data.fullName) ||
    `${asString(data.firstName)} ${asString(data.lastName)}`.trim();

  const name =
    role === "organizer"
      ? asString(data.organizationName) ||
        fullName ||
        asString(data.contactName) ||
        email ||
        "Organization"
      : fullName || email || "User";

  const details =
    role === "organizer"
      ? [asString(data.organizationType), asString(data.contactName)]
          .filter(Boolean)
          .join(" - ")
      : [asString(data.universityName), asString(data.departmentName)]
          .filter(Boolean)
          .join(" - ");

  return {
    id,
    role,
    name,
    details,
    email,
    initials: getInitials(name),
    searchText: normalize([name, details, email, role].join(" ")),
    avatarURL: asString(data.avatarURL) || undefined,
  };
}

export default function FeedDirectorySearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function fetchApprovedDirectory() {
      setLoading(true);
      setLoadFailed(false);

      try {
        const approvedQuery = query(
          collection(db, "users"),
          where("status", "==", "approved")
        );
        const snap = await getDocs(approvedQuery);
        const rows = snap.docs
          .map((docSnap) => buildDirectoryEntry(docSnap.id, docSnap.data()))
          .filter((entry): entry is DirectoryEntry => Boolean(entry))
          .sort((a, b) => a.name.localeCompare(b.name, "tr"));

        if (active) setEntries(rows);
      } catch (err) {
        console.error("Failed to load approved directory:", err);
        if (active) setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchApprovedDirectory();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const normalizedTerm = normalize(searchTerm);

  const results = useMemo(() => {
    if (!normalizedTerm) return [];
    return entries
      .filter((entry) => entry.searchText.includes(normalizedTerm))
      .slice(0, 8);
  }, [entries, normalizedTerm]);

  const showPanel = open && normalizedTerm.length > 0;

  function openProfile(entry: DirectoryEntry) {
    setOpen(false);
    setSearchTerm("");
    router.push(entry.id === user?.uid ? "/student/profile" : `/student/profile/${entry.id}`);
  }

  return (
    <div ref={wrapperRef} className="feed-directory-search">
      <style>{`
        .feed-directory-search {
          position: relative;
          width: 100%;
          min-width: 0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .fds-input {
          width: 100%;
          height: 38px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #ffffff;
          color: #111827;
          font-size: 0.86rem;
          outline: none;
          padding: 0 13px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .fds-input:focus {
          border-color: #246344;
          box-shadow: 0 0 0 3px rgba(36, 99, 68, 0.12);
        }

        .fds-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: min(420px, calc(100vw - 32px));
          max-height: 380px;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
          z-index: 1010;
          padding: 6px;
        }

        .fds-state {
          padding: 14px;
          font-size: 0.84rem;
          color: #6b7280;
          text-align: center;
        }

        .fds-result {
          width: 100%;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }

        .fds-result:hover,
        .fds-result:focus-visible {
          background: #f9fafb;
          outline: none;
        }

        .fds-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #f0faf5;
          color: #246344;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 800;
          border: 1px solid #d1fae5;
          overflow: hidden;
        }

        .fds-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .fds-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .fds-name,
        .fds-detail,
        .fds-email {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .fds-name {
          color: #111827;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .fds-detail {
          color: #6b7280;
          font-size: 0.78rem;
        }

        .fds-email {
          color: #9ca3af;
          font-size: 0.76rem;
        }

        .fds-chip {
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .fds-chip.student {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .fds-chip.organizer {
          background: #f0faf5;
          color: #246344;
        }

        @media (max-width: 720px) {
          .fds-panel {
            right: auto;
            left: 0;
            width: min(340px, calc(100vw - 24px));
          }
        }
      `}</style>

      <input
        className="fds-input"
        type="search"
        value={searchTerm}
        onChange={(event) => {
          const nextValue = event.target.value;
          setSearchTerm(nextValue);
          setOpen(nextValue.trim().length > 0);
        }}
        onFocus={() => setOpen(searchTerm.trim().length > 0)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Search profiles"
        aria-label="Search profiles"
      />

      {showPanel && (
        <div className="fds-panel" role="listbox">
          {loading && <div className="fds-state">Loading profiles...</div>}

          {!loading && loadFailed && (
            <div className="fds-state">Profiles could not be loaded.</div>
          )}

          {!loading && !loadFailed && results.length === 0 && (
            <div className="fds-state">No matches found.</div>
          )}

          {!loading &&
            !loadFailed &&
            results.map((entry) => (
              <button
                key={entry.id}
                className="fds-result"
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openProfile(entry)}
              >
                <span className="fds-avatar">
                  {entry.avatarURL ? (
                    <img src={entry.avatarURL} alt="" />
                  ) : (
                    entry.initials
                  )}
                </span>
                <span className="fds-main">
                  <span className="fds-name">{entry.name}</span>
                  {entry.details && (
                    <span className="fds-detail">{entry.details}</span>
                  )}
                  {entry.email && <span className="fds-email">{entry.email}</span>}
                </span>
                <span className={`fds-chip ${entry.role}`}>
                  {entry.role === "organizer" ? "Org" : "User"}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
