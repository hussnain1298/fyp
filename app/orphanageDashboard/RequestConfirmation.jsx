"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import { collection, query, getDocs, where, updateDoc, doc, getDoc } from "firebase/firestore"
import { motion } from "framer-motion"
import { FaUser, FaMoneyBillWave, FaTshirt, FaUtensils, FaCheck, FaTimes, FaSpinner } from "react-icons/fa"

const PAGE_SIZE = 5

export default function RequestConfirmations({ activeStatus, matchesStatus }) {
  const [requests, setRequests] = useState([])
  const [requestDonations, setRequestDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [donorNames, setDonorNames] = useState({})
  const [page, setPage] = useState(1)
  const [processingIds, setProcessingIds] = useState(new Set())

  const fetchRequestsAndDonations = useCallback(async () => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Fetch requests by orphanageId = current user
      const reqSnap = await getDocs(query(collection(firestore, "requests"), where("orphanageId", "==", user.uid)))
      const reqList = reqSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setRequests(reqList)

      // Fetch donations related to orphanage requests
      const dSnap = await getDocs(query(collection(firestore, "donations"), where("orphanageId", "==", user.uid)))
      const allDonations = dSnap.docs.map((doc) => ({
        ...doc.data(),
        donationId: doc.id,
        from: "request",
      }))

      const reqDonations = allDonations.filter((d) => d.requestId)
      const requestMap = Object.fromEntries(reqList.map((r) => [r.id, r]))
      const enrichedDonations = reqDonations.map((d) => ({
        ...d,
        requestTitle: requestMap[d.requestId]?.title || requestMap[d.requestId]?.requestType || "N/A",
      }))
      setRequestDonations(enrichedDonations)

      // Fetch donor names in batch
      const uniqueDonorIds = [...new Set(reqDonations.map((d) => d.donorId))]
      const donorNameMap = {}
      await Promise.all(
        uniqueDonorIds.map(async (donorId) => {
          try {
            const userDoc = await getDoc(doc(firestore, "users", donorId))
            donorNameMap[donorId] = userDoc.exists() && userDoc.data().name ? userDoc.data().name : "Anonymous Donor"
          } catch {
            donorNameMap[donorId] = "Anonymous Donor"
          }
        }),
      )
      setDonorNames(donorNameMap)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequestsAndDonations()
  }, [fetchRequestsAndDonations])

  // Status badge helper
  const renderStatusBadge = (status) => {
    const lower = (status || "").toLowerCase()
    let bgClass = "bg-gray-400 text-white"
    let icon = null

    if (["pending", "pending approval", "in progress"].includes(lower)) {
      bgClass = "bg-yellow-400 text-yellow-900"
      icon = <FaSpinner className="animate-spin mr-1" />
    } else if (["approved", "fulfilled", "confirmed"].includes(lower)) {
      bgClass = "bg-green-600 text-white"
      icon = <FaCheck className="mr-1" />
    } else if (lower === "rejected") {
      bgClass = "bg-red-600 text-white"
      icon = <FaTimes className="mr-1" />
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-xs ${bgClass}`}>
        {icon}
        {status}
      </span>
    )
  }

  const filteredDonations = useMemo(
    () => requestDonations.filter((d) => matchesStatus(d.status || (d.confirmed ? "approved" : "pending"))),
    [requestDonations, matchesStatus],
  )

  const paginatedDonations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredDonations.slice(start, start + PAGE_SIZE)
  }, [filteredDonations, page])

  const totalPages = Math.ceil(filteredDonations.length / PAGE_SIZE)

  const handleConfirmDonation = async (donation) => {
    const user = auth.currentUser
    if (!user || processingIds.has(donation.donationId)) return

    setProcessingIds((prev) => new Set(prev).add(donation.donationId))

    try {
      await updateDoc(doc(firestore, "donations", donation.donationId), {
        confirmed: true,
        status: "approved",
      })

      const requestRef = doc(firestore, "requests", donation.requestId)
      const reqSnap = await getDoc(requestRef)
      const requestData = reqSnap.exists() ? reqSnap.data() : null
      if (!requestData) return

      if (donation.donationType === "Food") {
        const confirmedDonationsSnap = await getDocs(
          query(
            collection(firestore, "donations"),
            where("requestId", "==", donation.requestId),
            where("confirmed", "==", true),
          ),
        )
        let totalMeals = 0
        confirmedDonationsSnap.forEach((d) => {
          totalMeals += Number(d.data().numMeals || 0)
        })
        if (requestData.quantity && totalMeals >= Number(requestData.quantity)) {
          await updateDoc(requestRef, { status: "Fulfilled" })
        }
      } else {
        const confirmedDonationsSnap = await getDocs(
          query(
            collection(firestore, "donations"),
            where("requestId", "==", donation.requestId),
            where("confirmed", "==", true),
          ),
        )
        let totalConfirmed = 0
        confirmedDonationsSnap.forEach((d) => {
          const data = d.data()
          if (donation.donationType === "Money") {
            totalConfirmed += Number(data.amount || 0)
          } else if (donation.donationType === "Clothes") {
            totalConfirmed += Number(data.numClothes || 0)
          }
        })
        if (requestData.quantity && totalConfirmed >= Number(requestData.quantity)) {
          await updateDoc(requestRef, { status: "Fulfilled" })
        }
      }

      setRequestDonations((prev) =>
        prev.map((d) => (d.donationId === donation.donationId ? { ...d, status: "approved", confirmed: true } : d)),
      )
    } catch (err) {
      console.error("Approval error", err)
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(donation.donationId)
        return newSet
      })
    }
  }

  const handleRejectDonation = async (donation) => {
    if (processingIds.has(donation.donationId)) return

    setProcessingIds((prev) => new Set(prev).add(donation.donationId))

    try {
      await updateDoc(doc(firestore, "donations", donation.donationId), {
        confirmed: false,
        status: "rejected",
      })

      setRequestDonations((prev) =>
        prev.map((d) => (d.donationId === donation.donationId ? { ...d, status: "rejected" } : d)),
      )
    } catch (err) {
      console.error("Rejection error", err)
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(donation.donationId)
        return newSet
      })
    }
  }

  const getDonationIcon = (donationType) => {
    switch (donationType) {
      case "Money":
        return <FaMoneyBillWave className="text-green-600" />
      case "Clothes":
        return <FaTshirt className="text-blue-600" />
      case "Food":
        return <FaUtensils className="text-orange-600" />
      default:
        return <FaUser className="text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mr-3"></div>
        <span className="text-gray-600">Loading requests...</span>
      </div>
    )
  }

  return (
    <section className="mb-10">
      <div className="flex items-center mb-6">
        <FaUser className="text-2xl text-gray-600 mr-3" />
        <h3 className="text-2xl font-semibold text-gray-900">Request Donations</h3>
        <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
          {filteredDonations.length} items
        </span>
      </div>

      {paginatedDonations.length === 0 ? (
        <div className="text-center py-12">
          <FaUser className="text-4xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No request donations found for the selected status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedDonations.map((donation, index) => {
            const currentStatus = (donation.status || (donation.confirmed ? "approved" : "pending")).toLowerCase()
            const isProcessing = processingIds.has(donation.donationId)

            return (
              <motion.div
                key={donation.donationId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getDonationIcon(donation.donationType)}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">{donation.requestTitle || "N/A"}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <p className="flex items-center">
                            <FaUser className="mr-2 text-gray-400" />
                            <strong>Donor:</strong> {donorNames[donation.donorId] || donation.donorId}
                          </p>
                          {donation.amount && (
                            <p className="flex items-center">
                              <FaMoneyBillWave className="mr-2 text-green-500" />
                              <strong>Amount:</strong> Rs. {donation.amount.toLocaleString()}
                            </p>
                          )}
                          {donation.numClothes && (
                            <p className="flex items-center">
                              <FaTshirt className="mr-2 text-blue-500" />
                              <strong>Clothes:</strong> {donation.numClothes} items
                            </p>
                          )}
                          {donation.numMeals != null && (
                            <p className="flex items-center">
                              <FaUtensils className="mr-2 text-orange-500" />
                              <strong>Meals:</strong> {donation.numMeals}
                            </p>
                          )}
                          {donation.foodDescription && (
                            <p className="sm:col-span-2">
                              <strong>Food Description:</strong> {donation.foodDescription}
                            </p>
                          )}
                        </div>
                        <div className="mt-3">
                          {renderStatusBadge(donation.status || (donation.confirmed ? "approved" : "pending"))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {currentStatus === "pending" && (
                    <div className="flex gap-3 lg:flex-col xl:flex-row">
                      <button
                        onClick={() => handleConfirmDonation(donation)}
                        disabled={isProcessing}
                        className="flex-1 lg:flex-none px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectDonation(donation)}
                        disabled={isProcessing}
                        className="flex-1 lg:flex-none px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaTimes className="mr-2" />}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  )
}

// Enhanced Pagination component
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i)
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (page + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  return (
    <div className="flex justify-center items-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
      >
        Previous
      </button>

      {getVisiblePages().map((pageNum, index) => (
        <button
          key={index}
          onClick={() => typeof pageNum === "number" && onPageChange(pageNum)}
          disabled={pageNum === "..."}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
            page === pageNum
              ? "bg-gray-600 text-white shadow-lg"
              : pageNum === "..."
                ? "cursor-default text-gray-400"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
          aria-current={page === pageNum ? "page" : undefined}
        >
          {pageNum}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
      >
        Next
      </button>
    </div>
  )
}
