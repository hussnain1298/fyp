// lib/firebaseAdmin.js
import admin from "firebase-admin";

const serviceAccount = require("../path/to/your/firebase-service-account-key.json"); // Firebase service account key

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://your-database-name.firebaseio.com",
  });
}

const db = admin.firestore();
export { db };
