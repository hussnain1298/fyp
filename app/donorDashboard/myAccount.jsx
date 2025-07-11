"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";

// Tab Components
import Dashboard from "./dashboard";
import AccountDetails from "./accountDetails";
import FulfillRequests from "./fulfillRequest";
import FulfillServices from "./fullfillServices";
import Messages from "./messages";
import DonationsHistory from "./donationHistory";
import FulfillFundraise from "./fullfillFundraise";
import Navbar from "../Navbar/navbar";
import Footer from "../footer/page";
import GoalAndChartSection from "./Goal";
import PredictiveAnalytics from "@/components/predectiveanalytics";

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const notificationsRef = collection(firestore, "notifications", user.uid, "userNotifications");
    const q = query(notificationsRef, where("read", "==", false), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("userSession");
      router.push("/login");
    } catch (error) {
      console.error("Error Logging Out:", error.message);
    }
  };

  const tabs = useMemo(
    () => [
      { id: "Dashboard", label: "Dashboard", icon: "🏠" },
      { id: "Account details", label: "Account Details", icon: "👤" },
      { id: "Messages", label: "Messages", icon: "💬", badge: unreadCount },
      // { id: "Fulfill Requests", label: "Fulfill Requests", icon: "❤️" },
      // { id: "Fulfill Services", label: "Fulfill Services", icon: "🎓" },
   
      { id: "Donations", label: "Donation History", icon: "📊" },
      // 🔥 NEW TAB
      { id: "My Goal", label: "My Goal", icon: "🎯" },
      { id: "Logout", label: "Logout", icon: "🚪", isAction: true },
    ],
    [unreadCount]
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return <Dashboard />;
      case "Account details":
        return <AccountDetails />;
      case "Messages":
        return <Messages />;
      // case "Fulfill Requests":
      //   return <FulfillRequests />;
      // case "Fulfill Services":
      //   return <FulfillServices />;
    
      case "Donations":
        return <DonationsHistory />;
      // 🔥 NEW CASE
      case "My Goal":
        return <GoalAndChartSection />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-6 mt-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-80">
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 sticky top-24">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Donor Profile</h2>
                <div className="h-1 w-12 bg-gray-600 rounded"></div>
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => (tab.isAction ? handleLogout() : setActiveTab(tab.id))}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${
                      activeTab === tab.id && !tab.isAction
                        ? "bg-gray-100 text-gray-800 border-l-4 border-gray-600 font-medium"
                        : tab.isAction
                        ? "hover:bg-red-50 text-red-600 hover:text-red-700"
                        : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    {tab.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white shadow-sm border border-gray-200 rounded-xl min-h-[600px] p-6"
            >
              {renderTabContent()}
            </motion.div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
