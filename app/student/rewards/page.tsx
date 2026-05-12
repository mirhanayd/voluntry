"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, runTransaction, addDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

import { useConfirm } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { formatDateTime } from "@/constants/index";

interface Reward {
  id: string;
  title: string;
  sponsorName: string;
  description: string;
  imageURL: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
}

interface Redemption {
  id: string;
  rewardTitle: string;
  sponsorName: string;
  pointCost: number;
  redeemedAt: string;
  couponCode: string;
  status: "pending" | "fulfilled";
}

/**
 * Generate a unique coupon code from userId + rewardId + timestamp.
 * Format: VTR-XXXX-XXXX (8 alphanumeric chars)
 */
function generateCouponCode(userId: string, rewardId: string, timestamp: string): string {
  const raw = `${userId}-${rewardId}-${timestamp}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Use absolute value and convert to base-36, pad to 8 chars
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
  return `VTR-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myCoupons, setMyCoupons] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"marketplace" | "coupons">("marketplace");

  const confirm = useConfirm();
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        // Fetch user points
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setPoints(userDoc.data().points || 0);
        }

        // Fetch active rewards
        const q = query(collection(db, "rewards"), where("isActive", "==", true));
        const querySnapshot = await getDocs(q);
        const fetchedRewards: Reward[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedRewards.push({ id: docSnap.id, ...docSnap.data() } as Reward);
        });
        setRewards(fetchedRewards);

        // Fetch user's redeemed coupons
        const redemptionQuery = query(
          collection(db, "redemptions"),
          where("userId", "==", user.uid),
          orderBy("redeemedAt", "desc")
        );
        const redemptionSnap = await getDocs(redemptionQuery);
        const fetchedCoupons: Redemption[] = [];
        redemptionSnap.forEach((docSnap) => {
          fetchedCoupons.push({ id: docSnap.id, ...docSnap.data() } as Redemption);
        });
        setMyCoupons(fetchedCoupons);
      } catch (error) {
        console.error("Error fetching rewards data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleRedeem = async (reward: Reward) => {
    if (!user) return;



    const confirmed = await confirm({
      title: "Redeem Reward",
      message: `Are you sure you want to redeem "${reward.title}" for ${reward.pointCost} points?`,
      confirmLabel: "Redeem",
      destructive: false,
    });

    if (!confirmed) return;

    setRedeemingId(reward.id);

    try {
      // Re-fetch users/{uid} to get latest points
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error("User not found");
      const currentPoints = userDoc.data().points || 0;

      if (currentPoints < reward.pointCost) {
        showToast("You don't have enough points.", "error");
        setRedeemingId(null);
        return;
      }

      if (reward.stock <= 0) {
        showToast("This reward is out of stock.", "error");
        setRedeemingId(null);
        return;
      }

      const rewardRef = doc(db, "rewards", reward.id);

      // Run Transaction
      await runTransaction(db, async (transaction) => {
        const tUserDoc = await transaction.get(userRef);
        const tRewardDoc = await transaction.get(rewardRef);

        if (!tUserDoc.exists()) throw new Error("User not found");
        if (!tRewardDoc.exists()) throw new Error("Reward not found");

        const tPoints = tUserDoc.data().points || 0;
        const tStock = tRewardDoc.data().stock || 0;

        if (tPoints < reward.pointCost) {
          throw new Error("INSUFFICIENT_POINTS");
        }
        if (tStock <= 0) {
          throw new Error("OUT_OF_STOCK");
        }

        transaction.update(userRef, { points: tPoints - reward.pointCost });
        transaction.update(rewardRef, { stock: tStock - 1 });
      });

      // Generate unique coupon code
      const redeemedAt = new Date().toISOString();
      const couponCode = generateCouponCode(user.uid, reward.id, redeemedAt);

      // After transaction success, add to redemptions with coupon code
      const redemptionRef = await addDoc(collection(db, "redemptions"), {
        userId: user.uid,
        rewardId: reward.id,
        rewardTitle: reward.title,
        sponsorName: reward.sponsorName,
        pointCost: reward.pointCost,
        redeemedAt,
        couponCode,
        status: "pending"
      });

      showToast("Reward redeemed successfully! 🎉", "success");
      
      // Update local state
      setPoints(prev => prev - reward.pointCost);
      setRewards(prevRewards => prevRewards.map(r => 
        r.id === reward.id ? { ...r, stock: r.stock - 1 } : r
      ));

      // Add the new coupon to the top of the list
      setMyCoupons(prev => [{
        id: redemptionRef.id,
        rewardTitle: reward.title,
        sponsorName: reward.sponsorName,
        pointCost: reward.pointCost,
        redeemedAt,
        couponCode,
        status: "pending",
      }, ...prev]);

    } catch (error: unknown) {
      console.error("Redeem error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (msg === "INSUFFICIENT_POINTS") {
        showToast("You don't have enough points.", "error");
      } else if (msg === "OUT_OF_STOCK") {
        showToast("This reward is out of stock.", "error");
      } else {
        showToast("Failed to redeem reward. Please try again.", "error");
      }
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopyCoupon = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast("Coupon code copied!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If still checking auth
  if (authLoading) {
    return (
      <main style={mainContent}>
        <div style={headerContainer}>
          <div>
            <div style={{ width: 200, height: 28, background: "#e5e7eb", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 300, height: 20, background: "#e5e7eb", borderRadius: 4 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
      <main style={mainContent}>
        <style>{`
          .rewards-grid {
            display: grid;
            gap: 24px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 768px) {
            .rewards-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (min-width: 1024px) {
            .rewards-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
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
          .tab-bar {
            display: flex;
            gap: 0;
            margin-bottom: 24px;
            border-bottom: 2px solid #e5e7eb;
          }
          .tab-btn {
            padding: 10px 20px;
            border: none;
            background: none;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: color 0.2s, border-color 0.2s;
          }
          .tab-btn.active {
            color: #246344;
            border-bottom-color: #246344;
          }
          .tab-btn:hover:not(.active) {
            color: #374151;
          }
          .coupon-card {
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
          .coupon-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
        `}</style>
        
        {/* Page Header */}
        <header style={headerContainer}>
          <div>
            <h1 style={titleStyle}>Reward Marketplace</h1>
            <p style={subtitleStyle}>Redeem your points for exclusive rewards</p>
          </div>
          {!loading && (
            <div style={pointsPill}>
              ⭐ {points} pts available
            </div>
          )}
        </header>

        {/* Tab Bar */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "marketplace" ? "active" : ""}`}
            onClick={() => setActiveTab("marketplace")}
          >
            🎁 Marketplace
          </button>
          <button
            className={`tab-btn ${activeTab === "coupons" ? "active" : ""}`}
            onClick={() => setActiveTab("coupons")}
          >
            🎟️ My Coupons {myCoupons.length > 0 && `(${myCoupons.length})`}
          </button>
        </div>

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <>
            {loading ? (
              <LoadingSkeleton type="card" rows={6} />
            ) : rewards.length === 0 ? (
              <EmptyState
                emoji="🎁"
                title="No rewards available at the moment."
              />
            ) : (
              <div className="rewards-grid">
                {rewards.map((reward) => {
                  const isOutOfStock = reward.stock === 0;
                  const notEnoughPoints = points < reward.pointCost;
                  const isRedeeming = redeemingId === reward.id;
                  const anyRedeeming = redeemingId !== null;
                  
                  let btnLabel = "Redeem";
                  let btnStyle = redeemBtnStyle;
                  
                  if (isOutOfStock) {
                    btnLabel = "Out of Stock";
                    btnStyle = disabledBtnStyle;
                  } else if (notEnoughPoints) {
                    btnLabel = "Not Enough Points";
                    btnStyle = disabledBtnStyle;
                  }

                  return (
                    <div key={reward.id} style={cardStyle}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={reward.imageURL || "https://placehold.co/600x400?text=No+Image"} alt={reward.title} style={imageStyle} />
                      <div style={bodyStyle}>
                        <h3 style={cardTitleStyle}>{reward.title}</h3>
                        <p style={sponsorStyle}>{reward.sponsorName}</p>
                        <p style={descStyle}>{reward.description}</p>
                        
                        <div style={dividerStyle} />
                        
                        <div style={bottomRowStyle}>
                          <span style={costBadgeStyle}>⭐ {reward.pointCost} pts</span>
                          <button 
                            style={isRedeeming ? { ...btnStyle, opacity: 0.7 } : btnStyle}
                            disabled={isOutOfStock || notEnoughPoints || anyRedeeming}
                            onClick={() => handleRedeem(reward)}
                          >
                            {isRedeeming ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="16" opacity="0.5" />
                                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                                Redeeming...
                              </span>
                            ) : (
                              btnLabel
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* My Coupons Tab */}
        {activeTab === "coupons" && (
          <>
            {loading ? (
              <LoadingSkeleton type="card" rows={4} />
            ) : myCoupons.length === 0 ? (
              <EmptyState
                emoji="🎟️"
                title="No coupons yet."
                subtitle="Redeem rewards from the marketplace to get coupon codes!"
              />
            ) : (
              <>
                {/* Summary */}
                <div style={summaryCardStyle}>
                  <div>
                    <p style={summaryLabelStyle}>Total Coupons</p>
                    <p style={summaryValueStyle}>{myCoupons.length}</p>
                  </div>
                  <div>
                    <p style={summaryLabelStyle}>Total Points Spent</p>
                    <p style={summaryValueStyle}>
                      {myCoupons.reduce((sum, c) => sum + (c.pointCost || 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Coupon List */}
                <div>
                  {myCoupons.map((coupon) => (
                    <div key={coupon.id} className="coupon-card">
                      <div style={iconWrapperStyle}>🎟️</div>
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <h3 style={couponTitleStyle}>{coupon.rewardTitle}</h3>
                        <p style={couponSponsorStyle}>{coupon.sponsorName}</p>
                        <p style={couponDateStyle}>{formatDateTime(coupon.redeemedAt)}</p>
                        
                        <div style={couponMetaRow}>
                          <span style={couponPointsBadgeStyle}>-{coupon.pointCost} pts</span>
                          <span style={
                            coupon.status === "pending" ? pendingBadgeStyle : fulfilledBadgeStyle
                          }>{coupon.status === "pending" ? "Active" : "Used"}</span>
                        </div>

                        {/* Coupon Code */}
                        <div className="coupon-code-box">
                          <span className="coupon-code-text">{coupon.couponCode || "—"}</span>
                          {coupon.couponCode && (
                            <button
                              className={`coupon-copy-btn ${copiedId === coupon.id ? "copied" : ""}`}
                              onClick={() => handleCopyCoupon(coupon.couponCode, coupon.id)}
                            >
                              {copiedId === coupon.id ? "✓ Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainContent: React.CSSProperties = {
  flex: 1,
  padding: "2rem",
  maxWidth: 1200,
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
};

const headerContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "2rem",
  flexWrap: "wrap",
  gap: "1rem",
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

const pointsPill: React.CSSProperties = {
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
  borderRadius: "20px",
  padding: "6px 16px",
  fontWeight: 600,
  fontSize: "14px",
  whiteSpace: "nowrap",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  display: "flex",
  flexDirection: "column",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "160px",
  objectFit: "cover",
  borderRadius: "10px 10px 0 0",
};

const bodyStyle: React.CSSProperties = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  fontSize: "15px",
  margin: "0 0 4px 0",
};

const sponsorStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 8px 0",
};

const descStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: 1.5,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  margin: 0,
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "#e5e7eb",
  margin: "16px 0",
};

const bottomRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "auto",
};

const costBadgeStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fcd34d",
  borderRadius: "12px",
  fontSize: "13px",
  padding: "4px 10px",
  fontWeight: 500,
};

const baseBtnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "6px",
  padding: "6px 16px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const redeemBtnStyle: React.CSSProperties = {
  ...baseBtnStyle,
  background: "#246344",
  color: "white",
};

const disabledBtnStyle: React.CSSProperties = {
  ...baseBtnStyle,
  background: "#f3f4f6",
  color: "#9ca3af",
  cursor: "not-allowed",
};

/* ── Coupon Tab Styles ───────────────────────────────────────────────────────── */

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

const couponTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#111827",
  fontSize: "15px",
  margin: "0 0 2px 0",
};

const couponSponsorStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0 0 4px 0",
};

const couponDateStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0 0 8px 0",
};

const couponMetaRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
};

const couponPointsBadgeStyle: React.CSSProperties = {
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
