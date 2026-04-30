import { initializeApp } from "firebase/app";
import { doc, getFirestore, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(`Missing required Firebase env vars: ${missingVars.join(", ")}`);
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface RewardSeed {
  id: string;
  title: string;
  sponsorName: string;
  description: string;
  pointCost: number;
  imageURL: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

const rewards: RewardSeed[] = [
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

async function seedRewards() {
  try {
    for (const reward of rewards) {
      await setDoc(doc(db, "rewards", reward.id), reward);
    }

    console.log("✅ 6 rewards seeded.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed rewards:", error);
    process.exit(1);
  }
}

void seedRewards();
