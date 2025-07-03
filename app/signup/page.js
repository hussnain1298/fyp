// app/signup/page.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useForm, Controller } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import dynamic from "next/dynamic";
const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

import axios from "axios";

const FormInput = React.forwardRef(
  ({ label, type = "text", error, name, ...rest }, ref) => {
    const inputId = name || label.replace(/\s+/g, "");
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          type={type}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete={name === "email" ? "email" : "off"}
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
            className="text-red-600 text-sm"
            role="alert"
          >
            {error.message}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

const PasswordInput = React.forwardRef(
  (
    { label = "Password", error, showPassword, toggleShow, name, ...rest },
    ref
  ) => {
    const inputId = name || "password";
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
          </button>
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-red-600 text-sm"
            role="alert"
          >
            {error.message}
          </p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

const loadCityOptions = async (inputValue) => {
  if (!inputValue) return [];
  try {
    const res = await axios.get(
      "https://wft-geo-db.p.rapidapi.com/v1/geo/cities",
      {
        params: { namePrefix: inputValue, sort: "-population", limit: 10 },
        headers: {
          "X-RapidAPI-Key":
            "75b9489edemshc4bf9834e6e1852p14e79ejsn0ec27f88f073",
          "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
        },
      }
    );
    return res.data.data.map((city) => ({
      label: `${city.city}, ${city.countryCode}`,
      value: city.city,
    }));
  } catch {
    return [];
  }
};

export default function SignUp() {
  const [userType, setUserType] = useState("Donor");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const router = useRouter();

  const checkPasswordRules = (password) => ({
    length: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      await sendEmailVerification(userCred.user);
      await setDoc(doc(firestore, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email: data.email,
        fullName: data.fullName || "",
        contactNumber: data.contactNumber,
        orgAddress: data.orgAddress,
        city: data.city,
        orgName: data.orgName || "",
        licenseId: data.licenseId || "",
        userType,
        createdAt: new Date(),
      });
      toast.success("Verification email sent!", { position: "top-right" });
      setShowModal(true);
      reset();
    } catch (error) {
      let msg = error.message;
      if (error.code === "auth/email-already-in-use")
        msg = "This email is already registered.";
      toast.error("\u274C Error: " + msg, { position: "top-right" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-tr from-slate-100 to-slate-200 px-4 sm:px-6 lg:px-8">
      <ToastContainer />
      <div className="w-full max-w-xl bg-white p-6 sm:p-10 rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Create Account
        </h2>

        <div className="flex justify-center gap-4 mb-6" role="tablist">
          {["Donor", "Orphanage"].map((type) => (
            <button
              key={type}
              onClick={() => setUserType(type)}
              className={`w-32 py-2 text-sm font-medium rounded-full transition-all ${
                userType === type
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              role="tab"
              aria-selected={userType === type}
            >
              {type}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormInput
            label="Email"
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
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
              validate: (value) => {
                const rules = checkPasswordRules(value);
                if (
                  !rules.length ||
                  !rules.hasLetter ||
                  !rules.hasNumber ||
                  !rules.hasSpecial
                ) {
                  return "Password must meet all 3 requirements";
                }
                return true;
              },
            })}
            error={errors.password}
            showPassword={showPassword}
            toggleShow={() => setShowPassword(!showPassword)}
            name="password"
            onChange={(e) => {
              setPasswordInput(e.target.value);
            }}
          />

          {passwordInput && (
            <div className="text-sm mt-2 space-y-1">
              {(() => {
                const rules = checkPasswordRules(passwordInput);
                return (
                  <>
                    <p
                      className={`flex items-center gap-2 ${
                        rules.length ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <span>{rules.length ? "✓" : "✕"}</span> At least 8
                      characters
                    </p>
                    <p
                      className={`flex items-center gap-2 ${
                        rules.hasLetter ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <span>{rules.hasLetter ? "✓" : "✕"}</span> Includes a
                      letter (A-Z or a-z)
                    </p>
                    <p
                      className={`flex items-center gap-2 ${
                        rules.hasNumber ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <span>{rules.hasNumber ? "✓" : "✕"}</span> Includes a
                      number (0–9)
                    </p>
                    <p
                      className={`flex items-center gap-2 ${
                        rules.hasSpecial ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <span>{rules.hasSpecial ? "✓" : "✕"}</span> Includes a
                      special character (@$!%*?&)
                    </p>
                  </>
                );
              })()}
            </div>
          )}

          <PasswordInput
            label="Confirm Password"
            {...register("confirmPassword", {
              required: "Confirm your password",
              validate: (val) =>
                val === watch("password") || "Passwords do not match",
            })}
            error={errors.confirmPassword}
            showPassword={showPassword}
            toggleShow={() => setShowPassword(!showPassword)}
            name="confirmPassword"
          />

          {userType === "Donor" && (
            <FormInput
              label="Full Name"
              {...register("fullName", { required: "Full Name is required" })}
              error={errors.fullName}
              name="fullName"
            />
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Contact Number
            </label>
            <Controller
              name="contactNumber"
              control={control}
              rules={{
                required: "Contact number is required",
                validate: (val) =>
                  val.replace(/\D/g, "").length >= 7 || "Invalid phone number",
              }}
              render={({ field }) => (
                <PhoneInput
                  country="pk"
                  value={field.value}
                  onChange={field.onChange}
                  inputProps={{ name: "contactNumber", required: true }}
                  inputStyle={{ width: "100%" }}
                  enableSearch
                />
              )}
            />
            {errors.contactNumber && (
              <p className="text-red-600 text-sm mt-1">
                {errors.contactNumber.message}
              </p>
            )}
          </div>

          <FormInput
            label="Address"
            {...register("orgAddress", { required: "Address is required" })}
            error={errors.orgAddress}
            name="orgAddress"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              City
            </label>
            <Controller
              name="city"
              control={control}
              rules={{ required: "City is required" }}
              render={({ field }) => (
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  isClearable
                  loadOptions={loadCityOptions}
                  onChange={(opt) => field.onChange(opt?.value || "")}
                  value={
                    field.value
                      ? { label: field.value, value: field.value }
                      : null
                  }
                  placeholder="Start typing your city..."
                />
              )}
            />
            {errors.city && (
              <p className="text-red-600 text-sm mt-1">{errors.city.message}</p>
            )}
          </div>

          {userType === "Orphanage" && (
            <>
              <FormInput
                label="Organization Name"
                {...register("orgName", {
                  required: "Organization Name is required",
                })}
                error={errors.orgName}
                name="orgName"
              />
              <FormInput
                label="License ID"
                {...register("licenseId", {
                  required: "License ID is required",
                  pattern: {
                    value: /^[A-Z0-9]{6,12}$/,
                    message: "6–12 uppercase letters/numbers",
                  },
                })}
                error={errors.licenseId}
                name="licenseId"
              />
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700"
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              Verify Your Email
            </h2>
            <p className="text-gray-700 mb-4">
              A verification link was sent. Check your inbox.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
