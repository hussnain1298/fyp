"use client";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, onAuthStateChanged } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Function to generate a consistent color based on organization name
const generateColor = (name) => {
  if (!name) return "#4CAF50"; // Default green color

  // Simple hash function to generate a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to hex color
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }

  return color;
};

export default function AccountDetails() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Combined form state with all fields empty by default
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
  const [loading, setLoading] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state observer");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => {
      console.log("Cleaning up auth state observer");
      unsubscribe();
    };
  }, []);

  // Fetch user data
  useEffect(() => {
    if (!user) {
      console.log("No user found, skipping data fetch");
      return;
    }

    console.log("Fetching data for user:", user.uid);

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log("Fetched user data:", data);

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
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          }));
        } else {
          toast.error("User data not found!");
        }
      } catch (error) {
        toast.error("Failed to load user data.");
        console.error("Fetch user data error:", error);
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

      if (
        formData.newPassword &&
        formData.newPassword === formData.confirmPassword
      ) {
        console.log("Updating password...");
        await updatePassword(user, formData.newPassword);
      }
      toast.success("Changes saved successfully!");
      console.log("Changes saved successfully");
    } catch (error) {
      toast.error("Failed to save changes.");
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get the first letter of organization name
  const getInitial = () => {
    if (!formData.orgName) return "O"; // Default to "O" for Orphanage if no name
    return formData.orgName.charAt(0).toUpperCase();
  };

  // Get background color based on organization name
  const getBackgroundColor = () => {
    return generateColor(formData.orgName);
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

        {/* Letter Avatar instead of profile image */}
        <div className="flex justify-center mb-6">
          <div
            className="w-40 h-40 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-lg"
            style={{ backgroundColor: getBackgroundColor() }}
          >
            {getInitial()}
          </div>
        </div>

        {/* Combined Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="grid grid-cols-3 gap-6"
        >
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="text-gray-700 font-medium">
                Organization Name *
              </label>
              <input
                type="text"
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Organization Name"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full border border-gray-300 p-2 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">
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
          </div>

          {/* Middle Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
              Password Change
            </h3>

            <div>
              <label className="text-gray-700 font-medium">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">
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
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
              Address Details
            </h3>

            <div>
              <label className="text-gray-700 font-medium">Address</label>
              <input
                type="text"
                name="orgAddress"
                value={formData.orgAddress}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Address"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="City"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">Province</label>
              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Province"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">ZIP</label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="ZIP Code"
              />
            </div>

            <div>
              <label className="text-gray-700 font-medium">Tax ID</label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Tax ID"
              />
            </div>
          </div>

          {/* Save Button spanning all columns */}
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