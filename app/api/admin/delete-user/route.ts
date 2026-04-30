import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function DELETE(req: NextRequest) {
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

    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "UID is required." },
        { status: 400 }
      );
    }

    // Disable the auth account rather than permanently deleting
    await adminAuth.updateUser(uid, { disabled: true });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("delete-user error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to disable user." },
      { status: 500 }
    );
  }
}
