"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import { collection, query, getDocs, where, updateDoc, doc, increment, getDoc } from "firebase/firestore"
import { motion } from "framer-motion"
import { FaDollarSign, FaUser, FaCheck, FaTimes, FaSpinner, FaChartLine, FaStickyNote } from "react-icons/fa"

const PAGE_SIZE = 5

export default function FundraiserConfirmations({ activeStatus, matchesStatus }) {
  const [fundraiserDonations, setFundraiserDonations] = useState([])
  const [fundraisers, setFundraisers] = useState({})
  const [donorNames, setDonorNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [processingIds, setProcessingIds] = useState(new Set())

  const fetchFundraiserDonations = useCallback(async () => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const fundraiserQuery = query(collection(firestore, "fundraisers"), where("orphanageId", "==", user.uid))
      const fundraisersSnap = await getDocs(fundraiserQuery)

      const fDonations = []
      const fundraiserMap = {}
      const donorIds = new Set()

      for (const f of fundraisersSnap.docs) {
        const fundraiserData = f.data()
        fundraiserMap[f.id] = fundraiserData

        const fDonSnap = await getDocs(collection(firestore, `fundraisers/${f.id}/donations`))
        fDonSnap.forEach((d) => {
          const donation = d.data()
          if (matchesStatus(donation.status)) {
            fDonations.push({
              ...donation,
              fundraiserId: f.id,
              donationId: d.id,
              from: "fundraiser",
              fundraiserTitle: fundraiserData.title || "Untitled Fundraiser",
            })
            if (donation.donorId) {
              donorIds.add(donation.donorId)
            }
          }
        })
      }

      setFundraisers(fundraiserMap)
      setFundraiserDonations(fDonations)

      // Fetch donor names
      const donorNameMap = {}
      await Promise.all(
        Array.from(donorIds).map(async (donorId) => {
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
      console.error("Error fetching fundraiser donations:", error)
    } finally {
      setLoading(false)
    }
  }, [matchesStatus])

  useEffect(() => {
    fetchFundraiserDonations()
  }, [fetchFundraiserDonations])

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

  const paginatedDonations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return fundraiserDonations.slice(start, start + PAGE_SIZE)
  }, [fundraiserDonations, page])

  const totalPages = Math.ceil(fundraiserDonations.length / PAGE_SIZE)

  const handleConfirmDonation = async (donation) => {
    const user = auth.currentUser
    if (!user || processingIds.has(donation.donationId)) return

    setProcessingIds((prev) => new Set(prev).add(donation.donationId))

    try {
      await updateDoc(doc(firestore, `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`), {
        status: "approved",
      })

      await updateDoc(doc(firestore, "fundraisers", donation.fundraiserId), {
        raisedAmount: increment(Number(donation.amount || 0)),
      })

      setFundraiserDonations((prev) =>
        prev.map((d) => (d.donationId === donation.donationId ? { ...d, status: "approved" } : d)),
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
      await updateDoc(doc(firestore, `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`), {
        status: "rejected",
      })

      setFundraiserDonations((prev) =>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mr-3"></div>
        <span className="text-gray-600">Loading fundraisers...</span>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center mb-6">
        <FaChartLine className="text-2xl text-gray-600 mr-3" />
        <h3 className="text-2xl font-semibold text-gray-900">Fundraiser Donations</h3>
        <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
          {fundraiserDonations.length} items
        </span>
      </div>

      {paginatedDonations.length === 0 ? (
        <div className="text-center py-12">
          <FaChartLine className="text-4xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No fundraiser donations found for the selected status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedDonations.map((donation, index) => {
            const isProcessing = processingIds.has(donation.donationId)
            const fundraiser = fundraisers[donation.fundraiserId]

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
                      <div className="text-2xl">
                        <FaDollarSign className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">{donation.fundraiserTitle}</h4>

                        {/* Fundraiser Progress */}
                        {fundraiser && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>
                                Rs. {(fundraiser.raisedAmount || 0).toLocaleString()} / Rs.{" "}
                                {(fundraiser.targetAmount || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, ((fundraiser.raisedAmount || 0) / (fundraiser.targetAmount || 1)) * 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <p className="flex items-center">
                            <FaUser className="mr-2 text-gray-400" />
                            <strong>Donor:</strong> {donorNames[donation.donorId] || "Anonymous Donor"}
                          </p>
                          {donation.amount && (
                            <p className="flex items-center">
                              <FaDollarSign className="mr-2 text-green-500" />
                              <strong>Amount:</strong> Rs. {Number(donation.amount).toLocaleString()}
                            </p>
                          )}
                          {donation.description && (
                            <p className="sm:col-span-2 flex items-start">
                              <FaStickyNote className="mr-2 text-blue-500 mt-0.5" />
                              <span>
                                <strong>Note:</strong> {donation.description}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="mt-3">{renderStatusBadge(donation.status)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {donation.status?.toLowerCase() === "pending" && (
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
