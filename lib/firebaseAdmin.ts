import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App;

if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    const decoded = JSON.parse(
      Buffer.from(serviceAccount, "base64").toString("utf-8")
    );
    app = initializeApp({ credential: cert(decoded) });
  } else {
    console.warn(
      "⚠️  FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
        "Admin SDK features (createUser, etc.) will NOT work. " +
        "Add the base64-encoded service account JSON to .env.local."
    );
    // Fallback with explicit projectId so Firebase doesn't throw
    // "Unable to detect a Project Id" — but auth operations will still fail.
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
