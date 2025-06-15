"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

// Tabs Components
import OrphanageDashboard from "./dashboard";
import Navbar from "../Navbar/page";
import AccountDetails from "./accountDetails";
import Request from "./requests";
import Services from "./service";
import FundRaise from "./fundraise";
import Messages from "./messages";
import ConfirmFund from "./confirmation";
import Footer from "../footer/page";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const notificationsRef = collection(
      firestore,
      "notifications",
      user.uid,
      "userNotifications"
    );
    const q = query(
      notificationsRef,
      where("read", "==", false),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("userSession");
      router.push("/login");
    } catch (error) {
      console.error("Error Logging Out:", error.message);
    }
  };

  const tabs = [
    "Dashboard",
    "Account details",
    "Messages",
    "Requests",
    "Services",
    "Fund Raise",
    "Confirm Fund",
    "Logout",
  ];

  return (
    <section className={`${poppins.className} min-h-screen`}>
      <Navbar />
      <div className="container mx-auto mt-20 px-4 flex flex-col lg:flex-row gap-10">
        {/* Sidebar */}
        <aside className="w-full lg:w-1/4 h-full bg-white shadow-md p-6 rounded-lg">
          <ul className="space-y-2 text-sm font-medium">
            {tabs.map((tab) => (
              <li
                key={tab}
                onClick={() =>
                  tab === "Logout" ? handleLogout() : setActiveTab(tab)
                }
                className={`p-3 rounded flex justify-between items-center cursor-pointer transition ${
                  activeTab === tab
                    ? "bg-gray-200 font-bold"
                    : "hover:bg-gray-100"
                }`}
              >
                <span>{tab}</span>
                {tab === "Messages" && unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <motion.div
          className="w-full lg:w-3/4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeTab === "Dashboard" && <OrphanageDashboard />}
          {activeTab === "Account details" && <AccountDetails />}
          {activeTab === "Messages" && <Messages />}
          {activeTab === "Requests" && <Request />}
          {activeTab === "Services" && <Services />}
          {activeTab === "Fund Raise" && <FundRaise />}
          {activeTab === "Confirm Fund" && <ConfirmFund />}
        </motion.div>
      </div>
      <Footer/>
    </section>
    
  );
}
