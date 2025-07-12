"use client";

import { useState, useEffect, useCallback } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  updatePassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import {
  FaUser,
  FaLock,
  FaMapMarkerAlt,
  FaEye,
  FaEyeSlash,
  FaBuilding,
  FaUniversity,
  FaIdCard,
} from "react-icons/fa"; // FaPhone icon will be removed as PhoneInput handles it
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import axios from "axios";
import PhoneInput from "react-phone-input-2"; // PhoneInput import kiya gaya hai
import "react-phone-input-2/lib/style.css"; // PhoneInput ki styling import ki gayi hai

const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function AccountDetails() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    orgName: "",
    email: "",
    contactNumber: "",
    bankAccount: "",
    licenseId: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    orgAddress: "",
    city: "",
    province: "",
    zip: "",
    taxId: "",
  });

  const [errors, setErrors] = useState({});

  // City API integration - only city names
  const loadCityOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) return [];
    try {
      const res = await axios.get(
        "https://wft-geo-db.p.rapidapi.com/v1/geo/cities",
        {
          params: {
            namePrefix: inputValue,
            sort: "-population",
            limit: 10,
            countryIds: "PK", // Filter for Pakistan only
          },
          headers: {
            "X-RapidAPI-Key":
              "75b9489edemshc4bf9834e6e1852p14e79ejsn0ec27f88f073",
            "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
          },
        }
      );
      return res.data.data.map((city) => ({
        label: city.city, // Only city name
        value: city.city, // Only city name
      }));
    } catch (error) {
      console.error("Error loading cities:", error);
      return [];
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFormData((prev) => ({
          ...prev,
          orgName: data.orgName || "",
          email: user.email || "",
          contactNumber: data.contactNumber || "",
          bankAccount: data.bankAccount || "",
          licenseId: data.licenseId || "",
          orgAddress: data.orgAddress || "",
          city: data.city || "",
          province: data.province || "",
          zip: data.zip || "",
          taxId: data.taxId || "",
        }));
      } else {
        toast.error("User data not found!");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data.");
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const validateLicenseId = (licenseId) => {
    if (!licenseId) return false;

    // Format 1: SWD/PB/XXXX/YYYY
    const format1 = /^SWD\/(PB|SD|KP|BL)\/\d{4}\/\d{4}$/;

    // Format 2: Charity-REG-XXXX/YYYY
    const format2 = /^Charity-REG-\d{4}\/\d{4}$/;

    return format1.test(licenseId) || format2.test(licenseId);
  };

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push(
        "Password must contain at least one special character (@$!%*?&)"
      );
    }

    return errors;
  };

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required fields
    if (!formData.orgName?.trim()) {
      newErrors.orgName = "Organization name is required";
    } else if (!/^[A-Za-z\s]+$/.test(formData.orgName.trim())) {
      newErrors.orgName =
        "Organization name can only contain letters and spaces";
    }

    // Contact Number validation
    if (!formData.contactNumber?.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else {
      const cleanNumber = formData.contactNumber.replace(/\D/g, "");
      if (cleanNumber.length < 7) {
        // Minimum 7 digits for a valid phone number
        newErrors.contactNumber =
          "Please enter a valid contact number (at least 7 digits)";
      }
    }

    // Bank Account validation
    if (formData.bankAccount?.trim()) {
      const cleanBankAccount = formData.bankAccount.replace(/[-\s]/g, "");
      if (!/^\d{10,20}$/.test(cleanBankAccount)) {
        newErrors.bankAccount =
          "Please enter a valid bank account number (10-20 digits)";
      }
    }

    // License ID validation
    if (formData.licenseId?.trim()) {
      if (!validateLicenseId(formData.licenseId.trim())) {
        newErrors.licenseId =
          "Please enter a valid license ID format: SWD/PB/XXXX/YYYY or Charity-REG-XXXX/YYYY";
      }
    }

    // Password validation
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword =
          "Current password is required to set new password";
      }

      const passwordErrors = validatePassword(formData.newPassword);
      if (passwordErrors.length > 0) {
        newErrors.newPassword = passwordErrors[0]; // Show first error
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    // ZIP code validation
    if (formData.zip && !/^\d{5}(-\d{4})?$/.test(formData.zip)) {
      newErrors.zip = "Please enter a valid ZIP code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const formatBankAccount = (value) => {
    // Remove all non-digits
    const cleanValue = value.replace(/\D/g, "");

    // Format as XXXX-XXXX-XXXX-XXXX (Pakistani bank account format)
    if (cleanValue.length <= 4) {
      return cleanValue;
    } else if (cleanValue.length <= 8) {
      return `${cleanValue.slice(0, 4)}-${cleanValue.slice(4)}`;
    } else if (cleanValue.length <= 12) {
      return `${cleanValue.slice(0, 4)}-${cleanValue.slice(
        4,
        8
      )}-${cleanValue.slice(8)}`;
    } else {
      return `${cleanValue.slice(0, 4)}-${cleanValue.slice(
        4,
        8
      )}-${cleanValue.slice(8, 12)}-${cleanValue.slice(12, 16)}`;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Format bank account number
    if (name === "bankAccount") {
      const formattedValue = formatBankAccount(value);
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    }
    // Organization name - only allow letters and spaces
    else if (name === "orgName") {
      const cleanValue = value.replace(/[^A-Za-z\s]/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle change for PhoneInput specifically
  const handlePhoneInputChange = (value) => {
    setFormData((prev) => ({ ...prev, contactNumber: value }));
    if (errors.contactNumber) {
      setErrors((prev) => ({ ...prev, contactNumber: "" }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Verify current password before allowing password change
  const verifyCurrentPassword = async (currentPassword) => {
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      console.error("Password verification failed:", error);
      return false;
    }
  };

  const handlePasswordUpdate = async () => {
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      toast.error("Please fill all password fields");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
      return false;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setErrors((prev) => ({ ...prev, newPassword: passwordErrors[0] }));
      return false;
    }

    setPasswordLoading(true);
    try {
      // First verify current password
      const isCurrentPasswordValid = await verifyCurrentPassword(
        formData.currentPassword
      );

      if (!isCurrentPasswordValid) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Current password is incorrect",
        }));
        toast.error("Current password is incorrect");
        return false;
      }

      // Update password
      await updatePassword(user, formData.newPassword);

      // Clear password fields after successful update
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      // Clear password-related errors
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.currentPassword;
        delete newErrors.newPassword;
        delete newErrors.confirmPassword;
        return newErrors;
      });

      toast.success(
        "Password updated successfully! Please use your new password for future logins."
      );
      return true;
    } catch (error) {
      console.error("Error updating password:", error);
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please log out and log back in to change your password");
      } else {
        toast.error("Failed to update password. Please try again.");
      }
      return false;
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(firestore, "users", user.uid);

      // Clean bank account number before saving (remove hyphens)
      const cleanBankAccount = formData.bankAccount.replace(/[-\s]/g, "");

      // Update profile data
      await updateDoc(userRef, {
        orgName: formData.orgName.trim(),
        contactNumber: formData.contactNumber.trim(),
        bankAccount: cleanBankAccount,
        licenseId: formData.licenseId.trim(),
        orgAddress: formData.orgAddress.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        zip: formData.zip.trim(),
        taxId: formData.taxId.trim(),
      });

      // Handle password update separately if provided
      if (formData.newPassword) {
        const passwordUpdated = await handlePasswordUpdate();
        if (!passwordUpdated) {
          setLoading(false);
          return;
        }
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-500">Please log in to access your profile.</p>
      </div>
    );
  }

  return (
    <section
      className={`${poppins.className} p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50`}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center mb-4">
          <FaUser className="text-2xl sm:text-3xl text-gray-600 mr-3" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
            Account Details
          </h1>
        </div>
        <p className="text-gray-600">
          Manage your organization profile and settings
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Profile Avatar */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-white text-3xl sm:text-5xl font-bold shadow-xl bg-gradient-to-br from-gray-500 to-gray-600">
              {formData.orgName?.charAt(0).toUpperCase() || "O"}
            </div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gray-500 rounded-full border-4 border-white flex items-center justify-center">
              <FaUser className="text-white text-xs sm:text-sm" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
          {/* Organization Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center mb-6">
              <FaBuilding className="text-xl text-gray-600 mr-2" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Organization Information
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="orgName"
                  value={formData.orgName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                    errors.orgName
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-gray-500"
                  }`}
                  placeholder="Enter organization name (letters only)"
                />
                {errors.orgName && (
                  <p className="text-red-500 text-sm mt-1">{errors.orgName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  placeholder="Email address"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Number *
                </label>
                {/* PhoneInput component yahan lagaya gaya hai */}
                <PhoneInput
                  country="pk"
                  value={formData.contactNumber}
                  onChange={handlePhoneInputChange} // Naya handler use kiya gaya hai
                  inputProps={{ name: "contactNumber", required: true }}
                  inputStyle={{
                    width: "100%",
                    height: "48px",
                    borderRadius: "8px", // Rounded-lg ke mutabiq
                    border: errors.contactNumber
                      ? "1px solid #ef4444"
                      : "1px solid #d1d5db", // Error state ke liye border
                    fontSize: "16px",
                    paddingLeft: "50px", // Flag aur dial code ke liye space
                  }}
                  containerStyle={{ width: "100%" }}
                  enableSearch
                />
                {errors.contactNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.contactNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bank Account
                </label>
                <div className="relative">
                  <FaUniversity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                      errors.bankAccount
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-gray-500"
                    }`}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength="19" // 16 digits + 3 hyphens
                  />
                </div>
                {errors.bankAccount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.bankAccount}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter your bank account number
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  License ID
                </label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="licenseId"
                    value={formData.licenseId}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                      errors.licenseId
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-gray-500"
                    }`}
                    placeholder="SWD/PB/1234/2024 or Charity-REG-1234/2024"
                  />
                </div>
                {errors.licenseId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.licenseId}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format: SWD/PB/XXXX/YYYY or Charity-REG-XXXX/YYYY
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tax ID (Optional)
                </label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Enter tax identification number"
                />
              </div>
            </div>
          </motion.div>

          {/* Password Change */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center mb-6">
              <FaLock className="text-xl text-gray-600 mr-2" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Password Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none transition-colors ${
                      errors.currentPassword
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-gray-500"
                    }`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none transition-colors ${
                      errors.newPassword
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-gray-500"
                    }`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("new")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none transition-colors ${
                      errors.confirmPassword
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-gray-500"
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Password Requirements:</strong> Minimum 8 characters
                with uppercase, lowercase, number, and special character
                (@$!%*?&). Leave blank to keep current password.
              </p>
            </div>
          </motion.div>

          {/* Address Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center mb-6">
              <FaMapMarkerAlt className="text-xl text-gray-600 mr-2" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Address Information
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Organization Address
                </label>
                <input
                  type="text"
                  name="orgAddress"
                  value={formData.orgAddress}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Enter complete address"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  isClearable
                  loadOptions={loadCityOptions}
                  onChange={(option) => {
                    setFormData((prev) => ({
                      ...prev,
                      city: option?.value || "",
                    }));
                  }}
                  value={
                    formData.city
                      ? { label: formData.city, value: formData.city }
                      : null
                  }
                  placeholder="🌍 Start typing city name..."
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      minHeight: "48px",
                      fontSize: "16px",
                      boxShadow: state.isFocused ? "0 0 0 2px #6b7280" : "none",
                      borderColor: state.isFocused ? "#6b7280" : "#d1d5db",
                      "&:hover": {
                        borderColor: "#6b7280",
                      },
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#9ca3af",
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected
                        ? "#6b7280"
                        : state.isFocused
                        ? "#f3f4f6"
                        : "white",
                      color: state.isSelected ? "white" : "#374151",
                      "&:hover": {
                        backgroundColor: state.isSelected
                          ? "#6b7280"
                          : "#f3f4f6",
                      },
                    }),
                  }}
                  noOptionsMessage={({ inputValue }) =>
                    inputValue.length < 2
                      ? "Type at least 2 characters to search cities"
                      : "No cities found"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Province/State
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Enter province or state"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                    errors.zip
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-gray-500"
                  }`}
                  placeholder="Enter ZIP or postal code"
                />
                {errors.zip && (
                  <p className="text-red-500 text-sm mt-1">{errors.zip}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <button
              type="submit"
              disabled={loading || passwordLoading}
              className={`w-full sm:w-auto px-8 py-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-lg ${
                loading || passwordLoading
                  ? "cursor-not-allowed opacity-70"
                  : "hover:shadow-xl"
              }`}
            >
              {loading || passwordLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {passwordLoading
                    ? "Updating Password..."
                    : "Saving Changes..."}
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </section>
  );
}
