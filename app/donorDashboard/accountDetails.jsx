"use client";

import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { auth, firestore, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function AccountDetails() {
  const [formData, setFormData] = useState({
    profilePhoto: "",
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.uid);
      try {
        const email = user.email || "";
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData((prev) => ({
            ...prev,
            email,
            profilePhoto: data.profilePhoto || "",
            organizationName: data.orgName || prev.organizationName,
            contactNumber: data.contactNumber || prev.contactNumber,
            address: data.orgAddress || prev.address,
            city: data.city || prev.city,
            province: data.province || prev.province,
            zip: data.zip || prev.zip,
          }));
        } else {
          setFormData((prev) => ({ ...prev, email }));
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePhoto" && files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, profilePhoto: reader.result }));
        setSelectedFile(file);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!userId) {
      alert("User not logged in");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert("New password and confirmation do not match.");
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;

      // 1. Handle profile photo upload if needed
      let photoURL = formData.profilePhoto;
      if (selectedFile) {
        const storageRef = ref(storage, `profilePhotos/${userId}`);
        await uploadBytes(storageRef, selectedFile);
        photoURL = await getDownloadURL(storageRef);
      }

      // 2. Update user password if new password is provided
      if (formData.currentPassword && formData.newPassword) {
        const credential = EmailAuthProvider.credential(
          user.email,
          formData.currentPassword
        );

        // Reauthenticate
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, formData.newPassword);

        alert("Password updated successfully.");
      }

      // 3. Update Firestore user document with other details
      const updatedData = {
        orgName: formData.organizationName,
        profilePhoto: photoURL,
        contactNumber: formData.contactNumber,
        orgAddress: formData.address,
        city: formData.city,
        province: formData.province,
        zip: formData.zip,
      };

      await updateDoc(doc(firestore, "users", userId), updatedData);

      alert("Profile updated successfully!");

      // Clear password fields after save
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setSelectedFile(null);
    } catch (error) {
      console.error("Error saving profile or updating password:", error);
      alert(
        error.code === "auth/wrong-password"
          ? "Current password is incorrect."
          : "Failed to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center py-8">Loading profile...</p>;
  }

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8`}>
      <motion.div
        className="w-full max-w-5xl mx-auto bg-white shadow-md rounded-lg p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 text-center">
          Donor Profile
        </h2>

        <div className="flex justify-center mb-6">
          <div className="relative w-28 h-28 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            {formData.profilePhoto ? (
              <img
                src={formData.profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-purple-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A13.937 13.937 0 0112 15c2.485 0 4.815.733 6.879 1.982M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
            <label
              htmlFor="profilePhoto"
              className="absolute bottom-1 right-1 bg-white rounded-full p-1 cursor-pointer shadow-md hover:bg-green-100"
              title="Change profile photo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z"
                />
              </svg>
            </label>
            <input
              type="file"
              id="profilePhoto"
              name="profilePhoto"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Section */}
          <div>
            <h3 className="font-bold mb-4 text-lg border-b pb-2">Personal Details</h3>
            <label className="block font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <label className="block font-medium text-gray-700 mb-1 mt-6">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full border border-gray-300 p-2 bg-gray-100 cursor-not-allowed rounded-md"
            />

            <label className="block font-medium text-gray-700 mb-1 mt-6">
              Contact Number *
            </label>
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

            <label className="block font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />

            <label className="block font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
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
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {saving ? "Saving..." : "SAVE CHANGES"}
        </button>
      </motion.div>
    </section>
  );
}
