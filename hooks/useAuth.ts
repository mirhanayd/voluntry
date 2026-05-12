"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserRole } from "@/types";
import { useRouter } from "next/navigation";

const INACTIVITY_TIMEOUT = 600_000; // 10 minutes
const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "touchstart"];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // ── Auto-logout on inactivity ─────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await signOut(auth);
        router.replace("/login?reason=timeout");
      } catch {
        // ignore
      }
    }, INACTIVITY_TIMEOUT);
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role as UserRole);
          } else {
            setRole(null);
          }
        } catch {
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Start / stop inactivity tracking when user state changes
  useEffect(() => {
    if (!user) {
      // No user — clear timer and listeners
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // User is logged in — start tracking
    resetTimer();

    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      );
    };
  }, [user, resetTimer]);

  return { user, role, loading };
}
