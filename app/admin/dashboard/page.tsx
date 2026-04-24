"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./dashboard.module.css";

interface DashboardStats {
  totalUsers: number | null;
  pendingApprovals: number | null;
  activeEvents: number | null;
  distributedRewards: number | null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: null,
    pendingApprovals: null,
    activeEvents: null,
    distributedRewards: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersSnap, pendingSnap, eventsSnap, rewardsSnap] =
          await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(
              query(collection(db, "users"), where("status", "==", "pending"))
            ),
            getDocs(
              query(collection(db, "events"), where("status", "==", "active"))
            ),
            getDocs(collection(db, "rewards")),
          ]);

        setStats({
          totalUsers: usersSnap.size,
          pendingApprovals: pendingSnap.size,
          activeEvents: eventsSnap.size,
          distributedRewards: rewardsSnap.size,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }
    }

    fetchStats();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Pending Approvals", value: stats.pendingApprovals },
    { label: "Active Events", value: stats.activeEvents },
    { label: "Distributed Rewards", value: stats.distributedRewards },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Dashboard</h1>
      <p className={styles.subheading}>Overview of your platform</p>

      <div className={styles.grid}>
        {cards.map((card) => (
          <div key={card.label} className={styles.card}>
            <p className={styles.cardLabel}>{card.label}</p>
            {card.value !== null ? (
              <p className={styles.cardValue}>{card.value}</p>
            ) : (
              <p className={styles.loadingValue}>Loading...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
