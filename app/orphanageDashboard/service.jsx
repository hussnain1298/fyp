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
import { FaPlus, FaEdit, FaTrash, FaGraduationCap, FaFilter, FaClock, FaUsers } from "react-icons/fa"
import "react-toastify/dist/ReactToastify.css"

const categories = [
  { value: "Academic Skills", label: "Academic Skills", icon: "📚" },
  { value: "Technology & STEM", label: "Technology & STEM", icon: "💻" },
  { value: "Arts & Creativity", label: "Arts & Creativity", icon: "🎨" },
  { value: "Personal Development", label: "Personal Development", icon: "🌱" },
  { value: "Career Training", label: "Career Training", icon: "💼" },
  { value: "Social Learning", label: "Social Learning", icon: "👥" },
]

const FREQUENCY_OPTIONS = [
  { value: "Daily", label: "Daily", icon: "📅" },
  { value: "Weekend", label: "Weekend", icon: "🗓️" },
]

const MODE_OPTIONS = [
  { value: "Online", label: "Online", icon: "💻" },
  { value: "Onsite", label: "On-site", icon: "🏢" },
]

const DURATION_OPTIONS = [
  { value: "One Day", label: "One Day", icon: "⏰" },
  { value: "One Week", label: "One Week", icon: "📅" },
  { value: "One Month", label: "One Month", icon: "🗓️" },
]

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Fulfilled: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
}

const PAGE_SIZE = 6

export default function ServicesDashboard() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState({
    title: "",
    description: "",
    frequency: "Daily",
    mode: "Online",
    duration: "One Day",
    numberOfStudents: "",
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [page, setPage] = useState(1)
  const [filterCategory, setFilterCategory] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")

  const fetchServices = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setLoading(true)

    try {
      const q = query(collection(firestore, "services"), where("orphanageId", "==", user.uid))
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setServices(list)
    } catch (err) {
      toast.error("Failed to load services: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const validateForm = useCallback(() => {
    const errors = []

    if (!form.title?.trim()) {
      errors.push("Category is required")
    }

    if (!form.description?.trim()) {
      errors.push("Description is required")
    }

    if (!form.numberOfStudents || isNaN(form.numberOfStudents) || Number(form.numberOfStudents) <= 0) {
      errors.push("Number of students must be a positive number")
    }

    return errors
  }, [form])

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const categoryMatch = filterCategory === "All" || service.title === filterCategory
      const statusMatch = filterStatus === "All" || (service.status || "Pending") === filterStatus
      return categoryMatch && statusMatch
    })
  }, [services, filterCategory, filterStatus])

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE)
  const paginatedServices = filteredServices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
      title: form.title,
      description: form.description.trim(),
      frequency: form.frequency,
      mode: form.mode,
      duration: form.duration,
      numberOfStudents: Number(form.numberOfStudents),
      orphanageId: user.uid,
      orphanageEmail: user.email,
    }

    try {
      setLoading(true)
      if (isEdit) {
        const ref = doc(firestore, "services", form.id)
        await updateDoc(ref, payload)
        setServices((prev) => prev.map((s) => (s.id === form.id ? { ...s, ...payload } : s)))
        toast.success("Service updated successfully")
      } else {
        const ref = await addDoc(collection(firestore, "services"), {
          ...payload,
          status: "Pending",
          timestamp: serverTimestamp(),
        })
        setServices((prev) => [...prev, { id: ref.id, ...payload, status: "Pending" }])
        toast.success("Service posted successfully")
      }
      setModalOpen(false)
      setForm({
        title: "",
        description: "",
        frequency: "Daily",
        mode: "Online",
        duration: "One Day",
        numberOfStudents: "",
      })
    } catch (err) {
      setFormError(err.message)
      toast.error("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    try {
      await deleteDoc(doc(firestore, "services", id))
      setServices((prev) => prev.filter((s) => s.id !== id))
      toast.success("Service deleted successfully")
    } catch (err) {
      toast.error("Failed to delete service")
    }
  }

  const openModal = (service = null) => {
    if (service) {
      setForm(service)
      setEditMode(true)
    } else {
      setForm({
        title: "",
        description: "",
        frequency: "Daily",
        mode: "Online",
        duration: "One Day",
        numberOfStudents: "",
      })
      setEditMode(false)
    }
    setFormError("")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm({
      title: "",
      description: "",
      frequency: "Daily",
      mode: "Online",
      duration: "One Day",
      numberOfStudents: "",
    })
    setFormError("")
  }

  return (
    <div className="p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-2">
              <FaGraduationCap className="text-3xl text-green-600 mr-3" />
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">Services</h1>
            </div>
            <p className="text-gray-600">Manage educational services for your organization</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors shadow-lg"
          >
            <FaPlus />
            <span>New Service</span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
            >
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
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
            <div className="text-2xl font-bold text-blue-600">{services.length}</div>
            <div className="text-sm text-blue-600">Total Services</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {services.filter((s) => (s.status || "Pending") === "Pending").length}
            </div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {services.filter((s) => s.status === "Fulfilled").length}
            </div>
            <div className="text-sm text-green-600">Fulfilled</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{filteredServices.length}</div>
            <div className="text-sm text-purple-600">Filtered</div>
          </div>
        </div>
      </motion.div>

      {/* Services Grid */}
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
      ) : paginatedServices.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No services found</h3>
          <p className="text-gray-500 mb-6">
            {filterCategory !== "All" || filterStatus !== "All"
              ? "Try adjusting your filters"
              : "Create your first service to get started"}
          </p>
          <button
            onClick={() => openModal()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Create Service
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {paginatedServices.map((service, index) => {
            const category = categories.find((c) => c.value === service.title)
            const status = service.status || "Pending"

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{category?.icon || "🎓"}</span>
                    <h3 className="font-bold text-lg text-gray-800 truncate">{service.title}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                    {status}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-3">{service.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <FaClock className="text-gray-400" />
                      <span className="text-gray-500">Frequency:</span>
                    </div>
                    <span className="font-medium">{service.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">💻</span>
                      <span className="text-gray-500">Mode:</span>
                    </div>
                    <span className="font-medium">{service.mode}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">⏰</span>
                      <span className="text-gray-500">Duration:</span>
                    </div>
                    <span className="font-medium">{service.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <FaUsers className="text-gray-400" />
                      <span className="text-gray-500">Students:</span>
                    </div>
                    <span className="font-medium">{service.numberOfStudents}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal(service)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editMode ? "Edit Service" : "Create New Service"}
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                  <select
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    rows={4}
                    placeholder="Describe the service you're offering"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    >
                      {FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                    <select
                      value={form.mode}
                      onChange={(e) => setForm({ ...form, mode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    >
                      {MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                    <select
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    >
                      {DURATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Students *</label>
                    <input
                      type="number"
                      value={form.numberOfStudents}
                      onChange={(e) => setForm({ ...form, numberOfStudents: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="Expected number of students"
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? "Saving..." : editMode ? "Update Service" : "Create Service"}
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
