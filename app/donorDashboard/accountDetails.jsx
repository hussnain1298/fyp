"use client"

import { useState, useEffect } from "react"
import { Poppins } from "next/font/google"
import { motion } from "framer-motion"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

// High-Quality 3D Avatar Component using actual 3D avatar images
function HighQuality3DAvatar({ variant = 1 }) {
  // Professional 3D avatar URLs (you can replace these with your own high-quality 3D avatars)
  const avatarImages = {
    1: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&auto=format&q=80", // Professional male
    2: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face&auto=format&q=80", // Professional female
    3: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&auto=format&q=80", // Young professional
    4: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&auto=format&q=80", // Professional female 2
    5: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face&auto=format&q=80", // Senior professional
  }

  const backgroundGradients = {
    1: "from-green-400 to-green-600",
    2: "from-purple-400 to-purple-600",
    3: "from-blue-400 to-blue-600",
    4: "from-pink-400 to-pink-600",
    5: "from-indigo-400 to-indigo-600",
  }

  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* 3D Background with gradient like the reference */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${backgroundGradients[variant]} shadow-2xl`}>
        {/* Inner glow effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
      </div>

      {/* Avatar Image Container */}
      <div className="absolute inset-2 rounded-full overflow-hidden bg-white shadow-inner">
        <img
          src={avatarImages[variant] || "/placeholder.svg"}
          alt="Professional Avatar"
          className="w-full h-full object-cover"
          style={{
            filter: "contrast(1.1) saturate(1.2) brightness(1.05)",
          }}
          onError={(e) => {
            // Fallback to a default avatar if image fails to load
            e.target.src = `https://ui-avatars.com/api/?name=User&size=400&background=4F46E5&color=fff&format=png&rounded=true&bold=true`
          }}
        />

        {/* 3D Lighting overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20 rounded-full"></div>

        {/* Professional business overlay effect */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-800/40 to-transparent rounded-b-full"></div>
      </div>

      {/* 3D Shadow effect */}
      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-28 h-8 bg-black/30 rounded-full blur-lg"></div>

      {/* Additional glow for premium look */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
    </div>
  )
}

// Custom 3D Avatar Component using your specific URLs
function CustomAvatar3D({ variant = 1 }) {
  // Your complete collection of 3D avatar URLs
  const avatarImages = {
    1: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/17._Designer.png",
    2: "https://getillustrations.b-cdn.net//photos/pack/3d-avatar-male_lg.png",
    3: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/16._Doctor.png",
    4: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/4._Western_Man.png",
    5: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/3._Black_Man.png",
    6: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/18._Artist.png",
    7: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/1._Asian_Man.png",
    8: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/17._Designer.png", // Fallback
  }

  const backgroundGradients = {
    1: "from-green-400 to-green-600", // Designer - Green
    2: "from-blue-400 to-blue-600", // Male Avatar - Blue
    3: "from-red-400 to-red-600", // Doctor - Red
    4: "from-orange-400 to-orange-600", // Western Man - Orange
    5: "from-purple-400 to-purple-600", // Black Man - Purple
    6: "from-pink-400 to-pink-600", // Artist - Pink
    7: "from-indigo-400 to-indigo-600", // Asian Man - Indigo
    8: "from-teal-400 to-teal-600", // Fallback - Teal
  }

  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* 3D Background with gradient */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${backgroundGradients[variant]} shadow-2xl`}>
        {/* Inner glow effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
      </div>

      {/* Avatar Image Container */}
      <div className="absolute inset-2 rounded-full overflow-hidden bg-white shadow-inner">
        <img
          src={avatarImages[variant] || avatarImages[1]}
          alt="Professional 3D Avatar"
          className="w-full h-full object-cover object-center"
          style={{
            filter: "contrast(1.1) saturate(1.1) brightness(1.05) drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
          }}
          onError={(e) => {
            // Fallback to placeholder if URL fails
            e.target.src = "/placeholder.svg?height=400&width=400"
          }}
        />

        {/* 3D Lighting overlay for realistic effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20 rounded-full"></div>

        {/* Professional business overlay effect */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-gray-900/20 to-transparent rounded-b-full"></div>
      </div>

      {/* 3D Shadow effect */}
      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-28 h-8 bg-black/30 rounded-full blur-lg"></div>

      {/* Additional premium glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
    </div>
  )
}

export default function AccountDetails() {
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    contactNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    address: "",
    city: "",
    province: "",
    zip: "",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const [avatarVariant, setAvatarVariant] = useState(1)

  // Generate avatar variant based on user ID (now supports 1-7 variants)
  const generateAvatarVariant = (uid) => {
    if (!uid) return 1
    const hash = uid.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
    return Math.abs(hash % 7) + 1 // Now returns 1-7 instead of 1-5
  }

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.uid)

      // Set avatar variant based on user ID
      setAvatarVariant(generateAvatarVariant(user.uid))

      try {
        const email = user.email || ""
        const userDoc = await getDoc(doc(firestore, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setFormData((prev) => ({
            ...prev,
            email,
            organizationName: data.orgName || prev.organizationName,
            contactNumber: data.contactNumber || prev.contactNumber,
            address: data.orgAddress || prev.address,
            city: data.city || prev.city,
            province: data.province || prev.province,
            zip: data.zip || prev.zip,
          }))
        } else {
          setFormData((prev) => ({ ...prev, email }))
        }
      } catch (error) {
        console.error("Failed to load user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!userId) {
      alert("User not logged in")
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert("New password and confirmation do not match.")
      return
    }

    setSaving(true)

    try {
      const user = auth.currentUser

      // 1. Update user password if new password is provided
      if (formData.currentPassword && formData.newPassword) {
        const credential = EmailAuthProvider.credential(user.email, formData.currentPassword)

        // Reauthenticate
        await reauthenticateWithCredential(user, credential)

        // Update password
        await updatePassword(user, formData.newPassword)

        alert("Password updated successfully.")
      }

      // 2. Update Firestore user document with other details
      const updatedData = {
        orgName: formData.organizationName,
        contactNumber: formData.contactNumber,
        orgAddress: formData.address,
        city: formData.city,
        province: formData.province,
        zip: formData.zip,
      }

      await updateDoc(doc(firestore, "users", userId), updatedData)

      alert("Profile updated successfully!")

      // Clear password fields after save
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    } catch (error) {
      console.error("Error saving profile or updating password:", error)
      alert(
        error.code === "auth/wrong-password"
          ? "Current password is incorrect."
          : "Failed to save profile. Please try again.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-center py-8">Loading profile...</p>
  }

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8`}>
      <motion.div
        className="w-full max-w-5xl mx-auto bg-white shadow-md rounded-lg p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 text-center">Donor Profile</h2>

        {/* High-Quality 3D Avatar */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotateY: [0, 5, -5, 0],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            {/* Use AIGeneratedAvatar for consistent 3D style */}
            <CustomAvatar3D variant={avatarVariant} />
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Section */}
          <div>
            <h3 className="font-bold mb-4 text-lg border-b pb-2">Personal Details</h3>
            <label className="block font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <label className="block font-medium text-gray-700 mb-1 mt-6">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full border border-gray-300 p-2 bg-gray-100 cursor-not-allowed rounded-md"
            />

            <label className="block font-medium text-gray-700 mb-1 mt-6">Contact Number *</label>
            <input
              type="text"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Middle Section */}
          <div>
            <h3 className="font-bold mb-4 text-lg border-b pb-2">Password Change</h3>

            <label className="block font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Right Section */}
          <div>
            <h3 className="font-bold mb-4 text-lg border-b pb-2">Address Details</h3>

            <label className="block font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">Province</label>
            <input
              type="text"
              name="province"
              value={formData.province}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">ZIP</label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-8 w-full py-3 px-6 font-semibold transition-all shadow-md ${
            saving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {saving ? "Saving..." : "SAVE CHANGES"}
        </button>
      </motion.div>
    </section>
  )
}