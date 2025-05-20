"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { FaFileAlt, FaDownload, FaMapMarkerAlt, FaUser, FaSignOutAlt } from "react-icons/fa"; 
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function DonorDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        return;
      }
      try {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data());
        } else {
          setUser({ email: currentUser.email });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUser({ email: currentUser.email });
      }
    };

    fetchUser();
  }, []);

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex`}>
      {/* Main Content */}
      <motion.div
        className="w-full bg-white shadow-md p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="mt-6 mb-2 text-2xl font-bold">
          WELCOME {user?.orgName ? user.orgName : user?.email || "Guest"}
        </h1>
        
        <p className="text-gray-600 ">
          From your account dashboard, you can view your <span className="text-blue-500 cursor-pointer">recent Donations</span>,
          chat with <span className="text-blue-500 cursor-pointer">Orphanages </span>  <span className="text-blue-500 cursor-pointer"></span>,
          and edit your <span className="text-blue-500 cursor-pointer">password</span> and <span className="text-blue-500 cursor-pointer">account details.</span>
        </p>

        {/* Dashboard Icons */}
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg">
            <FaFileAlt className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">DONATIONS</p>
          </div>
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg">
            <FaDownload className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">MESSAGES</p>
          </div>
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg">
            <FaMapMarkerAlt className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">ADDRESSES</p>
          </div>
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg">
            <FaUser className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">ACCOUNT DETAILS</p>
          </div>
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg col-span-2">
            <FaSignOutAlt className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">LOGOUT</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
