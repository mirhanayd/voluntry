"use client";

import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface University {
  id: string;
  name: string;
  shortName: string;
}

interface Department {
  id: string;
  name: string;
  category: string;
}

// ─── SEARCHABLE DROPDOWN ──────────────────────────────────────────────────────

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  displayKey,
  groupKey,
}: {
  options: any[];
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder: string;
  displayKey: string;
  groupKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o[displayKey].toLowerCase().includes(search.toLowerCase())
  );

  // Group by category if groupKey provided
  const grouped: Record<string, any[]> = {};
  if (groupKey) {
    filtered.forEach((o) => {
      const g = o[groupKey] || "Other";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(o);
    });
  }

  const handleSelect = (opt: any) => {
    onChange(opt.id, opt[displayKey]);
    setLabel(opt[displayKey]);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...styles.input,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          color: label ? "#111827" : "#9ca3af",
          userSelect: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label || placeholder}
        </span>
        <span style={{ fontSize: "10px", marginLeft: "8px", flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={styles.dropdown}>
          {/* Search input */}
          <div style={{ padding: "8px" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                ...styles.input,
                margin: 0,
                fontSize: "13px",
                padding: "8px 10px",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={styles.noResult}>No results found</div>
            )}

            {groupKey
              ? Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <div style={styles.groupLabel}>{group}</div>
                    {items.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => handleSelect(opt)}
                        style={{
                          ...styles.option,
                          backgroundColor:
                            value === opt.id ? "#f0faf5" : "transparent",
                          fontWeight: value === opt.id ? 600 : 400,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#f0faf5")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            value === opt.id ? "#f0faf5" : "transparent")
                        }
                      >
                        {opt[displayKey]}
                      </div>
                    ))}
                  </div>
                ))
              : filtered.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt)}
                    style={{
                      ...styles.option,
                      backgroundColor:
                        value === opt.id ? "#f0faf5" : "transparent",
                      fontWeight: value === opt.id ? 600 : 400,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f0faf5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        value === opt.id ? "#f0faf5" : "transparent")
                    }
                  >
                    <span>{opt[displayKey]}</span>
                    {opt.shortName && opt.shortName !== opt[displayKey] && (
                      <span style={styles.badge}>{opt.shortName}</span>
                    )}
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    universityId: "",
    universityName: "",
    departmentId: "",
    departmentName: "",
    studentNumber: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch universities and departments from Firestore
  useEffect(() => {
    const fetchData = async () => {
      const [uniSnap, deptSnap] = await Promise.all([
        getDocs(query(collection(db, "universities"))),
        getDocs(query(collection(db, "departments"))),
      ]);
      const unis = uniSnap.docs.map((d) => ({ id: d.id, ...d.data() } as University));
      const depts = deptSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Department));
      unis.sort((a, b) => a.name.localeCompare(b.name));
      depts.sort((a, b) => a.name.localeCompare(b.name));
      setUniversities(unis);
      setDepartments(depts);
    };
    fetchData();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Please enter your full name.";
    if (!form.email.trim()) return "Please enter your email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!form.universityId) return "Please select your university.";
    if (!form.departmentId) return "Please select your department.";
    if (!form.studentNumber.trim()) return "Please enter your student number.";
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // Write user document to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: "student",
        status: "pending",
        universityId: form.universityId,
        universityName: form.universityName,
        departmentId: form.departmentId,
        departmentName: form.departmentName,
        studentNumber: form.studentNumber.trim(),
        points: 0,
        createdAt: new Date().toISOString(),
      });

      router.push("/pending"); // A page that says "Your account is pending approval"
    } catch (err: any) {
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password must be at least 6 characters.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrapper}>
          <img src="/logo.png" alt="VolunTRY" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join VolunTRY and start volunteering</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleRegister} style={styles.form}>

          {/* Full Name */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="John Doe"
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#246344")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="example@email.com"
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#246344")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>

          {/* Password row */}
          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#246344")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#246344")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
          </div>

          {/* University */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>University</label>
            <SearchableDropdown
              options={universities}
              value={form.universityId}
              onChange={(id, name) =>
                setForm((p) => ({ ...p, universityId: id, universityName: name }))
              }
              placeholder="Select your university"
              displayKey="name"
            />
          </div>

          {/* Department */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Department</label>
            <SearchableDropdown
              options={departments}
              value={form.departmentId}
              onChange={(id, name) =>
                setForm((p) => ({ ...p, departmentId: id, departmentName: name }))
              }
              placeholder="Select your department"
              displayKey="name"
              groupKey="category"
            />
          </div>

          {/* Student Number */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Student Number</label>
            <input
              type="text"
              value={form.studentNumber}
              onChange={(e) => handleChange("studentNumber", e.target.value)}
              placeholder="e.g. 20120874"
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#246344")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget.style.backgroundColor = "#1a4a32");
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget.style.backgroundColor = "#246344");
            }}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p style={styles.loginText}>
          Already have an account?{" "}
          <Link href="/login" style={styles.loginLink}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "32px 16px",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    padding: "40px 36px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  },
  logoWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "24px",
  },
  logo: {
    height: "64px",
    objectFit: "contain",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 4px 0",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center",
    margin: "0 0 28px 0",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "14px",
    marginBottom: "16px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  row: {
    display: "flex",
    gap: "12px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s",
    color: "#111827",
    backgroundColor: "#ffffff",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "8px",
    padding: "12px",
    backgroundColor: "#246344",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    transition: "background-color 0.2s",
    width: "100%",
  },
  loginText: {
    textAlign: "center",
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "20px",
  },
  loginLink: {
    color: "#246344",
    fontWeight: "600",
    textDecoration: "none",
  },
  // Dropdown styles
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 999,
  },
  option: {
    padding: "9px 14px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "background-color 0.1s",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#111827",
  },
  groupLabel: {
    padding: "6px 14px 4px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#246344",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderTop: "1px solid #f3f4f6",
  },
  badge: {
    fontSize: "11px",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    padding: "2px 6px",
    borderRadius: "4px",
    flexShrink: 0,
  },
  noResult: {
    padding: "12px 14px",
    fontSize: "13px",
    color: "#9ca3af",
    textAlign: "center",
  },
};