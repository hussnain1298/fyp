"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { firestore, auth } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { toast, ToastContainer } from "react-toastify"
import { motion } from "framer-motion"
import { FaPlus, FaEdit, FaTrash, FaFilter } from "react-icons/fa"
import { FileText, DollarSign, Shirt, UtensilsCrossed, Package, Loader2 } from "lucide-react"
import "react-toastify/dist/ReactToastify.css"

const PAGE_SIZE = 9

const REQUEST_TYPES = [
  { value: "Money", label: "Money", icon: DollarSign },
  { value: "Clothes", label: "Clothes", icon: Shirt },
  { value: "Food", label: "Food", icon: UtensilsCrossed },
  { value: "Other", label: "Other", icon: Package },
]

const STATUS_COLORS = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
 
  Fulfilled: "bg-green-50 text-green-700 border-green-200",

}

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
const RequestSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[420px]">
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
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="flex space-x-2 mt-auto">
      <div className="h-8 bg-green-100 rounded-lg flex-1"></div>
      <div className="h-8 bg-red-100 rounded-lg flex-1"></div>
    </div>
  </div>
)

export default function RequestsDashboard() {
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState({
    title: "",
    description: "",
    requestType: "",
    quantity: "",
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")

const fetchRequests = useCallback(async () => {
  const user = auth.currentUser
  if (!user) {
    toast.error("Please log in to view requests")
    return
  }
  setLoading(true)

  try {
    const q = query(collection(firestore, "requests"), where("orphanageId", "==", user.uid))
    const snapshot = await getDocs(q)
    const list = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const request = { id: docSnap.id, ...docSnap.data() }

        // Fetch related donations
        const donationQuery = query(
          collection(firestore, "donations"),
          where("requestId", "==", request.id),
          where("confirmed", "==", true)
        )
        const donationSnap = await getDocs(donationQuery)

        let donated = 0
        donationSnap.forEach((don) => {
          const data = don.data()
          if (request.requestType === "Money") donated += Number(data.amount || 0)
          if (request.requestType === "Clothes") donated += Number(data.numClothes || 0)
          if (request.requestType === "Food") donated += Number(data.numMeals || 0)
        })

        return {
          ...request,
          donatedAmount: donated,
          progress: request.quantity ? Math.min((donated / request.quantity) * 100, 100) : 0,
        }
      })
    )

    setRequests(list)
  } catch (err) {
    toast.error("Failed to load requests: " + err.message)
  } finally {
    setLoading(false)
  }
}, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

 const validateForm = useCallback(() => {
  const errors = []

  if (!form.title?.trim()) {
    errors.push("Title is required")
  }

  if (!form.description?.trim()) {
    errors.push("Description is required")
  }

  if (!form.requestType) {
    errors.push("Request type is required")
  }

  // ✅ Enforce quantity for all types
  if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) <= 0) {
    errors.push("Quantity is required and must be a positive number")
  }

  return errors
}, [form])


  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const typeMatch = filterType === "All" || request.requestType === filterType
      const statusMatch = filterStatus === "All" || (request.status || "Pending") === filterStatus
      return typeMatch && statusMatch
    })
  }, [requests, filterType, filterStatus])

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE)
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError("")

    const errors = validateForm()
    if (errors.length > 0) {
      setFormError(errors.join(", "))
      return
    }

    const user = auth.currentUser
    if (!user) {
      toast.error("Please log in to create requests")
      return
    }

    const isEdit = !!form.id
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      requestType: form.requestType,
      quantity: form.quantity ? Number(form.quantity) : null,
      orphanageId: user.uid,
      orphanageEmail: user.email,
      status: form.status || "Pending",
      timestamp: serverTimestamp(),
    }

    try {
      setLoading(true)
      if (isEdit) {
        const ref = doc(firestore, "requests", form.id)
        await updateDoc(ref, payload)
        setRequests((prev) => prev.map((r) => (r.id === form.id ? { ...r, ...payload } : r)))
        toast.success("Request updated successfully")
      } else {
        const ref = await addDoc(collection(firestore, "requests"), payload)
        setRequests((prev) => [...prev, { id: ref.id, ...payload }])
        toast.success("Request posted successfully")
      }
      setModalOpen(false)
      setForm({ title: "", description: "", requestType: "", quantity: "" })
    } catch (err) {
      setFormError(err.message)
      toast.error("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this request?")) return

    try {
      await deleteDoc(doc(firestore, "requests", id))
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast.success("Request deleted successfully")
    } catch (err) {
      toast.error("Failed to delete request")
    }
  }

  const openModal = (request = null) => {
    if (request) {
      setForm(request)
      setEditMode(true)
    } else {
      setForm({ title: "", description: "", requestType: "", quantity: "" })
      setEditMode(false)
    }
    setFormError("")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm({ title: "", description: "", requestType: "", quantity: "" })
    setFormError("")
  }

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Requests...</h2>
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
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <FileText className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Donation Requests</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create and manage your donation requests to get the support you need
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="All">All Types</option>
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
             
                <option value="Fulfilled">Fulfilled</option>
               
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaPlus />
              <span>New Request</span>
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">{requests.length}</div>
              <div className="text-sm text-green-600">Total Requests</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">
                {requests.filter((r) => (r.status || "Pending") === "Pending").length}
              </div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter((r) => r.status === "Fulfilled").length}
              </div>
              <div className="text-sm text-green-600">Fulfilled</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">{filteredRequests.length}</div>
              <div className="text-sm text-green-600">Filtered</div>
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        {paginatedRequests.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <FileText className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">No requests found</h3>
            <p className="text-gray-500 text-lg mb-6">
              {filterType !== "All" || filterStatus !== "All"
                ? "Try adjusting your filters"
                : "Create your first request to get started"}
            </p>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Create Request
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          >
            {paginatedRequests.map((request, index) => {
              const requestType = REQUEST_TYPES.find((t) => t.value === request.requestType)
              const status = request.status || "Pending"
              const IconComponent = requestType?.icon || Package

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[420px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm font-medium">
                        {request.requestType}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                      {status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-green-700 transition-colors">
                    {request.title}
                  </h3>

                  <div className="text-gray-600 mb-4 leading-relaxed flex-1">
                    <ReadMoreText text={request.description} maxLength={50} />
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Type:</span>
                      <span className="font-semibold text-green-600">{request.requestType}</span>
                    </div>

                   {request.quantity && (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500 font-medium">Donated:</span>
    <span className="font-semibold text-green-600">
      {request.donatedAmount || 0} / {request.quantity}
    </span>
  </div>
)}


             <div className="h-2 w-full bg-gray-100 rounded-full mt-1">
  <div
    className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
    style={{ width: `${request.progress}%` }}
  ></div>
</div>
{typeof request.progress === "number" ? (
  <p className="text-xs text-green-600 font-medium mt-1">
    {request.progress.toFixed(1)}% completed
  </p>
) : (
  <p className="text-xs text-gray-400 font-medium mt-1">No data</p>
)}


                  </div>

                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => openModal(request)}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FaTrash />
                      <span>Delete</span>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
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
          </motion.div>
        )}

        {/* Modal */}
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  {editMode ? "Edit Request" : "Create New Request"}
                </h2>

                <form onSubmit={handleSave} className="space-y-6">
                  {formError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Enter request title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Description *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                      rows={4}
                      placeholder="Describe what you need and why"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Request Type *</label>
                    <select
                      value={form.requestType}
                      onChange={(e) => setForm({ ...form, requestType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select type</option>
                      {REQUEST_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Quantity (Optional)</label>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Enter quantity if applicable"
                      min="1"
                    />
                  </div>

                  <div className="flex space-x-4 pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                    >
                      {loading ? "Saving..." : editMode ? "Update Request" : "Create Request"}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
