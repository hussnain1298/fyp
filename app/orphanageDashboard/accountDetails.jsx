"use client";

import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, onAuthStateChanged } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function AccountDetails() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

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
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
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
          }));
        } else {
          toast.error("User data not found!");
        }
      } catch {
        toast.error("Failed to load user data.");
      }
    };
    fetchUserData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.orgName || !formData.contactNumber) {
      toast.error("Organization Name and Contact number are required!");
      return;
    }

    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        orgName: formData.orgName,
        contactNumber: formData.contactNumber,
        orgAddress: formData.orgAddress,
        city: formData.city,
        province: formData.province,
        zip: formData.zip,
        taxId: formData.taxId,
      });

      if (formData.newPassword) {
        await updatePassword(user, formData.newPassword);
      }

      toast.success("Changes saved successfully!");
    } catch (error) {
      toast.error("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth)
    return <p className="p-6 text-center">Loading authentication...</p>;
  if (!user)
    return (
      <p className="p-6 text-center">Please log in to access your profile.</p>
    );

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8`}>
      <ToastContainer />
      <motion.div
        className="bg-white shadow-md rounded-lg p-6 max-w-5xl mx-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 text-center">
          Orphanage Profile
        </h2>

        <div className="flex justify-center mb-6">
          <div className="w-40 h-40 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-lg bg-green-500">
            {formData.orgName?.charAt(0).toUpperCase() || "O"}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="grid grid-cols-3 gap-6"
        >
          <div className="space-y-4">
            <label className="text-gray-700 font-medium">Organization Name *</label>
            <input
              type="text"
              name="orgName"
              value={formData.orgName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full border border-gray-300 p-2 rounded-md bg-gray-100 cursor-not-allowed"
            />

            <label className="text-gray-700 font-medium">Contact Number *</label>
            <input
              type="text"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
              Password Change
            </h3>
            <label className="text-gray-700 font-medium">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
              Address Details
            </h3>

            <label className="text-gray-700 font-medium">Address</label>
            <input
              type="text"
              name="orgAddress"
              value={formData.orgAddress}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">Province</label>
            <input
              type="text"
              name="province"
              value={formData.province}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">ZIP</label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <label className="text-gray-700 font-medium">Tax ID</label>
            <input
              type="text"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          <div className="col-span-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-green-600 text-white py-3 px-6 font-semibold hover:bg-green-700 transition-all shadow-md ${
                loading ? "cursor-not-allowed opacity-70" : ""
              }`}
            >
              {loading ? "Saving..." : "SAVE CHANGES"}
            </button>
          </div>
        </form>
      </motion.div>
    </section>
  );
}
