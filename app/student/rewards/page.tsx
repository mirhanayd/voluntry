"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, runTransaction, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

import { useConfirm } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface Reward {
  id: string;
  title: string;
  sponsor: string;
  description: string;
  imageUrl: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
}

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

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
      message: `Are you sure you want to redeem ${reward.title} for ${reward.pointCost} points?`,
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

      // After transaction success, add to redemptions
      await addDoc(collection(db, "redemptions"), {
        userId: user.uid,
        rewardId: reward.id,
        rewardTitle: reward.title,
        sponsorName: reward.sponsor,
        pointCost: reward.pointCost,
        redeemedAt: new Date().toISOString(),
        status: "pending"
      });

      showToast("Reward redeemed successfully! 🎉", "success");
      
      // Update local state
      setPoints(prev => prev - reward.pointCost);
      setRewards(prevRewards => prevRewards.map(r => 
        r.id === reward.id ? { ...r, stock: r.stock - 1 } : r
      ));

    } catch (error: any) {
      console.error("Redeem error:", error);
      if (error.message === "INSUFFICIENT_POINTS") {
        showToast("You don't have enough points.", "error");
      } else if (error.message === "OUT_OF_STOCK") {
        showToast("This reward is out of stock.", "error");
      } else {
        showToast("Failed to redeem reward. Please try again.", "error");
      }
    } finally {
      setRedeemingId(null);
    }
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

        {/* Content */}
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
                  <img src={reward.imageUrl || "https://placehold.co/600x400?text=No+Image"} alt={reward.title} style={imageStyle} />
                  <div style={bodyStyle}>
                    <h3 style={cardTitleStyle}>{reward.title}</h3>
                    <p style={sponsorStyle}>{reward.sponsor}</p>
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
