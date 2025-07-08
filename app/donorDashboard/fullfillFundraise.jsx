"use client"

import { useState, useEffect } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, query, getDocs, doc, addDoc, updateDoc, serverTimestamp, where } from "firebase/firestore"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Target, MapPin, Building, TrendingUp, X, Loader2 } from "lucide-react"

// Read More/Less Component
const ReadMoreText = ({ text, maxLength = 50 }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text || text.length <= maxLength) {
    return <span>{text}</span>
  }

  return (
    <span>
      {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
      >
        {isExpanded ? "Read Less" : "Read More"}
      </button>
    </span>
  )
}

// Loading skeleton component
const FundraiserSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[420px]">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-green-100 rounded w-1/2"></div>
      <div className="h-4 bg-green-100 rounded w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
    <div className="h-3 bg-gray-100 rounded w-full mb-4"></div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="h-10 bg-green-100 rounded-xl w-full mt-auto"></div>
  </div>
)

export default function FulfillFundRaise() {
  const [fundraisers, setFundraisers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeModalId, setActiveModalId] = useState(null)
  const [donationAmount, setDonationAmount] = useState("")
  const [amountError, setAmountError] = useState("")
  const [donating, setDonating] = useState(false)
  const user = auth.currentUser

  useEffect(() => {
    const fetchFundraisers = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(query(collection(firestore, "fundraisers")))
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((f) => f.status === "Pending")

        const orphanageIds = [...new Set(list.map((f) => f.orphanageId).filter(Boolean))]
        const orphanageMap = {}

        if (orphanageIds.length > 0) {
          const batches = []
          while (orphanageIds.length) {
            batches.push(orphanageIds.splice(0, 10))
          }

          for (const batch of batches) {
            const orphanSnap = await getDocs(query(collection(firestore, "users"), where("__name__", "in", batch)))
            orphanSnap.forEach((doc) => {
              orphanageMap[doc.id] = doc.data()
            })
          }
        }

        const enriched = list.map((f) => ({
          ...f,
          orphanageName: orphanageMap[f.orphanageId]?.orgName || "N/A",
          orphanageLocation: orphanageMap[f.orphanageId]?.city || "N/A",
          progress: f.totalAmount > 0 ? Math.min(((f.raisedAmount || 0) / f.totalAmount) * 100, 100) : 0,
        }))

        setFundraisers(enriched)
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message)
        toast.error("Failed to load fundraisers")
      } finally {
        setLoading(false)
      }
    }

    fetchFundraisers()
  }, [])

  const closeModal = () => {
    setActiveModalId(null)
    setDonationAmount("")
    setAmountError("")
  }

  const handleDonate = async (fundraiserId) => {
    if (!user) {
      toast.error("Please log in as donor to donate.")
      return
    }

    const trimmed = donationAmount.trim()
    const amountNum = Number(trimmed)

    if (!trimmed || isNaN(amountNum)) {
      setAmountError("Please enter a valid numeric amount.")
      return
    }

    if (amountNum <= 0 || /^0\d+/.test(trimmed)) {
      setAmountError("Amount must be greater than zero, no leading zeros.")
      return
    }

    if (amountNum > 1000000) {
      setAmountError("Amount must be ≤ 1,000,000.")
      return
    }

    setAmountError("")
    setDonating(true)

    try {
      // Add donation record
      await addDoc(collection(firestore, "fundraisers", fundraiserId, "donations"), {
        donorId: user.uid,
        amount: amountNum,
        status: "pending",
        timestamp: serverTimestamp(),
      })

      // Get fundraiser doc
      const fundraiserRef = doc(firestore, "fundraisers", fundraiserId)
      const fundraiserSnap = await getDocs(
        query(collection(firestore, "fundraisers"), where("__name__", "==", fundraiserId)),
      )
      const fundraiserDoc = fundraiserSnap.docs[0]
      const current = fundraiserDoc?.data()

      const updatedRaised = (current?.raisedAmount || 0) + amountNum
      const isFulfilled = updatedRaised >= (current?.totalAmount || Number.POSITIVE_INFINITY)

      if (isFulfilled) {
        await updateDoc(fundraiserRef, {
          status: "Fulfilled",
          raisedAmount: updatedRaised,
        })
      } else {
        await updateDoc(fundraiserRef, {
          raisedAmount: updatedRaised,
        })
      }

      toast.success("Thank you! Your donation is awaiting orphanage confirmation.")
      closeModal()

      // Refresh the fundraisers list
      window.location.reload()
    } catch (err) {
      console.error("Donation failed:", err)
      setAmountError("Donation failed: " + err.message)
      toast.error("Donation failed")
    } finally {
      setDonating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Fundraisers...</h2>
            <p className="text-gray-600">Finding opportunities to make a difference</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <FundraiserSkeleton key={i} />
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
            <Target className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Support Fundraising Campaigns</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Help orphanages reach their fundraising goals and make a lasting impact on children's lives
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center">
            <X className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {/* Fundraisers Grid */}
        {fundraisers.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <Target className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">No active fundraisers</h3>
            <p className="text-gray-500 text-lg">Check back later for new fundraising opportunities</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {fundraisers.map((fundraiser) => (
              <div
                key={fundraiser.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[420px] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                      {fundraiser.title}
                    </h3>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>

                {/* Description */}
                <div className="text-gray-600 mb-4 leading-relaxed flex-1">
                  <ReadMoreText text={fundraiser.description} maxLength={50} />
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className="font-bold text-green-600">{fundraiser.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${fundraiser.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="space-y-3 mb-4 p-4 bg-green-50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Raised:</span>
                    <span className="font-bold text-green-700">
                      Rs. {(fundraiser.raisedAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Goal:</span>
                    <span className="font-bold text-gray-800">Rs. {fundraiser.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Remaining:</span>
                    <span className="font-bold text-orange-600">
                      Rs. {Math.max(0, fundraiser.totalAmount - (fundraiser.raisedAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Orphanage Details */}
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center text-gray-600 text-sm">
                    <Building className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-semibold">{fundraiser.orphanageName}</span>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-green-600" />
                    <span>{fundraiser.orphanageLocation}</span>
                  </div>
                </div>

                {/* Donate Button */}
                <button
                  onClick={() => setActiveModalId(fundraiser.id)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-300 mt-auto"
                >
                  Donate Now
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Donation Modal */}
        {activeModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Support this Fundraiser</h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Donation Input */}
              <div className="mb-6">
                <label htmlFor="donationAmount" className="block text-gray-700 text-sm font-bold mb-2">
                  Enter Amount (Rs.)
                </label>
                <input
                  type="number"
                  id="donationAmount"
                  placeholder="100"
                  min="1"
                  max="1000000"
                  value={donationAmount}
                  onChange={(e) => {
                    const input = e.target.value
                    if (/^\d*$/.test(input)) {
                      setDonationAmount(input)
                      setAmountError("")
                    }
                  }}
                  className="shadow appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {amountError && <p className="text-red-500 text-sm mt-2">{amountError}</p>}
              </div>

              {/* Donate Button */}
              <button
                onClick={() => handleDonate(activeModalId)}
                disabled={donating}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {donating ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Donate Now"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
