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
import { motion, AnimatePresence } from "framer-motion";
const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

import axios from "axios";

const FormInput = React.forwardRef(
  ({ label, type = "text", error, name, icon, ...rest }, ref) => {
    const inputId = name || label.replace(/\s+/g, "");
    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-gray-700"
        >
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{icon}</span>
            </div>
          )}
          <input
            id={inputId}
            name={name}
            type={type}
            placeholder={`Enter ${label.toLowerCase()}`}
            autoComplete={name === "email" ? "email" : "off"}
            className={`w-full ${
              icon ? "pl-10" : "pl-4"
            } pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-gray-300 focus:border-green-500"
            }`}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...rest}
            ref={ref}
          />
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${inputId}-error`}
              className="text-red-600 text-sm flex items-center gap-1"
              role="alert"
            >
              <span>⚠️</span>
              {error.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

const PasswordInput = React.forwardRef(
  (
    {
      label = "Password",
      error,
      showPassword,
      toggleShow,
      name,
      icon = "🔒",
      ...rest
    },
    ref
  ) => {
    const inputId = name || "password";
    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-gray-700"
        >
          {label}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
          <input
            id={inputId}
            name={name}
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-gray-300 focus:border-green-500"
            }`}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...rest}
            ref={ref}
          />
          <button
            type="button"
            onClick={toggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <AiFillEyeInvisible size={20} />
            ) : (
              <AiFillEye size={20} />
            )}
          </button>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${inputId}-error`}
              className="text-red-600 text-sm flex items-center gap-1"
              role="alert"
            >
              <span>⚠️</span>
              {error.message}
            </motion.p>
          )}
        </AnimatePresence>
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [step, setStep] = useState(1);

  const router = useRouter();

  const checkPasswordRules = (password) => ({
    length: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password),
  });

  const formatBankAccount = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Format as XXXX-XXXX-XXXX-XXXX
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1-");
    return formatted;
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    trigger,
    setValue,
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

      // Enhanced user data with all original fields preserved
      const userData = {
        uid: userCred.user.uid,
        email: data.email,
        fullName: data.fullName || "",
        contactNumber: data.contactNumber,
        orgAddress: data.orgAddress,
        city: data.city,
        orgName: data.orgName || "",
        licenseId: data.licenseId || "",
        bankAccount: data.bankAccount || "",
        userType,
        createdAt: new Date(),
        emailVerified: false,
        isActive: true,
        profileCompleted: true,
        // Additional fields for enhanced functionality
        lastLogin: null,
        loginCount: 0,
        profilePicture: "",
        bio: "",
        preferences: {
          notifications: true,
          emailUpdates: true,
          smsUpdates: false,
        },
        // Donor specific fields
        ...(userType === "Donor" && {
          totalDonated: 0,
          donationCount: 0,
          favoriteOrganizations: [],
          donationHistory: [],
        }),
        // Orphanage specific fields
        ...(userType === "Orphanage" && {
          totalReceived: 0,
          activeRequests: 0,
          completedRequests: 0,
          verificationStatus: "pending",
          documents: [],
        }),
      };

      await setDoc(doc(firestore, "users", userCred.user.uid), userData);

      toast.success(
        "🎉 Account created successfully! Please check your email for verification.",
        {
          position: "top-right",
          autoClose: 6000,
        }
      );
      setShowModal(true);
      reset();
    } catch (error) {
      let msg = error.message;
      if (error.code === "auth/email-already-in-use")
        msg =
          "This email is already registered. Please try logging in instead.";
      else if (error.code === "auth/weak-password")
        msg = "Password is too weak. Please choose a stronger password.";
      else if (error.code === "auth/invalid-email")
        msg = "Please enter a valid email address.";

      toast.error("❌ Error: " + msg, {
        position: "top-right",
        autoClose: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate =
      step === 1
        ? ["email", "password", "confirmPassword"]
        : userType === "Donor"
        ? ["fullName", "contactNumber", "orgAddress", "city"]
        : [
            "orgName",
            "licenseId",
            "bankAccount",
            "contactNumber",
            "orgAddress",
            "city",
          ];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(1);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-4 sm:px-6 lg:px-8">
      <ToastContainer />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-white text-2xl font-bold">CC</span>
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Join CareConnect
          </h2>
          <p className="text-gray-600">
            Create your account and start making a difference
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= 1
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <div
              className={`w-16 h-1 ${
                step >= 2 ? "bg-green-500" : "bg-gray-200"
              }`}
            ></div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= 2
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="flex justify-center gap-4 mb-8" role="tablist">
          {["Donor", "Orphanage"].map((type) => (
            <motion.button
              key={type}
              onClick={() => setUserType(type)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-3 text-sm font-semibold rounded-full transition-all duration-200 ${
                userType === type
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              role="tab"
              aria-selected={userType === type}
            >
              {type === "Donor" ? "❤️ Donor" : "🏠 Orphanage"}
            </motion.button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <FormInput
                  label="Email Address"
                  type="email"
                  icon="📧"
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
                        return "Password must meet all requirements below";
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
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-xl p-4 space-y-2"
                  >
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Password Requirements:
                    </p>
                    {(() => {
                      const rules = checkPasswordRules(passwordInput);
                      return (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div
                            className={`flex items-center gap-2 ${
                              rules.length ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            <span>{rules.length ? "✅" : "❌"}</span> 8+
                            characters
                          </div>
                          <div
                            className={`flex items-center gap-2 ${
                              rules.hasLetter
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            <span>{rules.hasLetter ? "✅" : "❌"}</span> Letter
                            (A-Z)
                          </div>
                          <div
                            className={`flex items-center gap-2 ${
                              rules.hasNumber
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            <span>{rules.hasNumber ? "✅" : "❌"}</span> Number
                            (0-9)
                          </div>
                          <div
                            className={`flex items-center gap-2 ${
                              rules.hasSpecial
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            <span>{rules.hasSpecial ? "✅" : "❌"}</span>{" "}
                            Special (@$!%*?&)
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                <PasswordInput
                  label="Confirm Password"
                  icon="🔐"
                  {...register("confirmPassword", {
                    required: "Confirm your password",
                    validate: (val) =>
                      val === watch("password") || "Passwords do not match",
                  })}
                  error={errors.confirmPassword}
                  showPassword={showConfirmPassword}
                  toggleShow={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  name="confirmPassword"
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                {userType === "Donor" && (
                  <FormInput
                    label="Full Name"
                    icon="👤"
                    {...register("fullName", {
                      required: "Full Name is required",
                      pattern: {
                        value: /^[A-Za-z\s]+$/,
                        message:
                          "Full name can only contain letters and spaces",
                      },
                    })}
                    error={errors.fullName}
                    name="fullName"
                    onInput={(e) => {
                      // Remove non-alphabetic characters except spaces
                      e.target.value = e.target.value.replace(
                        /[^A-Za-z\s]/g,
                        ""
                      );
                    }}
                  />
                )}

                {userType === "Orphanage" && (
                  <>
                    <FormInput
                      label="Organization Name"
                      icon="🏢"
                      {...register("orgName", {
                        required: "Organization Name is required",
                        pattern: {
                          value: /^[A-Za-z\s]+$/,
                          message:
                            "Organization name should contain only alphabets and spaces",
                        },
                      })}
                      error={errors.orgName}
                      name="orgName"
                      onInput={(e) => {
                        // Remove non-alphabetic characters except spaces
                        e.target.value = e.target.value.replace(
                          /[^A-Za-z\s]/g,
                          ""
                        );
                      }}
                    />
                    <FormInput
                      label="License ID"
                      icon="📋"
                      {...register("licenseId", {
                        required: "License ID is required",
                        pattern: {
                          value:
                            /^(SWD\/(PB|SD|KP|BL)\/\d{4}\/\d{4}|Charity-REG-\d{4}\/\d{4})$/,
                          message:
                            "Format: SWD/PB/XXXX/YYYY or Charity-REG-XXXX/YYYY",
                        },
                      })}
                      error={errors.licenseId}
                      name="licenseId"
                      placeholder="SWD/PB/XXXX/YYYY or Charity-REG-XXXX/YYYY"
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Bank Account *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-400">🏦</span>
                        </div>
                        <input
                          type="text"
                          placeholder="XXXX-XXXX-XXXX-XXXX"
                          {...register("bankAccount", {
                            required: "Bank Account is required",
                            validate: (value) => {
                              const digits = value.replace(/\D/g, "");
                              if (digits.length < 10 || digits.length > 20) {
                                return "Bank account must be 10-20 digits";
                              }
                              return true;
                            },
                          })}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
                            errors.bankAccount
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-300 focus:border-green-500"
                          }`}
                          onInput={(e) => {
                            const formatted = formatBankAccount(e.target.value);
                            e.target.value = formatted;
                            setValue(
                              "bankAccount",
                              formatted.replace(/-/g, "")
                            );
                          }}
                          maxLength="19"
                        />
                      </div>
                      <AnimatePresence>
                        {errors.bankAccount && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-600 text-sm flex items-center gap-1"
                          >
                            <span>⚠️</span>
                            {errors.bankAccount.message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Contact Number
                  </label>
                  <Controller
                    name="contactNumber"
                    control={control}
                    rules={{
                      required: "Contact number is required",
                      validate: (val) =>
                        val.replace(/\D/g, "").length >= 7 ||
                        "Invalid phone number",
                    }}
                    render={({ field }) => (
                      <PhoneInput
                        country="pk"
                        value={field.value}
                        onChange={field.onChange}
                        inputProps={{ name: "contactNumber", required: true }}
                        inputStyle={{
                          width: "100%",
                          height: "48px",
                          borderRadius: "12px",
                          border: "1px solid #d1d5db",
                          fontSize: "16px",
                        }}
                        containerStyle={{ width: "100%" }}
                        enableSearch
                      />
                    )}
                  />
                  <AnimatePresence>
                    {errors.contactNumber && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-600 text-sm flex items-center gap-1"
                      >
                        <span>⚠️</span>
                        {errors.contactNumber.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <FormInput
                  label="Address"
                  icon="📍"
                  {...register("orgAddress", {
                    required: "Address is required",
                  })}
                  error={errors.orgAddress}
                  name="orgAddress"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
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
                        placeholder="🌍 Start typing your city..."
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderRadius: "12px",
                            border: "1px solid #d1d5db",
                            minHeight: "48px",
                            fontSize: "16px",
                          }),
                        }}
                      />
                    )}
                  />
                  <AnimatePresence>
                    {errors.city && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-600 text-sm flex items-center gap-1"
                      >
                        <span>⚠️</span>
                        {errors.city.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            {step === 2 && (
              <motion.button
                type="button"
                onClick={prevStep}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                ← Previous
              </motion.button>
            )}

            {step === 1 ? (
              <motion.button
                type="button"
                onClick={nextStep}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="ml-auto px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-200"
              >
                Next →
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className={`ml-auto px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </motion.button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              disabled={loading}
            >
              Sign in here
            </button>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <span>🔐</span>
            <span>Your data is protected with enterprise-grade security</span>
          </div>
        </div>
      </motion.div>

      {/* Success Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-2xl max-w-md text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">
                Account Created Successfully!
              </h2>
              <p className="text-gray-700 mb-6">
                We've sent a verification email to your inbox. Please verify
                your email address to complete your registration.
              </p>
              <motion.button
                onClick={() => {
                  setShowModal(false);
                  router.push("/login");
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold transition-all duration-200"
              >
                Continue to Login
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
