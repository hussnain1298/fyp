"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import {
  FaFileAlt,
  FaDownload,
  FaMapMarkerAlt,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        setUser(userDoc.exists() ? userDoc.data() : { email: currentUser.email });
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUser({ email: currentUser.email });
      }
    };
    fetchUser();
  }, []);

  const cards = [
    { icon: FaFileAlt, label: "Donations" },
    { icon: FaDownload, label: "Messages" },
    { icon: FaMapMarkerAlt, label: "Addresses" },
    { icon: FaUser, label: "Account Details" },
    { icon: FaSignOutAlt, label: "Logout", full: true },
  ];

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-12`}>
         
      <motion.div
        className="w-full bg-white shadow-md rounded-xl p-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
   
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome to Admin Portal
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          From your account dashboard, you can view your{" "}
          <span className="text-green-500 underline cursor-pointer">donations</span>, chat with{" "}
          <span className="text-green-500 underline cursor-pointer">orphanages</span>, and manage your{" "}
          <span className="text-green-500 underline cursor-pointer">account details</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {cards.map(({ icon: Icon, label, full }) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.03 }}
              className={`border p-6 flex flex-col items-center text-center transition-all duration-200 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 ${
                full ? "col-span-full" : ""
              }`}
            >
              <Icon className="text-2xl text-gray-700 mb-2" />
              <p className="text-gray-800 font-semibold text-sm uppercase tracking-wide">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
