"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase"; // Firebase imports
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth"; // Firebase Auth v9+ import
import { doc, setDoc } from "firebase/firestore"; // Firestore v9+ import
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // Import eye icons for password visibility

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgName, setOrgName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [userType, setUserType] = useState("Donor"); // Default value
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // For toggling password visibility
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      // Create user in Firebase Authentication (Email/Password)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save user details in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        email,
        contactNumber,
        fullName,
        orgAddress,
        orgName,
        taxId,
        userType,
        createdAt: new Date(),
      });

      console.log("User signed up and stored in Firestore!");
      router.push(
        userType === "Donor" ? "/donorDashboard" : "/orphanageDashboard"
      ); // Redirect based on user type
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      // Google authentication using Firebase
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save Google user details in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName,
        contactNumber: "", // Google sign-up does not provide a contact number
        userType: "Donor", // Set default or based on condition
        createdAt: new Date(),
      });

      console.log("User signed up with Google and stored in Firestore!");
      router.push("/donordashboard"); // Redirect after signup
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">
          Sign Up
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* User Type Selection */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setUserType("Donor")}
            className={`w-24 py-2 text-sm font-medium rounded-l-md ${
              userType === "Donor"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            Donor
          </button>
          <button
            onClick={() => setUserType("Orphanage")}
            className={`w-24 py-2 text-sm font-medium rounded-r-md ${
              userType === "Orphanage"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            Orphanage
          </button>
        </div>

        {/* Form for Email/Password Sign-Up */}
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Common Fields: Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-600"
            >
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

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-600"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
          </div>

          {/* Donor-Specific Fields */}
          {userType === "Donor" && (
            <>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-600"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="contactNumber"
                  className="block text-sm font-medium text-gray-600"
                >
                  Contact Number
                </label>
                <input
                  type="text"
                  id="contactNumber"
                  placeholder="Enter your contact number"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Orphanage-Specific Fields */}
          {userType === "Orphanage" && (
            <>
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-sm font-medium text-gray-600"
                >
                  Organization Name
                </label>
                <input
                  type="text"
                  id="orgName"
                  placeholder="Enter your organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="orgAddress"
                  className="block text-sm font-medium text-gray-600"
                >
                  Organization Address
                </label>
                <input
                  type="text"
                  id="orgAddress"
                  placeholder="Enter your organization address"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="taxId"
                  className="block text-sm font-medium text-gray-600"
                >
                  Tax ID
                </label>
                <input
                  type="text"
                  id="taxId"
                  placeholder="Enter your organization tax ID"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Sign Up
          </button>
        </form>

        {/* Google Sign-Up Button */}
        <button
          onClick={handleGoogleSignUp}
          className="w-full py-3 bg-black mt-4 text-white rounded-md mb-4 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Sign Up with Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
