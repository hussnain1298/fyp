"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// Sample Data (Replace this with real data from API)
const donations = [
  { id: "#166653", date: "January 30, 2025", status: "Cancelled", total: "Rs1,539", items: "1 item" },
  { id: "#166652", date: "January 30, 2025", status: "Cancelled", total: "Rs513", items: "1 item" },
 
];

export default function DonationsHistory() {
  return (
    <section className="container mx-auto px-6 py-12 flex">
     

      {/* Donations Table */}
      <div className="w-full px-8">
        

        <div className="overflow-x-auto bg-white  p-6">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold">
                <th className="py-3 px-4 text-left">DONATION NO</th>
                <th className="py-3 px-4 text-left">DATE</th>
                <th className="py-3 px-4 text-left">STATUS</th>
                <th className="py-3 px-4 text-left">TOTAL</th>
                <th className="py-3 px-4 text-left">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((donation, index) => (
                <motion.tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <td className="py-3 px-4 text-blue-600 font-semibold">{donation.id}</td>
                  <td className="py-3 px-4">{donation.date}</td>
                  <td className="py-3 px-4 text-red-500">{donation.status}</td>
                  <td className="py-3 px-4 text-green-600 font-semibold">{donation.total} <span className="text-gray-500">for {donation.items}</span></td>
                  <td className="py-3 px-4">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition">
                      VIEW
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
