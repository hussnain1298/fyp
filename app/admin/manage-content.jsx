"use client"

import { useState, useEffect } from "react"
import { firestore } from "@/lib/firebase"
import { collection, getDocs, deleteDoc, doc, addDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Trash2,
  Eye,
  AlertTriangle,
  FileText,
  DollarSign,
  GraduationCap,
  Heart,
  Building,
  Calendar,
  X,
} from "lucide-react"

export default function ManageContent() {
  const [content, setContent] = useState([])
  const [filteredContent, setFilteredContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchAllContent()
  }, [])

  useEffect(() => {
    filterContent()
  }, [content, searchTerm, filterType])

  const fetchAllContent = async () => {
    setLoading(true)
    try {
      const collections = [
        { name: "requests", type: "Request" },
        { name: "services", type: "Service" },
        { name: "fundraisers", type: "Fundraiser" },
      ]

      const allContent = []

      for (const col of collections) {
        const snapshot = await getDocs(collection(firestore, col.name))
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          type: col.type,
          collection: col.name,
          ...doc.data(),
        }))
        allContent.push(...items)
      }

      // Fetch orphanage names for all items
      const orphanageIds = [...new Set(allContent.map((item) => item.orphanageId).filter(Boolean))]
      const orphanageMap = {}

      if (orphanageIds.length > 0) {
        for (const id of orphanageIds) {
          try {
            const userDoc = await getDoc(doc(firestore, "users", id))
            if (userDoc.exists()) {
              orphanageMap[id] = userDoc.data()
            }
          } catch (error) {
            console.error(`Error fetching user ${id}:`, error)
          }
        }
      }

      // Enrich content with orphanage info
      const enrichedContent = allContent.map((item) => ({
        ...item,
        orphanageName:
          orphanageMap[item.orphanageId]?.orgName || orphanageMap[item.orphanageId]?.fullName || "Unknown Organization",
      }))

      // Sort by creation date (newest first)
      enrichedContent.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || a.timestamp?.toDate?.() || new Date(0)
        const bDate = b.createdAt?.toDate?.() || b.timestamp?.toDate?.() || new Date(0)
        return bDate - aDate
      })

      setContent(enrichedContent)
    } catch (error) {
      console.error("Error fetching content:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterContent = () => {
    let filtered = content

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type.toLowerCase() === filterType.toLowerCase())
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.orphanageName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredContent(filtered)
  }

  const handleDeleteClick = (item) => {
    setItemToDelete(item)
    setDeleteReason("")
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteReason.trim()) {
      alert("Please provide a reason for deletion")
      return
    }

    if (!itemToDelete) return

    setDeleting(true)
    try {
      // Delete the item
      await deleteDoc(doc(firestore, itemToDelete.collection, itemToDelete.id))

      // Create admin notification
      await addDoc(collection(firestore, "adminNotifications"), {
        orphanageId: itemToDelete.orphanageId,
        orphanageName: itemToDelete.orphanageName,
        targetOrganization: itemToDelete.orphanageName,
        itemId: itemToDelete.id,
        itemTitle: itemToDelete.title,
        itemType: itemToDelete.type,
        reason: deleteReason.trim(),
        notificationType: "content_deletion",
        read: false,
        createdAt: serverTimestamp(),
        adminId: "admin", // You might want to get actual admin ID
      })

      // Update local state
      setContent((prev) => prev.filter((item) => item.id !== itemToDelete.id))

      setShowDeleteModal(false)
      setItemToDelete(null)
      setDeleteReason("")

      alert(`${itemToDelete.type} deleted successfully and notification sent to orphanage.`)
    } catch (error) {
      console.error("Error deleting content:", error)
      alert("Failed to delete content. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDetails = (item) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const getTypeIcon = (type) => {
    switch (type.toLowerCase()) {
      case "request":
        return <Heart className="w-5 h-5 text-red-500" />
      case "service":
        return <GraduationCap className="w-5 h-5 text-blue-500" />
      case "fundraiser":
        return <DollarSign className="w-5 h-5 text-green-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case "request":
        return "bg-red-50 text-red-700 border-red-200"
      case "service":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "fundraiser":
        return "bg-green-50 text-green-700 border-green-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const stats = {
    total: content.length,
    requests: content.filter((item) => item.type === "Request").length,
    services: content.filter((item) => item.type === "Service").length,
    fundraisers: content.filter((item) => item.type === "Fundraiser").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Content Management</h1>
              <p className="text-gray-600 text-lg">Monitor and manage platform content</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Total Content", value: stats.total, icon: FileText, color: "from-blue-500 to-cyan-500" },
            { title: "Requests", value: stats.requests, icon: Heart, color: "from-red-500 to-pink-500" },
            { title: "Services", value: stats.services, icon: GraduationCap, color: "from-purple-500 to-indigo-500" },
            {
              title: "Fundraisers",
              value: stats.fundraisers,
              icon: DollarSign,
              color: "from-green-500 to-emerald-500",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search content by title, description, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="request">Requests</option>
                <option value="service">Services</option>
                <option value="fundraiser">Fundraisers</option>
              </select>
            </div>
          </div>

          {filteredContent.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredContent.length} of {content.length} items
            </div>
          )}
        </motion.div>

        {/* Content List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          {filteredContent.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No content found</h3>
              <p className="text-gray-500">
                {searchTerm || filterType !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "No content has been posted yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContent.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                   <td className="px-6 py-4">
  <div className="flex items-start gap-3">
    {getTypeIcon(item.type)}
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>

      {/* ✅ Add requestType and quantity if present */}
      {item.requestType && (
        <div className="text-xs text-gray-600 mt-1">
          <span className="font-semibold">Type:</span> {item.requestType}
          {item.quantity !== undefined && (
            <>
              {" | "}
              <span className=" font-semibold ">Quantity:</span> {item.quantity}
            </>
          )}
        </div>
      )}
    </div>
  </div>
</td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{item.orphanageName}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getTypeColor(item.type)}`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {(
                            item.createdAt?.toDate?.() ||
                            item.timestamp?.toDate?.() ||
                            new Date()
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewDetails(item)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteClick(item)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Content"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(selectedItem.type)}
                      <h3 className="text-2xl font-bold text-gray-900">Content Details</h3>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedItem.title}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedItem.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getTypeColor(selectedItem.type)}`}
                        >
                          {selectedItem.type}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                        <p className="text-gray-900">{selectedItem.orphanageName}</p>
                      </div>
                    </div>

                    {selectedItem.type === "Fundraiser" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount</label>
                          <p className="text-gray-900">Rs. {selectedItem.totalAmount?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Raised Amount</label>
                          <p className="text-gray-900">Rs. {selectedItem.raisedAmount?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
                      <p className="text-gray-900">
                        {(
                          selectedItem.createdAt?.toDate?.() ||
                          selectedItem.timestamp?.toDate?.() ||
                          new Date()
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleDeleteClick(selectedItem)
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Content
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && itemToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => !deleting && setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Delete Content</h3>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to delete "{itemToDelete.title}"? This action cannot be undone.
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for deletion <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Please provide a reason for deleting this content..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                        rows={3}
                        disabled={deleting}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      disabled={deleting}
                      className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting || !deleteReason.trim()}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete Content
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
