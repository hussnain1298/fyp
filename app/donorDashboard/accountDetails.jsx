"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  updatePassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic"; // dynamic import for react-select
import axios from "axios"; // axios for city API
import PhoneInput from "react-phone-input-2"; // PhoneInput import
import "react-phone-input-2/lib/style.css"; // PhoneInput styling
import {
  FaUser,
  FaLock,
  FaMapMarkerAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa"; // Icons for password visibility

const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

export default function AccountDetails() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false); // New state for password loading
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    address: "",
    city: "",
    province: "",
    zip: "",
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
              "75b9489edemshc4bf9834e6e1852p14e79ejsn0ec27f88f073", // Same key as orphanageDashboard
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
          fullName: data.fullName || "",
          email: user.email || "",
          contactNumber: data.contactNumber || "",
          address: data.address || "",
          city: data.city || "",
          province: data.province || "",
          zip: data.zip || "",
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

  // Password validation function
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

    // Full Name validation: only alphabets and spaces
    if (!formData.fullName?.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (!/^[A-Za-z\s]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = "Full name can only contain letters and spaces";
    }

    // Contact Number validation
    if (!formData.contactNumber?.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else {
      const cleanNumber = formData.contactNumber.replace(/\D/g, "");
      if (cleanNumber.length < 7) {
        newErrors.contactNumber =
          "Please enter a valid contact number (at least 7 digits)";
      }
    }

    // Password validation (only if new password is provided)
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Full Name: only allow letters and spaces
    if (name === "fullName") {
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
      await updateDoc(userRef, {
        fullName: formData.fullName.trim(),
        contactNumber: formData.contactNumber.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        zip: formData.zip.trim(),
      });

      // Handle password update separately if provided
      if (formData.newPassword) {
        const passwordUpdated = await handlePasswordUpdate();
        if (!passwordUpdated) {
          setLoading(false);
          return; // Stop saving if password update failed
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
    <div className="p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
          Account Details
        </h1>
        <p className="text-gray-600">
          Manage your personal information and settings
        </p>
      </div>

      {/* Profile Avatar */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-white text-3xl sm:text-5xl font-bold shadow-xl bg-gradient-to-br from-gray-500 to-gray-600">
            {formData.fullName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gray-500 rounded-full border-4 border-white flex items-center justify-center">
            <FaUser className="text-white text-xs sm:text-sm" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8">
        {/* Personal Information */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <FaUser className="text-xl text-gray-600 mr-2" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                  errors.fullName
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-gray-500"
                }`}
                placeholder="Enter your full name (letters only)"
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
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
              <PhoneInput
                country="pk"
                value={formData.contactNumber}
                onChange={handlePhoneInputChange}
                inputProps={{ name: "contactNumber", required: true }}
                inputStyle={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "8px",
                  border: errors.contactNumber
                    ? "1px solid #ef4444"
                    : "1px solid #d1d5db", // Error state ke liye border
                  fontSize: "16px", // Keep font size consistent
                  paddingLeft: "60px", // Increased padding for flag and dial code
                  boxSizing: "border-box", // Ensure padding is included in width/height
                  lineHeight: "48px", // Match height for vertical centering
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
          </div>
        </div>

        {/* Password Settings */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <FaLock className="text-xl text-gray-600 mr-2" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Password Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <strong>Password Requirements:</strong> Minimum 8 characters with
              uppercase, lowercase, number, and special character (@$!%*?&).
              Leave blank to keep current password.
            </p>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <FaMapMarkerAlt className="text-xl text-gray-600 mr-2" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Address Information
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
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
                      backgroundColor: state.isSelected ? "#6b7280" : "#f3f4f6",
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
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading || passwordLoading}
            className={`px-8 py-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-lg ${
              loading || passwordLoading
                ? "cursor-not-allowed opacity-70"
                : "hover:shadow-xl"
            }`}
          >
            {loading || passwordLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {passwordLoading ? "Updating Password..." : "Saving Changes..."}
              </div>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
