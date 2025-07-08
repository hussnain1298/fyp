"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  Heart,
  Building,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Package,
  MapPin,
  X,
  CheckCircle,
  Plus,
  Minus,
  Eye,
} from "lucide-react"
import PaymentModule from "../payment/paymentModule"
const PAGE_SIZE = 9

// Read More Popup Component
const ReadMorePopup = ({ isOpen, onClose, title, description, requestType }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">{title || requestType}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton component
const RequestSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[520px]">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full"></div>
        <div className="h-4 bg-green-100 rounded w-24"></div>
      </div>
      <div className="h-6 bg-green-100 rounded-full w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
    <div className="h-2 bg-gray-100 rounded w-full mb-4"></div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="h-10 bg-green-100 rounded-xl w-full mt-auto"></div>
  </div>
)

export default function FulfillRequests() {
  const [requests, setRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [donationNote, setDonationNote] = useState("")
  const [donationAmount, setDonationAmount] = useState("")
  const [selectedSubtypes, setSelectedSubtypes] = useState([]) // Changed to array for multiple subtypes
  const [activeModalId, setActiveModalId] = useState(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("All")
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [readMorePopup, setReadMorePopup] = useState({ isOpen: false, title: "", description: "", requestType: "" })
  const router = useRouter()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [currentRequest, setCurrentRequest] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    filterAndSearchRequests()
  }, [requests, searchTerm, filterType])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const reqSnap = await getDocs(collection(firestore, "requests"))
      const rawRequests = reqSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((r) => r.status === "Pending")

      const orphanageIds = [...new Set(rawRequests.map((r) => r.orphanageId).filter(Boolean))]
      const orphanageMap = {}

      if (orphanageIds.length > 0) {
        const batches = []
        while (orphanageIds.length) batches.push(orphanageIds.splice(0, 10))
        for (const batch of batches) {
          const orphanSnap = await getDocs(query(collection(firestore, "users"), where("__name__", "in", batch)))
          orphanSnap.forEach((doc) => {
            orphanageMap[doc.id] = doc.data()
          })
        }
      }

      const enriched = await Promise.all(
        rawRequests.map(async (r) => {
          const donationSnap = await getDocs(
            query(collection(firestore, "donations"), where("requestId", "==", r.id), where("confirmed", "==", true)),
          )
          let totalDonated = 0
          const subtypeDonations = {}

          donationSnap.forEach((d) => {
            const donationData = d.data()

            // Handle multiple subtypes in single donation
            if (donationData.subtypes && Array.isArray(donationData.subtypes)) {
              donationData.subtypes.forEach((subtypeItem) => {
                subtypeDonations[subtypeItem.subtype] =
                  (subtypeDonations[subtypeItem.subtype] || 0) + subtypeItem.quantity
                totalDonated += subtypeItem.quantity
              })
            } else if (donationData.subtype) {
              // Handle single subtype donation
              const amount = donationData.donatedAmount || 0
              subtypeDonations[donationData.subtype] = (subtypeDonations[donationData.subtype] || 0) + amount
              totalDonated += amount
            } else {
              // Legacy single-type donations
              if (r.requestType === "Money") {
                totalDonated += Number(donationData.amount || 0)
              } else if (r.requestType === "Clothes") {
                totalDonated += Number(donationData.numClothes || 0)
              } else if (r.requestType === "Food") {
                totalDonated += Number(donationData.numMeals || 0)
              }
            }
          })

          return {
            ...r,
            totalDonated,
            subtypeDonations,
            orphanInfo: orphanageMap[r.orphanageId] || {},
            progress: r.totalQuantity ? Math.min((totalDonated / r.totalQuantity) * 100, 100) : 0,
          }
        }),
      )

      setRequests(enriched)
      setPage(1)
    } catch (err) {
      setError("Failed to load requests: " + err.message)
      toast.error("Failed to load requests")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSearchRequests = () => {
    let filtered = requests

    if (filterType !== "All") {
      filtered = filtered.filter((r) => r.requestType === filterType)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.orphanInfo?.orgName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredRequests(filtered)
    setPage(1)
  }

  const validateDonation = (request, note, selectedSubtypes) => {
    const errors = {}

    if (!note.trim()) {
      errors.note = "Please add a note about your donation"
    } else if (note.trim().length < 10) {
      errors.note = "Note must be at least 10 characters long"
    }

    if (["Money", "Clothes", "Food"].includes(request.requestType)) {
      // For Money and single-type requests
      if (request.requestType === "Money" || !request.subtypes || request.subtypes.length === 0) {
        if (!donationAmount || isNaN(donationAmount) || Number(donationAmount) <= 0) {
          const typeText = request.requestType === "Food" ? "number of meals" : "donation amount"
          errors.amount = `Please enter a valid ${typeText}`
        } else if (Number(donationAmount) > 1000000) {
          errors.amount = "Amount cannot exceed 1,000,000"
        } else if (request.requestType === "Money" && Number(donationAmount) < 1) {
          errors.amount = "Minimum donation amount is Rs. 1"
        } else if (["Clothes", "Food"].includes(request.requestType) && Number(donationAmount) < 1) {
          errors.amount = "Minimum quantity is 1"
        }

        // Check remaining amount for single-type requests
        const remainingAmount = (request.totalQuantity || 0) - (request.totalDonated || 0)
        if (remainingAmount <= 0) {
          errors.amount = "This request is already fulfilled"
        } else if (Number(donationAmount) > remainingAmount) {
          errors.amount = `Cannot donate more than needed. Maximum: ${remainingAmount}`
        }
      } else {
        // For multi-subtype requests
        if (!selectedSubtypes || selectedSubtypes.length === 0) {
          errors.subtypes = "Please select at least one item to donate"
        } else {
          let hasValidSubtype = false
          for (const subtypeItem of selectedSubtypes) {
            if (!subtypeItem.subtype) {
              errors.subtypes = "Please select all subtype items"
              break
            }
            if (!subtypeItem.quantity || isNaN(subtypeItem.quantity) || Number(subtypeItem.quantity) <= 0) {
              errors.subtypes = "All quantities must be positive numbers"
              break
            }

            // Check remaining amount for each subtype
            const requestSubtype = request.subtypes.find((item) => item.subtype === subtypeItem.subtype)
            if (requestSubtype) {
              const subtypeDonated = request.subtypeDonations?.[subtypeItem.subtype] || 0
              const remainingAmount = requestSubtype.quantity - subtypeDonated
              if (remainingAmount <= 0) {
                errors.subtypes = `${subtypeItem.subtype} is already fulfilled`
                break
              } else if (Number(subtypeItem.quantity) > remainingAmount) {
                errors.subtypes = `Cannot donate more than needed for ${subtypeItem.subtype}. Maximum: ${remainingAmount}`
                break
              }
              hasValidSubtype = true
            }
          }

          if (!hasValidSubtype && !errors.subtypes) {
            errors.subtypes = "Please select valid items to donate"
          }
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFulfill = async (request) => {
    const user = auth.currentUser
    if (!user) {
      toast.error("Please log in to make a donation")
      return
    }

    // Validate based on request type
    const isValid =
      request.requestType === "Money" || !request.subtypes || request.subtypes.length === 0
        ? validateDonation(request, donationNote, [])
        : validateDonation(request, donationNote, selectedSubtypes)

    if (!isValid) {
      toast.error("Please fix the validation errors")
      return
    }

    // For Money requests, show payment modal
    if (request.requestType === "Money") {
      setCurrentRequest(request)
      setPaymentAmount(Number(donationAmount))
      setActiveModalId(null)
      setShowPaymentModal(true)
      return
    }

    // For non-money requests, proceed with normal flow
    setSubmitting(true)
    try {
      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: request.orphanageId,
        requestId: request.id,
        donationType: request.requestType,
        description: donationNote.trim(),
        confirmed: false,
        timestamp: serverTimestamp(),
      }

      // Handle multiple subtypes or single donation
      if (request.subtypes && request.subtypes.length > 0 && selectedSubtypes.length > 0) {
        // Multiple subtypes donation
        donationData.subtypes = selectedSubtypes.map((item) => ({
          subtype: item.subtype,
          quantity: Number(item.quantity),
        }))
        donationData.donatedAmount = selectedSubtypes.reduce((sum, item) => sum + Number(item.quantity), 0)
      } else {
        // Single type donation
        donationData.amount = request.requestType === "Money" ? Number(donationAmount) : null
        donationData.numClothes = request.requestType === "Clothes" ? Number(donationAmount) : null
        donationData.numMeals = request.requestType === "Food" ? Number(donationAmount) : null
        donationData.donatedAmount = Number(donationAmount)
      }

      const donationRef = await addDoc(collection(firestore, "donations"), donationData)

      await updateDoc(doc(firestore, "requests", request.id), {
        donations: arrayUnion(donationRef.id),
      })

      toast.success("Donation submitted successfully! Awaiting orphanage confirmation.")
      closeModal()
      fetchRequests()
    } catch (err) {
      toast.error("Error submitting donation: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = async (paymentData) => {
    try {
      if (!currentRequest) return

      const donationData = {
        donorId: auth.currentUser.uid,
        donorEmail: auth.currentUser.email,
        orphanageId: currentRequest.orphanageId,
        requestId: currentRequest.id,
        donationType: "Money",
        amount: paymentAmount,
        donatedAmount: paymentAmount,
        description: donationNote.trim() || "Payment completed successfully",
        confirmed: true,
        paymentData: {
          transactionId: paymentData.transactionId,
          bank: paymentData.bank.name,
          timestamp: paymentData.timestamp,
        },
        timestamp: serverTimestamp(),
      }

      const donationRef = await addDoc(collection(firestore, "donations"), donationData)

      await updateDoc(doc(firestore, "requests", currentRequest.id), {
        donations: arrayUnion(donationRef.id),
      })

      // Reset states
      setShowPaymentModal(false)
      setCurrentRequest(null)
      setPaymentAmount(0)
      setDonationNote("")
      setDonationAmount("")
      setSelectedSubtypes([])
      setValidationErrors({})

      toast.success("Payment successful! Your donation has been confirmed.")
      fetchRequests()
    } catch (err) {
      console.error("Payment success handler error:", err.message)
      toast.error("Payment was successful but there was an error recording the donation. Please contact support.")
    }
  }

  const closeModal = () => {
    setActiveModalId(null)
    setDonationNote("")
    setDonationAmount("")
    setSelectedSubtypes([])
    setValidationErrors({})
  }

  const addSubtypeSelection = () => {
    setSelectedSubtypes([...selectedSubtypes, { subtype: "", quantity: "" }])
  }

  const removeSubtypeSelection = (index) => {
    if (selectedSubtypes.length > 1) {
      setSelectedSubtypes(selectedSubtypes.filter((_, i) => i !== index))
    }
  }

  const updateSubtypeSelection = (index, field, value) => {
    const newSubtypes = [...selectedSubtypes]
    newSubtypes[index][field] = value
    setSelectedSubtypes(newSubtypes)
  }

  const openReadMorePopup = (title, description, requestType) => {
    setReadMorePopup({ isOpen: true, title, description, requestType })
  }

  const closeReadMorePopup = () => {
    setReadMorePopup({ isOpen: false, title: "", description: "", requestType: "" })
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "Money":
        return <DollarSign className="w-5 h-5 text-green-600" />
      case "Clothes":
        return <Shirt className="w-5 h-5 text-green-600" />
      case "Food":
        return <UtensilsCrossed className="w-5 h-5 text-green-600" />
      default:
        return <Package className="w-5 h-5 text-green-600" />
    }
  }

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE)
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Requests...</h2>
            <p className="text-gray-600">Finding ways you can help</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <RequestSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Heart className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Fulfill Donation Requests</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Help those in need by fulfilling donation requests from orphanages across the community
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title, description, or orphanage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-12 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white min-w-[180px] transition-all"
              >
                <option value="All">All Types</option>
                <option value="Money">Money</option>
                <option value="Clothes">Clothes</option>
                <option value="Food">Food</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {filteredRequests.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
              </div>
              <div className="text-sm text-green-600 font-medium">
                Page {page} of {totalPages}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {/* Requests Grid */}
        {paginatedRequests.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <Heart className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">No requests found</h3>
            <p className="text-gray-500 text-lg">
              {searchTerm || filterType !== "All"
                ? "Try adjusting your search or filter criteria"
                : "Check back later for new donation opportunities"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {paginatedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[520px] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      {getTypeIcon(request.requestType)}
                    </div>
                    <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      {request.requestType}
                    </span>
                  </div>
                  <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full text-xs font-medium">
                    {request.status}
                  </span>
                </div>

                {/* Title and Description */}
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-green-700 transition-colors">
                  {request.title || request.requestType}
                </h3>

                <div className="text-gray-600 mb-4 leading-relaxed">
                  {request.description && request.description.length > 80 ? (
                    <>
                      <span>{request.description.substring(0, 80)}...</span>
                      <button
                        onClick={() =>
                          openReadMorePopup(
                            request.title || request.requestType,
                            request.description,
                            request.requestType,
                          )
                        }
                        className="ml-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors inline-flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Read More
                      </button>
                    </>
                  ) : (
                    <span>{request.description}</span>
                  )}
                </div>

                {/* Display subtypes if available */}
                {request.subtypes && request.subtypes.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Items needed:</div>
                    <div className="space-y-1">
                      {request.subtypes.map((item, idx) => {
                        const donated = request.subtypeDonations?.[item.subtype] || 0
                        const remaining = item.quantity - donated
                        return (
                          <div key={idx} className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                            <span className="text-blue-700">{item.subtype}</span>
                            <span className="font-semibold text-blue-800">
                              {remaining > 0 ? `${remaining} needed` : "✅ Fulfilled"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {request.totalQuantity && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="font-bold text-green-600">
                        {request.totalDonated || 0} / {request.totalQuantity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${request.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-green-600 font-medium mt-1">
                      {request.progress.toFixed(1)}% completed
                    </div>
                  </div>
                )}

                {/* Orphanage Info */}
                <div className="space-y-2 mb-4 p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center text-sm text-gray-700">
                    <Building className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-semibold">{request.orphanInfo?.orgName || "N/A"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-green-600" />
                    <span>{request.orphanInfo?.city || "N/A"}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    setActiveModalId(request.id)
                    // Initialize selectedSubtypes for multi-subtype requests
                    if (request.subtypes && request.subtypes.length > 0) {
                      setSelectedSubtypes([{ subtype: "", quantity: "" }])
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl mt-auto"
                >
                  <Heart className="w-5 h-5" />
                  <span>Donate Now</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    page === i + 1
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-green-50 border border-gray-200 hover:border-green-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Donation Modal */}
        {activeModalId && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const request = requests.find((r) => r.id === activeModalId)
                if (!request) return null

                const hasSubtypes = request.subtypes && request.subtypes.length > 0
                const hasAvailableSubtypes =
                  hasSubtypes &&
                  request.subtypes.some((item) => {
                    const donated = request.subtypeDonations?.[item.subtype] || 0
                    return item.quantity > donated
                  })

                return (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold text-gray-800">Make a Donation</h3>
                      <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="mb-8 p-6 bg-green-50 rounded-xl">
                      <div className="flex items-center space-x-3 mb-3">
                        {getTypeIcon(request.requestType)}
                        <span className="font-bold text-gray-800 text-lg">{request.title || request.requestType}</span>
                      </div>
                      <p className="text-gray-600 font-medium">{request.orphanInfo?.orgName}</p>

                      {/* Show subtype breakdown */}
                      {hasSubtypes && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm text-blue-800 space-y-2">
                            <p className="font-semibold">Items available for donation:</p>
                            {request.subtypes.map((item, idx) => {
                              const subtypeDonated = request.subtypeDonations?.[item.subtype] || 0
                              const subtypeRemaining = item.quantity - subtypeDonated
                              return (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.subtype}:</span>
                                  <span className={subtypeRemaining > 0 ? "text-green-600 font-bold" : "text-gray-500"}>
                                    {subtypeRemaining > 0 ? `${subtypeRemaining} available` : "Fulfilled"}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {!hasAvailableSubtypes && hasSubtypes ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-gray-800 mb-2">Request Fulfilled!</h4>
                        <p className="text-gray-600">This request has already been fully fulfilled by other donors.</p>
                        <button
                          onClick={closeModal}
                          className="mt-6 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all"
                        >
                          Close
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleFulfill(request)
                        }}
                        className="space-y-6"
                      >
                        {/* Multiple Subtypes Selection for multi-subtype requests */}
                        {hasSubtypes && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <label className="block text-sm font-bold text-gray-700">Select Items to Donate *</label>
                              <button
                                type="button"
                                onClick={addSubtypeSelection}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Item</span>
                              </button>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {selectedSubtypes.map((subtypeItem, index) => (
                                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                                  <div className="flex-1">
                                    <select
                                      value={subtypeItem.subtype}
                                      onChange={(e) => updateSubtypeSelection(index, "subtype", e.target.value)}
                                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                      required
                                    >
                                      <option value="">Select item type</option>
                                      {request.subtypes.map((item, idx) => {
                                        const subtypeDonated = request.subtypeDonations?.[item.subtype] || 0
                                        const subtypeRemaining = item.quantity - subtypeDonated
                                        return subtypeRemaining > 0 ? (
                                          <option key={idx} value={item.subtype}>
                                            {item.subtype} ({subtypeRemaining} available)
                                          </option>
                                        ) : null
                                      })}
                                    </select>
                                  </div>
                                  <div className="w-32">
                                    <input
                                      type="number"
                                      value={subtypeItem.quantity}
                                      onChange={(e) => updateSubtypeSelection(index, "quantity", e.target.value)}
                                      placeholder="Qty"
                                      min="1"
                                      max={(() => {
                                        if (subtypeItem.subtype) {
                                          const requestSubtype = request.subtypes.find(
                                            (item) => item.subtype === subtypeItem.subtype,
                                          )
                                          if (requestSubtype) {
                                            const donated = request.subtypeDonations?.[subtypeItem.subtype] || 0
                                            return requestSubtype.quantity - donated
                                          }
                                        }
                                        return 999
                                      })()}
                                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                      required
                                    />
                                  </div>
                                  {selectedSubtypes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSubtypeSelection(index)}
                                      className="text-red-500 hover:text-red-700 p-2 transition-colors"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {validationErrors.subtypes && (
                              <p className="text-red-500 text-sm mt-2">{validationErrors.subtypes}</p>
                            )}
                          </div>
                        )}

                        {/* Single Amount Input for Money and single-type requests */}
                        {(request.requestType === "Money" || !hasSubtypes) && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                              {request.requestType === "Money"
                                ? "Donation Amount (Rs.) *"
                                : request.requestType === "Clothes"
                                  ? "Number of Clothes *"
                                  : "Number of Meals *"}
                            </label>
                            <input
                              type="number"
                              value={donationAmount}
                              onChange={(e) => setDonationAmount(e.target.value)}
                              placeholder={`Enter ${request.requestType === "Money" ? "amount" : "quantity"}`}
                              min="1"
                              className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                                validationErrors.amount ? "border-red-500" : "border-gray-200"
                              }`}
                            />
                            {validationErrors.amount && (
                              <p className="text-red-500 text-sm mt-2">{validationErrors.amount}</p>
                            )}
                          </div>
                        )}

                        {/* Donation Note */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-3">Donation Message *</label>
                          <textarea
                            value={donationNote}
                            onChange={(e) => setDonationNote(e.target.value)}
                            placeholder="Write a heartfelt message about your donation..."
                            rows={4}
                            className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all ${
                              validationErrors.note ? "border-red-500" : "border-gray-200"
                            }`}
                          />
                          {validationErrors.note && (
                            <p className="text-red-500 text-sm mt-2">{validationErrors.note}</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-4 pt-6">
                          <button
                            type="button"
                            onClick={closeModal}
                            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                {request.requestType === "Money" ? (
                                  <>
                                    <DollarSign className="w-5 h-5" />
                                    <span>Proceed to Payment</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Submit Donation</span>
                                  </>
                                )}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Read More Popup */}
        <ReadMorePopup
          isOpen={readMorePopup.isOpen}
          onClose={closeReadMorePopup}
          title={readMorePopup.title}
          description={readMorePopup.description}
          requestType={readMorePopup.requestType}
        />

        {/* Payment Modal */}
        <PaymentModule
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setCurrentRequest(null)
            setPaymentAmount(0)
          }}
          amount={paymentAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  )
}
