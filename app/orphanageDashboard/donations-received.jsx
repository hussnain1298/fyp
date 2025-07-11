"use client"

import { useState, useEffect } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore"
import { toast, ToastContainer } from "react-toastify"
import { motion } from "framer-motion"
import {
  CheckCircle,
  XCircle,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Package,
  Eye,
  X,
  Loader2,
  Filter,
  Search,
} from "lucide-react"
import "react-toastify/dist/ReactToastify.css"

const REQUEST_TYPES = [
  { value: "Money", label: "Money", icon: DollarSign },
  { value: "Clothes", label: "Clothes", icon: Shirt, unit: "piece" },
  { value: "Food", label: "Food", icon: UtensilsCrossed, unit: "1 KG" },
  { value: "Other", label: "Other", icon: Package },
]

const STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
}

// Donation Details Modal Component
const DonationDetailsModal = ({ isOpen, onClose, donation, onConfirm, onReject, loading }) => {
  if (!isOpen || !donation) return null

  const requestType = REQUEST_TYPES.find((t) => t.value === donation.donationType)
  const IconComponent = requestType?.icon || Package

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-gray-800">Donation Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Donation Type */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{donation.donationType}</p>
                <p className="text-sm text-gray-500">Donation Type</p>
              </div>
            </div>

            {/* Donation Amount/Items */}
            <div className="bg-blue-50 p-4 rounded-xl">
              <h3 className="font-semibold text-blue-800 mb-2">Donation Details:</h3>
              {donation.subtypes && donation.subtypes.length > 0 ? (
                <div className="space-y-2">
                  {donation.subtypes.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-blue-700">{item.subtype}:</span>
                      <span className="font-semibold text-blue-800">
                        {item.quantity} {requestType?.unit || ""}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-blue-700">Total:</span>
                      <span className="text-blue-800">
                        {donation.donatedAmount} {requestType?.unit || ""}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <span className="text-blue-700">Amount: </span>
                  <span className="font-semibold text-blue-800">
                    {donation.donationType === "Money"
                      ? `Rs. ${donation.amount || donation.donatedAmount || 0}`
                      : `${donation.donatedAmount || donation.numClothes || donation.numMeals || 0} ${requestType?.unit || ""}`}
                  </span>
                </div>
              )}
            </div>

            {/* Donor Information */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">Donor Information:</h3>
              <p className="text-sm text-gray-600">Email: {donation.donorEmail}</p>
              <p className="text-sm text-gray-600">
                Date: {donation.timestamp?.toDate?.()?.toLocaleDateString() || "N/A"}
              </p>
            </div>

            {/* Description */}
            {donation.description && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Message:</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{donation.description}</p>
              </div>
            )}

            {/* Payment Information (for Money donations) */}
            {donation.donationType === "Money" && donation.paymentData && (
              <div className="bg-green-50 p-4 rounded-xl">
                <h3 className="font-semibold text-green-800 mb-2">Payment Information:</h3>
                <div className="text-sm space-y-1">
                  <p className="text-green-700">Transaction ID: {donation.paymentData.transactionId}</p>
                  <p className="text-green-700">Bank: {donation.paymentData.bank}</p>
                  <p className="text-green-700">Status: Completed</p>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-center">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                  STATUS_COLORS[
                    donation.confirmed === true ? "confirmed" : donation.confirmed === false ? "rejected" : "pending"
                  ]
                }`}
              >
                {donation.confirmed === true ? "Confirmed" : donation.confirmed === false ? "Rejected" : "Pending"}
              </span>
            </div>

            {/* Action Buttons */}
            {donation.confirmed === null && (
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => onConfirm(donation)}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Confirm</span>
                </button>
                <button
                  onClick={() => onReject(donation)}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DonationReceived() {
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchDonations()
  }, [])

  const fetchDonations = async () => {
    const user = auth.currentUser
    if (!user) {
      toast.error("Please log in to view donations")
      return
    }

    setLoading(true)
    try {
      const q = query(collection(firestore, "donations"), where("orphanageId", "==", user.uid))
      const snapshot = await getDocs(q)

      const donationsList = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const donation = { id: docSnap.id, ...docSnap.data() }

          // Fetch request details
          if (donation.requestId) {
            try {
              const requestDoc = await getDoc(doc(firestore, "requests", donation.requestId))
              if (requestDoc.exists()) {
                donation.requestDetails = requestDoc.data()
              }
            } catch (err) {
              console.error("Error fetching request details:", err)
            }
          }

          return donation
        }),
      )

      // Sort by timestamp (newest first)
      donationsList.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(0)
        const bTime = b.timestamp?.toDate?.() || new Date(0)
        return bTime - aTime
      })

      setDonations(donationsList)
    } catch (err) {
      toast.error("Failed to load donations: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (donation) => {
    setActionLoading(true)
    try {
      await updateDoc(doc(firestore, "donations", donation.id), {
        confirmed: true,
      })

      // Update local state
      setDonations((prev) => prev.map((d) => (d.id === donation.id ? { ...d, confirmed: true } : d)))

      toast.success("Donation confirmed successfully!")
      setShowModal(false)
    } catch (err) {
      toast.error("Failed to confirm donation: " + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (donation) => {
    setActionLoading(true)
    try {
      await updateDoc(doc(firestore, "donations", donation.id), {
        confirmed: false,
      })

      // Update local state
      setDonations((prev) => prev.map((d) => (d.id === donation.id ? { ...d, confirmed: false } : d)))

      toast.success("Donation rejected")
      setShowModal(false)
    } catch (err) {
      toast.error("Failed to reject donation: " + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const openModal = (donation) => {
    setSelectedDonation(donation)
    setShowModal(true)
  }

  const closeModal = () => {
    setSelectedDonation(null)
    setShowModal(false)
  }

  // Filter and search donations
  const filteredDonations = donations.filter((donation) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && donation.confirmed === null) ||
      (filter === "confirmed" && donation.confirmed === true) ||
      (filter === "rejected" && donation.confirmed === false)

    const matchesSearch =
      !searchTerm ||
      donation.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.donationType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.requestDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  // Pagination
  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDonations = filteredDonations.slice(startIndex, startIndex + itemsPerPage)

  const stats = {
    total: donations.length,
    pending: donations.filter((d) => d.confirmed === null).length,
    confirmed: donations.filter((d) => d.confirmed === true).length,
    rejected: donations.filter((d) => d.confirmed === false).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Donations...</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Donations Received</h1>
          <p className="text-gray-600">Review and manage donations from generous donors</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Donations</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-green-600">Confirmed</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-red-600">Rejected</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Donations</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search donations..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Donations Table */}
        {filteredDonations.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No donations found</h3>
            <p className="text-gray-500">
              {filter === "all" && !searchTerm
                ? "You haven't received any donations yet"
                : "No donations match your current filters"}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Donor & Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Amount/Items
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Request
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedDonations.map((donation, index) => {
                      const requestType = REQUEST_TYPES.find((t) => t.value === donation.donationType)
                      const IconComponent = requestType?.icon || Package
                      const status =
                        donation.confirmed === true
                          ? "confirmed"
                          : donation.confirmed === false
                            ? "rejected"
                            : "pending"

                      return (
                        <motion.tr
                          key={donation.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <IconComponent className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                  {donation.donorEmail}
                                </p>
                                <p className="text-xs text-gray-500">{donation.donationType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {donation.subtypes && donation.subtypes.length > 0 ? (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {donation.donatedAmount} {requestType?.unit || ""}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {donation.subtypes.length} item{donation.subtypes.length > 1 ? "s" : ""}
                                  </p>
                                </div>
                              ) : (
                                <p className="font-medium text-gray-900">
                                  {donation.donationType === "Money"
                                    ? `Rs. ${donation.amount || donation.donatedAmount || 0}`
                                    : `${donation.donatedAmount || donation.numClothes || donation.numMeals || 0} ${requestType?.unit || ""}`}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900 truncate max-w-[120px]">
                              {donation.requestDetails?.title || "N/A"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">
                              {donation.timestamp?.toDate?.()?.toLocaleDateString() || "N/A"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[status]}`}
                            >
                              {status === "confirmed" ? "Confirmed" : status === "rejected" ? "Rejected" : "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openModal(donation)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {donation.confirmed === null && (
                                <>
                                  <button
                                    onClick={() => handleConfirm(donation)}
                                    disabled={actionLoading}
                                    className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                                    title="Confirm"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(donation)}
                                    disabled={actionLoading}
                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {paginatedDonations.map((donation, index) => {
                const requestType = REQUEST_TYPES.find((t) => t.value === donation.donationType)
                const IconComponent = requestType?.icon || Package
                const status =
                  donation.confirmed === true ? "confirmed" : donation.confirmed === false ? "rejected" : "pending"

                return (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{donation.donationType}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[status]}`}>
                        {status === "confirmed" ? "Confirmed" : status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Donor:</span>
                        <span className="font-medium text-gray-900 truncate ml-2">{donation.donorEmail}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount:</span>
                        <span className="font-medium text-gray-900">
                          {donation.donationType === "Money"
                            ? `Rs. ${donation.amount || donation.donatedAmount || 0}`
                            : `${donation.donatedAmount || donation.numClothes || donation.numMeals || 0} ${requestType?.unit || ""}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium text-gray-900">
                          {donation.timestamp?.toDate?.()?.toLocaleDateString() || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(donation)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                      {donation.confirmed === null && (
                        <>
                          <button
                            onClick={() => handleConfirm(donation)}
                            disabled={actionLoading}
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => handleReject(donation)}
                            disabled={actionLoading}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      currentPage === page
                        ? "text-white bg-green-600 border border-green-600"
                        : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Donation Details Modal */}
        <DonationDetailsModal
          isOpen={showModal}
          onClose={closeModal}
          donation={selectedDonation}
          onConfirm={handleConfirm}
          onReject={handleReject}
          loading={actionLoading}
        />
      </div>
    </div>
  )
}
