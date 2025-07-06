"use client"

import { useEffect, useState, useMemo } from "react"
import { auth, firestore, updateDoc, deleteDoc } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { motion } from "framer-motion"
import { AlertTriangle, X, MessageSquare, Trash2, Calendar, User } from "lucide-react"

const OrphanageDashboard = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalServices: 0,
    totalFundraisers: 0,
    totalDonations: 0,
    activeRequests: 0,
    completedRequests: 0,
    pendingServices: 0,
    activeFundraisers: 0,
  })
  const [adminNotifications, setAdminNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const userWithId = { ...userData, uid: currentUser.uid }
            setUser(userWithId)
            console.log("=== USER DATA LOADED ===")
            console.log("User UID:", currentUser.uid)
            console.log("User Data:", userData)
            console.log("Org Name:", userData.orgName)

            loadDashboardData(currentUser.uid)
            loadAdminNotifications(currentUser.uid, userData)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadDashboardData = async (userId) => {
    try {
      // Load requests
      const requestsQuery = query(collection(firestore, "requests"), where("orphanageId", "==", userId))
      const requestsSnapshot = await getDocs(requestsQuery)
      const requests = requestsSnapshot.docs.map((doc) => doc.data())

      // Load services
      const servicesQuery = query(collection(firestore, "services"), where("orphanageId", "==", userId))
      const servicesSnapshot = await getDocs(servicesQuery)
      const services = servicesSnapshot.docs.map((doc) => doc.data())

      // Load fundraisers
      const fundraisersQuery = query(collection(firestore, "fundraisers"), where("orphanageId", "==", userId))
      const fundraisersSnapshot = await getDocs(fundraisersQuery)
      const fundraisers = fundraisersSnapshot.docs.map((doc) => doc.data())

      // Load donations
      const donationsQuery = query(collection(firestore, "donations"), where("orphanageId", "==", userId))
      const donationsSnapshot = await getDocs(donationsQuery)

      setStats({
        totalRequests: requests.length,
        totalServices: services.length,
        totalFundraisers: fundraisers.length,
        totalDonations: donationsSnapshot.size,
        activeRequests: requests.filter((r) => r.status === "Active").length,
        completedRequests: requests.filter((r) => r.status === "Completed").length,
        pendingServices: services.filter((s) => s.status === "Open").length,
        activeFundraisers: fundraisers.filter((f) => f.status === "Active").length,
      })
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  const loadAdminNotifications = (userId, userData) => {
    console.log("=== LOADING ADMIN NOTIFICATIONS ===")
    console.log("User ID:", userId)
    console.log("User Data:", userData)

    const orgName = userData.orgName || userData.organizationName || userData.fullName || userData.name

    // Strategy 1: Simple query by orphanageId (no orderBy to avoid index issues)
    const simpleQuery = query(collection(firestore, "adminNotifications"), where("orphanageId", "==", userId))

    console.log("Trying simple query by orphanageId:", userId)

    const unsubscribe = onSnapshot(
      simpleQuery,
      (snapshot) => {
        console.log(`Simple query returned ${snapshot.docs.length} documents`)

        if (snapshot.docs.length > 0) {
          const notifications = snapshot.docs.map((doc) => {
            const data = doc.data()
            console.log("Notification found:", data)
            return {
              id: doc.id,
              ...data,
            }
          })

          // Sort notifications client-side by createdAt
          notifications.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0)
            const bTime = b.createdAt?.toDate?.() || new Date(0)
            return bTime - aTime
          })

          setAdminNotifications(notifications)
          console.log(`Successfully loaded ${notifications.length} notifications`)

          // Show notifications panel if there are unread notifications
          const unreadCount = notifications.filter((n) => !n.read).length
          console.log("Unread notifications:", unreadCount)
          if (unreadCount > 0) {
            setShowNotifications(true)
          }
        } else {
          console.log("No notifications found with simple query, trying fallback...")

          // Fallback: Try by orgName if no results
          if (orgName) {
            const fallbackQuery = query(
              collection(firestore, "adminNotifications"),
              where("orphanageName", "==", orgName),
            )

            onSnapshot(
              fallbackQuery,
              (fallbackSnapshot) => {
                console.log(`Fallback query returned ${fallbackSnapshot.docs.length} documents`)

                const notifications = fallbackSnapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))

                // Sort client-side
                notifications.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0)
                  const bTime = b.createdAt?.toDate?.() || new Date(0)
                  return bTime - aTime
                })

                setAdminNotifications(notifications)

                const unreadCount = notifications.filter((n) => !n.read).length
                if (unreadCount > 0) {
                  setShowNotifications(true)
                }
              },
              (error) => {
                console.error("Fallback query also failed:", error)

                // Last resort: Get all notifications and filter client-side
                console.log("Trying last resort: get all notifications")

                const allNotificationsQuery = collection(firestore, "adminNotifications")

                onSnapshot(
                  allNotificationsQuery,
                  (allSnapshot) => {
                    console.log(`Got ${allSnapshot.docs.length} total notifications for client-side filtering`)

                    const allNotifications = allSnapshot.docs.map((doc) => ({
                      id: doc.id,
                      ...doc.data(),
                    }))

                    // Filter for this specific orphanage
                    const filteredNotifications = allNotifications.filter((notification) => {
                      const matchesId = notification.orphanageId === userId
                      const matchesOrgName = notification.orphanageName === orgName
                      const matchesTarget = notification.targetOrganization === orgName

                      if (matchesId || matchesOrgName || matchesTarget) {
                        console.log("Found matching notification:", notification)
                      }

                      return matchesId || matchesOrgName || matchesTarget
                    })

                    // Sort client-side
                    filteredNotifications.sort((a, b) => {
                      const aTime = a.createdAt?.toDate?.() || new Date(0)
                      const bTime = b.createdAt?.toDate?.() || new Date(0)
                      return bTime - aTime
                    })

                    console.log(`Client-side filtering found ${filteredNotifications.length} matching notifications`)
                    setAdminNotifications(filteredNotifications)

                    const unreadCount = filteredNotifications.filter((n) => !n.read).length
                    if (unreadCount > 0) {
                      setShowNotifications(true)
                    }
                  },
                  (finalError) => {
                    console.error("All notification loading strategies failed:", finalError)
                    setAdminNotifications([])
                  },
                )
              },
            )
          }
        }
      },
      (error) => {
        console.error("Primary query failed:", error)
        console.log("Error details:", error.code, error.message)

        // If we get permission errors, try a different approach
        if (error.code === "permission-denied") {
          console.log("Permission denied, trying alternative approach...")

          // Try to get notifications without real-time updates
          getDocs(collection(firestore, "adminNotifications"))
            .then((snapshot) => {
              console.log(`Static query returned ${snapshot.docs.length} documents`)

              const allNotifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))

              const filteredNotifications = allNotifications.filter((notification) => {
                return (
                  notification.orphanageId === userId ||
                  notification.orphanageName === orgName ||
                  notification.targetOrganization === orgName
                )
              })

              filteredNotifications.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0)
                const bTime = b.createdAt?.toDate?.() || new Date(0)
                return bTime - aTime
              })

              console.log(`Static filtering found ${filteredNotifications.length} matching notifications`)
              setAdminNotifications(filteredNotifications)

              const unreadCount = filteredNotifications.filter((n) => !n.read).length
              if (unreadCount > 0) {
                setShowNotifications(true)
              }
            })
            .catch((staticError) => {
              console.error("Static query also failed:", staticError)
              setAdminNotifications([])
            })
        }
      },
    )

    return unsubscribe
  }

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(firestore, "adminNotifications", notificationId), {
        read: true,
      })
      console.log("Notification marked as read:", notificationId)
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(firestore, "adminNotifications", notificationId))
      console.log("Notification deleted:", notificationId)
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const unreadNotifications = useMemo(() => {
    return adminNotifications.filter((n) => !n.read)
  }, [adminNotifications])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.orgName || user?.name}</p>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 bg-white rounded-lg shadow-sm border hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-6 h-6 text-gray-600" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

      

        {/* Admin Notifications Panel */}
        {showNotifications && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Admin Notifications</h3>
                      <p className="text-sm text-gray-600">{unreadNotifications.length} unread notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {adminNotifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No notifications from admin</p>
                    <p className="text-xs mt-2">If you expect notifications, check the console for debugging info</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {adminNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? "bg-red-50 border-l-4 border-l-red-500" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium text-red-700">Content Deleted by Admin</span>
                              {!notification.read && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">New</span>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm text-gray-900">
                                <strong>Item:</strong> {notification.itemTitle}
                              </p>
                              <p className="text-sm text-gray-900">
                                <strong>Type:</strong> {notification.itemType}
                              </p>
                              <p className="text-sm text-gray-900">
                                <strong>Reason:</strong> {notification.reason}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {notification.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Admin
                              </div>
                            </div>

                           
                          </div>

                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <button
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors"
                              >
                                Mark Read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalRequests}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-green-600">Active: {stats.activeRequests}</span>
              <span className="text-blue-600">Completed: {stats.completedRequests}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg p-6 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Services</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalServices}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">Pending: {stats.pendingServices}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg p-6 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Fundraisers</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalFundraisers}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">Active: {stats.activeFundraisers}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg p-6 shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Donations</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalDonations}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg p-6 shadow-sm border"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="font-medium text-gray-900">Create Request</div>
              <div className="text-sm text-gray-600">Post a new donation request</div>
            </button>

            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="font-medium text-gray-900">Add Service</div>
              <div className="text-sm text-gray-600">Offer a new service</div>
            </button>

            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="font-medium text-gray-900">Start Fundraiser</div>
              <div className="text-sm text-gray-600">Launch a fundraising campaign</div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default OrphanageDashboard
