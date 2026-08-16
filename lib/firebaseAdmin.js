import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp;

function getAdminApp() {
  if (adminApp) return adminApp;
  if (getApps().length) return (adminApp = getApps()[0]);

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  // Vercel commonly stores multiline secrets with literal "\n" characters.
  // Normalize escaped newlines, CRLF, whitespace, and accidental surrounding quotes.
  let privateKey = String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim();

  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\r/g, "")
    .trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY is not a valid PEM private key. Check the Vercel environment variable and make sure it contains the complete BEGIN/END PRIVATE KEY block."
    );
  }

  return (adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  }));
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
