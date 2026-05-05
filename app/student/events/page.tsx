"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEvents, EventFilters } from "@/hooks/useEvents";
import { DEPARTMENT_OPTIONS } from "@/constants/index";

/* ── Default filter values ── */

const DEFAULT_FILTERS: EventFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  location: "",
  categories: ["All"],
  pointMin: 10,
  pointMax: 200,
};

/* ── Component ── */

export default function StudentEventsPage() {
  const [filters, setFilters] = useState<EventFilters>({ ...DEFAULT_FILTERS });
  const [draft, setDraft] = useState<EventFilters>({ ...DEFAULT_FILTERS });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  const { events, loading, error } = useEvents(filters);

  /* close drawer on outside click */
  useEffect(() => {
    if (!drawerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [drawerOpen]);

  /* lock body scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  /* ── helpers ── */

  const formatDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return "Date TBD";
    try {
      const d = new Date(dateStr);
      const month = d.toLocaleString("en-US", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();
      const time = timeStr ? ` at ${timeStr}` : "";
      return `${month} ${day}, ${year}${time}`;
    } catch {
      return dateStr;
    }
  };

  const setDraftField = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleCategoryToggle = (cat: string) => {
    setDraft((prev) => {
      const current = prev.categories ?? ["All"];
      if (cat === "All") return { ...prev, categories: ["All"] };
      let next = current.filter((c) => c !== "All");
      if (next.includes(cat)) {
        next = next.filter((c) => c !== cat);
      } else {
        next = [...next, cat];
      }
      if (next.length === 0) next = ["All"];
      return { ...prev, categories: next };
    });
  };

  const openDrawer = () => {
    setDraft({ ...filters });
    setDrawerOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...draft });
    setDrawerOpen(false);
  };

  const clearDraft = () => setDraft({ ...DEFAULT_FILTERS });

  const clearFilters = () => setFilters({ ...DEFAULT_FILTERS });

  const removeFilter = (key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "search") next.search = "";
      if (key === "dateFrom") next.dateFrom = "";
      if (key === "dateTo") next.dateTo = "";
      if (key === "location") next.location = "";
      if (key === "categories") next.categories = ["All"];
      if (key === "pointMin") next.pointMin = DEFAULT_FILTERS.pointMin;
      if (key === "pointMax") next.pointMax = DEFAULT_FILTERS.pointMax;
      return next;
    });
  };

  /* ── active filter chips ── */

  const chips: { key: string; label: string }[] = [];
  if (filters.search) chips.push({ key: "search", label: `"${filters.search}"` });
  if (filters.dateFrom) chips.push({ key: "dateFrom", label: `From ${filters.dateFrom}` });
  if (filters.dateTo) chips.push({ key: "dateTo", label: `Until ${filters.dateTo}` });
  if (filters.location) chips.push({ key: "location", label: `📍 ${filters.location}` });
  if (filters.categories && !filters.categories.includes("All")) {
    chips.push({ key: "categories", label: filters.categories.join(", ") });
  }
  if (filters.pointMin !== DEFAULT_FILTERS.pointMin) {
    chips.push({ key: "pointMin", label: `Min ${filters.pointMin} pts` });
  }
  if (filters.pointMax !== DEFAULT_FILTERS.pointMax) {
    chips.push({ key: "pointMax", label: `Max ${filters.pointMax} pts` });
  }

  const hasFilters = chips.length > 0;

  /* ── Render ── */

  return (
    <div style={pageWrap}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .ev-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ev-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.10) !important;
        }
        @media (max-width: 1100px) {
          .ev-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 680px) {
          .ev-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .ev-header-row { flex-direction: column; align-items: flex-start !important; gap: 12px !important; }
          .ev-filter-panel { width: 100% !important; max-width: 100% !important; }
        }
        @media (max-width: 480px) {
          .ev-grid { gap: 10px !important; }
        }
        .drawer-overlay {
          animation: fadeIn 0.2s ease;
        }
        .drawer-panel {
          animation: slideIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); } to { transform: translateX(0); }
        }
      `}</style>

      {/* ── Header row ── */}
      <div className="ev-header-row" style={headerRow}>
        <div>
          <h1 style={pageTitle}>Discover Events</h1>
          <p style={pageSubtitle}>{events.length} event{events.length !== 1 ? "s" : ""} available</p>
        </div>
        <button onClick={openDrawer} style={filterBtn}>
          <span>⚙️</span> Filters {hasFilters && <span style={filterCount}>{chips.length}</span>}
        </button>
      </div>

      {/* ── Active Filter Chips ── */}
      {hasFilters && (
        <div style={chipRow}>
          {chips.map((chip) => (
            <span key={chip.key} style={chipStyle}>
              {chip.label}
              <button
                onClick={() => removeFilter(chip.key)}
                style={chipX}
                aria-label={`Remove ${chip.label} filter`}
              >
                ×
              </button>
            </span>
          ))}
          <button onClick={clearFilters} style={clearAllBtn}>Clear all</button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={errorBox}>
          <p style={{ margin: 0, color: "#dc2626" }}>
            Failed to load events. Please try again.
          </p>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="ev-grid" style={eventsGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={cardStyle}>
              <div style={skeletonImage} />
              <div style={cardBody}>
                <div style={{ ...skeletonLine, width: "75%", height: 16 }} />
                <div style={{ ...skeletonLine, width: "60%" }} />
                <div style={{ ...skeletonLine, width: "45%" }} />
                <div style={{ ...skeletonLine, width: "30%", marginTop: 8 }} />
                <div
                  style={{
                    ...skeletonLine,
                    width: "100%",
                    height: 36,
                    marginTop: 12,
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && events.length === 0 && (
        <div style={emptyState}>
          <span style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</span>
          <p style={emptyTitle}>No events found</p>
          <p style={emptySubtext}>Try adjusting your filters.</p>
        </div>
      )}

      {/* ── Event Cards ── */}
      {!loading && !error && events.length > 0 && (
        <div className="ev-grid" style={eventsGrid}>
          {events.map((ev) => {
            const current = (ev.currentParticipants as number) ?? 0;
            const max = (ev.maxParticipants as number) ?? 0;
            const isFull = max > 0 && current >= max;
            const imageUrl = (ev.coverURL ?? ev.imageURL) as string | undefined;

            return (
              <div key={ev.id} className="ev-card" style={cardStyle}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={ev.title ?? "Event"}
                    style={cardImageStyle}
                  />
                ) : (
                  <div style={cardImagePlaceholder}>
                    <span style={{ fontSize: "2rem" }}>📅</span>
                  </div>
                )}

                <div style={cardBody}>
                  <h3 style={cardTitleStyle}>
                    {ev.title ?? "Untitled Event"}
                  </h3>

                  <p style={cardMeta}>
                    📅 {formatDate(ev.date, ev.time as string | undefined)}
                  </p>

                  <p style={{ ...cardMeta, ...truncateStyle }}>
                    📍 {ev.location ?? "Location TBD"}
                  </p>

                  <div style={badgeRow}>
                    {ev.pointValue !== undefined && (
                      <span style={pointBadge}>+{ev.pointValue} pts</span>
                    )}
                    {max > 0 && (
                      <span style={isFull ? fullBadge : spotsBadge}>
                        {isFull ? "Full" : `${current} / ${max} spots`}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/student/events/${ev.id}`)}
                    style={viewBtn}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1b4e35";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#246344";
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter Drawer Overlay ── */}
      {drawerOpen && (
        <div ref={overlayRef} className="drawer-overlay" style={overlay}>
          <div className="drawer-panel" style={drawer}>
            {/* Drawer header */}
            <div style={drawerHeader}>
              <h2 style={drawerTitle}>Filters</h2>
              <button onClick={() => setDrawerOpen(false)} style={drawerCloseBtn}>
                ✕
              </button>
            </div>

            {/* Drawer body */}
            <div style={drawerBody}>
              {/* Search */}
              <div style={fg}>
                <label style={fl} htmlFor="drawer-search">Search</label>
                <input
                  id="drawer-search"
                  type="text"
                  placeholder="Search events..."
                  value={draft.search ?? ""}
                  onChange={(e) => setDraftField("search", e.target.value)}
                  style={fi}
                />
              </div>

              {/* Date range */}
              <div style={fg}>
                <label style={fl}>Date Range</label>
                <div style={frow}>
                  <input
                    type="date"
                    aria-label="Date from"
                    value={draft.dateFrom ?? ""}
                    onChange={(e) => setDraftField("dateFrom", e.target.value)}
                    style={{ ...fi, flex: 1 }}
                  />
                  <span style={{ color: "#9ca3af", alignSelf: "center" }}>–</span>
                  <input
                    type="date"
                    aria-label="Date to"
                    value={draft.dateTo ?? ""}
                    onChange={(e) => setDraftField("dateTo", e.target.value)}
                    style={{ ...fi, flex: 1 }}
                  />
                </div>
              </div>

              {/* Location */}
              <div style={fg}>
                <label style={fl} htmlFor="drawer-location">Location</label>
                <input
                  id="drawer-location"
                  type="text"
                  placeholder="Filter by city / location"
                  value={draft.location ?? ""}
                  onChange={(e) => setDraftField("location", e.target.value)}
                  style={fi}
                />
              </div>

              {/* Categories */}
              <div style={fg}>
                <label style={fl}>Department / Category</label>
                <div style={catGrid}>
                  {DEPARTMENT_OPTIONS.map((cat) => {
                    const checked = (draft.categories ?? []).includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryToggle(cat)}
                        style={{
                          ...catBtn,
                          background: checked ? "#246344" : "#f9fafb",
                          color: checked ? "#fff" : "#374151",
                          border: checked ? "1.5px solid #246344" : "1.5px solid #d1d5db",
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Point range */}
              <div style={fg}>
                <label style={fl}>Point Range</label>
                <div style={frow}>
                  <div style={{ flex: 1 }}>
                    <span style={fmini}>Min</span>
                    <input
                      type="number"
                      aria-label="Min points"
                      value={draft.pointMin ?? ""}
                      onChange={(e) =>
                        setDraftField(
                          "pointMin",
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                      style={fi}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={fmini}>Max</span>
                    <input
                      type="number"
                      aria-label="Max points"
                      value={draft.pointMax ?? ""}
                      onChange={(e) =>
                        setDraftField(
                          "pointMax",
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                      style={fi}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div style={drawerFooter}>
              <button onClick={clearDraft} style={clearDraftBtn}>Clear All</button>
              <button onClick={applyFilters} style={applyBtn}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ STYLES ═══════════════════════════════ */

const pageWrap: React.CSSProperties = {
  flex: 1,
  padding: "1.5rem 1rem",
  background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  minHeight: "100vh",
};

/* ── Header ── */

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const pageTitle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const pageSubtitle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#9ca3af",
  margin: "4px 0 0",
};

const filterBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  background: "#fff",
  border: "1.5px solid #d1d5db",
  borderRadius: 10,
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "#374151",
  cursor: "pointer",
  transition: "all 0.2s",
};

const filterCount: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "#246344",
  color: "#fff",
  fontSize: "0.7rem",
  fontWeight: 700,
};

/* ── Chips ── */

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginBottom: 20,
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderRadius: 20,
  background: "#f0faf5",
  border: "1px solid #bbf7d0",
  color: "#246344",
  fontSize: "0.78rem",
  fontWeight: 500,
};

const chipX: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#246344",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.9rem",
  lineHeight: 1,
  padding: 0,
};

const clearAllBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#dc2626",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 8px",
};

/* ── Grid & Cards ── */

const eventsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
};

const cardImageStyle: React.CSSProperties = {
  width: "100%",
  height: 200,
  objectFit: "cover",
  display: "block",
};

const cardImagePlaceholder: React.CSSProperties = {
  width: "100%",
  height: 200,
  background: "linear-gradient(135deg, #f0faf5 0%, #e0f2fe 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardBody: React.CSSProperties = {
  padding: "16px 20px 20px",
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 10px",
  lineHeight: 1.3,
};

const cardMeta: React.CSSProperties = {
  fontSize: "0.82rem",
  color: "#6b7280",
  margin: "0 0 4px",
  lineHeight: 1.4,
};

const truncateStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const badgeRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  margin: "10px 0 0",
};

const pointBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 12px",
  borderRadius: 12,
  fontSize: "0.76rem",
  fontWeight: 600,
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
};

const spotsBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 12px",
  borderRadius: 12,
  fontSize: "0.76rem",
  fontWeight: 500,
  color: "#6b7280",
  background: "#f3f4f6",
};

const fullBadge: React.CSSProperties = {
  ...spotsBadge,
  color: "#dc2626",
  background: "#fef2f2",
  fontWeight: 600,
};

const viewBtn: React.CSSProperties = {
  marginTop: "auto",
  width: "100%",
  padding: "11px 0",
  background: "#246344",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  fontSize: "0.88rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s",
  marginBlockStart: 14,
};

/* ── Skeleton & Empty ── */

const skeletonImage: React.CSSProperties = {
  width: "100%",
  height: 200,
  background:
    "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
  backgroundSize: "800px 100%",
  animation: "shimmer 1.5s infinite linear",
};

const skeletonLine: React.CSSProperties = {
  height: 12,
  borderRadius: 4,
  background:
    "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
  backgroundSize: "800px 100%",
  animation: "shimmer 1.5s infinite linear",
  marginBottom: 8,
};

const emptyState: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 350,
  textAlign: "center",
};

const emptyTitle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "#374151",
  margin: "0 0 4px",
};

const emptySubtext: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#9ca3af",
  margin: 0,
};

const errorBox: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "0.75rem 1rem",
  marginBottom: "1rem",
};

/* ── Drawer ── */

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  zIndex: 9999,
  display: "flex",
  justifyContent: "flex-end",
};

const drawer: React.CSSProperties = {
  width: 380,
  maxWidth: "90vw",
  height: "100vh",
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
};

const drawerHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px 16px",
  borderBottom: "1px solid #e5e7eb",
};

const drawerTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.15rem",
  fontWeight: 700,
  color: "#111827",
};

const drawerCloseBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "1.2rem",
  color: "#9ca3af",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 6,
  transition: "color 0.2s",
};

const drawerBody: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px",
};

const drawerFooter: React.CSSProperties = {
  padding: "16px 24px",
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  gap: 12,
};

/* ── Drawer form elements ── */

const fg: React.CSSProperties = { marginBottom: 22 };

const fl: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const fmini: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  color: "#6b7280",
  marginBottom: 4,
};

const fi: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: "0.88rem",
  border: "1.5px solid #e5e7eb",
  borderRadius: 10,
  outline: "none",
  background: "#f9fafb",
  color: "#111827",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};

const frow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const catGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const catBtn: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 20,
  fontSize: "0.8rem",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s",
  whiteSpace: "nowrap",
};

const clearDraftBtn: React.CSSProperties = {
  flex: 1,
  padding: "11px 0",
  background: "#f9fafb",
  border: "1.5px solid #d1d5db",
  borderRadius: 10,
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "#374151",
  cursor: "pointer",
  transition: "background 0.2s",
};

const applyBtn: React.CSSProperties = {
  flex: 2,
  padding: "11px 0",
  background: "#246344",
  border: "none",
  borderRadius: 10,
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "#fff",
  cursor: "pointer",
  transition: "background 0.2s",
};
