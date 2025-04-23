"use client";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase"; // Firebase imports
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function AccountDetails() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser; // Get the current user
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(firestore, "users", user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          displayName: data.displayName || "",
          email: user.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    };

    fetchUserData();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      // Update the user details in Firestore
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // If password is provided and matches the confirmation, update it
      if (formData.newPassword && formData.newPassword === formData.confirmPassword) {
        await updatePassword(user, formData.newPassword); // Update password in Firebase Auth
      }

      // Show success message
      toast.success("Changes saved successfully!");

    } catch (error) {
      toast.error("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex`}>
      <ToastContainer />
      {/* Main Content */}
      <motion.div
        className="w-3/4 bg-white shadow-md rounded-lg p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Page Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Account Details</h2>

        {/* Account Form */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-700 font-medium">First name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-gray-700 font-medium">Last name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Display name *</label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            readOnly
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none bg-gray-100 cursor-not-allowed"
          />
          <p className="text-sm text-gray-500 mt-1">This will be how your name is displayed.</p>
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Email address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* Password Change Section */}
        <h3 className="text-lg font-bold text-gray-800 mt-6 border-b pb-2">Password Change</h3>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Current password</label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">New password</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Confirm new password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Save Changes Button */}
        <button
          onClick={handleSaveChanges}
          className="mt-6 w-full bg-green-600 text-white py-3 px-6 font-semibold hover:bg-green-700 transition-all shadow-md"
          disabled={loading}
        >
          {loading ? "Saving..." : "SAVE CHANGES"}
        </button>
      </motion.div>
    </section>
  );
}
