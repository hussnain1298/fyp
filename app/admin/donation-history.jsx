"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase" // Corrected import to 'db'
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
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
  Building,
  User,
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

  // Caches for user and orphanage names
  const [userNames, setUserNames] = useState(new Map())
  const [orphanageNames, setOrphanageNames] = useState(new Map())

  const fetchComprehensiveHistory = async () => {
    setLoading(true)
    try {
      const [donationsSnap, servicesSnap, fundraisersSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "donations")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "fundraisers")),
        getDocs(collection(db, "users")), // Fetch all users for name lookups
      ])

      // Populate user and orphanage name caches
      const newUserNames = new Map()
      const newOrphanageNames = new Map()
      usersSnap.docs.forEach((docSnap) => {
        const userData = docSnap.data()
        if (userData.userType === "Donor") {
          newUserNames.set(docSnap.id, userData.fullName || userData.email)
        } else if (userData.userType === "Orphanage") {
          newOrphanageNames.set(docSnap.id, userData.orgName || userData.email)
        }
      })
      setUserNames(newUserNames)
      setOrphanageNames(newOrphanageNames)

      const allCombinedData = []
      let totalAmountSum = 0

      // 1. Process all donations (money, clothes, food, service fulfillment)
      const donationListPromises = donationsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const rawDate = data.timestamp?.toDate() || new Date(0)
        let totalDisplay = "—"
        let typeDisplay = data.donationType || "Other Donation"
        let status = data.confirmed === true ? "Approved" : data.confirmed === false ? "Rejected" : "Pending"
        let category = "Donations Made"
        let description = data.description || data.donationNote || "—"
        const amount = data.amount || null // Actual numeric amount for money donations

        if (data.donationType === "Money" && typeof data.amount === "number") {
          totalDisplay = `Rs. ${Number(data.amount).toLocaleString()}`
          totalAmountSum += Number(data.amount)
        } else if (data.donationType === "Clothes" && (data.donatedAmount || data.subtypes?.[0]?.quantity)) {
          totalDisplay = `${data.donatedAmount || data.subtypes[0].quantity} Clothes`
        } else if (data.donationType === "Food" && (data.donatedAmount || data.subtypes?.[0]?.quantity)) {
          totalDisplay = `${data.donatedAmount || data.subtypes[0].quantity} Meals`
        } else if (data.donationType === "Service Fulfillment" && data.serviceId) {
          // For service fulfillment, fetch linked service details
          try {
            const serviceDoc = await getDoc(doc(db, "services", data.serviceId))
            if (serviceDoc.exists()) {
              const serviceData = serviceDoc.data()
              typeDisplay = serviceData.title || "Service Fulfillment"
              status = serviceData.status || "Pending" // Use service status
              category = "Services"
              totalDisplay = data.donationNote || "Service Fulfilled"
              description = data.donationNote || serviceData.description || "Service Fulfilled"
            }
          } catch (error) {
            console.error("Error fetching service details for donation:", data.serviceId, error)
            typeDisplay = "Service Fulfillment (Error)"
            status = "Unknown"
          }
        }

        return {
          id: docSnap.id,
          date: rawDate,
          status: status,
          total: totalDisplay,
          type: typeDisplay,
          description: description,
          source: "donation",
          category: category,
          donorId: data.donorId || "—",
          orphanageId: data.orphanageId || "—",
          requestId: data.requestId || "—",
          donationType: data.donationType || "—",
          amount: amount, // Store actual amount for money donations
          numClothes: data.numClothes || null,
          numMeals: data.numMeals || null,
          foodDescription: data.foodDescription || null,
          serviceId: data.serviceId || null,
          donationNote: data.donationNote || null,
          paymentData: data.paymentData || null,
        }
      })
      const donationList = await Promise.all(donationListPromises)
      allCombinedData.push(...donationList)

      // 2. Process all services (posted by orphanages)
      const servicePostedListPromises = servicesSnap.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const rawDate = data.timestamp?.toDate() || new Date(0)
        // Count fulfillments for this service
        const fulfillmentCountSnap = await getDocs(
          query(collection(db, "donations"), where("serviceId", "==", docSnap.id)),
        )
        return {
          id: docSnap.id,
          date: rawDate,
          status: data.status || "Pending",
          total: `${fulfillmentCountSnap.size} Fulfillments`,
          type: data.title || "Service Posted",
          description: data.description || data.title || "Service Posted",
          source: "service_posted",
          category: "Services Posted",
          orphanageId: data.orphanageId || "—",
          title: data.title,
          fulfillmentCount: fulfillmentCountSnap.size,
        }
      })
      const servicePostedList = await Promise.all(servicePostedListPromises)
      allCombinedData.push(...servicePostedList)

      // 3. Process all fundraisers (posted by orphanages) and their donations
      const fundraiserListPromises = fundraisersSnap.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const rawDate = data.timestamp?.toDate() || new Date(0)
        const donationsInFundraiserSnap = await getDocs(collection(db, "fundraisers", docSnap.id, "donations"))
        const totalRaised = data.raisedAmount || 0
        const donationCount = donationsInFundraiserSnap.size

        // Add individual fundraiser donations to the combined list
        donationsInFundraiserSnap.docs.forEach((donationDoc) => {
          const fundDonationData = donationDoc.data()
          const fundDonationDate = fundDonationData.timestamp?.toDate() || new Date(0)
          allCombinedData.push({
            id: donationDoc.id,
            fundraiserId: docSnap.id,
            fundraiserTitle: data.title,
            date: fundDonationDate,
            status: fundDonationData.status === "pending" ? "Pending" : "Approved",
            total: `Rs. ${Number(fundDonationData.amount).toLocaleString()}`,
            type: "Fundraiser Donation",
            description: fundDonationData.donationNote || `Contributed to ${data.title}`,
            source: "fundraiser_donation",
            category: "Fundraiser Donations",
            amount: fundDonationData.amount,
            donorId: fundDonationData.donorId || "—",
            orphanageId: data.orphanageId || "—", // Fundraiser's orphanage
          })
          if (typeof fundDonationData.amount === "number") {
            totalAmountSum += Number(fundDonationData.amount)
          }
        })

        return {
          id: docSnap.id,
          date: rawDate,
          status: data.status || "Active", // Fundraiser status
          total: `Rs. ${Number(totalRaised).toLocaleString()} / Rs. ${Number(data.totalAmount).toLocaleString()}`,
          type: data.title || "Fundraiser Posted",
          description: data.description || data.title || "Fundraiser Posted",
          source: "fundraiser_posted",
          category: "Fundraisers Posted",
          orphanageId: data.orphanageId || "—",
          title: data.title,
          totalAmount: data.totalAmount,
          raisedAmount: totalRaised,
          donationCount,
          progress: data.totalAmount ? Math.round((totalRaised / data.totalAmount) * 100) : 0,
        }
      })
      const fundraiserPostedList = await Promise.all(fundraiserListPromises)
      allCombinedData.push(...fundraiserPostedList)

      allCombinedData.sort((a, b) => b.date.getTime() - a.date.getTime()) // Ensure proper date sorting
      setDonations(allCombinedData)
      setFilteredDonations(allCombinedData)

      // Calculate stats
      const newStats = {
        total: allCombinedData.length,
        approved: allCombinedData.filter((d) => d.status === "Approved" || d.status === "Fulfilled").length,
        pending: allCombinedData.filter((d) => d.status === "Pending" || d.status === "In Progress").length,
        totalAmount: totalAmountSum, // Summed up from all money and fundraiser donations
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
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.description?.toLowerCase().includes(searchLower) ||
          d.type?.toLowerCase().includes(searchLower) ||
          d.id?.toLowerCase().includes(searchLower) ||
          userNames.get(d.donorId)?.toLowerCase().includes(searchLower) || // Search by donor name
          orphanageNames.get(d.orphanageId)?.toLowerCase().includes(searchLower) || // Search by orphanage name
          d.donorEmail?.toLowerCase().includes(searchLower) ||
          d.orphanageId?.toLowerCase().includes(searchLower) ||
          d.requestId?.toLowerCase().includes(searchLower) ||
          d.fundraiserTitle?.toLowerCase().includes(searchLower), // Search by fundraiser title
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
      doc.text(`Total Entries: ${stats.total}`, 14, 42)
      doc.text(`Approved/Fulfilled: ${stats.approved} | Pending/In Progress: ${stats.pending}`, 14, 52)
      doc.text(`Total Money Amount: Rs. ${stats.totalAmount.toLocaleString()}`, 14, 62)
      // Add table
      autoTable(doc, {
        startY: 72,
        head: [["ID", "Date", "Type", "Status", "Amount/Details", "Category", "Linked Entity"]],
        body: filteredDonations.map((d) => [
          `#${d.id.substring(0, 8)}`,
          d.date.toLocaleDateString(),
          d.type,
          d.status,
          d.total,
          d.category,
          d.donorId !== "—"
            ? `Donor: ${userNames.get(d.donorId)?.substring(0, 15) || d.donorId.substring(0, 8)}...`
            : d.orphanageId !== "—"
              ? `Orphanage: ${orphanageNames.get(d.orphanageId)?.substring(0, 15) || d.orphanageId.substring(0, 8)}...`
              : d.requestId !== "—"
                ? `Request: ${d.requestId.substring(0, 8)}...`
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
        aVal = Number.parseFloat(aVal.replace("Rs. ", "").replace(/,/g, "")) || 0
        bVal = Number.parseFloat(bVal.replace("Rs. ", "").replace(/,/g, "")) || 0
      }
      return dir === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
    setFilteredDonations(sorted)
  }

  const getTypeIcon = (type) => {
    switch (type.toLowerCase()) {
      case "money":
      case "fundraiser donation":
        return <DollarSign className="w-4 h-4" />
      case "clothes":
        return <Shirt className="w-4 h-4" />
      case "food":
        return <UtensilsCrossed className="w-4 h-4" />
      case "service fulfillment":
      case "service posted":
        return <GraduationCap className="w-4 h-4" />
      case "fundraiser posted":
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
      case "In Progress":
      case "Active":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Rejected":
      case "Completed": // For fundraisers that are completed
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
        <p className="text-gray-600">Comprehensive record of all platform activities</p>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
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
              <p className="text-sm text-gray-600">Approved/Fulfilled</p>
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
              <p className="text-sm text-gray-600">Pending/In Progress</p>
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
              <p className="text-sm text-gray-600">Total Money Amount</p>
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
                placeholder="Search history..."
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
                {["All", "Approved", "Pending", "Rejected", "Fulfilled", "In Progress", "Active", "Completed"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
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
                "Services", // Service Fulfillment
                "Fundraiser Donations",
                "Services Posted",
                "Fundraisers Posted",
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
            Showing {filteredDonations.length} of {donations.length} entries
          </div>
        )}
      </div>
      {/* Donations Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {paginated.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No entries found</h3>
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
                      { key: "category", label: "Category" },
                      { key: "linkedEntity", label: "Linked Entity" }, // New column for linked ID
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
                  {paginated.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">#{entry.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{entry.date.toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(entry.type)}
                          <span className="text-sm text-gray-900 capitalize">{entry.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                            entry.status,
                          )}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{entry.total}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{entry.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {entry.donorId && entry.donorId !== "—" && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{userNames.get(entry.donorId)?.substring(0, 15) || "Donor ID"}...</span>
                            </div>
                          )}
                          {entry.orphanageId && entry.orphanageId !== "—" && (
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              <span>
                                {orphanageNames.get(entry.orphanageId)?.substring(0, 15) || "Orphanage ID"}...
                              </span>
                            </div>
                          )}
                          {entry.requestId && entry.requestId !== "—" && (
                            <div className="flex items-center gap-1">
                              <span>Request ID: {entry.requestId.substring(0, 8)}...</span>
                            </div>
                          )}
                          {!entry.donorId && !entry.orphanageId && !entry.requestId && "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDonation(entry)}
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
              <h3 className="text-xl font-bold text-gray-900">Entry Details</h3>
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

              {selectedDonation.donorId && selectedDonation.donorId !== "—" && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Donor:</span>
                  <span className="text-sm text-gray-900">
                    {userNames.get(selectedDonation.donorId) || selectedDonation.donorId}
                  </span>
                </div>
              )}
              {selectedDonation.orphanageId && selectedDonation.orphanageId !== "—" && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Orphanage:</span>
                  <span className="text-sm text-gray-900">
                    {orphanageNames.get(selectedDonation.orphanageId) || selectedDonation.orphanageId}
                  </span>
                </div>
              )}
              {selectedDonation.requestId && selectedDonation.requestId !== "—" && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Request ID:</span>
                  <span className="text-sm text-gray-900">{selectedDonation.requestId}</span>
                </div>
              )}
              {selectedDonation.fundraiserId && selectedDonation.fundraiserId !== "—" && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Fundraiser ID:</span>
                  <span className="text-sm text-gray-900">{selectedDonation.fundraiserId}</span>
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

              {selectedDonation.source === "fundraiser_posted" && (
                <div className="bg-orange-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-orange-800 mb-2">Fundraiser Details:</h3>
                  <div className="text-sm space-y-1">
                    <p className="text-orange-700">
                      Target Amount: Rs. {selectedDonation.totalAmount?.toLocaleString() || "N/A"}
                    </p>
                    <p className="text-orange-700">
                      Raised Amount: Rs. {selectedDonation.raisedAmount?.toLocaleString() || "N/A"}
                    </p>
                    <p className="text-orange-700">Donations Count: {selectedDonation.donationCount || 0}</p>
                    <p className="text-orange-700">Progress: {selectedDonation.progress || 0}%</p>
                  </div>
                </div>
              )}

              {selectedDonation.source === "service_posted" && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-800 mb-2">Service Details:</h3>
                  <div className="text-sm space-y-1">
                    <p className="text-blue-700">Title: {selectedDonation.title || "N/A"}</p>
                    <p className="text-blue-700">Fulfillments: {selectedDonation.fulfillmentCount || 0}</p>
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

export default DonationsHistory
