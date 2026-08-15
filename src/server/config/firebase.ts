import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let firebaseAdminInitialized = false;
let adminDb: any = null;
let adminAuth: any = null;

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    const apps = getApps();
    const firebaseApp = apps.length > 0 ? apps[0] : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });
    adminDb = getFirestore(firebaseApp);
    adminDb.settings({ ignoreUndefinedProperties: true });
    adminAuth = getAuth(firebaseApp);

    adminDb.collection("users").limit(1).get().then(() => {
      firebaseAdminInitialized = true;
      console.log("🔥 Firebase Admin SDK initialized successfully.");
    }).catch((err: any) => {
      console.error("⚠️ Firestore database error or offline fallback:", err.message);
      adminDb = null;
    });
  } else {
    console.log("⚠️ Firebase Admin SDK NOT initialized: Missing environment variables.");
  }
} catch (error) {
  console.error("❌ Firebase Admin initialization error:", error);
}

export { firebaseAdminInitialized, adminDb, adminAuth };
