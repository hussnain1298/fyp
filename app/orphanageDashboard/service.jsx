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
import { FaPlus, FaEdit, FaTrash, FaFilter, FaClock, FaUsers } from "react-icons/fa"
import { GraduationCap, Monitor, MapPin, Calendar, Loader2 } from "lucide-react"
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
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Fulfilled: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
}

const PAGE_SIZE = 9

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
const ServiceSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[420px]">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full"></div>
        <div className="h-4 bg-green-100 rounded w-32"></div>
      </div>
      <div className="h-6 bg-green-100 rounded-full w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
    <div className="space-y-3 mb-4">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="flex space-x-2 mt-auto">
      <div className="h-8 bg-green-100 rounded-lg flex-1"></div>
      <div className="h-8 bg-red-100 rounded-lg flex-1"></div>
    </div>
  </div>
)

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
    if (!user) {
      toast.error("Please log in to view services")
      return
    }
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
    if (!user) {
      toast.error("Please log in to create services")
      return
    }

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

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Services...</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ServiceSkeleton key={i} />
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
            <GraduationCap className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Educational Services</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Post your educational service needs and connect with skilled volunteers
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaPlus />
              <span>New Service</span>
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">{services.length}</div>
              <div className="text-sm text-green-600">Total Services</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">
                {services.filter((s) => (s.status || "Pending") === "Pending").length}
              </div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {services.filter((s) => s.status === "Fulfilled").length}
              </div>
              <div className="text-sm text-green-600">Fulfilled</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">{filteredServices.length}</div>
              <div className="text-sm text-green-600">Filtered</div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {paginatedServices.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <GraduationCap className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">No services found</h3>
            <p className="text-gray-500 text-lg mb-6">
              {filterCategory !== "All" || filterStatus !== "All"
                ? "Try adjusting your filters"
                : "Create your first service to get started"}
            </p>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Create Service
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
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
                  className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[420px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">{category?.icon || "🎓"}</span>
                      </div>
                      <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm font-medium">
                        {service.title}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                      {status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-green-700 transition-colors">
                    {service.title}
                  </h3>

                  <div className="text-gray-600 mb-4 leading-relaxed flex-1">
                    <ReadMoreText text={service.description} maxLength={50} />
                  </div>

                  <div className="space-y-3 mb-6 p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-700">
                        <Calendar className="w-4 h-4 mr-2 text-green-600" />
                        <span className="font-medium">{service.frequency}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        {service.mode === "Online" ? (
                          <Monitor className="w-4 h-4 mr-2 text-green-600" />
                        ) : (
                          <MapPin className="w-4 h-4 mr-2 text-green-600" />
                        )}
                        <span className="font-medium">{service.mode}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-700">
                        <FaClock className="w-4 h-4 mr-2 text-green-600" />
                        <span className="font-medium">{service.duration}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <FaUsers className="w-4 h-4 mr-2 text-green-600" />
                        <span className="font-medium">{service.numberOfStudents} students</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => openModal(service)}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  {editMode ? "Edit Service" : "Create New Service"}
                </h2>

                <form onSubmit={handleSave} className="space-y-6">
                  {formError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Category *</label>
                    <select
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                    <label className="block text-sm font-bold text-gray-700 mb-3">Description *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                      rows={4}
                      placeholder="Describe the service you're requesting"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Frequency</label>
                      <select
                        value={form.frequency}
                        onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      >
                        {FREQUENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Mode</label>
                      <select
                        value={form.mode}
                        onChange={(e) => setForm({ ...form, mode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                      <label className="block text-sm font-bold text-gray-700 mb-3">Duration</label>
                      <select
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      >
                        {DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Number of Students *</label>
                      <input
                        type="number"
                        value={form.numberOfStudents}
                        onChange={(e) => setForm({ ...form, numberOfStudents: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Expected number of students"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                    >
                      {loading ? "Saving..." : editMode ? "Update Service" : "Create Service"}
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
