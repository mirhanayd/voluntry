import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(
      authHeader.split("Bearer ")[1]
    );

    if (decodedToken.firebase.sign_in_provider !== "anonymous") {
      return NextResponse.json(
        { error: "Only anonymous users can create a guest profile." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    await adminDb.collection("users").doc(decodedToken.uid).set(
      {
        uid: decodedToken.uid,
        fullName: "Guest User",
        firstName: "Guest",
        lastName: "User",
        email: "",
        role: "student",
        status: "approved",
        points: 0,
        isGuest: true,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("guest-user error:", err);
    return NextResponse.json(
      { error: "Failed to create guest profile." },
      { status: 500 }
    );
  }
}
