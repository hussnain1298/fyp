"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase"; // Firebase imports
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgName, setOrgName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [userType, setUserType] = useState("Donor"); // Default: Donor
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // ✅ Function: Handle SignUp
  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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

      // ✅ SUCCESS TOAST MESSAGE
      toast.success("🎉 User Successfully Signed Up!", { position: "top-right" });

      // Redirect user
      setTimeout(() => {
        router.push(userType === "Donor" ? "/donorDashboard" : "/orphanageDashboard");
      }, 2000);
    } catch (error) {
      toast.error("❌ Error: " + error.message, { position: "top-right" });
    }
  };

  // ✅ Function: Google SignUp
  const handleGoogleSignUp = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName,
        contactNumber: "",
        userType: "Donor",
        createdAt: new Date(),
      });

      toast.success("🎉 Signed Up with Google!", { position: "top-right" });

      setTimeout(() => {
        router.push("/donorDashboard");
      }, 2000);
    } catch (error) {
      toast.error("❌ Error: " + error.message, { position: "top-right" });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <ToastContainer />
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Sign Up</h2>

        {/* User Type Selection */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setUserType("Donor")}
            className={`w-24 py-2 text-sm font-medium rounded-l-md ${
              userType === "Donor" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Donor
          </button>
          <button
            onClick={() => setUserType("Orphanage")}
            className={`w-24 py-2 text-sm font-medium rounded-r-md ${
              userType === "Orphanage" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Orphanage
          </button>
        </div>

        {/* SignUp Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
          </div>

          {/* Conditional Fields for Donor */}
          {userType === "Donor" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Contact Number</label>
                <input
                  type="text"
                  placeholder="Enter your contact number"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Conditional Fields for Orphanage */}
          {userType === "Orphanage" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600">Organization Name</label>
                <input
                  type="text"
                  placeholder="Enter your organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Organization Address</label>
                <input
                  type="text"
                  placeholder="Enter your organization address"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700">
            Sign Up
          </button>
        </form>

        {/* Google Sign-Up Button */}
        <button onClick={handleGoogleSignUp} className="w-full py-3 bg-black mt-4 text-white rounded-md">
          Sign Up with Google
        </button>
      </div>
    </div>
  );
}
