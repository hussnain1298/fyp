'use client'; // Ensure that the component is client-side only

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // ✅ Get query params
import { auth, firestore } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";

// This is the main Login component
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [donorCheck, setDonorCheck] = useState(false); // ✅ Track if user came from Donate
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ Get query params

  // ✅ useEffect to check if the user came from "Donate"
  useEffect(() => {
    if (searchParams.get("redirect") === "donate") {
      setDonorCheck(true);
    }
  }, [searchParams]);

  // ✅ Handle user login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Reset error before login attempt

    try {
      // ✅ Step 1: User Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Step 2: Fetch User Role from Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.userType || null; // ✅ Ensure userType exists

        // ✅ If coming from Donate button, enforce Donor restriction
        if (donorCheck && role !== "Donor") {
          setError("Only donors can proceed with donations.");
          return;
        }

        // ✅ Redirect based on user role
        if (role === "Donor") {
          router.push("/donorDashboard");
        } else if (role === "Orphanage") {
          router.push("/orphanageDashboard");
        } else {
          setError("User role is missing. Please contact support.");
        }
      } else {
        setError("User data not found in Firestore.");
      }
    } catch (err) {
      setError("Login failed: " + err.message);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Login</h2>

        {/* ✅ Show Donor Restriction Message Only When Required */}
        {donorCheck && <p className="text-red-500 text-center mb-4">Only donors can proceed with donations.</p>}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Wrapping the LoginPage component with Suspense boundary for useSearchParams()
const LoginPageWithSuspense = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
};

export default LoginPageWithSuspense;
