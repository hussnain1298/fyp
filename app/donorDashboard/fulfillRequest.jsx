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
  MapPin,
  Building,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

const PAGE_SIZE = 6

export default function FulfillRequests() {
  const [requests, setRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [donationNote, setDonationNote] = useState("")
  const [donationAmount, setDonationAmount] = useState("")
  const [activeModalId, setActiveModalId] = useState(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("All")
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const router = useRouter()

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
          donationSnap.forEach((d) => {
            const donationData = d.data()
            if (r.requestType === "Money") {
              totalDonated += Number(donationData.amount || 0)
            } else if (r.requestType === "Clothes") {
              totalDonated += Number(donationData.numClothes || 0)
            } else if (r.requestType === "Food") {
              totalDonated += Number(donationData.numMeals || 0)
            }
          })

          return {
            ...r,
            totalDonated,
            orphanInfo: orphanageMap[r.orphanageId] || {},
            progress: r.quantity ? Math.min((totalDonated / r.quantity) * 100, 100) : 0,
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

    // Filter by type
    if (filterType !== "All") {
      filtered = filtered.filter((r) => r.requestType === filterType)
    }

    // Search by title, description, or orphanage name
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

  const validateDonation = (request) => {
    const errors = {}

    if (!donationNote.trim()) {
      errors.note = "Please add a note about your donation"
    } else if (donationNote.trim().length < 10) {
      errors.note = "Note must be at least 10 characters long"
    }

    if (["Money", "Clothes", "Food"].includes(request.requestType)) {
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

    if (!validateDonation(request)) {
      toast.error("Please fix the validation errors")
      return
    }

    setSubmitting(true)
    try {
      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: request.orphanageId,
        requestId: request.id,
        donationType: request.requestType,
        amount: request.requestType === "Money" ? Number(donationAmount) : null,
        numClothes: request.requestType === "Clothes" ? Number(donationAmount) : null,
        numMeals: request.requestType === "Food" ? Number(donationAmount) : null,
        foodDescription: request.requestType === "Food" ? request.description : null,
        description: donationNote.trim(),
        confirmed: false,
        timestamp: serverTimestamp(),
      }

      const donationRef = await addDoc(collection(firestore, "donations"), donationData)
      await updateDoc(doc(firestore, "requests", request.id), {
        donations: arrayUnion(donationRef.id),
      })

      toast.success("Donation submitted successfully! Awaiting orphanage confirmation.")
      closeModal()
      fetchRequests() // Refresh data
    } catch (err) {
      toast.error("Error submitting donation: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => {
    setActiveModalId(null)
    setDonationNote("")
    setDonationAmount("")
    setValidationErrors({})
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "Money":
        return <DollarSign className="w-5 h-5" />
      case "Clothes":
        return <Shirt className="w-5 h-5" />
      case "Food":
        return <UtensilsCrossed className="w-5 h-5" />
      default:
        return <Heart className="w-5 h-5" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case "Money":
        return "bg-green-50 text-green-700 border-green-200"
      case "Clothes":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Food":
        return "bg-orange-50 text-orange-700 border-orange-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE)
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={5000} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Help Those in Need</h1>
        <p className="text-gray-600">Make a difference by fulfilling donation requests</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, description, or orphanage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
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
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Requests Grid */}
      {paginatedRequests.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No requests found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paginatedRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(request.requestType)}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(request.requestType)}`}
                    >
                      {request.requestType}
                    </span>
                  </div>
                  <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded-full text-xs font-medium">
                    {request.status}
                  </span>
                </div>

                {/* Title and Description */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {request.title || request.requestType}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{request.description}</p>

                {/* Progress Bar */}
                {request.quantity && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {request.totalDonated || 0} / {request.quantity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${request.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{request.progress.toFixed(1)}% completed</div>
                  </div>
                )}

                {/* Orphanage Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="w-4 h-4 mr-2" />
                    <span className="font-medium">{request.orphanInfo?.orgName || "N/A"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{request.orphanInfo?.city || "N/A"}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setActiveModalId(request.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Heart className="w-4 h-4" />
                  <span>Donate Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                page === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Donation Modal */}
      {activeModalId && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const request = requests.find((r) => r.id === activeModalId)
              if (!request) return null

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Make a Donation</h3>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      {getTypeIcon(request.requestType)}
                      <span className="font-semibold text-gray-900">{request.title || request.requestType}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{request.orphanInfo?.orgName}</p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleFulfill(request)
                    }}
                  >
                    {/* Donation Note */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Donation Message *</label>
                      <textarea
                        value={donationNote}
                        onChange={(e) => setDonationNote(e.target.value)}
                        placeholder="Write a message about your donation..."
                        rows={3}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          validationErrors.note ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {validationErrors.note && <p className="text-red-500 text-sm mt-1">{validationErrors.note}</p>}
                    </div>

                    {/* Amount Input */}
                    {["Money", "Clothes", "Food"].includes(request.requestType) && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          placeholder={
                            request.requestType === "Money"
                              ? "Enter amount in Rs."
                              : request.requestType === "Clothes"
                                ? "Enter quantity"
                                : "Enter number of meals"
                          }
                          min="1"
                          max="1000000"
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.amount ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {validationErrors.amount && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.amount}</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Submit Donation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
