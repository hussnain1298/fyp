"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  where,
  updateDoc,
  doc,
} from "firebase/firestore"
import { motion } from "framer-motion"
import {
  FaCog,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaClipboardList,
  FaStickyNote,
  FaCalendarAlt,
} from "react-icons/fa"

const PAGE_SIZE = 5

export default function ServiceConfirmations() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [processingIds, setProcessingIds] = useState(new Set())

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const serviceQuery = query(
        collection(firestore, "services"),
        where("orphanageId", "==", user.uid),
        where("status", "==", "In Progress")
      )

      const serviceSnap = await getDocs(serviceQuery)
      const serviceList = serviceSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setServices(serviceList)
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const renderStatusBadge = (status) => {
    const lower = (status || "").toLowerCase()
    let bgClass = "bg-gray-400 text-white"
    let icon = null

    if (["pending", "in progress"].includes(lower)) {
      bgClass = "bg-yellow-400 text-yellow-900"
      icon = <FaSpinner className="animate-spin mr-1" />
    } else if (["fulfilled", "completed"].includes(lower)) {
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

  const paginatedServices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return services.slice(start, start + PAGE_SIZE)
  }, [services, page])

  const totalPages = Math.ceil(services.length / PAGE_SIZE)

  const handleApproveService = async (serviceId) => {
    if (processingIds.has(serviceId)) return
    setProcessingIds((prev) => new Set(prev).add(serviceId))

    try {
      await updateDoc(doc(firestore, "services", serviceId), {
        status: "Fulfilled",
        completedAt: new Date().toISOString(),
      })

      setServices((prev) =>
        prev.map((svc) =>
          svc.id === serviceId ? { ...svc, status: "Fulfilled", completedAt: new Date().toISOString() } : svc
        )
      )
    } catch (err) {
      console.error("Failed to approve service", err)
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(serviceId)
        return newSet
      })
    }
  }

  const handleRejectService = async (serviceId) => {
    if (processingIds.has(serviceId)) return
    setProcessingIds((prev) => new Set(prev).add(serviceId))

    try {
      await updateDoc(doc(firestore, "services", serviceId), {
        status: "Pending",
        rejectedAt: new Date().toISOString(),
      })

      setServices((prev) =>
        prev.map((svc) =>
          svc.id === serviceId ? { ...svc, status: "Pending", rejectedAt: new Date().toISOString() } : svc
        )
      )
    } catch (err) {
      console.error("Failed to reject service", err)
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(serviceId)
        return newSet
      })
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "N/A"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mr-3"></div>
        <span className="text-gray-600">Loading services...</span>
      </div>
    )
  }

  return (
    <section className="mb-10">
      <div className="flex items-center mb-6">
        <FaCog className="text-2xl text-gray-600 mr-3" />
        <h3 className="text-2xl font-semibold text-gray-900">Service Requests</h3>
        <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
          {services.length} items
        </span>
      </div>

      {paginatedServices.length === 0 ? (
        <div className="text-center py-12">
          <FaCog className="text-4xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No in-progress services found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedServices.map((service, index) => {
            const isProcessing = processingIds.has(service.id)

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        <FaClipboardList className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-lg mb-2">
                          {service.title || "Untitled Service"}
                        </h4>

                        <div className="space-y-2 text-sm text-gray-600">
                          {service.description && (
                            <p className="flex items-start">
                              <FaStickyNote className="mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Description:</strong> {service.description}
                              </span>
                            </p>
                          )}

                          {service.lastFulfillmentNote && (
                            <p className="flex items-start">
                              <FaStickyNote className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Last Note:</strong> {service.lastFulfillmentNote}
                              </span>
                            </p>
                          )}

                          {service.createdAt && (
                            <p className="flex items-center">
                              <FaCalendarAlt className="mr-2 text-gray-400" />
                              <span>
                                <strong>Created:</strong> {formatDate(service.createdAt)}
                              </span>
                            </p>
                          )}

                          {service.completedAt && (
                            <p className="flex items-center">
                              <FaCalendarAlt className="mr-2 text-green-500" />
                              <span>
                                <strong>Completed:</strong> {formatDate(service.completedAt)}
                              </span>
                            </p>
                          )}

                          {service.rejectedAt && (
                            <p className="flex items-center">
                              <FaCalendarAlt className="mr-2 text-red-500" />
                              <span>
                                <strong>Rejected:</strong> {formatDate(service.rejectedAt)}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="mt-3">{renderStatusBadge(service.status)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 lg:flex-col xl:flex-row lg:items-end">
                    <button
                      onClick={() => handleApproveService(service.id)}
                      disabled={isProcessing}
                      className="flex-1 lg:flex-none px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                      Mark Complete
                    </button>
                    <button
                      onClick={() => handleRejectService(service.id)}
                      disabled={isProcessing}
                      className="flex-1 lg:flex-none px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaTimes className="mr-2" />}
                      Reset to Pending
                    </button>
                  </div>
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
