"use client";

import { useState, useEffect } from "react";
import {
  FaTachometerAlt,
  FaChartBar,
  FaUserShield,
  FaSignOutAlt,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import AdminHome from "./dashboard";
import Statistics from "./statistics";
import MyAccount from "./myAccount";
import Navbar from "../Navbar/navbar";
import Contact from "./contact";
import Footer from "../footer/page";
import Subscriptions from "./subscribe";
import Users from "./users";
import { FaUserFriends } from "react-icons/fa";


const tabs = [
  { label: "Dashboard", icon: <FaTachometerAlt /> },
   { label: "MyAccount", icon: <FaUserShield /> },
  { label: "Statistics", icon: <FaChartBar /> },
 { label: "Users", icon: <FaUserFriends /> },

   { label: "Contact", icon: <FaUserShield/> },
   { label: "Subscriptions", icon: <FaUserShield /> },

  { label: "Logout", icon: <FaSignOutAlt /> },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return router.push("/login");

      try {
        const docSnap = await getDoc(doc(firestore, "users", currentUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userType !== "admin") return router.push("/unauthorized");
          setUser(data);
        } else {
          router.push("/unauthorized");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        router.push("/unauthorized");
      }
    };
    fetchUser();
  }, [router]);

  const handleTabClick = (label) => {
    if (label === "Logout") {
      auth.signOut().then(() => router.push("/login"));
    } else {
      setActiveTab(label);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "Dashboard":
        return <AdminHome user={user} />;
      case "Statistics":
        return <Statistics />;
      case "MyAccount":
        return <MyAccount />;
        case "Users":
  return <Users />;

      case "Contact":
        return <Contact/>;
       case "Subscriptions":
  return <Subscriptions />;


      default:
        return <div className="text-red-500">Unknown Tab</div>;
    }
  };

  return (
    <div className=" flex bg-gray-50 text-gray-800">
          <Navbar/>
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-md p-6 sticky top-0 h-90 mt-20 ml-20">
        
        <nav className="flex flex-col gap-3">
          {tabs.map(({ label, icon }) => (
            <button
              key={label}
              onClick={() => handleTabClick(label)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-lg font-medium transition ${
                activeTab === label
                  ? "bg-green-100 text-green-700"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
     <main className="ml-50 mt-10 flex-1 p-10">      {renderTab()}
      </main>
     
    </div>
    
  );
}
