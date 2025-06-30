"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { getDoc, setDoc, doc } from "firebase/firestore";
import Loading from "./loading";
import { motion } from "framer-motion";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [donorCheck, setDonorCheck] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [pendingUser, setPendingUser] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("redirect") === "donate") {
      setDonorCheck(true);
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");
    setVerifyMessage("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setPendingUser(user);
        setShowVerifyModal(true);
        setLoading(false);
        return;
      }

      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.userType || null;

        if (donorCheck && role !== "Donor") {
          setError("Only donors can proceed with donations.");
          setLoading(false);
          return;
        }

        if (role === "Donor") {
          router.push("/donorDashboard");
        } else if (role === "Orphanage") {
          router.push("/orphanageDashboard");
        } else {
          setError("User role is missing. Please contact support.");
        }
      } else {
        const newUser = {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || "",
          contactNumber: "",
          userType: "Donor",
          createdAt: new Date(),
          emailVerified: true,
        };
        await setDoc(userDocRef, newUser);
        router.push("/donorDashboard");
      }
    } catch (err) {
      setError("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetMessage("");
    if (!resetEmail) {
      setResetMessage("Please enter an email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("✅ Reset email sent. Check your inbox.");
    } catch (err) {
      setResetMessage("❌ " + err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-tr from-slate-100 to-slate-200 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white p-6 sm:p-10 rounded-2xl shadow-xl"
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h2>

        {donorCheck && <p className="text-red-500 text-center text-sm mb-4">Only donors can proceed with donations.</p>}
        {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <FormInput label="Email" type="email" value={email} onChange={setEmail} required />

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-3 right-3 text-gray-500"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
          </div>

          <div className="text-right text-sm">
            <button type="button" className="text-blue-600 hover:underline" onClick={() => setShowResetModal(true)}>
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </motion.div>

      {showResetModal && (
        <Modal
          title="Reset Password"
          inputValue={resetEmail}
          onChange={setResetEmail}
          message={resetMessage}
          onSubmit={handleResetPassword}
          onClose={() => {
            setShowResetModal(false);
            setResetMessage("");
            setResetEmail("");
          }}
          submitLabel="Send Reset Link"
        />
      )}

      {showVerifyModal && (
        <Modal
          title="Email Not Verified"
          message={verifyMessage || "Please verify your email before logging in."}
          onSubmit={async () => {
            try {
              await sendEmailVerification(pendingUser);
              setVerifyMessage("✅ Verification email sent.");
            } catch (err) {
              setVerifyMessage("❌ " + err.message);
            }
          }}
          onClose={() => {
            setShowVerifyModal(false);
            setPendingUser(null);
            setVerifyMessage("");
          }}
          submitLabel="Resend Verification"
        />
      )}
    </div>
  );
};

const Modal = ({ title, message, inputValue, onChange, onSubmit, onClose, submitLabel = "Submit" }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg text-center">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
      {onChange && (
        <input
          type="email"
          placeholder="Enter email"
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md mb-4"
        />
      )}
      {message && (
        <p className={`text-sm mb-3 ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
      <div className="flex justify-end space-x-2">
        <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          Cancel
        </button>
        <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {submitLabel}
        </button>
      </div>
    </div>
  </div>
);

const FormInput = ({ label, type = "text", value, onChange, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      placeholder={`Enter ${label.toLowerCase()}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

const LoginPageWithSuspense = () => (
  <Suspense fallback={<Loading />}>
    <LoginPage />
  </Suspense>
);

export default LoginPageWithSuspense;
