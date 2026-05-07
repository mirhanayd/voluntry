"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/constants/index";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/Toast";


interface Redemption {
  id: string;
  userId: string;
  rewardId: string;
  rewardTitle: string;
  sponsorName: string;
  pointCost: number;
  redeemedAt: string;
  couponCode: string;
  status: "pending" | "fulfilled";
}

export default function RewardHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "redemptions"),
          where("userId", "==", user.uid),
          orderBy("redeemedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data: Redemption[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as Redemption);
        });
        setRedemptions(data);
      } catch (err) {
        console.error("Error fetching redemption history", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (user) {
        fetchHistory();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const totalPointsSpent = redemptions.reduce((sum, r) => sum + (r.pointCost || 0), 0);
  const totalRewardsRedeemed = redemptions.length;

  const handleCopyCoupon = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast("Coupon code copied!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading) {
    return (
      <main style={mainContent}>
        <div style={headerContainer}>
          <div>
            <div style={{ width: 200, height: 28, background: "#e5e7eb", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 150, height: 20, background: "#e5e7eb", borderRadius: 4 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
      <main style={mainContent}>
        <style>{`
          .coupon-code-box {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f9fafb;
            border: 1px dashed #d1d5db;
            border-radius: 8px;
            padding: 8px 12px;
            margin-top: 8px;
          }
          .coupon-code-text {
            font-family: 'Courier New', monospace;
            font-weight: 700;
            font-size: 14px;
            color: #246344;
            letter-spacing: 1px;
          }
          .coupon-copy-btn {
            background: #246344;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            white-space: nowrap;
          }
          .coupon-copy-btn:hover {
            opacity: 0.85;
          }
          .coupon-copy-btn.copied {
            background: #16a34a;
          }
          .history-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 12px;
            display: flex;
            gap: 16px;
            align-items: flex-start;
            transition: box-shadow 0.2s;
          }
          .history-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
        `}</style>

        {/* Page Header */}
        <header style={headerContainer}>
          <div>
            <h1 style={titleStyle}>Redemption History</h1>
            <p style={subtitleStyle}>Your redeemed rewards and coupon codes</p>
          </div>
          <Link href="/student/rewards" style={backLinkStyle}>
            &larr; Back to Marketplace
          </Link>
        </header>

        {/* Summary Card */}
        {!loading && redemptions.length > 0 && (
          <div style={summaryCardStyle}>
            <div>
              <p style={summaryLabelStyle}>Total Points Spent</p>
              <p style={summaryValueStyle}>{totalPointsSpent}</p>
            </div>
            <div>
              <p style={summaryLabelStyle}>Total Rewards Redeemed</p>
              <p style={summaryValueStyle}>{totalRewardsRedeemed}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="history-card">
                <div style={{ width: 48, height: 48, background: "#e5e7eb", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "40%", height: 20, background: "#e5e7eb", borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ width: "25%", height: 16, background: "#e5e7eb", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: "30%", height: 14, background: "#e5e7eb", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 60, height: 20, background: "#e5e7eb", borderRadius: 12 }} />
                    <div style={{ width: 60, height: 20, background: "#e5e7eb", borderRadius: 12 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : redemptions.length === 0 ? (
          <EmptyState
            emoji="🎁"
            title="No redemptions yet."
            subtitle="Visit the marketplace to redeem your points!"
            action={{ label: "Go to Marketplace", href: "/student/rewards" }}
          />
        ) : (
          <div>
            {redemptions.map((r) => (
              <div key={r.id} className="history-card">
                <div style={iconWrapperStyle}>🎁</div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <h3 style={rewardTitleStyle}>{r.rewardTitle}</h3>
                  <p style={sponsorNameStyle}>{r.sponsorName}</p>
                  <p style={dateStyle}>{formatDateTime(r.redeemedAt)}</p>
                  
                  <div style={bottomRowStyle}>
                    <span style={pointsBadgeStyle}>-{r.pointCost} pts</span>
                    <span style={
                      r.status === "pending" ? pendingBadgeStyle : fulfilledBadgeStyle
                    }>{r.status === "pending" ? "Active" : "Used"}</span>
                  </div>

                  {/* Coupon Code */}
                  {r.couponCode && (
                    <div className="coupon-code-box">
                      <span className="coupon-code-text">{r.couponCode}</span>
                      <button
                        className={`coupon-copy-btn ${copiedId === r.id ? "copied" : ""}`}
                        onClick={() => handleCopyCoupon(r.couponCode, r.id)}
                      >
                        {copiedId === r.id ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainContent: React.CSSProperties = {
  flex: 1,
  padding: "2rem",
  maxWidth: 800,
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
};

const headerContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "24px",
  flexWrap: "wrap",
  gap: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 4px 0",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  margin: 0,
};

const backLinkStyle: React.CSSProperties = {
  color: "#246344",
  fontSize: "14px",
  textDecoration: "none",
  fontWeight: 500,
};

const summaryCardStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px",
  display: "flex",
  gap: "32px",
  marginBottom: "24px",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 4px 0",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const iconWrapperStyle: React.CSSProperties = {
  background: "#f0faf5",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  fontSize: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const rewardTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#111827",
  fontSize: "15px",
  margin: "0 0 2px 0",
};

const sponsorNameStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0 0 4px 0",
};

const dateStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0 0 8px 0",
};

const bottomRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
};

const pointsBadgeStyle: React.CSSProperties = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fca5a5",
  borderRadius: "12px",
  fontSize: "12px",
  padding: "2px 8px",
  fontWeight: 500,
};

const baseBadgeStyle: React.CSSProperties = {
  borderRadius: "12px",
  fontSize: "12px",
  padding: "2px 8px",
  fontWeight: 500,
  textTransform: "capitalize",
};

const pendingBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  background: "#f0faf5",
  color: "#246344",
};

const fulfilledBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  background: "#f3f4f6",
  color: "#6b7280",
};
