"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { auth, firestore } from "@/lib/firebase"; // Import firestore for notifications
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

import OrphanageDashboard from "./dashboard";
import Navbar from "../Navbar/page";
import AccountDetails from "./accountDetails";
import Request from "./requests";
import Services from "./service";
import FundRaise from "./fundraise";
import ConfirmedRequests from "./confirmdonations";
import Messages from "./messages";

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Listen for auth state change to get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Firestore listener for orphanage notifications (unread only)
  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(firestore, "notifications", user.uid, "userNotifications");
    
    const q = query(notificationsRef, where("read", "==", false), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  // Logout function
  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("userSession");
      router.push("/login");
    } catch (error) {
      console.error(" Error Logging Out:", error.message);
    }
  };

  // Handle click on notification: Open chat page for that chat
  const openChatFromNotification = (chatId) => {
    if (!chatId) return;
    router.push(`/chat?chatId=${chatId}`);
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
            {["Dashboard","Account details","Messages", "Requests", "Services", "Fund Raise", "Donations", "Logout"].map((tab) => (
              <li
                key={tab}
                onClick={() => {
                  if (tab === "Logout") {
                    handleLogout();
                  } else {
                    setActiveTab(tab);
                  }
                }}
                className={`p-3 cursor-pointer flex justify-between items-center ${
                  activeTab === tab ? "bg-gray-200 font-bold" : "hover:bg-gray-100"
                }`}
              >
                {tab}
                {/* Show notification badge only on Requests tab */}
                {tab === "Messages" && notifications.length > 0 && (
                  <span className="bg-red-600 text-white rounded-full px-2 text-xs font-semibold">
                    {notifications.length}
                  </span>
                )}
              </li>
            ))}
          </ul>

        
          
        </aside>

        {/* Main Content Section */}
        <div className="w-full lg:w-3/4 mt-18">
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
            {activeTab === "Messages" && (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
  >
    <Messages />
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
