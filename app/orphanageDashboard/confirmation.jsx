'use client';

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import RequestConfirmations from "./RequestConfirmation";
import FundraiserConfirmations from "./FundRaiserConfirmation";
import ServiceConfirmations from "./ServiceConfirmation";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

const ConfirmFund = () => {
  const [activeStatus, setActiveStatus] = useState("pending");
  const [activeCategory, setActiveCategory] = useState("requests");
  const [counts, setCounts] = useState({ requests: 0, fundraisers: 0, services: 0 });

  const matchesStatus = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    switch (activeStatus) {
      case "pending":
        return ["pending", "pending approval", "in progress"].includes(s);
      case "approved":
        return ["approved", "fulfilled", "confirmed"].includes(s);
      case "rejected":
        return s === "rejected";
      default:
        return false;
    }
  };

  useEffect(() => {
    const fetchCounts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const [requestsSnap, fundraisersSnap, servicesSnap] = await Promise.all([
        getDocs(query(collection(firestore, "requests"), where("orphanageId", "==", user.uid))),
        getDocs(query(collection(firestore, "fundraisers"), where("orphanageId", "==", user.uid))),
        getDocs(query(collection(firestore, "services"), where("orphanageId", "==", user.uid))),
      ]);

      setCounts({
        requests: requestsSnap.size,
        fundraisers: fundraisersSnap.size,
        services: servicesSnap.size,
      });
    };

    fetchCounts();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8 mt-16">
        <h2 className="text-4xl font-bold text-gray-800 mb-6 border-b pb-2 text-center">
          CONFIRM DONATIONS
        </h2>

        {/* Category Filters */}
        <div className="flex gap-3 mb-6 justify-center">
          {["requests", "fundraisers", "services"].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded font-semibold transition-colors duration-200 ${
                activeCategory === category
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category.toUpperCase()} ({counts[category]})
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex gap-3 mb-8 justify-center">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-2 rounded font-semibold transition-colors duration-200 ${
                activeStatus === status
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {activeCategory === "requests" && (
          <RequestConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
        )}
        {activeCategory === "fundraisers" && (
          <FundraiserConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
        )}
        {activeCategory === "services" && (
          <ServiceConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
        )}
      </div>
    </div>
  );
};

export default ConfirmFund;
