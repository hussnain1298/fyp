// ✅ LoginPage.jsx
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import Loading from "./loading";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [donorCheck, setDonorCheck] = useState(false);
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
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

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
          setLoading(false);
        }
      } else {
        setError("User data not found in Firestore.");
        setLoading(false);
      }
    } catch (err) {
      setError("Login failed: " + err.message);
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4 sm:px-8">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Login</h2>

        {donorCheck && <p className="text-red-500 text-center text-sm sm:text-base mb-4">Only donors can proceed with donations.</p>}
        {error && <p className="text-red-500 text-center text-sm sm:text-base mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <FormInput label="Email" type="email" value={email} onChange={setEmail} required />
          <FormInput label="Password" type="password" value={password} onChange={setPassword} required />

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white text-sm sm:text-base rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

const LoginPageWithSuspense = () => {
  return (
    <Suspense fallback={<Loading />}>
      <LoginPage />
    </Suspense>
  );
};

const FormInput = ({ label, type = "text", value, onChange, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600">{label}</label>
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

export default LoginPageWithSuspense;