"use client"

import { useEffect, useState, useMemo } from "react"
import { auth, firestore, updateDoc, deleteDoc } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  X,
  MessageSquare,
  Trash2,
  Calendar,
  User,
  TrendingUp,
  Heart,
  DollarSign,
  GraduationCap,
  Bell,
  Building,
  Activity,
  Users,
  Target,
  Award,
  Sparkles,
} from "lucide-react"

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
    totalRaised: 0,
    monthlyDonations: 0,
  })
  const [adminNotifications, setAdminNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const userWithId = { ...userData, uid: currentUser.uid }
            setUser(userWithId)

            loadDashboardData(currentUser.uid)
            loadAdminNotifications(currentUser.uid, userData)
            loadRecentActivity(currentUser.uid)
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
      // Real-time listeners for better performance
      const requestsQuery = query(collection(firestore, "requests"), where("orphanageId", "==", userId))
      const servicesQuery = query(collection(firestore, "services"), where("orphanageId", "==", userId))
      const fundraisersQuery = query(collection(firestore, "fundraisers"), where("orphanageId", "==", userId))
      const donationsQuery = query(collection(firestore, "donations"), where("orphanageId", "==", userId))

      // Set up real-time listeners
      const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
        const requests = snapshot.docs.map((doc) => doc.data())
        setStats((prev) => ({
          ...prev,
          totalRequests: requests.length,
          activeRequests: requests.filter((r) => r.status === "Active" || r.status === "Pending").length,
          completedRequests: requests.filter((r) => r.status === "Completed" || r.status === "Fulfilled").length,
        }))
      })

      const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
        const services = snapshot.docs.map((doc) => doc.data())
        setStats((prev) => ({
          ...prev,
          totalServices: services.length,
          pendingServices: services.filter((s) => s.status === "Pending").length,
        }))
      })

      const unsubscribeFundraisers = onSnapshot(fundraisersQuery, (snapshot) => {
        const fundraisers = snapshot.docs.map((doc) => doc.data())
        const totalRaised = fundraisers.reduce((sum, f) => sum + (f.raisedAmount || 0), 0)
        setStats((prev) => ({
          ...prev,
          totalFundraisers: fundraisers.length,
          activeFundraisers: fundraisers.filter((f) => f.status === "Active" || !f.status).length,
          totalRaised,
        }))
      })

      const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
        const donations = snapshot.docs.map((doc) => doc.data())
        const thisMonth = new Date()
        thisMonth.setDate(1)
        const monthlyDonations = donations.filter((d) => {
          const donationDate = d.timestamp?.toDate()
          return donationDate && donationDate >= thisMonth
        }).length

        setStats((prev) => ({
          ...prev,
          totalDonations: donations.length,
          monthlyDonations,
        }))
      })

      return () => {
        unsubscribeRequests()
        unsubscribeServices()
        unsubscribeFundraisers()
        unsubscribeDonations()
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  const loadRecentActivity = async (userId) => {
    try {
      // Load recent donations
      const donationsQuery = query(
        collection(firestore, "donations"),
        where("orphanageId", "==", userId),
        // orderBy("timestamp", "desc"),
        // limit(5)
      )
      const donationsSnap = await getDocs(donationsQuery)
      const recentDonations = donationsSnap.docs
        .map((doc) => ({
          id: doc.id,
          type: "donation",
          ...doc.data(),
        }))
        .sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0))
        .slice(0, 5)

      setRecentActivity(recentDonations)
    } catch (error) {
      console.error("Error loading recent activity:", error)
    }
  }

  const loadAdminNotifications = (userId, userData) => {
    const orgName = userData.orgName || userData.organizationName || userData.fullName || userData.name

    const simpleQuery = query(collection(firestore, "adminNotifications"), where("orphanageId", "==", userId))

    const unsubscribe = onSnapshot(
      simpleQuery,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))

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
        } else if (orgName) {
          const fallbackQuery = query(
            collection(firestore, "adminNotifications"),
            where("orphanageName", "==", orgName),
          )

          onSnapshot(fallbackQuery, (fallbackSnapshot) => {
            const notifications = fallbackSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))

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
          })
        }
      },
      (error) => {
        console.error("Notification query failed:", error)
        getDocs(collection(firestore, "adminNotifications"))
          .then((snapshot) => {
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
      },
    )

    return unsubscribe
  }

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(firestore, "adminNotifications", notificationId), {
        read: true,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(firestore, "adminNotifications", notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const unreadNotifications = useMemo(() => {
    return adminNotifications.filter((n) => !n.read)
  }, [adminNotifications])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 text-lg font-medium">
            Loading your dashboard...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8"
        >
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-xl">
                <Building className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Welcome back! 👋</h1>
                <p className="text-gray-600 text-lg">{user?.orgName || user?.name}</p>
              </div>
            </div>
            <p className="text-sm text-green-600 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Manage your organization's activities
            </p>
          </div>

          {/* Enhanced Notifications Button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-4 bg-white rounded-xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-200"
            >
              <Bell className="w-6 h-6 text-green-600" />
              {unreadNotifications.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                >
                  {unreadNotifications.length}
                </motion.span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Enhanced Admin Notifications Panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-8"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">Admin Notifications</h3>
                        <p className="text-gray-600">
                          {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowNotifications(false)}
                      className="p-2 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </motion.button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {adminNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No notifications from admin</p>
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {adminNotifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-6 hover:bg-gray-50 transition-colors ${
                            !notification.read ? "bg-red-50 border-l-4 border-l-red-500" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="font-semibold text-red-700">Content Deleted by Admin</span>
                                {!notification.read && (
                                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                    New
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2 mb-4">
                                <p className="text-gray-900">
                                  <strong>Item:</strong> {notification.itemTitle}
                                </p>
                                <p className="text-gray-900">
                                  <strong>Type:</strong> {notification.itemType}
                                </p>
                                <p className="text-gray-900">
                                  <strong>Reason:</strong> {notification.reason}
                                </p>
                              </div>

                              <div className="flex items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {notification.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Admin
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => markNotificationAsRead(notification.id)}
                                  className="px-4 py-2 bg-green-100 text-green-700 text-sm rounded-full hover:bg-green-200 transition-colors font-medium"
                                >
                                  Mark Read
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteNotification(notification.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete notification"
                              >
                                <Trash2 className="w-5 h-5" />
                              </motion.button>
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
        </AnimatePresence>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Requests",
              value: stats.totalRequests,
              icon: Heart,
              color: "from-red-500 to-pink-500",
              bgColor: "bg-red-50",
              textColor: "text-red-600",
              subtitle: `${stats.activeRequests} active, ${stats.completedRequests} completed`,
              trend: "+12%",
            },
            {
              title: "Services",
              value: stats.totalServices,
              icon: GraduationCap,
              color: "from-purple-500 to-indigo-500",
              bgColor: "bg-purple-50",
              textColor: "text-purple-600",
              subtitle: `${stats.pendingServices} pending`,
              trend: "+8%",
            },
            {
              title: "Fundraisers",
              value: stats.totalFundraisers,
              icon: DollarSign,
              color: "from-green-500 to-emerald-500",
              bgColor: "bg-green-50",
              textColor: "text-green-600",
              subtitle: `Rs. ${stats.totalRaised.toLocaleString()} raised`,
              trend: "+15%",
            },
            {
              title: "Total Donations",
              value: stats.totalDonations,
              icon: TrendingUp,
              color: "from-blue-500 to-cyan-500",
              bgColor: "bg-blue-50",
              textColor: "text-blue-600",
              subtitle: `${stats.monthlyDonations} this month`,
              trend: "+20%",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <span className="text-xs text-green-600 font-medium">{stat.trend}</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{stat.title}</p>
                <p className="text-sm text-gray-500">{stat.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity & Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              </div>

              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Heart className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">New donation received</p>
                        <p className="text-sm text-gray-500">
                          {activity.donationType} - {activity.timestamp?.toDate?.()?.toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        New
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Create Request",
                    description: "Post a new donation request",
                    icon: Heart,
                    color: "from-red-500 to-pink-500",
                  },
                  {
                    title: "Add Service",
                    description: "Offer educational services",
                    icon: GraduationCap,
                    color: "from-purple-500 to-indigo-500",
                  },
                  {
                    title: "Start Fundraiser",
                    description: "Launch a fundraising campaign",
                    icon: DollarSign,
                    color: "from-green-500 to-emerald-500",
                  },
                ].map((action, index) => (
                  <motion.button
                    key={action.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg bg-gradient-to-r ${action.color} group-hover:scale-110 transition-transform`}
                      >
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                          {action.title}
                        </div>
                        <div className="text-sm text-gray-600">{action.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Welcome Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white bg-opacity-10 rounded-full translate-y-16 -translate-x-16"></div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-full">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Making a Difference Together</h3>
                  <p className="text-green-100 text-lg">
                    Your organization is helping create positive change in the community.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-green-100 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                  <span>Active Organization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Community Partner</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Building className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default OrphanageDashboard
