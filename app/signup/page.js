"use client";
import React, { useState } from "react";
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
import { useForm } from "react-hook-form";
import Loading from "@/components/loading";

export default function SignUp() {
  const [userType, setUserType] = useState("Donor");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    console.log("Form data:", data); // Debug log to verify values
    setLoading(true);
    try {
      if (!data.email || !data.password) {
        throw new Error("Email and password are required");
      }
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const userDoc = {
        uid: user.uid,
        email: data.email,
        fullName: data.fullName || "",
        contactNumber: data.contactNumber || "",
        orgAddress: data.orgAddress || "",
        orgName: data.orgName || "",
        licenseId: data.licenseId || "",
        city: data.city || "",
        userType,
        createdAt: new Date(),
      };

      await setDoc(doc(firestore, "users", user.uid), userDoc);

      toast.success("🎉 User Successfully Signed Up!", { position: "top-right" });

      setLoading(false);
      reset();

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
        fullName: user.displayName || "",
        contactNumber: "",
        userType: "Donor",
        createdAt: new Date(),
      });

      toast.success("🎉 Signed Up with Google!", { position: "top-right" });

      setLoading(false);

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
            type="button"
            className={`w-24 py-2 text-sm sm:text-base font-medium rounded-l-md ${
              userType === "Donor"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            aria-pressed={userType === "Donor"}
          >
            Donor
          </button>
          <button
            onClick={() => setUserType("Orphanage")}
            type="button"
            className={`w-24 py-2 text-sm sm:text-base font-medium rounded-r-md ${
              userType === "Orphanage"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            aria-pressed={userType === "Orphanage"}
          >
            Orphanage
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormInput
            label="Email"
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                message: "Invalid email address",
              },
            })}
            error={errors.email}
            name="email"
          />

          <PasswordInput
            label="Password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            error={errors.password}
            showPassword={showPassword}
            toggleShow={() => setShowPassword(!showPassword)}
            name="password"
          />

          {userType === "Donor" && (
            <>
              <FormInput
                label="Full Name"
                {...register("fullName", { required: "Full Name is required" })}
                error={errors.fullName}
                name="fullName"
              />
              <FormInput
                label="Contact Number"
                {...register("contactNumber", {
                  required: "Contact Number is required",
                  pattern: {
                    value: /^\+?[0-9\s-]{7,15}$/,
                    message: "Invalid phone number",
                  },
                })}
                error={errors.contactNumber}
                name="contactNumber"
              />
              <FormInput
                label="Address"
                {...register("orgAddress", { required: "Address is required" })}
                error={errors.orgAddress}
                name="orgAddress"
              />
              <FormInput
                label="City"
                {...register("city", { required: "City is required" })}
                error={errors.city}
                name="city"
              />
            </>
          )}

          {userType === "Orphanage" && (
            <>
              <FormInput
                label="Organization Name"
                {...register("orgName", { required: "Organization Name is required" })}
                error={errors.orgName}
                name="orgName"
              />
              <FormInput
                label="Organization Address"
                {...register("orgAddress", { required: "Organization Address is required" })}
                error={errors.orgAddress}
                name="orgAddress"
              />
              <FormInput
                label="City"
                {...register("city", { required: "City is required" })}
                error={errors.city}
                name="city"
              />
              <FormInput
                label="License ID"
                {...register("licenseId", { required: "License ID is required" })}
                error={errors.licenseId}
                name="licenseId"
              />
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Sign Up
          </button>
        </form>

        {userType === "Donor" && (
          <button
            onClick={handleGoogleSignUp}
            className="w-full py-3 text-sm sm:text-base bg-black mt-4 text-white rounded-md"
            type="button"
          >
            Sign Up with Google
          </button>
        )}
      </div>
    </div>
  );
}

const FormInput = React.forwardRef(({ label, type = "text", error, name, ...rest }, ref) => {
  const inputId = name || label.replace(/\s+/g, "");
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-600">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={`Enter ${label.toLowerCase()}`}
        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
        ref={ref}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-red-600 text-sm mt-1"
          role="alert"
        >
          {error.message}
        </p>
      )}
    </div>
  );
});

const PasswordInput = React.forwardRef(
  ({ label = "Password", error, showPassword, toggleShow, name, ...rest }, ref) => {
    const inputId = name || "password";
    return (
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-600">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 6 characters"
            className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...rest}
            ref={ref}
          />
          <button
            type="button"
            onClick={toggleShow}
            className="absolute right-3 top-3"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
          </button>
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-red-600 text-sm mt-1" role="alert">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);
