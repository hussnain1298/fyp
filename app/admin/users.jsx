"use client"

import { useState, useEffect } from "react"
import { firestore } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  Eye,
  Shield,
  Building,
  Calendar,
  Mail,
  Phone,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
} from "lucide-react"

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [updatingUser, setUpdatingUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, filterRole, filterStatus])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const usersSnapshot = await getDocs(collection(firestore, "users"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Sort by creation date (newest first)
      usersData.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0)
        const bDate = b.createdAt?.toDate?.() || new Date(0)
        return bDate - aDate
      })

      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by role
    if (filterRole !== "all") {
      filtered = filtered.filter((user) => user.userType?.toLowerCase() === filterRole.toLowerCase())
    }

    // Filter by status
    if (filterStatus !== "all") {
      const isActive = filterStatus === "active"
      filtered = filtered.filter((user) => (user.isActive !== false) === isActive)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.orgName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.contactNumber?.includes(searchTerm),
      )
    }

    setFilteredUsers(filtered)
  }

  const activateUser = async (userId, currentStatus) => {
    setUpdatingUser(userId)
    try {
      const newStatus = !currentStatus
      await updateDoc(doc(firestore, "users", userId), {
        isActive: newStatus,
      })

      // Update local state
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, isActive: newStatus } : user)))

      console.log(`User ${newStatus ? "activated" : "deactivated"} successfully`)
    } catch (error) {
      console.error("Error updating user status:", error)
      alert("Failed to update user status. Please try again.")
    } finally {
      setUpdatingUser(null)
    }
  }

  const handleViewDetails = (user) => {
    setSelectedUser(user)
    setShowDetailModal(true)
  }

  const getRoleIcon = (userType) => {
    switch (userType?.toLowerCase()) {
      case "orphanage":
        return <Building className="w-5 h-5 text-blue-500" />
      case "donor":
        return <UserCheck className="w-5 h-5 text-green-500" />
      case "admin":
        return <Shield className="w-5 h-5 text-purple-500" />
      default:
        return <Users className="w-5 h-5 text-gray-500" />
    }
  }

  const getRoleColor = (userType) => {
    switch (userType?.toLowerCase()) {
      case "orphanage":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "donor":
        return "bg-green-50 text-green-700 border-green-200"
      case "admin":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const stats = {
    total: users.length,
    active: users.filter((user) => user.isActive !== false).length,
    inactive: users.filter((user) => user.isActive === false).length,
    orphanages: users.filter((user) => user.userType?.toLowerCase() === "orphanage").length,
    donors: users.filter((user) => user.userType?.toLowerCase() === "donor").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading users...</p>
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
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 text-lg">Manage platform users and their access</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            { title: "Total Users", value: stats.total, icon: Users, color: "from-blue-500 to-cyan-500" },
            { title: "Active Users", value: stats.active, icon: UserCheck, color: "from-green-500 to-emerald-500" },
            { title: "Inactive Users", value: stats.inactive, icon: UserX, color: "from-red-500 to-pink-500" },
            { title: "Orphanages", value: stats.orphanages, icon: Building, color: "from-purple-500 to-indigo-500" },
            { title: "Donors", value: stats.donors, icon: Shield, color: "from-orange-500 to-amber-500" },
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
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
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
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name, email, organization, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white min-w-[120px]"
                >
                  <option value="all">All Roles</option>
                  <option value="orphanage">Orphanages</option>
                  <option value="donor">Donors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {filteredUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          )}
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchTerm || filterRole !== "all" || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "No users have registered yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {(user.fullName || user.email || "U").charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-gray-900">{user.fullName || user.orgName  || "No Name"}</h3>
                         
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.userType)}
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.userType)}`}
                          >
                            {user.userType || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.contactNumber && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{user.contactNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.isActive !== false ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-700 font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-700 font-medium">Inactive</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {(user.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewDetails(user)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => activateUser(user.id, user.isActive !== false)}
                            disabled={updatingUser === user.id}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive !== false
                                ? "text-red-600 hover:bg-red-100"
                                : "text-green-600 hover:bg-green-100"
                            } disabled:opacity-50`}
                            title={user.isActive !== false ? "Deactivate User" : "Activate User"}
                          >
                            {updatingUser === user.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                            ) : user.isActive !== false ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
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

        {/* User Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedUser && (
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
                      <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {(selectedUser.fullName || selectedUser.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
                        <p className="text-gray-600">{selectedUser.fullName || "No Name"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <XCircle className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <p className="text-gray-900">{selectedUser.fullName || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <p className="text-gray-900">{selectedUser.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(selectedUser.userType)}
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getRoleColor(selectedUser.role)}`}
                          >
                            {selectedUser.userType || "Unknown"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div className="flex items-center gap-2">
                          {selectedUser.isActive !== false ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-green-700 font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-500" />
                              <span className="text-red-700 font-medium">Inactive</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedUser.orgName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                        <p className="text-gray-900">{selectedUser.orgName}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <p className="text-gray-900">{selectedUser.contactNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Joined Date</label>
                        <p className="text-gray-900">
                          {(selectedUser.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {selectedUser.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900">{selectedUser.address}</p>
                        </div>
                      </div>
                    )}
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
                        activateUser(selectedUser.id, selectedUser.isActive !== false)
                        setShowDetailModal(false)
                      }}
                      className={`px-6 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                        selectedUser.isActive !== false
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {selectedUser.isActive !== false ? (
                        <>
                          <UserX className="w-4 h-4" />
                          Deactivate User
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Activate User
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
