// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";

import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBR7zHP2p91iY5TFRvENnxpBRpzS2yFxBY",
  authDomain: "my-app-4a509.firebaseapp.com",
  projectId: "my-app-4a509",
  storageBucket: "my-app-4a509.appspot.com",
  messagingSenderId: "1092985922173",
  appId: "1:1092985922173:web:82c622a950dd709a930714",
  measurementId: "G-5ELDWGKM87",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const db = firestore; // 👈 Add this alias
const storage = getStorage(app);
const database = getDatabase(app);

// Only initialize analytics on the client side
let analytics;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

// ✅ Export Firebase instances
export { auth, firestore, db, storage, analytics, database };

// ✅ Export Firestore methods
export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
};

// ✅ Export Auth methods
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
};

// ✅ Export Storage methods
export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};
