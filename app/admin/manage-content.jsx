"use client"

import { useState, useEffect, useMemo } from "react"
import { auth, firestore, collection, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from "@/lib/firebase"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Eye,
  Trash2,
  AlertTriangle,
  X,
  Calendar,
  User,
  DollarSign,
  Heart,
  Briefcase,
  MessageSquare,
  CheckCircle,
  Clock,
} from "lucide-react"

const ManageContent = () => {
  const [requests, setRequests] = useState([])
  const [services, setServices] = useState([])
  const [fundraisers, setFundraisers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const unsubscribeRequests = onSnapshot(collection(firestore, "requests"), (snapshot) => {
      const requestsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "request",
        ...doc.data(),
      }))
      setRequests(requestsData)
    })

    const unsubscribeServices = onSnapshot(collection(firestore, "services"), (snapshot) => {
      const servicesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "service",
        ...doc.data(),
      }))
      setServices(servicesData)
    })

    const unsubscribeFundraisers = onSnapshot(collection(firestore, "fundraisers"), (snapshot) => {
      const fundraisersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "fundraiser",
        ...doc.data(),
      }))
      setFundraisers(fundraisersData)
      setLoading(false)
    })

    return () => {
      unsubscribeRequests()
      unsubscribeServices()
      unsubscribeFundraisers()
    }
  }, [])

  const allContent = useMemo(() => {
    return [...requests, ...services, ...fundraisers]
  }, [requests, services, fundraisers])

  const filteredContent = useMemo(() => {
    let filtered = allContent

    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.orgName
?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt),
    )
  }, [allContent, filterType, searchTerm])

  const statistics = useMemo(() => {
    return {
      total: allContent.length,
      requests: requests.length,
      services: services.length,
      fundraisers: fundraisers.length,
      active: allContent.filter((item) => item.status === "Active" || item.status === "Open").length,
      completed: allContent.filter((item) => item.status === "Completed" || item.status === "Fulfilled").length,
    }
  }, [allContent, requests, services, fundraisers])

  const handleDelete = async (item) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      alert("Please provide a reason for deletion")
      return
    }
    if (!itemToDelete.orgName) {
  console.warn("Missing orphanage name for item:", itemToDelete)
}


    setDeleting(true)
    try {
      // Delete the item from its collection
      const collectionName =
        itemToDelete.type === "request" ? "requests" : itemToDelete.type === "service" ? "services" : "fundraisers"

      await deleteDoc(doc(firestore, collectionName, itemToDelete.id))

      // Create notification for the orphanage
  await addDoc(collection(firestore, "adminNotifications"), {
  orphanageId: itemToDelete.orphanageId || "",
  orphanageName: itemToDelete.orgName || "Unknown Orphanage",
  itemType: itemToDelete.type,
  itemTitle: itemToDelete.title || "Untitled",
  itemId: itemToDelete.id,
  reason: deleteReason,
  adminId: auth.currentUser?.uid || "unknown",
  createdAt: serverTimestamp(),
  read: false,
})

      setShowDeleteModal(false)
      setDeleteReason("")
      setItemToDelete(null)
      alert("Content deleted successfully and notification sent to orphanage")
    } catch (error) {
      console.error("Error deleting content:", error)
      alert("Error deleting content. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "open":
        return "text-green-600 bg-green-100"
      case "completed":
      case "fulfilled":
        return "text-blue-600 bg-blue-100"
      case "in progress":
        return "text-yellow-600 bg-yellow-100"
      case "cancelled":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "request":
        return <Heart className="w-4 h-4" />
      case "service":
        return <Briefcase className="w-4 h-4" />
      case "fundraiser":
        return <DollarSign className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">Monitor and manage all orphanage content</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Requests</p>
                <p className="text-2xl font-bold text-red-600">{statistics.requests}</p>
              </div>
              <Heart className="w-8 h-8 text-red-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Services</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.services}</p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fundraisers</p>
                <p className="text-2xl font-bold text-green-600">{statistics.fundraisers}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.completed}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="request">Requests</option>
                <option value="service">Services</option>
                <option value="fundraiser">Fundraisers</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orphanage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContent.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{item.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="text-sm text-gray-900 capitalize">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{item.orgName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {item.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Content"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No content found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Content Details</h3>
                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <p className="text-gray-900">{selectedItem.title}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <p className="text-gray-900">{selectedItem.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <p className="text-gray-900 capitalize">{selectedItem.type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedItem.status)}`}
                        >
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Orphanage</label>
                      <p className="text-gray-900">{selectedItem.orgName}</p>
                    </div>

                    {selectedItem.type === "fundraiser" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
                          <p className="text-gray-900">${selectedItem.targetAmount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Raised Amount</label>
                          <p className="text-gray-900">${selectedItem.raisedAmount?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    )}

                    {selectedItem.type === "request" && selectedItem.requestType && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                        <p className="text-gray-900">{selectedItem.requestType}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                      <p className="text-gray-900">{selectedItem.createdAt?.toDate?.()?.toLocaleString() || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(null)
                        handleDelete(selectedItem)
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
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
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg max-w-md w-full"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Delete Content</h3>
                      <p className="text-sm text-gray-600">This action cannot be undone</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">
                      You are about to delete: <strong>{itemToDelete?.title}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      Please provide a reason for deletion. This will be sent to the orphanage.
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deletion Reason *</label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Please explain why this content is being deleted..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false)
                        setDeleteReason("")
                        setItemToDelete(null)
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      disabled={deleting || !deleteReason.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

export default ManageContent
