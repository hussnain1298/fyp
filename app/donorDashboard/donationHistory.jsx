"use client"

import { useState, useEffect } from "react"
import { auth, firestore } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore" // Added getDoc
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

const DonationsHistory = () => {
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
    const user = auth.currentUser
    if (!user) {
      setLoading(false)
      return
    }
    try {
      // Get user type to determine what to fetch
      const userDocSnap = await getDocs(query(collection(firestore, "users"), where("__name__", "==", user.uid)))
      const userData = userDocSnap.docs[0]?.data()
      const userType = userData?.userType

      const promises = [
        // Donations made by user
        getDocs(query(collection(firestore, "donations"), where("donorId", "==", user.uid))),
        // Services fulfilled by user (these are the service documents themselves)
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
      const donationListPromises = donSnap.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const rawDate = data.timestamp?.toDate()
        let total = "—"
        let numClothes = null
        let numMeals = null
        let amount = null
        const donationType = data.donationType || "—"
        let status = data.confirmed ? "Approved" : "Pending" // Default status for general donations
        let description = data.description || data.donationNote || "—"
        let category = "Donations Made"
        let typeDisplay = donationType // Default display for type column

        // If a serviceId is present, it's a service fulfillment
        if (data.serviceId) {
          try {
            const serviceDoc = await getDoc(doc(firestore, "services", data.serviceId))
            if (serviceDoc.exists()) {
              const serviceData = serviceDoc.data()
              typeDisplay = serviceData.title || "Service Fulfillment" // Display service title
              status = serviceData.status || "Pending" // Get status from service document
              category = "Services" // Change category to Services
              total = data.donationNote || "Service Fulfilled" // Amount column for services
              description = data.donationNote || serviceData.description || "Service Fulfilled"
            }
          } catch (error) {
            console.error("Error fetching service details for donation:", data.serviceId, error)
            typeDisplay = "Service Fulfillment (Error)"
            status = "Unknown"
            category = "Services"
          }
        } else if (donationType === "Money" && data.amount) {
          amount = data.amount
          total = data.amount ? `Rs. ${Number(data.amount).toLocaleString()}` : "—"
        } else if (donationType === "Clothes" && (data.donatedAmount || data.subtypes?.[0]?.quantity)) {
          numClothes = data.donatedAmount || data.subtypes[0].quantity
          total = `${numClothes} Clothes`
        } else if (donationType === "Food" && (data.donatedAmount || data.subtypes?.[0]?.quantity)) {
          numMeals = data.donatedAmount || data.subtypes[0].quantity
          total = `${numMeals} Meals`
        } else if (data.foodDescription) {
          total = "Food" // Fallback for older food donations
        }

        return {
          id: docSnap.id,
          date: rawDate || new Date(0),
          status: status, // Use fetched service status or default
          total, // This is for the table display
          type: typeDisplay, // Use service title or donation type
          description: description,
          source: "donation_made",
          category: category, // Use updated category
          requestId: data.requestId || "—",
          orphanageId: data.orphanageId || "—",
          donationType: donationType,
          amount: amount,
          numClothes: numClothes,
          numMeals: numMeals,
          foodDescription: data.foodDescription || null,
          serviceId: data.serviceId || null,
          donationNote: data.donationNote || null,
        }
      })
      const donationList = await Promise.all(donationListPromises)

      // Process services fulfilled (these are the service documents themselves, where donorId matches)
      const serviceFulfilledList = servFulfilledSnap.docs.map((docSnap) => {
        const data = docSnap.data()
        const rawDate = data.fulfilledAt?.toDate() || data.timestamp?.toDate()
        return {
          id: docSnap.id,
          date: rawDate || new Date(0),
          status: data.status || "Pending", // Use the service's actual status
          total: data.lastFulfillmentNote || data.title || "Service Fulfilled", // Display note or title
          type: data.title || "Service", // Display service title
          description: data.lastFulfillmentNote || data.description || data.title || "Service Fulfilled",
          source: "service_fulfilled",
          category: "Services", // Change category to Services
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
          total: `Rs. ${Number(donation.amount).toLocaleString()}`,
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
          servCreatedSnap.docs.map(async (docSnap) => {
            const data = docSnap.data()
            const rawDate = data.timestamp?.toDate()
            // Count fulfillments for this service
            const fulfillmentCountSnap = await getDocs(
              query(collection(firestore, "donations"), where("serviceId", "==", docSnap.id)),
            )
            return {
              id: docSnap.id,
              date: rawDate || new Date(0),
              status: data.status || "Pending",
              total: `${fulfillmentCountSnap.size} Fulfillments`,
              type: data.title || "Service Created",
              description: data.description || data.title || "Service Posted",
              source: "service_created",
              category: "Services Posted",
              title: data.title,
              fulfillmentCount: fulfillmentCountSnap.size,
            }
          }),
        )
      }

      // Process fundraisers created (for orphanages)
      if (fundCreatedSnap) {
        fundraiserCreatedList = await Promise.all(
          fundCreatedSnap.docs.map(async (docSnap) => {
            const data = docSnap.data()
            const rawDate = data.timestamp?.toDate()
            // Get donation count and total raised
            const donationsSnap = await getDocs(collection(firestore, "fundraisers", docSnap.id, "donations"))
            const totalRaised = data.raisedAmount || 0
            const donationCount = donationsSnap.size
            return {
              id: docSnap.id,
              date: rawDate || new Date(0),
              status: data.status || "Pending",
              total: `Rs. ${Number(totalRaised).toLocaleString()} / Rs. ${Number(data.totalAmount).toLocaleString()}`,
              type: data.title || "Fundraiser Created",
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
      combined.sort((a, b) => b.date.getTime() - a.date.getTime()) // Ensure proper date sorting
      setDonations(combined)
      setFilteredDonations(combined)

      // Calculate stats
      const newStats = {
        total: combined.length,
        approved: combined.filter((d) => d.status === "Approved" || d.status === "Fulfilled").length,
        pending: combined.filter((d) => d.status === "Pending").length,
        totalAmount: combined.reduce((sum, d) => {
          // Only sum 'amount' if it's a number and not a service fulfillment (which uses donationNote for 'total')
          if (d.amount && typeof d.amount === "number") return sum + d.amount
          // For fundraiser donations, also add their amount
          if (d.source === "fundraiser_donation" && d.amount && typeof d.amount === "number") return sum + d.amount
          return sum
        }, 0),
      }
      setStats(newStats)
    } catch (error) {
      console.error("Error fetching comprehensive history:", error)
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

  const filterAndSearchDonations = () => {
    let filtered = donations
    // Filter by status
    if (filterStatus !== "All") {
      filtered = filtered.filter((d) => d.status === filterStatus)
    }
    // Filter by category
    if (filterCategory !== "All Categories") {
      filtered = filtered.filter((d) => d.category === filterCategory)
    }
    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.id?.toLowerCase().includes(searchTerm.toLowerCase()),
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
        head: [["ID", "Date", "Type", "Status", "Amount", "Category"]],
        body: filteredDonations.map((d) => [
          `#${d.id.substring(0, 8)}`,
          d.date.toLocaleDateString(),
          d.type,
          d.status,
          d.total,
          d.category,
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
      const aVal = a[key]
      const bVal = b[key]
      // Handle date objects for sorting
      if (key === "date") {
        return dir === "asc" ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime()
      }
      return dir === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
    setFilteredDonations(sorted)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "Money":
        return <DollarSign className="w-4 h-4" />
      case "Clothes":
        return <Shirt className="w-4 h-4" />
      case "Food":
        return <UtensilsCrossed className="w-4 h-4" />
      case "Service":
      case "Service Fulfillment": // Added for service fulfillment donations
        return <GraduationCap className="w-4 h-4" />
      case "Fundraiser":
        return <TrendingUp className="w-4 h-4" />
      default:
        // If type is a service title, use GraduationCap
        if (type && type.includes("Service")) {
          // Simple check, can be more robust
          return <GraduationCap className="w-4 h-4" />
        }
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
        <p className="text-gray-600">Track all your contributions and activities</p>
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
                {["All", "Approved", "Pending", "Fulfilled"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[180px]"
            >
              {[
                "All Categories",
                "Donations Made",
                "Services", // Changed from "Services Fulfilled"
                "Fundraiser Donations",
               
              ].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
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
                      { key: "total", label: "Amount" },
                      { key: "category", label: "Category" },
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
                          <span className="text-sm text-gray-900">{donation.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(donation.status)}`}
                        >
                          {donation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{donation.total}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{donation.category}</span>
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
                    {[...Array(totalPages)].map((_, idx) => (
                      <button
                        key={idx + 1}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === idx + 1
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
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
                  className={`text-sm font-medium px-2 py-1 rounded-full border ${getStatusColor(selectedDonation.status)}`}
                >
                  {selectedDonation.status}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <div className="flex items-center space-x-2">
                  {getTypeIcon(selectedDonation.type)}
                  <span className="text-sm text-gray-900">{selectedDonation.type}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Amount:</span>
                <span className="text-sm font-bold text-gray-900">{selectedDonation.total}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Category:</span>
                <span className="text-sm text-gray-900">{selectedDonation.category}</span>
              </div>
              {/* Enhanced donation details based on source */}
              {selectedDonation.source === "donation_made" && (
                <>
                  {selectedDonation.amount && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Amount:</span>
                      <span className="text-sm font-bold text-green-600">
                        Rs. {Number(selectedDonation.amount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedDonation.numClothes && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Clothes:</span>
                      <span className="text-sm font-bold text-blue-600">{selectedDonation.numClothes} items</span>
                    </div>
                  )}
                  {selectedDonation.numMeals && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Meals:</span>
                      <span className="text-sm font-bold text-orange-600">{selectedDonation.numMeals} meals</span>
                    </div>
                  )}
                  {selectedDonation.donationType === "Service Fulfillment" && selectedDonation.donationNote && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 block mb-2">Fulfillment Note:</span>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                        {selectedDonation.donationNote}
                      </p>
                    </div>
                  )}
                </>
              )}
              {selectedDonation.description && selectedDonation.description !== "—" && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 block mb-2">Description:</span>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">{selectedDonation.description}</p>
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

export default DonationsHistory
