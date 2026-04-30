require("dotenv").config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });

const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!encoded) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
const app = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

const db = getFirestore(app);

const rewards = [
  {
    id: "reward_001",
    title: "Book Voucher",
    sponsorName: "D&R Kıbrıs",
    description:
      "A 50-point book voucher redeemable at any D&R store in Northern Cyprus. Valid for 3 months.",
    pointCost: 50,
    imageURL:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop",
    stock: 20,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "reward_002",
    title: "Cafe Voucher",
    sponsorName: "Café Central Lefkoşa",
    description:
      "Enjoy a free coffee and pastry at Café Central. Redeemable once per visit.",
    pointCost: 30,
    imageURL:
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop",
    stock: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "reward_003",
    title: "Stationery Set",
    sponsorName: "Kırtasiye Plus",
    description:
      "A premium stationery set including notebook, pens, highlighters and sticky notes.",
    pointCost: 20,
    imageURL:
      "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=400&h=300&fit=crop",
    stock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "reward_004",
    title: "Cinema Ticket",
    sponsorName: "CinePlus KKTC",
    description:
      "One free cinema ticket valid for any standard screening. Not valid for 3D or special events.",
    pointCost: 40,
    imageURL:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
    stock: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "reward_005",
    title: "Sports Bag",
    sponsorName: "SportMax Kıbrıs",
    description:
      "A branded sports bag perfect for gym and outdoor activities. Available in black and navy.",
    pointCost: 150,
    imageURL:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
    stock: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "reward_006",
    title: "Restaurant Voucher",
    sponsorName: "Olive Garden Girne",
    description:
      "A dining voucher worth 100 TL at Olive Garden restaurant in Kyrenia. Valid for dine-in only.",
    pointCost: 80,
    imageURL:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
    stock: 25,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

(async () => {
  try {
    for (const reward of rewards) {
      await db.collection("rewards").doc(reward.id).set(reward);
    }

    console.log("✅ 6 rewards seeded.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed rewards:", error);
    process.exit(1);
  }
})();
