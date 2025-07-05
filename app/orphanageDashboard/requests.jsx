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
import "react-toastify/dist/ReactToastify.css"

const PAGE_SIZE = 6

const REQUEST_TYPES = [
  { value: "Money", label: "Money", icon: "💰" },
  { value: "Clothes", label: "Clothes", icon: "👕" },
  { value: "Food", label: "Food", icon: "🍽️" },
  { value: "Other", label: "Other", icon: "📦" },
]

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Fulfilled: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
}

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
    if (!user) return
    setLoading(true)

    try {
      const q = query(collection(firestore, "requests"), where("orphanageId", "==", user.uid))
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
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

    if (form.quantity && (isNaN(form.quantity) || Number(form.quantity) <= 0)) {
      errors.push("Quantity must be a positive number")
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
    if (!user) return

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

  return (
    <div className="p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">Requests</h1>
            <p className="text-gray-600">Manage your donation requests</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors shadow-lg"
          >
            <FaPlus />
            <span>New Request</span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
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
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
            <div className="text-sm text-blue-600">Total Requests</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter((r) => (r.status || "Pending") === "Pending").length}
            </div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter((r) => r.status === "Fulfilled").length}
            </div>
            <div className="text-sm text-green-600">Fulfilled</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{filteredRequests.length}</div>
            <div className="text-sm text-purple-600">Filtered</div>
          </div>
        </div>
      </motion.div>

      {/* Requests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-xl p-6">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : paginatedRequests.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No requests found</h3>
          <p className="text-gray-500 mb-6">
            {filterType !== "All" || filterStatus !== "All"
              ? "Try adjusting your filters"
              : "Create your first request to get started"}
          </p>
          <button
            onClick={() => openModal()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Create Request
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {paginatedRequests.map((request, index) => {
            const requestType = REQUEST_TYPES.find((t) => t.value === request.requestType)
            const status = request.status || "Pending"

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{requestType?.icon || "📦"}</span>
                    <h3 className="font-bold text-lg text-gray-800 truncate">{request.title}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                    {status}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-3">{request.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium">{request.requestType}</span>
                  </div>
                  {request.quantity && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium">{request.quantity}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal(request)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(request.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-8">
          <div className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  page === i + 1 ? "bg-green-600 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editMode ? "Edit Request" : "Create New Request"}
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="Enter request title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    rows={4}
                    placeholder="Describe what you need and why"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Request Type *</label>
                  <select
                    value={form.requestType}
                    onChange={(e) => setForm({ ...form, requestType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Select type</option>
                    {REQUEST_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity (Optional)</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="Enter quantity if applicable"
                    min="1"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? "Saving..." : editMode ? "Update Request" : "Create Request"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
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
  )
}
