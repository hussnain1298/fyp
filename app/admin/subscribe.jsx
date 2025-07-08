"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Mail,
  Search,
  Calendar,
  Download,
  Trash2,
  Send,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { firestore } from "@/lib/firebase"
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy } from "firebase/firestore"

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unsubscribed: 0,
    thisMonth: 0,
    thisWeek: 0,
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(firestore, "subscriptions"), where("isDeleted", "!=", true), orderBy("createdAt", "desc")),
      (snapshot) => {
        const subscriptionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setSubscriptions(subscriptionsData)
        calculateStats(subscriptionsData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching subscriptions:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    filterSubscriptions()
  }, [subscriptions, searchTerm, filterStatus])

  const calculateStats = (subscriptionsData) => {
    const total = subscriptionsData.length
    const active = subscriptionsData.filter((sub) => sub.isActive !== false).length
    const unsubscribed = subscriptionsData.filter((sub) => sub.isActive === false).length

    // Calculate this month and this week subscriptions
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    const thisMonth = subscriptionsData.filter((sub) => {
      const createdAt = sub.createdAt?.toDate?.()
      return createdAt && createdAt >= startOfMonth
    }).length

    const thisWeek = subscriptionsData.filter((sub) => {
      const createdAt = sub.createdAt?.toDate?.()
      return createdAt && createdAt >= startOfWeek
    }).length

    setStats({ total, active, unsubscribed, thisMonth, thisWeek })
  }

  const filterSubscriptions = () => {
    let filtered = subscriptions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((sub) => sub.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter((sub) => sub.isActive !== false)
      } else if (filterStatus === "unsubscribed") {
        filtered = filtered.filter((sub) => sub.isActive === false)
      }
    }

    setFilteredSubscriptions(filtered)
  }

  const toggleSubscriptionStatus = async (subscriptionId, currentStatus) => {
    try {
      const newStatus = currentStatus === false ? true : false
      await updateDoc(doc(firestore, "subscriptions", subscriptionId), {
        isActive: newStatus,
        updatedAt: new Date(),
        ...(newStatus === false && { unsubscribedAt: new Date() }),
        ...(newStatus === true && { resubscribedAt: new Date() }),
      })
      console.log(`Subscription ${subscriptionId} status updated to: ${newStatus ? "active" : "unsubscribed"}`)
    } catch (error) {
      console.error("Error updating subscription status:", error)
    }
  }

  const softDeleteSubscription = async (subscriptionId) => {
    try {
      await updateDoc(doc(firestore, "subscriptions", subscriptionId), {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      setShowDeleteModal(false)
      setSubscriptionToDelete(null)
      console.log(`Subscription ${subscriptionId} soft deleted`)
    } catch (error) {
      console.error("Error soft deleting subscription:", error)
    }
  }

  const exportSubscriptions = () => {
    const csvContent = [
      ["Email", "Status", "Subscribed Date", "Last Updated"],
      ...filteredSubscriptions.map((sub) => [
        sub.email,
        sub.isActive === false ? "Unsubscribed" : "Active",
        sub.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
        sub.updatedAt?.toDate?.()?.toLocaleDateString() || "Unknown",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `newsletter-subscriptions-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (isActive) => {
    if (isActive === false) {
      return <AlertCircle className="w-4 h-4 text-red-600" />
    }
    return <CheckCircle className="w-4 h-4 text-green-600" />
  }

  const getStatusColor = (isActive) => {
    if (isActive === false) {
      return "bg-red-100 text-red-800"
    }
    return "bg-green-100 text-green-800"
  }

  const getStatusText = (isActive) => {
    if (isActive === false) {
      return "Unsubscribed"
    }
    return "Active"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading subscriptions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Newsletter Subscriptions</h1>
                <p className="text-gray-600">Manage newsletter subscribers and send campaigns</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportSubscriptions}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Send className="w-4 h-4" />
                Send Campaign
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subscribers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-gray-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unsubscribed</p>
                <p className="text-2xl font-bold text-red-600">{stats.unsubscribed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search subscribers by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Subscribers</option>
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Subscriptions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscribed Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription, index) => (
                  <motion.tr
                    key={subscription.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {subscription.email?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{subscription.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(subscription.isActive)}
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subscription.isActive)}`}
                        >
                          {getStatusText(subscription.isActive)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {subscription.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {subscription.updatedAt?.toDate?.()?.toLocaleDateString() || "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSubscriptionStatus(subscription.id, subscription.isActive)}
                          className={`p-2 rounded-lg transition-colors ${
                            subscription.isActive === false
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                          title={subscription.isActive === false ? "Resubscribe" : "Unsubscribe"}
                        >
                          {subscription.isActive === false ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => window.open(`mailto:${subscription.email}`)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Send Email"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSubscriptionToDelete(subscription)
                            setShowDeleteModal(true)
                          }}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Delete Subscription"
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

          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No subscriptions found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the subscription for <strong>{subscriptionToDelete?.email}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSubscriptionToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => softDeleteSubscription(subscriptionToDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Subscription
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
