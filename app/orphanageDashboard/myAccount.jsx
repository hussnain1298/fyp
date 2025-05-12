"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { auth } from "@/lib/firebase"; // ✅ Import auth for logout
import OrphanageDashboard from "./dashboard";
import Navbar from "../Navbar/page";
import AccountDetails from "./accountDetails";
import AddressSection from "./addressSection";
import Request from "./requests";
import Services from "./service";
import FundRaise from "./fundraise";
import ConfirmedRequests from "./confirmdonations";

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const router = useRouter();

  // ✅ Proper Logout Function
  const handleLogout = async () => {
    try {
      await auth.signOut(); // 🔹 Sign the user out of Firebase
      localStorage.removeItem("userSession"); // 🔹 Remove session data
      router.push("/login"); // 🔹 Redirect to login
    } catch (error) {
      console.error(" Error Logging Out:", error.message);
    }
  };

  return (
    <section className={`${poppins.className} container mx-auto`}>
      {/* Navbar Section */}
      <Navbar />

      {/* Main Account Section */}
      <div className="flex flex-col lg:flex-row mt-8 gap-10">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 mt-20">
          <ul className="space-y-2">
            {["Dashboard", "Services", "Requests", "Fund Raise", "Addresses", "Donations", "Account details", "Logout"].map((tab) => (
              <li
                key={tab}
                onClick={() => {
                  if (tab === "Logout") {
                    handleLogout(); // ✅ Call Logout Function
                  } else {
                    setActiveTab(tab);
                  }
                }}
                className={`p-3 cursor-pointer ${
                  activeTab === tab ? "bg-gray-200 font-bold" : "hover:bg-gray-100"
                }`}
              >
                {tab}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content Section */}
        <div className="w-full lg:w-3/4 mt-18">
          {/* Greeting Message - Always Visible */}

          {/* Dynamic Content Based on Active Tab */}
          <div className="mt-8">
            {activeTab === "Dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <OrphanageDashboard />
              </motion.div>
            )}
            {activeTab === "Account details" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <AccountDetails />
              </motion.div>
            )}
            {activeTab === "Addresses" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <AddressSection />
              </motion.div>
            )}
            {activeTab === "Donations" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <ConfirmedRequests />
              </motion.div>
            )}
            {activeTab === "Requests" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Request />
              </motion.div>
            )}
            {activeTab === "Services" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Services />
              </motion.div>
            )}
            {activeTab === "Fund Raise" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <FundRaise />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
