"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { auth, firestore } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function DonationsHistory() {
  const [donations, setDonations] = useState([])
  const [filteredDonations, setFilteredDonations] = useState([])
  const [filterStatus, setFilterStatus] = useState("All")
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDonation, setSelectedDonation] = useState(null)
  const itemsPerPage = 8
  const [filterCategory, setFilterCategory] = useState("All Categories")

  const fetchComprehensiveHistory = async () => {
    const user = auth.currentUser
    if (!user) return

    // Get user type to determine what to fetch
    const userDoc = await getDocs(query(collection(firestore, "users"), where("__name__", "==", user.uid)))
    const userData = userDoc.docs[0]?.data()
    const userType = userData?.userType

    const promises = [
      // Donations made by user
      getDocs(query(collection(firestore, "donations"), where("donorId", "==", user.uid))),
      // Services fulfilled by user
      getDocs(query(collection(firestore, "services"), where("donorId", "==", user.uid))),
      // Fundraiser donations made by user
      fetchFundraiserDonations(user.uid),
    ]

    // Add additional queries based on user type
    if (userType === "Orphanage") {
      promises.push(
        // Services created by orphanage
        getDocs(query(collection(firestore, "services"), where("orphanageId", "==", user.uid))),
        // Fundraisers created by orphanage
        getDocs(query(collection(firestore, "fundraisers"), where("orphanageId", "==", user.uid))),
      )
    }

    const results = await Promise.all(promises)
    const [donSnap, servFulfilledSnap, fundDonationsSnap, servCreatedSnap, fundCreatedSnap] = results

    // Process donations made
    const donationList = donSnap.docs.map((doc) => {
      const data = doc.data()
      const rawDate = data.timestamp?.toDate()

      let total = "—"
      if (data.amount) {
        total = `Rs${data.amount}`
      } else if (data.numClothes) {
        total = `${data.numClothes} Clothes`
      } else if (data.numMeals) {
        total = `${data.numMeals} Meals`
      } else if (data.foodDescription) {
        total = "Food"
      }

      return {
        id: doc.id,
        date: rawDate || new Date(0),
        status: data.confirmed ? "Approved" : "Pending",
        total,
        type: data.donationType || "—",
        description: data.description || "—",
        source: "donation_made",
        category: "Donations Made",
        requestId: data.requestId || "—",
        orphanageId: data.orphanageId || "—",
        donationType: data.donationType || "—",
        amount: data.amount || null,
        numClothes: data.numClothes || null,
        numMeals: data.numMeals || null,
        foodDescription: data.foodDescription || null,
      }
    })

    // Process services fulfilled - fix the mapping
    const serviceFulfilledList = servFulfilledSnap.docs.map((doc) => {
      const data = doc.data()
      const rawDate = data.fulfilledAt?.toDate() || data.timestamp?.toDate()
      return {
        id: doc.id,
        date: rawDate || new Date(0),
        status: data.status === "In Progress" ? "Fulfilled" : data.status,
        total: "—",
        type: "Service",
        description: data.lastFulfillmentNote || data.title || "Service Fulfilled",
        source: "service_fulfilled",
        category: "Services Fulfilled",
        serviceTitle: data.title,
        orphanageId: data.orphanageId,
      }
    })

    // Process fundraiser donations made
    const fundraiserDonationsList = fundDonationsSnap.map((donation) => {
      const rawDate = donation.timestamp?.toDate()
      return {
        id: donation.id,
        fundraiserId: donation.fundraiserId,
        fundraiserTitle: donation.fundraiserTitle,
        date: rawDate || new Date(0),
        status: donation.status === "pending" ? "Pending" : "Approved",
        total: `Rs${donation.amount}`,
        type: "Fundraiser",
        description: donation.fundraiserTitle || "Fundraiser Donation",
        source: "fundraiser_donation",
        category: "Fundraiser Donations",
        amount: donation.amount,
      }
    })

    let serviceCreatedList = []
    let fundraiserCreatedList = []

    // Process services created (for orphanages)
    if (servCreatedSnap) {
      serviceCreatedList = await Promise.all(
        servCreatedSnap.docs.map(async (doc) => {
          const data = doc.data()
          const rawDate = data.timestamp?.toDate()

          // Count fulfillments for this service
          const fulfillmentCount = await getDocs(
            query(collection(firestore, "services"), where("originalServiceId", "==", doc.id)),
          )

          return {
            id: doc.id,
            date: rawDate || new Date(0),
            status: data.status || "Pending",
            total: `${fulfillmentCount.size} Fulfillments`,
            type: "Service Created",
            description: data.description || data.title || "Service Posted",
            source: "service_created",
            category: "Services Posted",
            title: data.title,
            fulfillmentCount: fulfillmentCount.size,
          }
        }),
      )
    }

    // Process fundraisers created (for orphanages)
    if (fundCreatedSnap) {
      fundraiserCreatedList = await Promise.all(
        fundCreatedSnap.docs.map(async (doc) => {
          const data = doc.data()
          const rawDate = data.timestamp?.toDate()

          // Get donation count and total raised
          const donationsSnap = await getDocs(collection(firestore, "fundraisers", doc.id, "donations"))
          const totalRaised = data.raisedAmount || 0
          const donationCount = donationsSnap.size

          return {
            id: doc.id,
            date: rawDate || new Date(0),
            status: data.status || "Pending",
            total: `Rs${totalRaised} / Rs${data.totalAmount}`,
            type: "Fundraiser Created",
            description: data.description || data.title || "Fundraiser Posted",
            source: "fundraiser_created",
            category: "Fundraisers Posted",
            title: data.title,
            totalAmount: data.totalAmount,
            raisedAmount: totalRaised,
            donationCount,
            progress: Math.round((totalRaised / data.totalAmount) * 100),
          }
        }),
      )
    }

    const combined = [
      ...donationList,
      ...serviceFulfilledList,
      ...fundraiserDonationsList,
      ...serviceCreatedList,
      ...fundraiserCreatedList,
    ]

    combined.sort((a, b) => b.date - a.date)
    setDonations(combined)
    setFilteredDonations(combined)
  }

  useEffect(() => {
    fetchComprehensiveHistory()
  }, [])

  // Helper function to fetch fundraiser donations
  const fetchFundraiserDonations = async (userId) => {
    try {
      // First get all fundraisers
      const fundraisersSnap = await getDocs(collection(firestore, "fundraisers"))
      const allDonations = []

      // For each fundraiser, check its donations subcollection
      for (const fundraiserDoc of fundraisersSnap.docs) {
        const fundraiserData = fundraiserDoc.data()
        const donationsSnap = await getDocs(
          query(collection(firestore, "fundraisers", fundraiserDoc.id, "donations"), where("donorId", "==", userId)),
        )

        donationsSnap.docs.forEach((donationDoc) => {
          allDonations.push({
            id: donationDoc.id,
            fundraiserId: fundraiserDoc.id,
            fundraiserTitle: fundraiserData.title,
            ...donationDoc.data(),
          })
        })
      }

      return allDonations
    } catch (error) {
      console.error("Error fetching fundraiser donations:", error)
      return []
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text("Donation History", 14, 16)
    autoTable(doc, {
      startY: 22,
      head: [["Donation No", "Date", "Status", "Total", "Type"]],
      body: filteredDonations.map((d) => [`#${d.id}`, d.date.toLocaleDateString(), d.status, d.total, d.type]),
    })
    doc.save("donations.pdf")
  }

  const handleFilter = (status) => {
    setFilterStatus(status)
    setCurrentPage(1)
    const base = status === "All" ? donations : donations.filter((d) => d.status === status)
    setFilteredDonations(base)
  }

  const handleCategoryFilter = (category) => {
    setFilterCategory(category)
    setCurrentPage(1)
    let base = filterStatus === "All" ? donations : donations.filter((d) => d.status === filterStatus)
    if (category !== "All Categories") {
      base = base.filter((d) => d.category === category)
    }
    setFilteredDonations(base)
  }

  const handleSort = (key) => {
    const dir = sortKey === key && sortDir === "asc" ? "desc" : "asc"
    setSortKey(key)
    setSortDir(dir)
    const sorted = [...filteredDonations].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]
      return dir === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
    setFilteredDonations(sorted)
  }

  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage)
  const paginated = filteredDonations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <section className="container mx-auto px-6 py-12">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-2">Donations</h2>
      <div className="flex justify-between items-center mb-6">
        <div>
          {totalPages > 1 && (
            <p className="text-sm text-gray-500 mt-1">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
        <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow text-sm">
          Export PDF
        </button>
      </div>

      <div className="mb-6 flex gap-4 justify-end items-center">
        <select
          value={filterStatus}
          onChange={(e) => handleFilter(e.target.value)}
          className="px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {["All", "Approved", "Pending"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[
            "All Categories",
            "Donations Made",
            "Services Fulfilled",
            "Fundraiser Donations"
          ].map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 text-xs uppercase">
            <tr>
              {["id", "date", "status", "total", "type", "category"].map((key) => (
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
                  #{donation.id}{" "}
                  {donation.source === "service" && <span className="text-xs text-gray-500">(service)</span>}
                  {donation.source === "fundraiser" && <span className="text-xs text-gray-500">(fundraiser)</span>}
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
                <td className="px-5 py-3">{donation.category}</td>
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
                currentPage === idx + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
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
            <div className="space-y-2 text-sm">
              <p>
                <strong>ID:</strong> #{selectedDonation.id}
              </p>
              <p>
                <strong>Date:</strong> {selectedDonation.date.toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`font-semibold ${
                    selectedDonation.status === "Approved" ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {selectedDonation.status}
                </span>
              </p>
              <p>
                <strong>Type:</strong> {selectedDonation.type}
              </p>

              {/* Enhanced donation details based on source */}
              {selectedDonation.source === "request" && (
                <>
                  {selectedDonation.amount && (
                    <p>
                      <strong>Amount:</strong> Rs. {selectedDonation.amount}
                    </p>
                  )}
                  {selectedDonation.numClothes && (
                    <p>
                      <strong>Clothes:</strong> {selectedDonation.numClothes} items
                    </p>
                  )}
                  {selectedDonation.numMeals && (
                    <p>
                      <strong>Meals:</strong> {selectedDonation.numMeals} meals
                    </p>
                  )}
                  {selectedDonation.foodDescription && (
                    <p>
                      <strong>Food Description:</strong> {selectedDonation.foodDescription}
                    </p>
                  )}
                  {selectedDonation.requestId && selectedDonation.requestId !== "—" && (
                    <p>
                      <strong>Request ID:</strong> {selectedDonation.requestId}
                    </p>
                  )}
                </>
              )}

              {selectedDonation.source === "fundraiser" && (
                <>
                  <p>
                    <strong>Amount:</strong> Rs. {selectedDonation.amount}
                  </p>
                  {selectedDonation.fundraiserId && (
                    <p>
                      <strong>Fundraiser ID:</strong> {selectedDonation.fundraiserId}
                    </p>
                  )}
                </>
              )}

              {/* Enhanced details based on source */}
              {selectedDonation.source === "service_created" && (
                <>
                  <p>
                    <strong>Title:</strong> {selectedDonation.title}
                  </p>
                  <p>
                    <strong>Fulfillments:</strong> {selectedDonation.fulfillmentCount}
                  </p>
                </>
              )}

              {selectedDonation.source === "fundraiser_created" && (
                <>
                  <p>
                    <strong>Title:</strong> {selectedDonation.title}
                  </p>
                  <p>
                    <strong>Target:</strong> Rs. {selectedDonation.totalAmount}
                  </p>
                  <p>
                    <strong>Raised:</strong> Rs. {selectedDonation.raisedAmount}
                  </p>
                  <p>
                    <strong>Progress:</strong> {selectedDonation.progress}%
                  </p>
                  <p>
                    <strong>Donations:</strong> {selectedDonation.donationCount}
                  </p>
                </>
              )}

              <p>
                <strong>Total:</strong> {selectedDonation.total}
              </p>

              {selectedDonation.description && selectedDonation.description !== "—" && (
                <div className="mt-3">
                  <strong>Description:</strong>
                  <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded text-xs">{selectedDonation.description}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedDonation(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
