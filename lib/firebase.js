// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBR7zHP2p91iY5TFRvENnxpBRpzS2yFxBY",
  authDomain: "my-app-4a509.firebaseapp.com",
  projectId: "my-app-4a509",
  storageBucket: "my-app-4a509.firebasestorage.app", // Fixed the storage bucket URL
  messagingSenderId: "1092985922173",
  appId: "1:1092985922173:web:82c622a950dd709a930714",
  measurementId: "G-5ELDWGKM87",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

let analytics;
if (typeof window !== "undefined") {
  // Import analytics dynamically to avoid server-side issues
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export { auth, firestore, storage, analytics };
