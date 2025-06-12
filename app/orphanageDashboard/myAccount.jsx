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

import OrphanageDashboard from "./dashboard";
import Navbar from "../Navbar/page";
import AccountDetails from "./accountDetails";
import Request from "./requests";
import Services from "./service";
import FundRaise from "./fundraise";
import Messages from "./messages";
import ConfirmFund from "./confirmation";

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

  return (
    <section className={`${poppins.className} container mx-auto`}>
      <Navbar />
      <div className="flex flex-col lg:flex-row mt-8 gap-10">
        <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 mt-20">
          <ul className="space-y-2">
            {[
              "Dashboard",
              "Account details",
              "Messages",
              "Requests",
              "Services",
              "Fund Raise",
              "Confirm Fund",
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
                className={`p-3 cursor-pointer flex justify-between items-center ${
                  activeTab === tab ? "bg-gray-200 font-bold" : "hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab}
                  {tab === "Messages" && unreadCount > 0 && (
                    <span className="bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="w-full lg:w-3/4 mt-18">
          <div className="mt-8">
            {activeTab === "Dashboard" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <OrphanageDashboard />
              </motion.div>
            )}
            {activeTab === "Account details" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <AccountDetails />
              </motion.div>
            )}
            {activeTab === "Messages" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Messages />
              </motion.div>
            )}
            {activeTab === "Requests" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Request />
              </motion.div>
            )}
            {activeTab === "Services" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Services />
              </motion.div>
            )}
            {activeTab === "Fund Raise" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <FundRaise />
              </motion.div>
            )}
            {activeTab === "Confirm Fund" && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <ConfirmFund />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
