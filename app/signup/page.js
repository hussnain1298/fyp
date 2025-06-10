// ✅ SignUp.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "./loading";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgName, setOrgName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState("Donor");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        email,
        contactNumber,
        fullName,
        orgAddress,
        orgName,
        taxId,
        city,
        userType,
        createdAt: new Date(),
      });

      toast.success("🎉 User Successfully Signed Up!", { position: "top-right" });

      setTimeout(() => {
        router.push(userType === "Donor" ? "/donorDashboard" : "/orphanageDashboard");
      }, 2000);
    } catch (error) {
      toast.error("❌ Error: " + error.message, { position: "top-right" });
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4 sm:px-8">
      <ToastContainer />
      <div className="w-full max-w-md p-6 sm:p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Sign Up</h2>

        <div className="flex justify-center mb-4 flex-wrap">
          <button
            onClick={() => setUserType("Donor")}
            className={`w-24 py-2 text-sm sm:text-base font-medium rounded-l-md ${
              userType === "Donor" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Donor
          </button>
          <button
            onClick={() => setUserType("Orphanage")}
            className={`w-24 py-2 text-sm sm:text-base font-medium rounded-r-md ${
              userType === "Orphanage" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Orphanage
          </button>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <FormInput label="Email" type="email" value={email} onChange={setEmail} required />
          <PasswordInput value={password} onChange={setPassword} showPassword={showPassword} toggleShow={() => setShowPassword(!showPassword)} />

          {userType === "Donor" && (
            <>
              <FormInput label="Full Name" value={fullName} onChange={setFullName} required />
              <FormInput label="Contact Number" value={contactNumber} onChange={setContactNumber} required />
              <FormInput label="Address" value={orgAddress} onChange={setOrgAddress} required />
              <FormInput label="City" value={city} onChange={setCity} required />
            </>
          )}

          {userType === "Orphanage" && (
            <>
              <FormInput label="Organization Name" value={orgName} onChange={setOrgName} required />
              <FormInput label="Organization Address" value={orgAddress} onChange={setOrgAddress} required />
              <FormInput label="City" value={city} onChange={setCity} required />
              <FormInput label="Tax ID" value={taxId} onChange={setTaxId} required />
            </>
          )}

          <button type="submit" className="w-full py-3 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700">
            Sign Up
          </button>
        </form>

        {userType === "Donor" && (
          <button onClick={handleGoogleSignUp} className="w-full py-3 text-sm sm:text-base bg-black mt-4 text-white rounded-md">
            Sign Up with Google
          </button>
        )}
      </div>
    </div>
  );
}

const FormInput = ({ label, type = "text", value, onChange, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600">{label}</label>
    <input
      type={type}
      placeholder={`Enter ${label.toLowerCase()}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

const PasswordInput = ({ value, onChange, showPassword, toggleShow }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600">Password</label>
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Minimum 6 characters"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={6}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
      <button type="button" onClick={toggleShow} className="absolute right-3 top-3">
        {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
      </button>
    </div>
  </div>
);
