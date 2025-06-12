"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
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
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchDonations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(firestore, "donations"), where("donorId", "==", user.uid));
      const snap = await getDocs(q);

      const list = snap.docs.map(doc => {
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
          description: data.description || "",
          full: data,
        };
      });

      setDonations(list);
      setFilteredDonations(list);
    };

    fetchDonations();
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
    const base = status === "All" ? donations : donations.filter((d) => d.status === status);
    setFilteredDonations(base);
  };

  const handleSort = (key) => {
    const direction = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(direction);

    const sorted = [...filteredDonations].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      return direction === "asc" ? aVal > bVal : aVal < bVal;
    });
    setFilteredDonations(sorted);
  };

  const paginated = filteredDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <section className="container mx-auto px-6 py-12">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-center">DONATION HISTORY </h2>
          <div className="flex gap-2">
            <button onClick={exportPDF} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700">
              Export PDF
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-3">
          {["All", "Approved", "Pending"].map((status) => (
            <button
              key={status}
              onClick={() => handleFilter(status)}
              className={`px-4 py-1 rounded ${
                filterStatus === status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto bg-white p-6 rounded shadow">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold">
                {["id", "date", "status", "total", "type"].map((key) => (
                  <th
                    key={key}
                    className="py-3 px-4 text-left cursor-pointer"
                    onClick={() => handleSort(key)}
                  >
                    {key.toUpperCase()}
                    {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
                <th className="py-3 px-4 text-left">VIEW</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((donation, index) => (
                <motion.tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="py-3 px-4 text-blue-600 font-semibold">#{donation.id}</td>
                  <td className="py-3 px-4">{donation.date.toLocaleDateString()}</td>
                  <td className={`py-3 px-4 font-medium ${donation.status === "Approved" ? "text-green-600" : "text-yellow-600"}`}>
                    {donation.status}
                  </td>
                  <td className="py-3 px-4">{donation.total}</td>
                  <td className="py-3 px-4">{donation.type}</td>
                  <td className="py-3 px-4">
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded"
                      onClick={() => setSelectedDonation(donation)}
                    >
                      View
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center mt-6 gap-2">
            {Array.from({ length: Math.ceil(filteredDonations.length / itemsPerPage) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-3 py-1 rounded ${
                  currentPage === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {selectedDonation && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Donation Details</h3>
              <p><strong>ID:</strong> {selectedDonation.id}</p>
              <p><strong>Date:</strong> {selectedDonation.date.toLocaleString()}</p>
              <p><strong>Status:</strong> {selectedDonation.status}</p>
              <p><strong>Total:</strong> {selectedDonation.total}</p>
              <p><strong>Type:</strong> {selectedDonation.type}</p>
              <p className="mt-2"><strong>Description:</strong><br />{selectedDonation.description || "—"}</p>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setSelectedDonation(null)}
                  className="text-gray-700 hover:text-black"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
