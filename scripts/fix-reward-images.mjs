/**
 * One-shot script to list all rewards in Firestore and update any that
 * have an empty imageURL with a curated Unsplash image.
 *
 * Usage:  node scripts/fix-reward-images.mjs
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Bootstrap Admin SDK ────────────────────────────────────────────────────
const svcRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ?? readFileSync(".env.local", "utf-8")
      .split("\n")
      .find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT_KEY="))
      ?.split("=")
      .slice(1)
      .join("=")
      .trim();

if (!svcRaw) {
  console.error("Could not find FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const decoded = JSON.parse(Buffer.from(svcRaw, "base64").toString("utf-8"));
const app = initializeApp({ credential: cert(decoded) });
const db = getFirestore(app);

// ── Curated reward images (Unsplash, royalty-free) ─────────────────────────
const REWARD_IMAGES = [
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop", // gift card / shopping
  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop", // coffee cup
  "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&h=400&fit=crop", // movie theater
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop", // watch / product
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop", // headphones
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=400&fit=crop", // book
  "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&h=400&fit=crop", // shopping bag
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&h=400&fit=crop", // burger / food
  "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=400&fit=crop", // popcorn
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&h=400&fit=crop", // gradient abstract
];

async function main() {
  const snap = await db.collection("rewards").get();

  if (snap.empty) {
    console.log("No rewards found in Firestore.");
    return;
  }

  console.log(`Found ${snap.size} reward(s).\n`);

  let updatedCount = 0;

  for (const [index, docSnap] of snap.docs.entries()) {
    const data = docSnap.data();
    console.log(`[${index + 1}] ${data.title || "Untitled"}`);
    console.log(`    imageURL: ${data.imageURL || "(empty)"}`);
    console.log(`    sponsor:  ${data.sponsorName || data.sponsor || "(none)"}`);

    if (!data.imageURL || data.imageURL.trim() === "") {
      const imageUrl = REWARD_IMAGES[index % REWARD_IMAGES.length];
      await docSnap.ref.update({ imageURL: imageUrl });
      console.log(`    ✅ Updated imageURL → ${imageUrl}`);
      updatedCount++;
    } else {
      console.log(`    ⏭️  Already has an image, skipping.`);
    }
    console.log();
  }

  console.log(`\nDone! Updated ${updatedCount} reward(s).`);
}

main().catch(console.error);
