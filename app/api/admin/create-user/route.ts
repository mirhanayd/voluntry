import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard: verify Firebase ID token ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || undefined,
    });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (err: any) {
    console.error("create-user error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create user." },
      { status: 500 }
    );
  }
}
