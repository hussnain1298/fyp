"use client"

import { useEffect, useState } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, doc, getDoc, addDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"

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
  const [expandedIds, setExpandedIds] = useState([])
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

  const effectiveCity = userCityFilter.trim()

  const toggleExpand = (id) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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
    setError("")
  }

  const handleDonationSubmit = async (req) => {
    setError("")
    try {
      if (!user) return setError("Login required.")
      if (req.status === "Fulfilled") return setError("Request already fulfilled.")
      if ((req.requestType === "Money" || req.requestType === "Clothes" || req.requestType === "Food") && (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) <= 0)) {
        return setError("Enter a valid amount.")
      }

      const updateField = {
        totalDonated: (req.totalDonated || 0) + Number(donationAmount)
      }

      await updateDoc(doc(firestore, "requests", req.id), updateField)

      const updatedRequests = cityFilteredRequests.map((r) => {
        if (r.id === req.id) {
          return {
            ...r,
            totalDonated: (r.totalDonated || 0) + Number(donationAmount),
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
        amount: req.requestType === "Money" ? Number(donationAmount) : null,
        numClothes: req.requestType === "Clothes" ? Number(donationAmount) : null,
        numMeals: req.requestType === "Food" ? Number(donationAmount) : null,
        foodDescription: req.requestType === "Food" ? req.description : null,
        description: donationNote || "",
        confirmed: false,
        timestamp: serverTimestamp(),
      }

      const donationRef = await addDoc(collection(firestore, "donations"), donationData)
      await updateDoc(doc(firestore, "requests", req.id), {
        donations: arrayUnion(donationRef.id),
      })

      setActiveModalId(null)
      setDonationNote("")
      setDonationAmount("")
      alert("Donation submitted for review.")
    } catch (err) {
      console.error("Donation error:", err.message)
      setError("Donation failed: " + err.message)
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
                  className="text-yellow-800 px-4 py-2 rounded text-sm hover:bg-yellow-100 border border-yellow-300"
                >
                  Continue Without Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and City Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="bg-green-100 text-green-700 font-medium px-4 py-2 rounded shadow">
          📍 Showing requests near <strong>{getLocationDisplayText()}</strong>
          <span className="ml-2 text-xs">({cityFilteredRequests.length} requests)</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={userCityFilter}
            onChange={(e) => setUserCityFilter(e.target.value)}
            placeholder="Search city..."
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            list="cities"
          />
          <datalist id="cities">
            {availableCities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {userCityFilter && (
            <button
              onClick={() => setUserCityFilter("")}
              className="text-gray-500 hover:text-gray-700 px-2 hover:bg-gray-100 rounded"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Available Cities Display */}
      {availableCities.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            {userCityFilter ? "Other available cities:" : "Available cities:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableCities.slice(0, 10).map((city) => (
              <button
                key={city}
                onClick={() => setUserCityFilter(city)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  city.toLowerCase() === effectiveCity.toLowerCase()
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {city}
              </button>
            ))}
            {availableCities.length > 10 && (
              <span className="text-gray-500 text-sm px-2 py-1">+{availableCities.length - 10} more...</span>
            )}
          </div>
        </div>
      )}

      {/* Type Filter */}
      <div className="flex justify-center gap-4 mb-6">
        {["All", "Food", "Money", "Clothes"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setSelectedType(type)
              setPage(1)
            }}
            className={`px-4 py-2 rounded border transition-colors ${
              selectedType === type ? "bg-green-600 text-white" : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">No requests found</p>
          <p className="text-gray-500 text-sm mt-2">
            {userCityFilter
              ? `No requests found for "${userCityFilter}". Try searching for a different city.`
              : `No requests available in your area`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((req) => {
            const isFood = req.requestType === "Food"
            return (
              <div
                key={req.id}
                className="p-5 border rounded-lg shadow bg-white flex flex-col justify-between h-full hover:shadow-lg transition-shadow"
              >
                {/* Top Content */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">{req.title || req.requestType}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded text-white text-xs ${
                        req.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-gray-600 mb-2 text-sm">
                    {req.description.length > 100 ? (
                      <>
                        {expandedIds.includes(req.id) ? req.description : `${req.description.slice(0, 100)}... `}
                        <button
                          onClick={() => toggleExpand(req.id)}
                          className="text-green-600 font-medium hover:underline ml-1"
                        >
                          {expandedIds.includes(req.id) ? "Show Less" : "Read More"}
                        </button>
                      </>
                    ) : (
                      req.description
                    )}
                  </div>
                </div>

                {/* Fixed Button Placement */}
 <div className="mt-auto">
{req.totalDonated != null && (
  <p className="text-sm text-gray-600 mb-2">
    Donated: {(req.totalDonated || 0)}{" "}
    {req.quantity ? `of ${req.quantity} ` : ""}
    {req.requestType === "Food"
      ? "meals"
      : req.requestType === "Clothes"
      ? "items"
      : "amount"}
  </p>
)}



                  <div className="mt-2 mb-4 text-sm text-gray-500 space-y-1">
                    <p>Orphanage: {req.orphanInfo?.orgName || "N/A"}</p>
                    <p>Location: {req.orphanInfo?.city || "N/A"}</p>
                  </div>
                  <button
                    onClick={() => handleDonateClick(req)}
                    disabled={req.status === "Fulfilled"}
                    className={`w-full py-2 px-6 rounded text-white transition-colors ${
                      req.status === "Fulfilled" ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    Donate
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded transition-colors ${
                page === i + 1 ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Donation Modal */}
      {activeModalId &&
        (() => {
          const req = filteredRequests.find((r) => r.id === activeModalId)
          if (!req) return null
          const isMoney = req.requestType === "Money"
          const isClothes = req.requestType === "Clothes"
          const isFood = req.requestType === "Food";

          return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Add Donation Note</h3>
                <textarea
                  value={donationNote}
                  onChange={(e) => setDonationNote(e.target.value)}
                  placeholder="Write something about your donation..."
                  rows={4}
                  className="w-full border border-gray-300 rounded p-2"
                />
            {(isMoney || isClothes || isFood) && (
  <div className="mt-4">
    <label className="block font-semibold text-sm mb-1">
      {isMoney
        ? "Donation Amount"
        : isClothes
        ? "Clothes Quantity"
        : "Number of Meals"}
    </label>
    <input
      type="number"
      value={donationAmount}
      onChange={(e) => setDonationAmount(e.target.value)}
      placeholder={
        isMoney
          ? "Enter donation amount"
          : isClothes
          ? "Enter clothes quantity"
          : "Enter number of meals"
      }
      className="w-full border border-gray-300 rounded p-2"
      required
      min={1}
    />
  </div>
)}
                {error && <p className="text-red-600 mt-2">{error}</p>}
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setActiveModalId(null)} className="px-4 py-2 border rounded hover:bg-gray-100">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDonationSubmit(req)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}
