"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEvents, EventFilters } from "@/hooks/useEvents";
import { DEPARTMENT_OPTIONS } from "@/constants/index";

/* ── Başlangıç değerleri (hepsini boş bırakıyorum şimdilik) ── */

const DEFAULT_FILTERS: EventFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  location: "",
  categories: ["All"],
  pointMin: 10,
  pointMax: 200,
};

/* ── Ana sayfa componenti (burası biraz karışık olabilir) ── */

export default function StudentEventsPage() {
  const [filters, setFilters] = useState<EventFilters>({ ...DEFAULT_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  // Filtreleri hook'a yolluyoruz ki verileri çeksin
  const { events, loading, error } = useEvents(filters);

  // Skeleton shimmer + responsive grid + hover icin style inject
  useEffect(() => {
    const id = "events-page-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
      .ev-card:hover {
        transform: scale(1.01);
        box-shadow: 0 6px 20px rgba(0,0,0,0.10) !important;
      }
      @media (max-width: 1100px) {
        .ev-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 700px) {
        .ev-grid { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Tarih formatlama ("Apr 22, 2026 at 14:30" gibi)
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

  /* ── Yardımcı fonksiyonlar  ── */

  const set = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleCategoryToggle = (cat: string) => {
    setFilters((prev) => {
      const current = prev.categories ?? ["All"];

      if (cat === "All") {
        return { ...prev, categories: ["All"] };
      }

      let next = current.filter((c) => c !== "All");

      if (next.includes(cat)) {
        next = next.filter((c) => c !== cat);
      } else {
        next = [...next, cat];
      }

      // Eğer hiçbir şey seçili değilse 'All' yapalım, patlamasın kod
      if (next.length === 0) next = ["All"];

      return { ...prev, categories: next };
    });
  };

  const clearFilters = () => setFilters({ ...DEFAULT_FILTERS });

  /* ── Ekrana bastığımız kısım) ── */

  return (
    <div style={pageWrap} className="events-layout">
      {/* Responsive styles */}
      <style>{`
        .events-layout {
          display: flex;
        }
        .filter-panel {
          width: 260px;
          min-width: 260px;
        }
        .filter-toggle-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .events-layout {
            flex-direction: column;
          }
          .filter-panel {
            width: 100%;
            min-width: unset;
          }
          .filter-toggle-btn {
            display: block;
            margin-bottom: 12px;
          }
          .filter-panel.hidden {
            display: none;
          }
        }
      `}</style>

      {/* ── Filtre Paneli (solda duracak) ── */}
      <aside
        style={filterPanel}
        className={`filter-panel${!showFilters ? ' hidden' : ''}`}
      >
        <div style={filterHeader}>
          <h2 style={filterTitle}>Filters</h2>
          <button
            onClick={clearFilters}
            style={clearBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(36,99,68,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Clear Filters
          </button>
        </div>

        {/* Arama kutusu */}
        <div style={filterGroup}>
          <label style={labelStyle} htmlFor="search-events">
            Search
          </label>
          <input
            id="search-events"
            type="text"
            placeholder="Search events..."
            value={filters.search ?? ""}
            onChange={(e) => set("search", e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Tarih aralığı flan */}
        <div style={filterGroup}>
          <label style={labelStyle}>Date Range</label>
          <div style={rowGap}>
            <input
              type="date"
              aria-label="Date from"
              value={filters.dateFrom ?? ""}
              onChange={(e) => set("dateFrom", e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="date"
              aria-label="Date to"
              value={filters.dateTo ?? ""}
              onChange={(e) => set("dateTo", e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Mekan / Şehir filtresi */}
        <div style={filterGroup}>
          <label style={labelStyle} htmlFor="location-filter">
            Location
          </label>
          <input
            id="location-filter"
            type="text"
            placeholder="Filter by city / location"
            value={filters.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Kategoriler (havalıcheckbox ) */}
        <div style={filterGroup}>
          <label style={labelStyle}>Department / Category</label>
          <div style={checkboxList}>
            {DEPARTMENT_OPTIONS.map((cat) => {
              const checked = (filters.categories ?? []).includes(cat);
              return (
                <label key={cat} style={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCategoryToggle(cat)}
                    style={checkboxInput}
                  />
                  <span style={checkboxLabel}>{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Puan aralığı (min-max) */}
        <div style={filterGroup}>
          <label style={labelStyle}>Point Range</label>
          <div style={rowGap}>
            <div style={{ flex: 1 }}>
              <span style={miniLabel}>Min</span>
              <input
                type="number"
                aria-label="Min points"
                value={filters.pointMin ?? ""}
                onChange={(e) =>
                  set(
                    "pointMin",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={miniLabel}>Max</span>
              <input
                type="number"
                aria-label="Max points"
                value={filters.pointMax ?? ""}
                onChange={(e) =>
                  set(
                    "pointMax",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Etkinlik kartları alanı ── */}
      <main style={mainArea}>
        {/* Filter toggle button — mobile only */}
        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilters((v) => !v)}
          style={{
            background: '#fff',
            border: '1px solid #246344',
            color: '#246344',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showFilters ? '🔼 Hide Filters' : '🔽 Filters'}
        </button>
        <h1 style={pageTitle}>Discover Events</h1>

        {/* Hata */}
        {error && (
          <div style={errorBox}>
            <p style={{ margin: 0, color: "#dc2626" }}>
              Failed to load events. Please try again.
            </p>
          </div>
        )}

        {/* Yükleniyor: Skeleton kartlar */}
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

        {/* Sonuç yok */}
        {!loading && !error && events.length === 0 && (
          <div style={emptyState}>
            <span style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</span>
            <p style={emptyTitle}>No events found</p>
            <p style={emptySubtext}>Try adjusting your filters.</p>
          </div>
        )}

        {/* Etkinlik Kartları */}
        {!loading && !error && events.length > 0 && (
          <div className="ev-grid" style={eventsGrid}>
            {events.map((ev) => {
              const current = (ev.currentParticipants as number) ?? 0;
              const max = (ev.maxParticipants as number) ?? 0;
              const isFull = max > 0 && current >= max;
              const imageUrl = (ev.coverURL ?? ev.imageURL) as string | undefined;

              return (
                <div key={ev.id} className="ev-card" style={cardStyle}>
                  {/* Kapak görseli */}
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
                    {/* Başlık */}
                    <h3 style={cardTitleStyle}>
                      {ev.title ?? "Untitled Event"}
                    </h3>

                    {/* Tarih */}
                    <p style={cardMeta}>
                      📅 {formatDate(ev.date, ev.time as string | undefined)}
                    </p>

                    {/* Lokasyon */}
                    <p style={{ ...cardMeta, ...truncateStyle }}>
                      📍 {ev.location ?? "Location TBD"}
                    </p>

                    {/* Puan + Kontenjan */}
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

                    {/* Detay butonu */}
                    <button
                      onClick={() =>
                        router.push(`/student/events/${ev.id}`)
                      }
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
      </main>
    </div>
  );
}

/* ── CSS Stilleri (inline faln)─ */

const pageWrap: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: "100vh",
  background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const filterPanel: React.CSSProperties = {
  width: 260,
  minWidth: 260,
  background: "#f9fafb",
  borderRight: "1px solid #e5e7eb",
  padding: "1.5rem 1rem",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const filterHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.75rem",
};

const filterTitle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const clearBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#246344",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 6,
  transition: "background 0.2s",
};

const filterGroup: React.CSSProperties = {
  marginBottom: "1rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.35rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const miniLabel: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  color: "#6b7280",
  marginBottom: 2,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "0.85rem",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  outline: "none",
  background: "#ffffff",
  color: "#111827",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const rowGap: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const checkboxList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  maxHeight: 200,
  overflowY: "auto",
};

const checkboxRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const checkboxInput: React.CSSProperties = {
  accentColor: "#246344",
  width: 15,
  height: 15,
  cursor: "pointer",
};

const checkboxLabel: React.CSSProperties = {
  fontSize: "0.84rem",
  color: "#374151",
};

const mainArea: React.CSSProperties = {
  flex: 1,
  padding: "2rem 2.5rem",
  overflowY: "auto",
};

const pageTitle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 1.5rem",
};

const errorBox: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "0.75rem 1rem",
  marginBottom: "1rem",
};

/* ── Grid & Kartlar ── */

const eventsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  transition: "transform 0.2s, box-shadow 0.2s",
  display: "flex",
  flexDirection: "column",
};

const cardImageStyle: React.CSSProperties = {
  width: "100%",
  height: 180,
  objectFit: "cover",
  display: "block",
};

const cardImagePlaceholder: React.CSSProperties = {
  width: "100%",
  height: 180,
  background: "#f0faf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardBody: React.CSSProperties = {
  padding: "14px 16px 16px",
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 8px",
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
  margin: "8px 0 0",
};

const pointBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: "0.76rem",
  fontWeight: 600,
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
};

const spotsBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
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
  padding: "10px 0",
  background: "#246344",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s",
};

/* ── Skeleton & Empty state ── */

const skeletonImage: React.CSSProperties = {
  width: "100%",
  height: 180,
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
