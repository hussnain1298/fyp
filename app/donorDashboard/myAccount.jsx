"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { auth } from "@/lib/firebase";  // Import auth instance from your firebase config
import { signOut } from "firebase/auth";

import AccountDetails from "./accountDetails";
import FulfillRequests from "./fulfillRequest";
import FulfillServices from "./fullfillServices";

import Dashboard from "./dashboard";
import DonationsHistory from "./donationHistory";
import Navbar from "../Navbar/page";
import LoginPage from "../login/page";
import Messages from "./messages";
import Footer from "../footer/page";

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login"); // Redirect after logout
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <section className={`${poppins.className} container mx-auto`}>
      {/* Navbar Section */}
      <Navbar />

      {/* Main Account Section */}
      <div className="flex flex-col lg:flex-row mt-24 gap-10">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 mt-22">
          <ul className="space-y-2">
            {[
              "Dashboard",
              "Account details",
              "Messages",
              "Fulfill Requests",
              "Fulfill Services",
             
              "Donations",
              "Logout",
            ].map((tab) => (
              <li
                key={tab}
                onClick={() => {
                  if (tab === "Logout") {
                    handleLogout();
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
          {/* Dynamic Content Based on Active Tab */}
          {activeTab === "Dashboard" && <Dashboard />}
          {activeTab === "Messages" && <Messages />}
          {activeTab === "Account details" && <AccountDetails />}
          {activeTab === "Fulfill Requests" && <FulfillRequests />}
          {activeTab === "Fulfill Services" && <FulfillServices />}
         
          {activeTab === "Donations" && <DonationsHistory />}
          {activeTab === "Profile " && <ProfilePage />}
          {activeTab === "Logout" && <LoginPage />}
        </div>
      </div>
      <Footer/>
    </section>
  );
}
