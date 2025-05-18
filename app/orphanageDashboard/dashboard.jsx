"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  FaFileAlt, FaDownload, FaMapMarkerAlt, FaUser, FaSignOutAlt 
} from "react-icons/fa"; 

export default function OrphanageDashboard() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;

      if (currentUser) {
        const userRef = doc(firestore, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUser(userDoc.data());
        } else {
          console.log("User document not found!");
        }
      }
    };

    fetchUserData();
  }, []);

  return (
    <section className="container mx-auto px-6 py-8 flex">
      {/* Main Content */}
      <motion.div
        className="w-full bg-white shadow-md p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* ✅ Display User Name or Email */}
        <h1 className="mt-6 mb-2 text-2xl font-bold"> {/* Added margin-top here */}
          WELCOME {user?.fullName ? user.fullName : user?.email || ""}
        </h1>
        
        <p className="text-gray-600">
          From your account dashboard, you can view your{" "}
          <span className="text-blue-500 cursor-pointer">recent Donations</span>,
          manage your{" "}
          <span className="text-blue-500 cursor-pointer">Transaction charges</span> and{" "}
          <span className="text-blue-500 cursor-pointer">billing addresses</span>, 
          and edit your{" "}
          <span className="text-blue-500 cursor-pointer">password</span> and account details.
        </p>

        {/* Dashboard Icons */}
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg">
            <FaFileAlt className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">DONATIONS</p>
          </div>
          <div className="border p-6 flex flex-col items-center cursor-pointer hover:bg-gray-100 transition rounded-lg">
            <FaDownload className="text-gray-600 text-2xl mb-2" />
            <p className="text-gray-700 font-semibold">DOWNLOADS</p>
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
