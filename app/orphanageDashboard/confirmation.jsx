'use client';

import { useState } from "react";
import RequestConfirmations from "./RequestConfirmation";
import FundraiserConfirmations from "./FundRaiserConfirmation";
import ServiceConfirmations from "./ServiceConfirmation";

const ConfirmFund = () => {
  const [activeStatus, setActiveStatus] = useState("pending");

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

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8 mt-16">
        <h2 className="text-3xl font-bold mb-8">Confirmations</h2>

        {/* Status Filters */}
        <div className="flex gap-3 mb-8">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-2 rounded font-semibold transition-colors duration-200 ${
                activeStatus === status
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        <RequestConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
        <FundraiserConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
        <ServiceConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
      </div>
    </div>
  );
};

export default ConfirmFund;
