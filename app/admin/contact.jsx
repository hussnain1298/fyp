"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  MessageSquare,
  Search,
  Mail,
  Phone,
  Calendar,
  Eye,
  Trash2,
  Reply,
  Archive,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { firestore } from "@/lib/firebase"
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore"

export default function ContactManagement() {
  const [messages, setMessages] = useState([])
  const [filteredMessages, setFilteredMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [expandedMessages, setExpandedMessages] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    replied: 0,
    archived: 0,
  })

  useEffect(() => {
    // Set up real-time listener for contact messages
    const unsubscribe = onSnapshot(
      query(collection(firestore, "contact-us"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Filter out deleted messages
        const activeMessages = messagesData.filter((msg) => !msg.isDeleted)

        setMessages(activeMessages)
        calculateStats(activeMessages)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching contact messages:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    filterMessages()
  }, [messages, searchTerm, filterStatus])

  const calculateStats = (messagesData) => {
    const total = messagesData.length
    const unread = messagesData.filter((msg) => !msg.isRead).length
    const read = messagesData.filter((msg) => msg.isRead && !msg.isReplied).length
    const replied = messagesData.filter((msg) => msg.isReplied).length
    const archived = messagesData.filter((msg) => msg.isArchived).length

    setStats({ total, unread, read, replied, archived })
  }

  const filterMessages = () => {
    let filtered = messages

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (msg) =>
          msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.message?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "unread":
          filtered = filtered.filter((msg) => !msg.isRead)
          break
        case "read":
          filtered = filtered.filter((msg) => msg.isRead && !msg.isReplied)
          break
        case "replied":
          filtered = filtered.filter((msg) => msg.isReplied)
          break
        case "archived":
          filtered = filtered.filter((msg) => msg.isArchived)
          break
      }
    }

    setFilteredMessages(filtered)
  }

  const markAsRead = async (messageId) => {
    try {
      await updateDoc(doc(firestore, "contact-us", messageId), {
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  }

  const markAsReplied = async (messageId) => {
    try {
      await updateDoc(doc(firestore, "contact-us", messageId), {
        isReplied: true,
        repliedAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error marking message as replied:", error)
    }
  }

  const archiveMessage = async (messageId) => {
    try {
      await updateDoc(doc(firestore, "contact-us", messageId), {
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error archiving message:", error)
    }
  }

  const softDeleteMessage = async (messageId) => {
    try {
      await updateDoc(doc(firestore, "contact-us", messageId), {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      setShowDeleteModal(false)
      setMessageToDelete(null)
    } catch (error) {
      console.error("Error soft deleting message:", error)
    }
  }

  const toggleExpanded = (messageId) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
  }

  const getStatusIcon = (message) => {
    if (message.isReplied) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    } else if (message.isRead) {
      return <Eye className="w-4 h-4 text-blue-600" />
    } else {
      return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusColor = (message) => {
    if (message.isReplied) {
      return "bg-green-100 text-green-800"
    } else if (message.isRead) {
      return "bg-blue-100 text-blue-800"
    } else {
      return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusText = (message) => {
    if (message.isReplied) {
      return "Replied"
    } else if (message.isRead) {
      return "Read"
    } else {
      return "Unread"
    }
  }

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "No message content"
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
              <p className="text-gray-600">Manage and respond to user inquiries</p>
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
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-gray-600" />
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
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.unread}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
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
                <p className="text-sm text-gray-600">Read</p>
                <p className="text-2xl font-bold text-blue-600">{stats.read}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
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
                <p className="text-sm text-gray-600">Replied</p>
                <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
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
                <p className="text-sm text-gray-600">Archived</p>
                <p className="text-2xl font-bold text-purple-600">{stats.archived}</p>
              </div>
              <Archive className="w-8 h-8 text-purple-600" />
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
                  placeholder="Search messages by name, email, subject, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Messages</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Messages List */}
        <div className="space-y-4">
          {filteredMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow ${
                !message.isRead ? "border-l-4 border-l-yellow-500" : ""
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {message.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{message.name || "Anonymous"}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {message.email}
                        </div>
                        {message.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {message.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {message.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown date"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(message)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message)}`}>
                      {getStatusText(message)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{message.subject || "No Subject"}</h4>
                  <p className="text-gray-600">
                    {expandedMessages[message.id]
                      ? message.message || "No message content"
                      : truncateText(message.message)}
                    {message.message && message.message.length > 100 && (
                      <button
                        onClick={() => toggleExpanded(message.id)}
                        className="ml-2 text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
                      >
                        {expandedMessages[message.id] ? (
                          <>
                            Read less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Read more <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {!message.isRead && (
                      <button
                        onClick={() => markAsRead(message.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Mark as Read
                      </button>
                    )}
                    {message.isRead && !message.isReplied && (
                      <button
                        onClick={() => markAsReplied(message.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        Mark as Replied
                      </button>
                    )}
                    {!message.isArchived && (
                      <button
                        onClick={() => archiveMessage(message.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                        Archive
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`mailto:${message.email}?subject=Re: ${message.subject}`)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Reply via Email"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setMessageToDelete(message)
                        setShowDeleteModal(true)
                      }}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete Message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No messages found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
          </div>
        )}

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
                Are you sure you want to delete the message from <strong>{messageToDelete?.name}</strong>? This action
                cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setMessageToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => softDeleteMessage(messageToDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
