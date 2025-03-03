"use client";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { FaFileAlt, FaDownload, FaMapMarkerAlt, FaUser, FaSignOutAlt } from "react-icons/fa"; 

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function OrphanageDashboard() {
  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex`}>
     

      {/* Main Content */}
      <motion.div
        className="w-full bg-white shadow-md  p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
       
        <p className="text-gray-600 ">
          From your account dashboard, you can view your <span className="text-blue-500 cursor-pointer">recent Donations</span>,
          manage your <span className="text-blue-500 cursor-pointer">Transaction charges</span> and <span className="text-blue-500 cursor-pointer">billing addresses</span>,
          and edit your <span className="text-blue-500 cursor-pointer">password</span> and account details.
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
