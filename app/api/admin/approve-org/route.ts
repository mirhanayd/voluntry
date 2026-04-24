import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { getApps } from "firebase-admin/app";

export async function POST(req: NextRequest) {
  try {
    const { email, organizationName, organizationType, requestId } =
      await req.json();

    if (!email || !organizationName || !requestId) {
      return NextResponse.json(
        { error: "Email, organization name, and request ID are required." },
        { status: 400 }
      );
    }

    // 1. Generate a temporary password
    const tempPassword =
      "Temp" +
      Math.random().toString(36).slice(2, 10) +
      "!" +
      Math.floor(Math.random() * 100);

    // 2. Create Firebase Auth user via Admin SDK (does NOT affect client session)
    const userRecord = await adminAuth.createUser({
      email,
      password: tempPassword,
      displayName: organizationName,
    });

    // 3. Write to Firestore users collection
    const db = getFirestore(getApps()[0]);
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      organizationName,
      organizationType: organizationType || "",
      role: "organizer",
      status: "approved",
      createdAt: new Date().toISOString(),
    });

    // 4. Update organizer_requests doc
    await db.collection("organizer_requests").doc(requestId).update({
      status: "approved",
    });

    // 5. Generate password reset link (admin SDK version)
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    return NextResponse.json({
      uid: userRecord.uid,
      resetLink,
      message: "Organization approved successfully.",
    });
  } catch (err: any) {
    console.error("approve-org error:", err);

    if (err.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "This email already has an account." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to approve organization." },
      { status: 500 }
    );
  }
}
