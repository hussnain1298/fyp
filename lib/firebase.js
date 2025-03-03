import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore"; // Import doc and setDoc from firestore

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBR7zHP2p91iY5TFRvENnxpBRpzS2yFxBY",
  authDomain: "my-app-4a509.firebaseapp.com",
  projectId: "my-app-4a509",
  storageBucket: "my-app-4a509.firebasestorage.app",
  messagingSenderId: "1092985922173",
  appId: "1:1092985922173:web:82c622a950dd709a930714",
  measurementId: "G-5ELDWGKM87",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

export {
  auth,
  firestore,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  doc, // Correct export of doc
  setDoc, // Correct export of setDoc
};
