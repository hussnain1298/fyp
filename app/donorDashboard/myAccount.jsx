"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import AddressSection from "./addressSection";
import AccountDetails from "./accountDetails";
import FulfillRequests from "./fulfillRequest";
import FulfillServices from "./fullfillServices";
import FulfillFundraise from "./fullfillFundraise";
import Dashboard from "./dashboard";
import DonationsHistory from "./donationHistory";
import Navbar from "../Navbar/page";
import LoginPage from "../login/page";
// Integrated DonorNavbar

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const router = useRouter(); // Next.js Router

  return (
    <section className={`${poppins.className} container mx-auto`}>
      {/* Navbar Section */}
  <Navbar/>

      {/* Main Account Section */}
      <div className="flex flex-col lg:flex-row mt-8 gap-10">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 mt-10">
          <ul className="space-y-2">
            {["Dashboard","Fulfill Requests","Fulfill Services","Fulfill FundRaise", "Donations", "Addresses", "Account details", "Logout"].map((tab) => (
              <li
                key={tab}
                onClick={() => {
                  if (tab === "Logout") {
                    router.push("/login"); // Next.js optimized navigation
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
            Hello <span className="font-bold">hunnybunny112200</span> (not{" "}
            <span className="font-bold">hunnybunny112200</span>?{" "}
            <a href="/logout" className="text-blue-500 ml-1">
              Log out
            </a>
            )
          </p>

          {/* Dynamic Content Based on Active Tab */}
          {activeTab === "Dashboard" && <Dashboard />}
          {activeTab === "Addresses" && <AddressSection />}
          {activeTab === "Account details" && <AccountDetails />}
          {activeTab === "Fulfill Requests" && <FulfillRequests />}
          {activeTab === "Fulfill Services" && <FulfillServices />}
          {activeTab === "Fulfill FundRaise" && <FulfillFundraise />}
          {activeTab === "Donations" && <DonationsHistory />}
          {activeTab === "Logout" && <LoginPage />}
        </div>
      </div>
    </section>
  );
}
