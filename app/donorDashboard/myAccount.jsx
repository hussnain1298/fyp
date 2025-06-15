"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

import AccountDetails from "./accountDetails";
import FulfillRequests from "./fulfillRequest";
import FulfillServices from "./fullfillServices";
import Dashboard from "./dashboard";
import DonationsHistory from "./donationHistory";
import Navbar from "../Navbar/page";
import Messages from "./messages";
import Footer from "../footer/page";

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
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <div className={`${poppins.className} flex flex-col min-h-screen`}>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 lg:px-8 mt-24 mb-12">
  <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
    {/* Sidebar */}
    <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 rounded-lg h-fit lg:h-full sticky top-24 self-start">
      <ul className="space-y-2 text-sm font-medium">
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
              if (tab === "Logout") handleLogout();
              else setActiveTab(tab);
            }}
            className={`p-3 rounded cursor-pointer ${
              activeTab === tab ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"
            }`}
          >
            {tab}
          </li>
        ))}
      </ul>
    </aside>

    {/* Main Content */}
    <section className="w-full lg:w-3/4">
      {activeTab === "Dashboard" && <Dashboard />}
      {activeTab === "Messages" && <Messages />}
      {activeTab === "Account details" && <AccountDetails />}
      {activeTab === "Fulfill Requests" && <FulfillRequests />}
      {activeTab === "Fulfill Services" && <FulfillServices />}
      {activeTab === "Donations" && <DonationsHistory />}
    </section>
  </div>
</main>


      <Footer />
    </div>
  );
}
