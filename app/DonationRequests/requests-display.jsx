"use client"

import { useEffect, useState } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, doc, getDoc, addDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
import { Eye, X, Plus, Minus } from "lucide-react"
import PaymentModule from "../payment/paymentModule"

const REQUEST_TYPES = [
  { value: "Money", label: "Money", maxLimit: 50000 },
  { value: "Clothes", label: "Clothes", maxLimit: 200, unit: "piece" },
  { value: "Food", label: "Food", maxLimit: 100, unit: "KG" },
  { value: "Other", label: "Other", maxLimit: 500 },
]

const CLOTHES_SUBTYPES = [
  { value: "Jeans", label: "Jeans", icon: "👖" },
  { value: "Shirts", label: "Shirts", icon: "👔" },
  { value: "Shalwar Kameez", label: "Shalwar Kameez", icon: "🥻" },
  { value: "Trousers", label: "Trousers", icon: "👖" },
  { value: "School Uniforms", label: "School Uniforms", icon: "👕" },
  { value: "Winter Clothes", label: "Winter Clothes", icon: "🧥" },
  { value: "Undergarments", label: "Undergarments", icon: "👙" },
  { value: "Shoes", label: "Shoes", icon: "👟" },
]

const FOOD_SUBTYPES = [
  { value: "Rice", label: "Rice", icon: "🍚" },
  { value: "Wheat/Flour", label: "Wheat/Flour", icon: "🌾" },
  { value: "Lentils", label: "Lentils", icon: "🫘" },
  { value: "Vegetables", label: "Vegetables", icon: "🥬" },
  { value: "Fruits", label: "Fruits", icon: "🍎" },
  { value: "Meat/Chicken", label: "Meat/Chicken", icon: "🍗" },
  { value: "Milk/Dairy", label: "Milk/Dairy", icon: "🥛" },
  { value: "Cooking Oil", label: "Cooking Oil", icon: "🫒" },
  { value: "Spices", label: "Spices", icon: "🌶️" },
  { value: "Ready Meals", label: "Ready Meals", icon: "🍽️" },
]

// Request Details Popup Component
const RequestDetailsPopup = ({ isOpen, onClose, request, onDonate }) => {
  if (!isOpen || !request) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
        {/* Fixed Header */}
        <div className="p-4 border-b border-gray-100 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 truncate pr-4">{request.title || request.requestType}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <span
            className={`inline-block px-2 py-1 rounded text-white text-xs mt-2 ${
              request.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
            }`}
          >
            {request.status}
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Request Type */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Request Type:</h4>
            <p className="text-green-600 font-semibold text-sm">{request.requestType}</p>
          </div>

          {/* Items needed or Money needed */}
          {((request.subtypes && request.subtypes.length > 0) || request.requestType === "Money") && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {request.requestType === "Money" ? "Money needed:" : "Items needed:"}
              </h4>
              <div className="space-y-1">
                {request.requestType === "Money" && request.quantity ? (
                  <div className="flex justify-between text-xs bg-green-50 px-2 py-1 rounded">
                    <span className="text-green-700">Money</span>
                    <span className="font-semibold text-green-800">
                      {request.totalDonated || 0} / {request.quantity}
                    </span>
                  </div>
                ) : (
                  request.subtypes?.map((item, idx) => {
                    const donated = request.subtypeDonations?.[item.subtype] || 0
                    return (
                      <div key={idx} className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                        <span className="text-blue-700 truncate">{item.subtype}</span>
                        <span className="font-semibold text-blue-800 ml-2 flex-shrink-0">
                          {donated} / {item.quantity}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 ">Description:</h4>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Orphanage Info */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Orphanage Details:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Name: {request.orphanInfo?.orgName || "N/A"}</p>
              <p>Location: {request.orphanInfo?.city || "N/A"}</p>
              <p>
                Donated: {request.totalDonated || 0} {request.quantity ? `of ${request.quantity} ` : ""}
                {request.requestType === "Food" ? "KG" : request.requestType === "Clothes" ? "piece" : "amount"}
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Footer with Donate Button */}
        <div className="p-4 border-t border-gray-100 rounded-b-2xl flex-shrink-0">
          <button
            onClick={() => {
              onClose()
              onDonate(request)
            }}
            disabled={request.status === "Fulfilled"}
            className={`w-full py-2 px-6 rounded text-white transition-colors ${
              request.status === "Fulfilled" ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Donate
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RequestsDisplay({
  cityFilteredRequests,
  loading,
  userCityFilter,
  setUserCityFilter,
  availableCities,
  locationStatus,
  showLocationPrompt,
  setShowLocationPrompt,
  handleRetryLocation,
  isRetrying,
  getLocationDisplayText,
  getLocationPromptMessage,
}) {
  const [filteredRequests, setFilteredRequests] = useState([])
  const [selectedType, setSelectedType] = useState("All")
  const [page, setPage] = useState(1)
  const pageSize = 6
  const [donationNote, setDonationNote] = useState("")
  const [donationAmount, setDonationAmount] = useState("")
  const [activeModalId, setActiveModalId] = useState(null)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [currentRequest, setCurrentRequest] = useState(null)

  // Add selectedSubtypes state for multiple subtype donations
  const [selectedSubtypes, setSelectedSubtypes] = useState([])
  const [requestDetailsPopup, setRequestDetailsPopup] = useState({
    isOpen: false,
    request: null,
  })

  const effectiveCity = userCityFilter.trim()

  const openRequestDetailsPopup = (request) => {
    setRequestDetailsPopup({ isOpen: true, request })
  }

  const closeRequestDetailsPopup = () => {
    setRequestDetailsPopup({ isOpen: false, request: null })
  }

  useEffect(() => {
    const start = (page - 1) * pageSize
    const filtered =
      selectedType === "All"
        ? cityFilteredRequests
        : cityFilteredRequests.filter((r) => r.requestType.toLowerCase() === selectedType.toLowerCase())
    setFilteredRequests(filtered.slice(start, start + pageSize))
  }, [selectedType, cityFilteredRequests, page])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u)
      if (!u) return setUserType(null)
      try {
        const snap = await getDoc(doc(firestore, "users", u.uid))
        setUserType(snap.exists() ? snap.data().userType : null)
      } catch (error) {
        console.error("Auth error:", error.message)
        setUserType(null)
      }
    })
    return unsubscribe
  }, [])

  const handleDonateClick = (req) => {
    if (!user) return alert("Please login to donate.")
    if (userType !== "Donor") return alert("Only donors can make donations.")
    if (req.status === "Fulfilled") return alert("This request is fulfilled.")
    setActiveModalId(req.id)
    setDonationNote("")
    setDonationAmount("")
    setSelectedSubtypes([{ subtype: "", quantity: "" }])
    setError("")
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

  const getSubtypeOptions = (requestType) => {
    if (requestType === "Clothes") return CLOTHES_SUBTYPES
    if (requestType === "Food") return FOOD_SUBTYPES
    return []
  }

  const handleDonationSubmit = async (req) => {
    setError("")
    try {
      if (!user) return setError("Login required.")
      if (req.status === "Fulfilled") return setError("Request already fulfilled.")

      const hasSubtypes = req.subtypes && req.subtypes.length > 0

      // Enhanced validation for donation amounts with subtype support
      if (req.requestType === "Money" || req.requestType === "Clothes" || req.requestType === "Food") {
        if (hasSubtypes) {
          // Validate multiple subtypes
          if (!selectedSubtypes || selectedSubtypes.length === 0) {
            return setError("Please select at least one item to donate.")
          }

          for (const subtypeItem of selectedSubtypes) {
            if (!subtypeItem.subtype) {
              return setError("Please select all subtype items.")
            }
            if (!subtypeItem.quantity || isNaN(Number(subtypeItem.quantity)) || Number(subtypeItem.quantity) <= 0) {
              return setError("All quantities must be positive numbers.")
            }

            const requestSubtype = req.subtypes.find((item) => item.subtype === subtypeItem.subtype)
            if (requestSubtype) {
              const subtypeDonated = req.subtypeDonations?.[subtypeItem.subtype] || 0
              const subtypeRemaining = requestSubtype.quantity - subtypeDonated

              if (subtypeRemaining <= 0) {
                return setError(`${subtypeItem.subtype} is already fulfilled.`)
              }

              if (Number(subtypeItem.quantity) > subtypeRemaining) {
                return setError(
                  `Cannot donate more than needed for ${subtypeItem.subtype}. Maximum: ${subtypeRemaining}`,
                )
              }
            }
          }
        } else {
          // Validate single amount
          if (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) <= 0) {
            return setError("Enter a valid amount.")
          }

          const remainingAmount = (req.quantity || 0) - (req.totalDonated || 0)
          if (remainingAmount <= 0) {
            return setError("This request is already fulfilled.")
          }

          if (Number(donationAmount) > remainingAmount) {
            return setError(`Cannot donate more than needed. Maximum: ${remainingAmount}`)
          }
        }

        // Check maximum limits per request type
        const maxLimits = { Money: 50000, Clothes: 200, Food: 100, Other: 500 }
        const maxLimit = maxLimits[req.requestType] || 1000
        const totalAmount = hasSubtypes
          ? selectedSubtypes.reduce((sum, item) => sum + Number(item.quantity), 0)
          : Number(donationAmount)

        if (totalAmount > maxLimit) {
          return setError(`Maximum ${req.requestType.toLowerCase()} donation is ${maxLimit}`)
        }
      }

      // For Money requests, show payment modal instead of direct submission
      if (req.requestType === "Money") {
        setCurrentRequest(req)
        setPaymentAmount(Number(donationAmount))
        setActiveModalId(null)
        setShowPaymentModal(true)
        return
      }

      // For non-money requests, proceed with normal flow
      const updateField = {
        totalDonated:
          (req.totalDonated || 0) +
          (hasSubtypes
            ? selectedSubtypes.reduce((sum, item) => sum + Number(item.quantity), 0)
            : Number(donationAmount)),
      }

      await updateDoc(doc(firestore, "requests", req.id), updateField)

      const updatedRequests = cityFilteredRequests.map((r) => {
        if (r.id === req.id) {
          return {
            ...r,
            totalDonated: updateField.totalDonated,
          }
        }
        return r
      })

      const start = (page - 1) * pageSize
      const filtered =
        selectedType === "All"
          ? updatedRequests
          : updatedRequests.filter((r) => r.requestType.toLowerCase() === selectedType.toLowerCase())
      setFilteredRequests(filtered.slice(start, start + pageSize))

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: req.orphanageId,
        requestId: req.id,
        donationType: req.requestType,
        description: donationNote || "",
        confirmed: false,
        timestamp: serverTimestamp(),
      }

      // Handle multiple subtypes or single donation
      if (hasSubtypes && selectedSubtypes.length > 0) {
        donationData.subtypes = selectedSubtypes.map((item) => ({
          subtype: item.subtype,
          quantity: Number(item.quantity),
        }))
        donationData.donatedAmount = selectedSubtypes.reduce((sum, item) => sum + Number(item.quantity), 0)
      } else {
        donationData.amount = req.requestType === "Money" ? Number(donationAmount) : null
        donationData.numClothes = req.requestType === "Clothes" ? Number(donationAmount) : null
        donationData.numMeals = req.requestType === "Food" ? Number(donationAmount) : null
        donationData.donatedAmount = Number(donationAmount)
      }

      const donationRef = await addDoc(collection(firestore, "donations"), donationData)
      await updateDoc(doc(firestore, "requests", req.id), {
        donations: arrayUnion(donationRef.id),
      })

      setActiveModalId(null)
      setDonationNote("")
      setDonationAmount("")
      setSelectedSubtypes([])
      alert("Donation submitted for review.")
    } catch (err) {
      console.error("Donation error:", err.message)
      setError("Donation failed: " + err.message)
    }
  }

  const handlePaymentSuccess = async (paymentData) => {
    try {
      if (!currentRequest) return

      const updateField = {
        totalDonated: (currentRequest.totalDonated || 0) + paymentAmount,
      }

      await updateDoc(doc(firestore, "requests", currentRequest.id), updateField)

      const updatedRequests = cityFilteredRequests.map((r) => {
        if (r.id === currentRequest.id) {
          return {
            ...r,
            totalDonated: (r.totalDonated || 0) + paymentAmount,
          }
        }
        return r
      })

      const start = (page - 1) * pageSize
      const filtered =
        selectedType === "All"
          ? updatedRequests
          : updatedRequests.filter((r) => r.requestType.toLowerCase() === selectedType.toLowerCase())
      setFilteredRequests(filtered.slice(start, start + pageSize))

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: currentRequest.orphanageId,
        requestId: currentRequest.id,
        donationType: "Money",
        amount: paymentAmount,
        donatedAmount: paymentAmount,
        description: donationNote || "Payment completed successfully",
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

      setShowPaymentModal(false)
      setCurrentRequest(null)
      setPaymentAmount(0)
      setDonationNote("")
      setDonationAmount("")

      alert("Payment successful! Your donation has been confirmed.")
    } catch (err) {
      console.error("Payment success handler error:", err.message)
      alert("Payment was successful but there was an error recording the donation. Please contact support.")
    }
  }

  const totalPages = Math.ceil(
    (selectedType === "All"
      ? cityFilteredRequests.length
      : cityFilteredRequests.filter((r) => r.requestType.toLowerCase() === selectedType.toLowerCase()).length) /
      pageSize,
  )

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Enhanced Location Prompt */}
      {showLocationPrompt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Location Access</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{getLocationPromptMessage()}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleRetryLocation}
                  disabled={isRetrying}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? "Requesting..." : locationStatus === "denied" ? "Allow Location" : "Try Again"}
                </button>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
                >
                  Continue Without Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Location:</span>
              <span className="text-sm text-green-600 font-medium">{getLocationDisplayText()}</span>
            </div>

            {availableCities.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by City:</label>
                <select
                  value={userCityFilter}
                  onChange={(e) => setUserCityFilter(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Cities</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                setPage(1)
              }}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="All">All Types</option>
              <option value="Money">Money</option>
              <option value="Clothes">Clothes</option>
              <option value="Food">Food</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{cityFilteredRequests.length}</div>
            <div className="text-xs text-gray-500">Total Requests</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">
              {cityFilteredRequests.filter((r) => r.status === "Pending").length}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {cityFilteredRequests.filter((r) => r.status === "Fulfilled").length}
            </div>
            <div className="text-xs text-gray-500">Fulfilled</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {
                (selectedType === "All"
                  ? cityFilteredRequests
                  : cityFilteredRequests.filter((r) => r.requestType.toLowerCase() === selectedType.toLowerCase())
                ).length
              }
            </div>
            <div className="text-xs text-gray-500">Filtered</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No requests found</div>
          <div className="text-gray-400 text-sm">
            {effectiveCity
              ? `No donation requests available in ${effectiveCity} for ${selectedType === "All" ? "any type" : selectedType.toLowerCase()}`
              : `No ${selectedType === "All" ? "" : selectedType.toLowerCase() + " "}donation requests available`}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 flex-1 pr-2">
                      {req.title || req.requestType}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-white text-xs flex-shrink-0 ${
                        req.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mb-3 line-clamp-3">{req.description}</div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium text-green-600">{req.requestType}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-medium">{req.orphanInfo?.city || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Donated:</span>
                      <span className="font-medium">
                        {req.totalDonated || 0} {req.quantity ? `of ${req.quantity} ` : ""}
                        {req.requestType === "Food" ? "KG" : req.requestType === "Clothes" ? "piece" : "amount"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openRequestDetailsPopup(req)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleDonateClick(req)}
                      disabled={req.status === "Fulfilled"}
                      className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                        req.status === "Fulfilled"
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      Donate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-2 rounded text-sm ${
                    page === i + 1 ? "bg-green-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Request Details Popup */}
      <RequestDetailsPopup
        isOpen={requestDetailsPopup.isOpen}
        onClose={closeRequestDetailsPopup}
        request={requestDetailsPopup.request}
        onDonate={handleDonateClick}
      />

      {/* Enhanced Donation Modal */}
      {activeModalId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {(() => {
              const req = cityFilteredRequests.find((r) => r.id === activeModalId)
              if (!req) return null

              const hasSubtypes = req.subtypes && req.subtypes.length > 0

              return (
                <>
                  {/* Modal Header - Fixed */}
                  <div className="p-6 border-b border-gray-100 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">Make a Donation</h3>
                      <button
                        onClick={() => setActiveModalId(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Error messages at top */}
                    {error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Modal Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">{req.title || req.requestType}</h4>
                      <p className="text-sm text-gray-600 mb-2">{req.description}</p>
                      <div className="text-sm text-gray-500">
                        <p>Type: {req.requestType}</p>
                        <p>
                          Donated: {req.totalDonated || 0} {req.quantity ? `of ${req.quantity} ` : ""}
                          {req.requestType === "Food" ? "KG" : req.requestType === "Clothes" ? "piece" : "amount"}
                        </p>
                      </div>
                    </div>

                    {/* Multiple Subtypes Selection for multi-subtype requests */}
                    {hasSubtypes && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block font-semibold text-sm">
                            Select Items to Donate <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={addSubtypeSelection}
                            disabled={selectedSubtypes.length >= 3}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1 ${
                              selectedSubtypes.length >= 3
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Item</span>
                          </button>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {selectedSubtypes.map((subtypeItem, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <select
                                  value={subtypeItem.subtype}
                                  onChange={(e) => updateSubtypeSelection(index, "subtype", e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Select item type</option>
                                  {getSubtypeOptions(req.requestType).map((subtype, idx) => {
                                    const requestSubtype = req.subtypes.find((item) => item.subtype === subtype.value)
                                    if (!requestSubtype) return null

                                    const subtypeDonated = req.subtypeDonations?.[subtype.value] || 0
                                    const subtypeRemaining = requestSubtype.quantity - subtypeDonated
                                    const alreadySelectedElsewhere = selectedSubtypes.some(
                                      (selected, selectedIndex) =>
                                        selectedIndex !== index && selected.subtype === subtype.value,
                                    )

                                    return subtypeRemaining > 0 && !alreadySelectedElsewhere ? (
                                      <option key={idx} value={subtype.value}>
                                        {subtype.icon} {subtype.label} ({subtypeRemaining} available)
                                      </option>
                                    ) : null
                                  })}
                                </select>
                              </div>
                              <div className="w-24">
                                <input
                                  type="number"
                                  value={subtypeItem.quantity}
                                  onChange={(e) => updateSubtypeSelection(index, "quantity", e.target.value)}
                                  placeholder="Qty"
                                  min="1"
                                  max={(() => {
                                    if (subtypeItem.subtype) {
                                      const requestSubtype = req.subtypes.find(
                                        (item) => item.subtype === subtypeItem.subtype,
                                      )
                                      if (requestSubtype) {
                                        const donated = req.subtypeDonations?.[subtypeItem.subtype] || 0
                                        return requestSubtype.quantity - donated
                                      }
                                    }
                                    return 999
                                  })()}
                                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  required
                                />
                              </div>
                              {selectedSubtypes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSubtypeSelection(index)}
                                  className="text-red-500 hover:text-red-700 p-1 transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Single Amount Input for Money and single-type requests */}
                    {!hasSubtypes && (
                      <div className="mb-4">
                        <label className="block font-semibold text-sm mb-1">
                          {req.requestType === "Money"
                            ? "Donation Amount (Rs.)"
                            : req.requestType === "Clothes"
                              ? "Clothes Quantity (piece)"
                              : "Food Quantity (KG)"}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(e.target.value)}
                          placeholder={`Max: ${(req.quantity || 0) - (req.totalDonated || 0)}`}
                          className="w-full border border-gray-300 rounded p-2"
                          required
                          min={1}
                          max={(req.quantity || 0) - (req.totalDonated || 0)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum you can donate: {(req.quantity || 0) - (req.totalDonated || 0)}{" "}
                          {REQUEST_TYPES.find((t) => t.value === req.requestType)?.unit || ""}
                        </p>
                      </div>
                    )}

                    <textarea
                      value={donationNote}
                      onChange={(e) => setDonationNote(e.target.value)}
                      placeholder="Write something about your donation..."
                      rows={4}
                      className="w-full border border-gray-300 rounded p-2"
                    />
                  </div>

                  {/* Modal Footer - Fixed */}
                  <div className="p-6 border-t border-gray-100 rounded-b-2xl">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setActiveModalId(null)}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDonationSubmit(req)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        {req.requestType === "Money" ? "Proceed to Payment" : "Submit Donation"}
                      </button>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
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
  )
}
