// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database"; // <-- import Realtime Database

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBR7zHP2p91iY5TFRvENnxpBRpzS2yFxBY",
  authDomain: "my-app-4a509.firebaseapp.com",
  projectId: "my-app-4a509",
  storageBucket: "my-app-4a509.appspot.com", // Fixed storage bucket
  messagingSenderId: "1092985922173",
  appId: "1:1092985922173:web:82c622a950dd709a930714",
  measurementId: "G-5ELDWGKM87",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const database = getDatabase(app); // <-- initialize database

// Only initialize analytics on the client side
let analytics;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export { auth, firestore, storage, analytics, database }; // <-- export database
