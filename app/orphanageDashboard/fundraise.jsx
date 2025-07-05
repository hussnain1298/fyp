"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, query, getDocs, deleteDoc, doc, updateDoc, where, addDoc, getDoc } from "firebase/firestore"
import { toast, ToastContainer } from "react-toastify"
import { motion } from "framer-motion"
import { FaPlus, FaEdit, FaTrash, FaDollarSign, FaChartLine, FaFilter } from "react-icons/fa"
import "react-toastify/dist/ReactToastify.css"

const MAX_DONATION_AMOUNT = 1000000
const PAGE_SIZE = 6

const titleOptions = [
  { value: "Books", label: "Books", icon: "📚" },
  { value: "School Uniforms", label: "School Uniforms", icon: "👕" },
  { value: "Nutrition", label: "Nutrition", icon: "🍎" },
  { value: "Medical Aid", label: "Medical Aid", icon: "🏥" },
  { value: "Other", label: "Other", icon: "📦" },
]

export default function FundRaise() {
  const [fundraisers, setFundraisers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editFundraiser, setEditFundraiser] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    customTitle: "",
    description: "",
    totalAmount: "",
  })
  const [page, setPage] = useState(1)
  const [filterTitle, setFilterTitle] = useState("All")

  const fetchFundraisers = useCallback(async () => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) return

    try {
      const q = query(collection(firestore, "fundraisers"), where("orphanageId", "==", user.uid))
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setFundraisers(list)
      setError("")
    } catch (err) {
      setError(err.message)
      toast.error("Failed to load fundraisers.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFundraisers()
  }, [fetchFundraisers])

  const validateForm = useCallback((formData) => {
    const errors = []

    const finalTitle = formData.title === "Other" ? formData.customTitle?.trim() : formData.title
    const amt = Number(formData.totalAmount)

    if (!finalTitle) {
      errors.push("Title is required")
    }

    if (!formData.description?.trim()) {
      errors.push("Description is required")
    }

    if (isNaN(amt) || amt < 1) {
      errors.push("Amount must be at least Rs. 1")
    }

    if (amt > MAX_DONATION_AMOUNT) {
      errors.push(`Amount cannot exceed Rs. ${MAX_DONATION_AMOUNT.toLocaleString()}`)
    }

    return errors
  }, [])

  const filteredFundraisers = useMemo(() => {
    return fundraisers.filter((fundraiser) => {
      return filterTitle === "All" || fundraiser.title === filterTitle
    })
  }, [fundraisers, filterTitle])

  const totalPages = Math.ceil(filteredFundraisers.length / PAGE_SIZE)
  const paginatedFundraisers = filteredFundraisers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this fundraiser?")) return

    try {
      await deleteDoc(doc(firestore, "fundraisers", id))
      setFundraisers((prev) => prev.filter((f) => f.id !== id))
      toast.success("Fundraiser deleted successfully")
    } catch (err) {
      toast.error("Failed to delete fundraiser")
    }
  }

  const handleEdit = (f) => {
    setEditFundraiser(f)
    setIsEditing(true)
    setModalOpen(true)
    setError("")
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setError("")

    const errors = validateForm(editFundraiser)
    if (errors.length > 0) {
      setError(errors.join(", "))
      return
    }

    try {
      setLoading(true)
      const { title, description, totalAmount } = editFundraiser
      const amt = Number(totalAmount)

      const ref = doc(firestore, "fundraisers", editFundraiser.id)
      await updateDoc(ref, { title, description, totalAmount: amt })

      setFundraisers((prev) =>
        prev.map((f) => (f.id === editFundraiser.id ? { ...f, title, description, totalAmount: amt } : f)),
      )

      toast.success("Fundraiser updated successfully")
      setIsEditing(false)
      setModalOpen(false)
    } catch (err) {
      setError("Failed to update fundraiser")
      toast.error("Failed to update fundraiser")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNew = async (e) => {
    e.preventDefault()
    setError("")

    const errors = validateForm(form)
    if (errors.length > 0) {
      setError(errors.join(", "))
      return
    }

    const user = auth.currentUser
    if (!user) return

    try {
      setLoading(true)
      const finalTitle = form.title === "Other" ? form.customTitle.trim() : form.title
      const amt = Number(form.totalAmount)

      const snap = await getDoc(doc(firestore, "users", user.uid))
      const name = snap.exists() ? snap.data().orgName || snap.data().name || "" : ""

      const data = {
        title: finalTitle,
        description: form.description.trim(),
        totalAmount: amt,
        raisedAmount: 0,
        orphanageId: user.uid,
        orphanageName: name,
        image: "/raise.jpg",
        createdAt: new Date(),
      }

      const ref = await addDoc(collection(firestore, "fundraisers"), data)
      setFundraisers((prev) => [...prev, { id: ref.id, ...data }])

      toast.success("Fundraiser created successfully")
      setForm({ title: "", customTitle: "", description: "", totalAmount: "" })
      setModalOpen(false)
    } catch (err) {
      setError("Failed to create fundraiser")
      toast.error("Failed to create fundraiser")
    } finally {
      setLoading(false)
    }
  }

  const openModal = (fundraiser = null) => {
    if (fundraiser) {
      setEditFundraiser(fundraiser)
      setIsEditing(true)
    } else {
      setForm({ title: "", customTitle: "", description: "", totalAmount: "" })
      setIsEditing(false)
    }
    setError("")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setIsEditing(false)
    setEditFundraiser(null)
    setForm({ title: "", customTitle: "", description: "", totalAmount: "" })
    setError("")
  }

  const getProgressPercentage = (raised, total) => {
    return total > 0 ? Math.min((raised / total) * 100, 100) : 0
  }

  return (
    <div className="p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-2">
              <FaDollarSign className="text-3xl text-green-600 mr-3" />
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">Fundraisers</h1>
            </div>
            <p className="text-gray-600">Create and manage your fundraising campaigns</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors shadow-lg"
          >
            <FaPlus />
            <span>New Fundraiser</span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <select
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
            >
              <option value="All">All Categories</option>
              {titleOptions
                .filter((t) => t.value !== "Other")
                .map((title) => (
                  <option key={title.value} value={title.value}>
                    {title.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{fundraisers.length}</div>
            <div className="text-sm text-blue-600">Total Fundraisers</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              Rs. {fundraisers.reduce((sum, f) => sum + (f.raisedAmount || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-600">Total Raised</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              Rs. {fundraisers.reduce((sum, f) => sum + (f.totalAmount || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">Total Goal</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{filteredFundraisers.length}</div>
            <div className="text-sm text-orange-600">Filtered</div>
          </div>
        </div>
      </motion.div>

      {/* Fundraisers Grid */}
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
      ) : paginatedFundraisers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No fundraisers found</h3>
          <p className="text-gray-500 mb-6">
            {filterTitle !== "All"
              ? "Try adjusting your filters"
              : "Create your first fundraiser to start raising funds"}
          </p>
          <button
            onClick={() => openModal()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Create Fundraiser
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {paginatedFundraisers.map((fundraiser, index) => {
            const titleOption = titleOptions.find((t) => t.value === fundraiser.title)
            const progress = getProgressPercentage(fundraiser.raisedAmount || 0, fundraiser.totalAmount || 0)

            return (
              <motion.div
                key={fundraiser.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{titleOption?.icon || "💰"}</span>
                    <h3 className="font-bold text-lg text-gray-800 truncate">{fundraiser.title}</h3>
                  </div>
                  <FaChartLine className="text-green-600" />
                </div>

                <p className="text-gray-600 mb-4 line-clamp-3">{fundraiser.description}</p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amount Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Raised:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {(fundraiser.raisedAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Goal:</span>
                    <span className="font-semibold">Rs. {(fundraiser.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Remaining:</span>
                    <span className="font-semibold text-orange-600">
                      Rs. {Math.max(0, (fundraiser.totalAmount || 0) - (fundraiser.raisedAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(fundraiser)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(fundraiser.id)}
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
                {isEditing ? "Edit Fundraiser" : "Create New Fundraiser"}
              </h2>

              <form onSubmit={isEditing ? handleSaveEdit : handleSubmitNew} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
                )}

                {!isEditing && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                      <select
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                        required
                      >
                        <option value="">Select Category</option>
                        {titleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.title === "Other" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Title *</label>
                        <input
                          type="text"
                          placeholder="Enter custom title"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                          value={form.customTitle}
                          onChange={(e) => setForm({ ...form, customTitle: e.target.value })}
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea
                    rows="4"
                    placeholder="Describe your fundraising goal and how the funds will be used"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    value={isEditing ? editFundraiser?.description || "" : form.description}
                    onChange={(e) =>
                      isEditing
                        ? setEditFundraiser({ ...editFundraiser, description: e.target.value })
                        : setForm({ ...form, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Target Amount (Rs.) *</label>
                  <input
                    type="number"
                    placeholder="Enter target amount"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    value={isEditing ? editFundraiser?.totalAmount || "" : form.totalAmount}
                    onChange={(e) =>
                      isEditing
                        ? setEditFundraiser({ ...editFundraiser, totalAmount: e.target.value })
                        : setForm({ ...form, totalAmount: e.target.value })
                    }
                    min="1"
                    max={MAX_DONATION_AMOUNT}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum amount: Rs. {MAX_DONATION_AMOUNT.toLocaleString()}
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? "Saving..." : isEditing ? "Update Fundraiser" : "Create Fundraiser"}
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
