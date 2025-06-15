"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

function CustomAvatar3D({ variant = 1 }) {
  const avatarImages = {
    1: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/17._Designer.png",
    2: "https://getillustrations.b-cdn.net//photos/pack/3d-avatar-male_lg.png",
    3: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/16._Doctor.png",
    4: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/4._Western_Man.png",
    5: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/3._Black_Man.png",
    6: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/18._Artist.png",
    7: "https://cdn1.iconfinder.com/data/icons/facely-metapeople-3d-avatar-set/512/1._Asian_Man.png",
  };
  const backgroundGradients = {
    1: "from-green-400 to-green-600",
    2: "from-blue-400 to-blue-600",
    3: "from-red-400 to-red-600",
    4: "from-orange-400 to-orange-600",
    5: "from-purple-400 to-purple-600",
    6: "from-pink-400 to-pink-600",
    7: "from-indigo-400 to-indigo-600",
  };
  return (
    <div className="relative w-32 h-32 mx-auto">
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${backgroundGradients[variant]} shadow-2xl`}>
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
      </div>
      <div className="absolute inset-2 rounded-full overflow-hidden bg-white shadow-inner">
        <img
          src={avatarImages[variant]}
          alt="3D Avatar"
          className="w-full h-full object-cover"
          style={{ filter: "contrast(1.1) saturate(1.1) brightness(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20 rounded-full"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-gray-900/20 to-transparent rounded-b-full"></div>
      </div>
      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-28 h-8 bg-black/30 rounded-full blur-lg"></div>
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
    </div>
  );
}

export default function AccountDetails() {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [avatarVariant, setAvatarVariant] = useState(1);

  const generateAvatarVariant = (uid) => {
    const hash = uid?.split("").reduce((a, b) => (a = (a << 5) - a + b.charCodeAt(0)), 0);
    return Math.abs(hash % 7) + 1;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return setLoading(false);
      setUserId(user.uid);
      setAvatarVariant(generateAvatarVariant(user.uid));

      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData((prev) => ({
            ...prev,
            email: user.email,
            fullName: data.fullName || "",
            contactNumber: data.contactNumber || "",
            address: data.orgAddress || "",
            city: data.city || "",
            province: data.province || "",
            zip: data.zip || "",
          }));
        }
      } catch (e) {
        toast.error("Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const validate = () => {
    const errs = {};
    if (!formData.fullName) errs.fullName = "Required";
    if (!/^\d{10,}$/.test(formData.contactNumber)) errs.contactNumber = "Invalid number";
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (formData.zip && !/^\d{5,}$/.test(formData.zip)) errs.zip = "Invalid ZIP";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSave = async () => {
    if (!validate()) return toast.error("Please fix validation errors");

    setSaving(true);
    try {
      const user = auth.currentUser;

      if (formData.currentPassword && formData.newPassword) {
        const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, formData.newPassword);
        toast.success("Password updated");
      }

      const data = {
        fullName: formData.fullName,
        contactNumber: formData.contactNumber,
        orgAddress: formData.address,
        city: formData.city,
        province: formData.province,
        zip: formData.zip,
      };

      await updateDoc(doc(firestore, "users", userId), data);
      toast.success("Profile updated");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      toast.error(err.code === "auth/wrong-password" ? "Incorrect password" : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <section className={`${poppins.className} container mx-auto px-4 py-8`}>
      <motion.div
        className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-center mb-6 border-b pb-2">Donor Profile</h2>

        <div className="flex justify-center mb-6">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }}>
            <CustomAvatar3D variant={avatarVariant} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Personal Info</h3>
            <LabelInput label="Full Name *" name="fullName" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
            <LabelInput label="Email *" name="email" value={formData.email} readOnly />
            <LabelInput label="Contact Number *" name="contactNumber" value={formData.contactNumber} onChange={handleChange} error={errors.contactNumber} />
          </div>

          <div>
            <h3 className="font-semibold mb-4">Password</h3>
            <LabelInput label="Current Password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} type="password" />
            <LabelInput label="New Password" name="newPassword" value={formData.newPassword} onChange={handleChange} type="password" />
            <LabelInput label="Confirm Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type="password" error={errors.confirmPassword} />
          </div>

          <div>
            <h3 className="font-semibold mb-4">Address</h3>
            <LabelInput label="Address" name="address" value={formData.address} onChange={handleChange} />
            <LabelInput label="City" name="city" value={formData.city} onChange={handleChange} />
            <LabelInput label="Province" name="province" value={formData.province} onChange={handleChange} />
            <LabelInput label="ZIP" name="zip" value={formData.zip} onChange={handleChange} error={errors.zip} />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-8 w-full py-3 text-white font-semibold rounded-lg transition-all ${saving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <ToastContainer position="top-right" autoClose={3000} />
      </motion.div>
    </section>
  );
}

const LabelInput = ({ label, name, value, onChange, type = "text", readOnly = false, error }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className={`w-full mt-1 p-2 border ${error ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-2 focus:ring-green-500`}
    />
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);
