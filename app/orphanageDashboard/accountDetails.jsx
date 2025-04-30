"use client";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { auth, firestore, storage } from "@/lib/firebase"; // Import directly from firebase.js
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";  // Import Firebase Storage methods

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function AccountDetails() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",  // Added contact number field
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profilePhoto: null,
    profilePhotoURL: "", // Store the URL for the preview
  });
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);  // For file preview

  const user = auth.currentUser; // Get the current user

  useEffect(() => {
    if (!user) {
      console.error("No user found");
      return;
    }

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: user.email || "",
            contactNumber: data.contactNumber || "",  // Fetch contact number
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            profilePhoto: data.profilePhoto || null,
            profilePhotoURL: data.profilePhoto || "", // Set the URL from Firebase
          });
        } else {
          toast.error("User data not found!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data.");
      }
    };

    fetchUserData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file instanceof File) {
      console.log("File selected:", file);
      setFormData({ ...formData, profilePhoto: file });

      // Preview the file before uploading
      const fileURL = URL.createObjectURL(file);
      setFilePreview(fileURL);  // Set the preview URL for image preview

      try {
        const photoURL = await uploadProfilePhoto(file); // Upload the photo to Firebase Storage and get the URL
        setFormData((prevData) => ({
          ...prevData,
          profilePhotoURL: photoURL, // Set the URL for preview
        }));
      } catch (error) {
        console.error("Error uploading profile photo:", error);
        toast.error("Failed to upload profile photo.");
      }
    } else {
      console.error("The selected file is not a valid file object.");
      toast.error("Invalid file selected.");
    }
  };

  const handleSaveChanges = async () => {
    if (!formData.firstName || !formData.lastName || !formData.contactNumber) {
      toast.error("First name, Last name, and Contact number are required!");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(firestore, "users", user.uid);

      // Update user details in Firestore
      await updateDoc(userRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,  // Save the contact number
      });

      // If password is provided and matches the confirmation, update it
      if (formData.newPassword && formData.newPassword === formData.confirmPassword) {
        console.log("Updating password...");
        await updatePassword(user, formData.newPassword); // Update password in Firebase Auth
      }

      // If there's a new profile photo, update it
      if (formData.profilePhoto) {
        console.log("Uploading new profile photo...");
        const photoURL = formData.profilePhotoURL || ""; // Use the existing URL if available
        await updateDoc(userRef, {
          profilePhoto: photoURL,
        });
      }

      toast.success("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to upload the profile photo to Firebase Storage and return the URL
  const uploadProfilePhoto = async (file) => {
    try {
      if (!file) {
        throw new Error("No file provided for upload.");
      }
      console.log("Uploading profile photo to Firebase Storage...");
      const storageRef = ref(storage, `profile_photos/${user.uid}`);  // Use storage reference
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);  // Get the download URL for the uploaded photo
      console.log("Profile photo uploaded. URL:", photoURL);
      return photoURL;
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      throw new Error("Profile photo upload failed.");
    }
  };

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex`}>
      <ToastContainer />
      <motion.div
        className="w-3/4 bg-white shadow-md rounded-lg p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Page Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Account Details</h2>

        {/* Profile Image */}
        <div className="flex justify-center items-center mb-6">
          <div className="relative">
            <div className="absolute right-0 top-0 bg-white p-1 rounded-full shadow-lg cursor-pointer">
              <label htmlFor="profile-photo" className="text-green-500">✎</label>
            </div>
            {filePreview ? (
              <img
                src={filePreview}  // Display the uploaded image
                alt="Profile Preview"
                className="w-40 h-40 rounded-full object-cover"
              />
            ) : (
              <div className="w-40 h-40 rounded-full flex items-center justify-center bg-gray-300">
                <span className="text-white text-3xl">👤</span>  {/* Default Avatar */}
              </div>
            )}
            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

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
          <label className="text-gray-700 font-medium">Email address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none bg-gray-100 cursor-not-allowed"
          />
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Contact Number *</label>
          <input
            type="text"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
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
