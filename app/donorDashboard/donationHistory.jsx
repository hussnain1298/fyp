"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DonationsHistory() {
  const [donations, setDonations] = useState([]);
  const [filteredDonations, setFilteredDonations] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const itemsPerPage = 8;

  useEffect(() => {
  const fetchDonationsAndServices = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const [donSnap, servSnap] = await Promise.all([
      getDocs(query(collection(firestore, "donations"), where("donorId", "==", user.uid))),
      getDocs(query(collection(firestore, "services"), where("donorId", "==", user.uid))),
      
    ]);

    const donationList = donSnap.docs.map(doc => {
      const data = doc.data();
      const rawDate = data.timestamp?.toDate();
      return {
        id: doc.id,
        date: rawDate || new Date(0),
        status: data.confirmed ? "Approved" : "Pending",
        total: data.amount
          ? `Rs${data.amount}`
          : data.numClothes
          ? `${data.numClothes} Clothes`
          : data.foodDescription
          ? "Food"
          : "—",
        type: data.donationType || "—",
        description: data.description || "—",
        source: "request",
      };
    });

    const serviceList = servSnap.docs.map(doc => {
      const data = doc.data();
      const rawDate = data.timestamp?.toDate();
      return {
        id: doc.id,
        date: rawDate || new Date(0),
        status: "In Progress",
        total: "—",
        type: "Service",
        description: data.lastFulfillmentNote || "—",
        source: "service",
      };
    });

    const combined = [...donationList, ...serviceList];
    combined.sort((a, b) => b.date - a.date); // latest first

    setDonations(combined);
    setFilteredDonations(combined);
  };

  fetchDonationsAndServices();
}, []);


  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Donation History", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Donation No", "Date", "Status", "Total", "Type"]],
      body: filteredDonations.map((d) => [
        `#${d.id}`,
        d.date.toLocaleDateString(),
        d.status,
        d.total,
        d.type,
      ]),
    });
    doc.save("donations.pdf");
  };

  const handleFilter = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
    const base = status === "All" ? donations : donations.filter(d => d.status === status);
    setFilteredDonations(base);
  };

  const handleSort = (key) => {
    const dir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(dir);
    const sorted = [...filteredDonations].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      return dir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    setFilteredDonations(sorted);
  };

  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
  const paginated = filteredDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <section className="container mx-auto px-6 py-12">
       <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-2">Donations</h2>
      <div className="flex justify-between items-center mb-6">
        <div>
         
          {totalPages > 1 && (
            <p className="text-sm text-gray-500 mt-1">Page {currentPage} of {totalPages}</p>
          )}
        </div>
        <button
          onClick={exportPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow text-sm"
        >
          Export PDF
        </button>
      </div>

   <div className="mb-6 text-end">
 
  <select
    id="filterStatus"
    value={filterStatus}
    onChange={(e) => handleFilter(e.target.value)}
    className="px-4 py-2 rounded-md  text-sm focus:outline-nonefocus:ring-2 focus:ring-blue-500 "
  >
    {["All", "Approved", "Pending"].map((status) => (
      <option key={status} value={status}>
        {status}
      </option>
    ))}
  </select>
</div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 text-xs uppercase">
            <tr>
              {["id", "date", "status", "total", "type"].map((key) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-5 py-3 cursor-pointer select-none text-left"
                >
                  {key.toUpperCase()}
                  {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((donation, index) => (
              <motion.tr
                key={donation.id}
                className="border-t hover:bg-gray-50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
               <td className="px-5 py-3 text-blue-600 font-medium">
  #{donation.id} {donation.source === "service" && <span className="text-xs text-gray-500">(service)</span>}
</td>

                <td className="px-5 py-3">{donation.date.toLocaleDateString()}</td>
                <td
                  className={`px-5 py-3 font-semibold ${
                    donation.status === "Approved" ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {donation.status}
                </td>
                <td className="px-5 py-3">{donation.total}</td>
                <td className="px-5 py-3">{donation.type}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setSelectedDonation(donation)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                  >
                    View
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              className={`px-4 py-1 text-sm rounded ${
                currentPage === idx + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}

      {selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Donation Details</h3>
            <p><strong>ID:</strong> #{selectedDonation.id}</p>
            <p><strong>Date:</strong> {selectedDonation.date.toLocaleString()}</p>
            <p><strong>Status:</strong> {selectedDonation.status}</p>
            <p><strong>Total:</strong> {selectedDonation.total}</p>
            <p><strong>Type:</strong> {selectedDonation.type}</p>
            <p className="mt-2"><strong>Description:</strong><br />{selectedDonation.description}</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedDonation(null)}
                className="px-4 py-1 border rounded hover:bg-gray-100 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
