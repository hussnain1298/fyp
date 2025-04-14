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
import LoginPage from "../login/page";
import Request from "./requests";

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
      console.error("🔥 Error Logging Out:", error.message);
    }
  };

  return (
    <section className={`${poppins.className} container mx-auto`}>
      {/* Navbar Section */}
      <Navbar />

      {/* Main Account Section */}
      <div className="flex flex-col lg:flex-row mt-8 gap-10">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 mt-10">
          <ul className="space-y-2">
            {["Dashboard", "Services", "Requests", "Addresses", "Account details", "Logout"].map((tab) => (
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
          <p className="text-lg font-medium">
            Hello <span className="font-bold">CareConnect.</span> (not{" "}
            <span className="font-bold">careconnect.com</span>?{" "}
            <button onClick={handleLogout} className="text-blue-500 ml-1">
              Log out
            </button>
            )
          </p>

          {/* Dynamic Content Based on Active Tab */}
          {activeTab === "Dashboard" && <OrphanageDashboard />}
          {activeTab === "Account details" && <AccountDetails />}
          {activeTab === "Addresses" && <AddressSection />}
          {activeTab === "Requests" && <Request />}
        </div>
      </div>
    </section>
  );
}
