"use client"

import { useState, useEffect, useCallback } from "react"
import { Poppins } from "next/font/google"
import { motion } from "framer-motion"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { updatePassword, onAuthStateChanged } from "firebase/auth"
import { toast, ToastContainer } from "react-toastify"
import { FaUser, FaLock, FaMapMarkerAlt, FaEye, FaEyeSlash, FaPhone, FaBuilding } from "react-icons/fa"
import "react-toastify/dist/ReactToastify.css"

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] })

export default function AccountDetails() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [formData, setFormData] = useState({
    orgName: "",
    email: "",
    contactNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    orgAddress: "",
    city: "",
    province: "",
    zip: "",
    taxId: "",
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoadingAuth(false)
    })
    return unsubscribe
  }, [])

  const fetchUserData = useCallback(async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(firestore, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setFormData((prev) => ({
          ...prev,
          orgName: data.orgName || "",
          email: user.email || "",
          contactNumber: data.contactNumber || "",
          orgAddress: data.orgAddress || "",
          city: data.city || "",
          province: data.province || "",
          zip: data.zip || "",
          taxId: data.taxId || "",
        }))
      } else {
        toast.error("User data not found!")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Failed to load user data.")
    }
  }, [user])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const validateForm = useCallback(() => {
    const newErrors = {}

    // Required fields
    if (!formData.orgName?.trim()) {
      newErrors.orgName = "Organization name is required"
    }

    if (!formData.contactNumber?.trim()) {
      newErrors.contactNumber = "Contact number is required"
    } else if (!/^\+?[\d\s-()]+$/.test(formData.contactNumber)) {
      newErrors.contactNumber = "Please enter a valid contact number"
    }

    // Password validation
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = "Current password is required to set new password"
      }

      if (formData.newPassword.length < 6) {
        newErrors.newPassword = "New password must be at least 6 characters"
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match"
      }
    }

    // ZIP code validation
    if (formData.zip && !/^\d{5}(-\d{4})?$/.test(formData.zip)) {
      newErrors.zip = "Please enter a valid ZIP code"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the errors before saving")
      return
    }

    setLoading(true)
    try {
      const userRef = doc(firestore, "users", user.uid)
      await updateDoc(userRef, {
        orgName: formData.orgName.trim(),
        contactNumber: formData.contactNumber.trim(),
        orgAddress: formData.orgAddress.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        zip: formData.zip.trim(),
        taxId: formData.taxId.trim(),
      })

      if (formData.newPassword) {
        await updatePassword(user, formData.newPassword)
        // Clear password fields after successful update
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }))
      }

      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      if (error.code === "auth/wrong-password") {
        setErrors({ currentPassword: "Current password is incorrect" })
        toast.error("Current password is incorrect")
      } else if (error.code === "auth/requires-recent-login") {
        toast.error("Please log out and log back in to change your password")
      } else {
        toast.error("Failed to update profile. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Authentication Required</h3>
        <p className="text-gray-500">Please log in to access your profile.</p>
      </div>
    )
  }

  return (
    <section className={`${poppins.className} p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50`}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center mb-4">
          <FaUser className="text-2xl sm:text-3xl text-gray-600 mr-3" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">Account Details</h1>
        </div>
        <p className="text-gray-600">Manage your organization profile and settings</p>
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Organization Information</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name *</label>
                <input
                  type="text"
                  name="orgName"
                  value={formData.orgName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                    errors.orgName ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-gray-500"
                  }`}
                  placeholder="Enter organization name"
                />
                {errors.orgName && <p className="text-red-500 text-sm mt-1">{errors.orgName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  placeholder="Email address"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number *</label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                      errors.contactNumber
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-gray-500"
                    }`}
                    placeholder="Enter contact number"
                  />
                </div>
                {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tax ID (Optional)</label>
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Password Settings</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
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
                {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
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
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
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
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Password Requirements:</strong> Minimum 6 characters. Leave blank to keep current password.
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Address Information</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Address</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Province/State</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP/Postal Code</label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                    errors.zip ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-gray-500"
                  }`}
                  placeholder="Enter ZIP or postal code"
                />
                {errors.zip && <p className="text-red-500 text-sm mt-1">{errors.zip}</p>}
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
              disabled={loading}
              className={`w-full sm:w-auto px-8 py-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-lg ${
                loading ? "cursor-not-allowed opacity-70" : "hover:shadow-xl"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving Changes...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </section>
  )
}
