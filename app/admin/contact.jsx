"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import { Mail, Phone, User, MessageSquare, Calendar, Eye, Trash2, CheckCircle, Clock, Search } from "lucide-react"

export default function Contact() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, "contact-us"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setMessages(data)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching contact submissions:", error)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const filteredMessages = useMemo(() => {
    return messages
      .filter((message) => {
        const matchesSearch =
          message.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.message?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || message.status === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return (b.timestamp?.toDate() || new Date()) - (a.timestamp?.toDate() || new Date())
          case "oldest":
            return (a.timestamp?.toDate() || new Date()) - (b.timestamp?.toDate() || new Date())
          case "name":
            return (a.name || "").localeCompare(b.name || "")
          default:
            return 0
        }
      })
  }, [messages, searchTerm, statusFilter, sortBy])

  const updateMessageStatus = async (messageId, newStatus) => {
    try {
      await updateDoc(doc(firestore, "contact-us", messageId), {
        status: newStatus,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error updating message status:", error)
    }
  }

  const deleteMessage = async (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteDoc(doc(firestore, "contact-us", messageId))
        setSelectedMessage(null)
      } catch (error) {
        console.error("Error deleting message:", error)
      }
    }
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A"
    const cleanPhone = phone.toString().replace(/\D/g, "")
    if (cleanPhone.startsWith("92")) {
      return `+${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 5)}-${cleanPhone.slice(5, 8)}-${cleanPhone.slice(8)}`
    }
    return phone
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "read":
        return "bg-yellow-100 text-yellow-800"
      case "replied":
        return "bg-green-100 text-green-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "new":
        return <Clock className="h-4 w-4" />
      case "read":
        return <Eye className="h-4 w-4" />
      case "replied":
        return <CheckCircle className="h-4 w-4" />
      case "archived":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const stats = useMemo(
    () => ({
      total: messages.length,
      new: messages.filter((m) => m.status === "new" || !m.status).length,
      replied: messages.filter((m) => m.status === "replied").length,
      thisMonth: messages.filter((m) => {
        const messageDate = m.timestamp?.toDate()
        const now = new Date()
        return (
          messageDate && messageDate.getMonth() === now.getMonth() && messageDate.getFullYear() === now.getFullYear()
        )
      }).length,
    }),
    [messages],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Messages</h1>
        <p className="text-gray-600">Manage and respond to customer inquiries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Messages</p>
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Replied</p>
              <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-purple-600">{stats.thisMonth}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search messages by name, email, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Messages List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Messages ({filteredMessages.length})</h2>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No messages found matching your criteria.</p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{message.name}</h3>
                          <p className="text-sm text-gray-600">{message.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status || "new")}`}
                        >
                          {getStatusIcon(message.status || "new")}
                          {(message.status || "new").charAt(0).toUpperCase() + (message.status || "new").slice(1)}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">{message.message}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {formatPhoneNumber(message.phone)}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {message.timestamp?.toDate?.().toLocaleDateString() || "N/A"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-6">
            {selectedMessage ? (
              <div>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Message Details</h2>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete message"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedMessage.name}</h3>
                        <p className="text-sm text-gray-600">{selectedMessage.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Phone</p>
                        <p className="font-medium">{formatPhoneNumber(selectedMessage.phone)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Date</p>
                        <p className="font-medium">
                          {selectedMessage.timestamp?.toDate?.().toLocaleDateString() || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Message</h4>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Update Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateMessageStatus(selectedMessage.id, "read")}
                        className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                      >
                        Mark as Read
                      </button>
                      <button
                        onClick={() => updateMessageStatus(selectedMessage.id, "replied")}
                        className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Mark as Replied
                      </button>
                    </div>
                    <button
                      onClick={() => updateMessageStatus(selectedMessage.id, "archived")}
                      className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Archive Message
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <a
                        href={`mailto:${selectedMessage.email}?subject=Re: Your inquiry&body=Dear ${selectedMessage.name},%0D%0A%0D%0AThank you for contacting us.%0D%0A%0D%0ABest regards,%0D%0ASupport Team`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Mail className="h-4 w-4" />
                        Reply via Email
                      </a>
                      <a
                        href={`tel:${selectedMessage.phone}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Phone className="h-4 w-4" />
                        Call Customer
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Message</h3>
                <p className="text-gray-600">Choose a message from the list to view details and take actions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
