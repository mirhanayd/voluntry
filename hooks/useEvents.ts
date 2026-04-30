"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ── Filtrelerin tipi  ── */

export interface EventFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  categories?: string[];
  pointMin?: number;
  pointMax?: number;
}

/* ── Firestore'dan gelen verinin şekli ── */

export interface EventDoc {
  id: string;
  title?: string;
  date?: string;
  location?: string;
  departmentRestriction?: string[];
  pointValue?: number;
  status?: string;
  [key: string]: unknown; // firestore'dan fazladan bir şey gelirse patlamasın
}

/* ── Esas Hook ── */

export function useEvents(filters: EventFilters = {}) {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Sadece yayınlanmış olanlar, diğerleri görünmesin
    const eventsRef = collection(db, "events");
    const baseQuery = query(eventsRef, where("status", "==", "published"));

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        let docs: EventDoc[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // ── Client tarafındaki filtrelemeler 
        // Başlığa göre ara (büyük/küçük harf takıntısı yok)
        if (filters.search) {
          const term = filters.search.toLowerCase();
          docs = docs.filter((e) =>
            (e.title ?? "").toLowerCase().includes(term)
          );
        }

        // Tarih aralığı (başlangıç - bitiş)
        if (filters.dateFrom) {
          docs = docs.filter(
            (e) => typeof e.date === "string" && e.date >= filters.dateFrom!
          );
        }
        if (filters.dateTo) {
          docs = docs.filter(
            (e) => typeof e.date === "string" && e.date <= filters.dateTo!
          );
        }

        // Lokasyona göre filtrele
        if (filters.location) {
          const loc = filters.location.toLowerCase();
          docs = docs.filter((e) =>
            (e.location ?? "").toLowerCase().includes(loc)
          );
        }

        // Kategori olayı
        if (
          filters.categories &&
          filters.categories.length > 0 &&
          !filters.categories.includes("All")
        ) {
          docs = docs.filter((e) => {
            const depts = e.departmentRestriction ?? [];
            return filters.categories!.some((cat) => depts.includes(cat));
          });
        }

        // Min/max puan olayı
        if (filters.pointMin !== undefined) {
          docs = docs.filter(
            (e) =>
              typeof e.pointValue === "number" &&
              e.pointValue >= filters.pointMin!
          );
        }
        if (filters.pointMax !== undefined) {
          docs = docs.filter(
            (e) =>
              typeof e.pointValue === "number" &&
              e.pointValue <= filters.pointMax!
          );
        }

        setEvents(docs);
        setLoading(false);
      },
      (err) => {
        console.error("useEvents snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Component ölünce listener'ı temizliyoruz yoksa memory leak falan
    return () => unsubscribe();
  }, [
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.location,
    // Array referansı değişip durmasın diye
    // eslint-disable-next-line react-hooks/exhaustive-deps // eslint için
    JSON.stringify(filters.categories),
    filters.pointMin,
    filters.pointMax,
  ]);

  return { events, loading, error };
}
