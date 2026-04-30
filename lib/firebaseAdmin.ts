import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    const decoded = JSON.parse(
      Buffer.from(serviceAccount, "base64").toString("utf-8")
    );
    app = initializeApp({ credential: cert(decoded) });
  } else {
    console.log(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Using Application Default Credentials (ADC) for App Hosting / Cloud Run."
    );
    // When running in Firebase App Hosting / Cloud Run, Firebase Admin automatically picks up ADC
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
