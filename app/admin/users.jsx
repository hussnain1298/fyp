"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import { Search, Building2, Heart, Calendar, Mail, Phone, MapPin, Trash2, Eye } from "lucide-react"

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, "users"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(data)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching users:", error)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const deleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(firestore, "users", userId))
      } catch (error) {
        console.error("Error deleting user:", error)
        alert("Error deleting user. Please try again.")
      }
    }
  }

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const matchesType = filter === "All" || user.userType === filter
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.orgName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.city?.toLowerCase().includes(searchLower)
        return matchesType && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (b.createdAt?.toDate?.() || new Date()) - (a.createdAt?.toDate?.() || new Date())
        } else if (sortBy === "oldest") {
          return (a.createdAt?.toDate?.() || new Date()) - (b.createdAt?.toDate?.() || new Date())
        } else if (sortBy === "name") {
          const nameA = (a.userType === "Orphanage" ? a.orgName : a.fullName) || ""
          const nameB = (b.userType === "Orphanage" ? b.orgName : b.fullName) || ""
          return nameA.localeCompare(nameB)
        }
        return 0
      })
  }, [users, filter, searchTerm, sortBy])

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A"
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 11 && cleaned.startsWith("92")) {
      return `+${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`
    }
    return phone
  }

  const stats = useMemo(
    () => ({
      total: users.length,
      donors: users.filter((u) => u.userType === "Donor").length,
      orphanages: users.filter((u) => u.userType === "Orphanage").length,
      recent: users.filter((u) => {
        const createdAt = u.createdAt?.toDate?.()
        if (!createdAt) return false
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return createdAt > weekAgo
      }).length,
    }),
    [users],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage registered donors and orphanages</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Donors</p>
              <p className="text-2xl font-bold text-red-600">{stats.donors}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Heart className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Orphanages</p>
              <p className="text-2xl font-bold text-green-600">{stats.orphanages}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New This Week</p>
              <p className="text-2xl font-bold text-purple-600">{stats.recent}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users by name, email, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Users</option>
              <option value="Donor">Donors</option>
              <option value="Orphanage">Orphanages</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filter !== "All"
                ? "Try adjusting your search or filter criteria."
                : "No users have registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                              user.userType === "Donor" ? "bg-red-500" : "bg-green-500"
                            }`}
                          >
                            {user.userType === "Donor"
                              ? user.fullName?.charAt(0) || "D"
                              : user.orgName?.charAt(0) || "O"}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.userType === "Orphanage" ? user.orgName || "N/A" : user.fullName || "N/A"}
                          </div>
                          {user.userType === "Orphanage" && user.contactPerson && (
                            <div className="text-sm text-gray-500">Contact: {user.contactPerson}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      {user.phone && <div className="text-sm text-gray-500">{formatPhoneNumber(user.phone)}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.userType === "Donor" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {user.city || "N/A"}
                      </div>
                      {user.address && (
                        <div className="text-sm text-gray-500 truncate max-w-xs" title={user.address}>
                          {user.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {user.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={`mailto:${user.email}`}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        {user.phone && (
                          <a
                            href={`tel:${user.phone}`}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded"
                            title="Call"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div
                    className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                      selectedUser.userType === "Donor" ? "bg-red-500" : "bg-green-500"
                    }`}
                  >
                    {selectedUser.userType === "Donor"
                      ? selectedUser.fullName?.charAt(0) || "D"
                      : selectedUser.orgName?.charAt(0) || "O"}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {selectedUser.userType === "Orphanage" ? selectedUser.orgName : selectedUser.fullName}
                    </h4>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedUser.userType === "Donor" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedUser.userType}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedUser.email}</p>
                  </div>

                  {selectedUser.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {formatPhoneNumber(selectedUser.phone)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedUser.city || "N/A"}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joined</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedUser.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                    </p>
                  </div>
                </div>

                {selectedUser.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedUser.address}</p>
                  </div>
                )}

                {selectedUser.userType === "Orphanage" && (
                  <>
                    {selectedUser.contactPerson && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedUser.contactPerson}</p>
                      </div>
                    )}
                    {selectedUser.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedUser.description}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <a
                    href={`mailto:${selectedUser.email}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </a>
                  {selectedUser.phone && (
                    <a
                      href={`tel:${selectedUser.phone}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
