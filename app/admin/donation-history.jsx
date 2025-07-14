"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase" // Corrected import to 'db'
import { collection, getDocs } from "firebase/firestore"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  Download,
  Search,
  Filter,
  Eye,
  Calendar,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  GraduationCap,
  TrendingUp,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

export default function DonationsHistory() {
  const [donations, setDonations] = useState([])
  const [filteredDonations, setFilteredDonations] = useState([])
  const [filterStatus, setFilterStatus] = useState("All")
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const itemsPerPage = 10
  const [filterCategory, setFilterCategory] = useState("All Categories")
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    totalAmount: 0,
  })

  const fetchComprehensiveHistory = async () => {
    setLoading(true)
    try {
      // Fetch all donations from the 'donations' collection (global admin view)
      const donationsSnap = await getDocs(collection(db, "donations"))
      const donationList = donationsSnap.docs.map((doc) => {
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
          status: data.confirmed === true ? "Approved" : data.confirmed === false ? "Rejected" : "Pending",
          total,
          type: data.donationType || "—",
          description: data.description || "—",
          source: "donation_linked", // Indicate this is from the 'donations' collection
          category: "Linked Donations",
          requestId: data.requestId || "—",
          orphanageId: data.orphanageId || "—",
          donationType: data.donationType || "—",
          amount: data.amount || null,
          numClothes: data.numClothes || null,
          numMeals: data.numMeals || null,
          foodDescription: data.foodDescription || null,
          donorEmail: data.donorEmail || "N/A",
          subtypes: data.subtypes || [], // Include subtypes if available
          donatedAmount: data.donatedAmount || null, // For consistency with other donation types
          paymentData: data.paymentData || null, // Include payment data if available
        }
      })

      // Sort by date (newest first)
      donationList.sort((a, b) => b.date - a.date)

      setDonations(donationList)
      setFilteredDonations(donationList)

      // Calculate stats
      const newStats = {
        total: donationList.length,
        approved: donationList.filter((d) => d.status === "Approved").length,
        pending: donationList.filter((d) => d.status === "Pending").length,
        totalAmount: donationList.reduce((sum, d) => {
          if (d.amount) return sum + d.amount
          return sum
        }, 0),
      }
      setStats(newStats)
    } catch (error) {
      console.error("Error fetching donation history:", error)
      toast.error("Failed to load donation history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComprehensiveHistory()
  }, [])

  useEffect(() => {
    filterAndSearchDonations()
  }, [donations, filterStatus, filterCategory, searchTerm])

  const filterAndSearchDonations = () => {
    let filtered = donations
    // Filter by status
    if (filterStatus !== "All") {
      filtered = filtered.filter((d) => d.status === filterStatus)
    }
    // Filter by category (only "Linked Donations" for this page)
    if (filterCategory !== "All Categories" && filterCategory !== "Linked Donations") {
      filtered = [] // No other categories are expected here
    }
    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.orphanageId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.requestId?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    setFilteredDonations(filtered)
    setCurrentPage(1)
  }

  const exportPDF = () => {
    try {
      const doc = new jsPDF()
      // Add title
      doc.setFontSize(20)
      doc.text("Donation History Report", 14, 22)
      // Add date
      doc.setFontSize(12)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32)
      // Add stats
      doc.text(`Total Donations: ${stats.total}`, 14, 42)
      doc.text(`Approved: ${stats.approved} | Pending: ${stats.pending}`, 14, 52)
      doc.text(`Total Amount: Rs. ${stats.totalAmount.toLocaleString()}`, 14, 62)
      // Add table
      autoTable(doc, {
        startY: 72,
        head: [["ID", "Date", "Type", "Status", "Amount/Details", "Donor Email", ]],
        body: filteredDonations.map((d) => [
          `#${d.id.substring(0, 8)}`,
          d.date.toLocaleDateString(),
          d.type,
          d.status,
          d.total,
          d.donorEmail,
          d.orphanageId !== "—"
            ? `Orphanage: ${d.orphanageId.substring(0, 8)}`
            : d.requestId !== "—"
              ? `Request: ${d.requestId.substring(0, 8)}`
              : "N/A",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      })
      doc.save(`donation-history-${new Date().toISOString().split("T")[0]}.pdf`)
      toast.success("PDF exported successfully!")
    } catch (error) {
      toast.error("Failed to export PDF")
    }
  }

  const handleSort = (key) => {
    const dir = sortKey === key && sortDir === "asc" ? "desc" : "asc"
    setSortKey(key)
    setSortDir(dir)
    const sorted = [...filteredDonations].sort((a, b) => {
      let aVal = a[key]
      let bVal = b[key]

      // Handle date sorting
      if (key === "date") {
        aVal = a.date.getTime()
        bVal = b.date.getTime()
      }
      // Handle amount sorting (if 'total' is a string like 'Rs123')
      if (key === "total" && typeof aVal === "string" && aVal.startsWith("Rs")) {
        aVal = Number.parseFloat(aVal.replace("Rs", "")) || 0
        bVal = Number.parseFloat(bVal.replace("Rs", "")) || 0
      }

      return dir === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
    setFilteredDonations(sorted)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "money":
        return <DollarSign className="w-4 h-4" />
      case "clothes":
        return <Shirt className="w-4 h-4" />
      case "food":
        return <UtensilsCrossed className="w-4 h-4" />
      case "Service": // This type might come from other history views, but for 'donations' collection, it's usually money/clothes/food
        return <GraduationCap className="w-4 h-4" />
      case "Fundraiser": // Same as above
        return <TrendingUp className="w-4 h-4" />
      default:
        return <CheckCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
      case "Fulfilled":
        return "bg-green-50 text-green-700 border-green-200"
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage)
  const paginated = filteredDonations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading donation history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={5000} />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Donation History</h1>
        <p className="text-gray-600">Comprehensive record of all linked donations</p>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Donations</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-purple-600">Rs. {stats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search donations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                {["All", "Approved", "Pending", "Rejected"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {/* Category Filter (fixed for this page) */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[180px]"
              disabled // This page only shows "Linked Donations"
            >
              <option value="Linked Donations">Linked Donations</option>
            </select>
          </div>
          {/* Export Button */}
          <button
            onClick={exportPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
        {filteredDonations.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredDonations.length} of {donations.length} donations
          </div>
        )}
      </div>
      {/* Donations Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {paginated.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No donations found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { key: "id", label: "ID" },
                      { key: "date", label: "Date" },
                      { key: "type", label: "Type" },
                      { key: "status", label: "Status" },
                      { key: "total", label: "Amount/Details" },
                      { key: "donorEmail", label: "Donor Email" },
                      // { key: "linkedId", label: "Linked ID" }, // New column for linked ID
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{label}</span>
                          {sortKey === key && <span className="text-blue-600">{sortDir === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.map((donation) => (
                    <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">#{donation.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{donation.date.toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(donation.type)}
                          <span className="text-sm text-gray-900 capitalize">{donation.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                            donation.status,
                          )}`}
                        >
                          {donation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{donation.total}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{donation.donorEmail}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* <span className="text-sm text-gray-500">
                          {donation.orphanageId !== "—" ? `Orphanage: ${donation.orphanageId.substring(0, 8)}...` : ""}
                          {donation.orphanageId !== "—" && donation.requestId !== "—" ? " | " : ""}
                          {donation.requestId !== "—" ? `Request: ${donation.requestId.substring(0, 8)}...` : "N/A"}
                        </span> */}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDonation(donation)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
                {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredDonations.length)} of {filteredDonations.length}{" "}
                    results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Donation Detail Modal */}
      {selectedDonation && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDonation(null)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Donation Details</h3>
              <button
                onClick={() => setSelectedDonation(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">ID:</span>
                <span className="text-sm text-blue-600 font-mono">#{selectedDonation.id}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Date:</span>
                <span className="text-sm text-gray-900">{selectedDonation.date.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-full border ${getStatusColor(
                    selectedDonation.status,
                  )}`}
                >
                  {selectedDonation.status}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <div className="flex items-center space-x-2">
                  {getTypeIcon(selectedDonation.type)}
                  <span className="text-sm text-gray-900 capitalize">{selectedDonation.type}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Amount/Details:</span>
                <span className="text-sm font-bold text-gray-900">{selectedDonation.total}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Donor Email:</span>
                <span className="text-sm text-gray-900">{selectedDonation.donorEmail}</span>
              </div>
              {(selectedDonation.orphanageId !== "—" || selectedDonation.requestId !== "—") && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Linked To:</span>
                  <span className="text-sm text-gray-900">
                    {selectedDonation.orphanageId !== "—" ? `Orphanage ID: ${selectedDonation.orphanageId}` : ""}
                    {selectedDonation.orphanageId !== "—" && selectedDonation.requestId !== "—" ? " | " : ""}
                    {selectedDonation.requestId !== "—" ? `Request ID: ${selectedDonation.requestId}` : ""}
                  </span>
                </div>
              )}
              {selectedDonation.description && selectedDonation.description !== "—" && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 block mb-2">Description:</span>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">{selectedDonation.description}</p>
                </div>
              )}
              {selectedDonation.donationType === "money" && selectedDonation.paymentData && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-800 mb-2">Payment Information:</h3>
                  <div className="text-sm space-y-1">
                    <p className="text-green-700">
                      Transaction ID: {selectedDonation.paymentData.transactionId || "N/A"}
                    </p>
                    <p className="text-green-700">Bank: {selectedDonation.paymentData.bank || "N/A"}</p>
                    <p className="text-green-700">Status: Completed</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedDonation(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
