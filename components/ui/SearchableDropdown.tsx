"use client";

import React, { useEffect, useRef, useState } from "react";

interface SearchableDropdownProps {
  options: any[];
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder: string;
  displayKey: string;
  groupKey?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  displayKey,
  groupKey,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o[displayKey].toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (opt: any) => {
    setLabel(opt[displayKey]);
    onChange(opt.id, opt[displayKey]);
    setOpen(false);
    setSearch("");
  };

  // Group by groupKey (if provided)
  const grouped: Record<string, any[]> = {};
  if (groupKey) {
    filtered.forEach((item) => {
      const group = item[groupKey] || "Other";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });
  }

  return (
    <div style={{ position: "relative" }} ref={wrapRef}>
      <input
        style={styles.input}
        value={open ? search : label || ""}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => setSearch(e.target.value)}
      />

      {open && (
        <div style={styles.dropdown}>
          {filtered.length === 0 && (
            <div style={styles.noResult}>No results found</div>
          )}

          {!groupKey &&
            filtered.map((opt) => (
              <div
                key={opt.id}
                style={{
                  ...styles.option,
                  background: value === opt.id ? "#f0faf5" : "transparent",
                }}
                onClick={() => handleSelect(opt)}
              >
                <span>{opt[displayKey]}</span>
                {opt.shortName && opt.shortName !== opt[displayKey] && (
                  <span style={styles.badge}>{opt.shortName}</span>
                )}
              </div>
            ))}

          {groupKey &&
            Object.entries(grouped).map(([groupName, list]) => (
              <div key={groupName}>
                <div style={styles.groupLabel}>{groupName}</div>
                {list.map((opt) => (
                  <div
                    key={opt.id}
                    style={{
                      ...styles.option,
                      background: value === opt.id ? "#f0faf5" : "transparent",
                    }}
                    onClick={() => handleSelect(opt)}
                  >
                    <span>{opt[displayKey]}</span>
                    {opt.shortName && opt.shortName !== opt[displayKey] && (
                      <span style={styles.badge}>{opt.shortName}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export { SearchableDropdown };

const styles: Record<string, React.CSSProperties> = {
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    maxHeight: 240,
    overflowY: "auto",
    zIndex: 999,
  },
  option: {
    padding: "9px 14px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "background 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#111827",
  },
  groupLabel: {
    padding: "8px 14px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    background: "#f9fafb",
  },
  badge: {
    background: "#e5e7eb",
    color: "#374151",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: 10,
    fontWeight: 600,
  },
  noResult: {
    padding: "10px 14px",
    fontSize: "13px",
    color: "#9ca3af",
  },
};
