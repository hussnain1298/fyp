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
  Gift,
  MapPin,
  Phone,
  Clock,
  Package,
  Shirt,
  UtensilsCrossed,
  Star,
  Eye,
  TrendingUp,
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
  const [publicDonations, setPublicDonations] = useState([])
  const [orphanageRequests, setOrphanageRequests] = useState([])
  const [showDonations, setShowDonations] = useState(false)
  const [donationFilter, setDonationFilter] = useState("All")

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
            loadPublicDonations()
            loadOrphanageRequests(currentUser.uid)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadPublicDonations = async () => {
    try {
      const donationsQuery = query(collection(firestore, "publicDonations"))
      const unsubscribe = onSnapshot(donationsQuery, (snapshot) => {
        const donations = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Sort by timestamp (newest first)
        donations.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(0)
          const bTime = b.timestamp?.toDate?.() || new Date(0)
          return bTime - aTime
        })

        setPublicDonations(donations)
      })

      return unsubscribe
    } catch (error) {
      console.error("Error loading public donations:", error)
    }
  }

  const loadOrphanageRequests = async (userId) => {
    try {
      const requestsQuery = query(collection(firestore, "requests"), where("orphanageId", "==", userId))
      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setOrphanageRequests(requests)
      })

      return unsubscribe
    } catch (error) {
      console.error("Error loading orphanage requests:", error)
    }
  }

  // Enhanced smart donation matching and prioritization
  const prioritizedDonations = useMemo(() => {
    if (!publicDonations.length || !orphanageRequests.length) {
      return []
    }

    const activeRequests = orphanageRequests.filter(
      (req) => req.status === "Active" || req.status === "Pending" || !req.status,
    )

    if (activeRequests.length === 0) {
      return []
    }

    const requestTypes = activeRequests.map((req) => req.requestType?.toLowerCase())

    // Categorize donations with priority scoring
    const matchedDonations = []
    const otherDonations = []

    publicDonations.forEach((donation) => {
      const donationType = donation.donationType?.toLowerCase()
      let priorityScore = 0

      // Check if donation type matches any of our requests
      const isDirectMatch = requestTypes.includes(donationType)

      if (isDirectMatch) {
        priorityScore = 3 // High priority for direct matches
        matchedDonations.push({ ...donation, priority: "high", priorityScore })
      } else {
        // Lower priority for non-matching donations
        priorityScore = 1
        otherDonations.push({ ...donation, priority: "normal", priorityScore })
      }
    })

    // Only return donations if we have priority matches (priorityScore > 1)
    const highPriorityDonations = matchedDonations.filter((d) => d.priorityScore > 1)

    if (highPriorityDonations.length === 0) {
      return [] // Don't show any donations if no priority matches
    }

    // Return only high priority donations first, then some normal ones
    return [...highPriorityDonations, ...otherDonations.slice(0, 3)]
  }, [publicDonations, orphanageRequests])

  const filteredDonations = useMemo(() => {
    if (donationFilter === "All") return prioritizedDonations
    return prioritizedDonations.filter(
      (donation) => donation.donationType?.toLowerCase() === donationFilter.toLowerCase(),
    )
  }, [prioritizedDonations, donationFilter])

  // Count high priority matches
  const priorityMatchCount = useMemo(() => {
    return prioritizedDonations.filter((d) => d.priority === "high").length
  }, [prioritizedDonations])

  const getDonationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "money":
        return DollarSign
      case "clothes":
        return Shirt
      case "food":
        return UtensilsCrossed
      default:
        return Package
    }
  }

  const getDonationColor = (type, priority) => {
    const baseColors = {
      money: priority === "high" ? "from-green-500 to-emerald-600" : "from-green-400 to-green-500",
      clothes: priority === "high" ? "from-blue-500 to-indigo-600" : "from-blue-400 to-blue-500",
      food: priority === "high" ? "from-orange-500 to-red-600" : "from-orange-400 to-orange-500",
      default: priority === "high" ? "from-purple-500 to-pink-600" : "from-purple-400 to-purple-500",
    }
    return baseColors[type?.toLowerCase()] || baseColors.default
  }

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
      const donationsQuery = query(collection(firestore, "donations"), where("orphanageId", "==", userId))
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
          <div className="flex items-center gap-4">
            {/* Available Donations Button - Only show if there are priority matches */}
            {priorityMatchCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDonations(!showDonations)}
                className="relative p-4 bg-white rounded-xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-200"
              >
                <Gift className="w-6 h-6 text-green-600" />
                {priorityMatchCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                  >
                    {priorityMatchCount}
                  </motion.span>
                )}
              </motion.button>
            )}

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

        {/* Available Donations Panel - Only show if there are priority matches */}
        <AnimatePresence>
          {showDonations && priorityMatchCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-8"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-full">
                        <Gift className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">Priority Donation Matches</h3>
                        <p className="text-gray-600">
                          {priorityMatchCount} donations matching your requests • {filteredDonations.length} total
                          available
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">High Priority</span>
                      </div>
                      <select
                        value={donationFilter}
                        onChange={(e) => setDonationFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="All">All Types</option>
                        <option value="Money">Money</option>
                        <option value="Clothes">Clothes</option>
                        <option value="Food">Food</option>
                      </select>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowDonations(false)}
                        className="p-2 hover:bg-green-100 rounded-full transition-colors"
                      >
                        <X className="w-6 h-6 text-gray-500" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {filteredDonations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No matching donations found</p>
                      <p className="text-sm">Try adjusting your filter or check back later!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                      {filteredDonations.map((donation, index) => {
                        const IconComponent = getDonationIcon(donation.donationType)
                        const isHighPriority = donation.priority === "high"

                        return (
                          <motion.div
                            key={donation.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative bg-white rounded-xl p-4 border-2 transition-all duration-300 hover:shadow-lg ${
                              isHighPriority ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-green-200"
                            }`}
                          >
                            {isHighPriority && (
                              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Priority Match
                              </div>
                            )}

                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`p-2 rounded-lg bg-gradient-to-r ${getDonationColor(donation.donationType, donation.priority)}`}
                              >
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 capitalize">{donation.donationType} Donation</h4>
                                <p className="text-sm text-gray-600">
                                  {donation.firstName} {donation.lastName}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              {donation.donationType === "money" && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-600">
                                    Rs. {Number(donation.donationAmount).toLocaleString()}
                                  </span>
                                </div>
                              )}

                              {donation.donationType === "clothes" && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Shirt className="w-4 h-4 text-blue-600" />
                                    <span>Qty: {donation.clothesQty}</span>
                                  </div>
                                  {donation.clothesDesc && (
                                    <p className="text-gray-600 text-xs">{donation.clothesDesc}</p>
                                  )}
                                </div>
                              )}

                              {donation.donationType === "food" && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="w-4 h-4 text-orange-600" />
                                    <span>
                                      {donation.foodType} - {donation.foodQty}
                                    </span>
                                  </div>
                                  {donation.foodExpiry && (
                                    <div className="flex items-center gap-2 text-xs text-orange-600">
                                      <Clock className="w-3 h-3" />
                                      <span>Expires: {donation.foodExpiry}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-gray-500">
                                <MapPin className="w-4 h-4" />
                                <span className="text-xs">
                                  {donation.city}, {donation.state}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-gray-500">
                                <Phone className="w-4 h-4" />
                                <span className="text-xs">{donation.phone}</span>
                              </div>

                              <div className="flex items-center gap-2 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs">
                                  {donation.timestamp?.toDate?.()?.toLocaleDateString() || "Recently"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                                  isHighPriority
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  Contact Donor
                                </div>
                              </motion.button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              title: "Priority Matches",
              value: priorityMatchCount,
              icon: Gift,
              color: "from-blue-500 to-cyan-500",
              bgColor: "bg-blue-50",
              textColor: "text-blue-600",
              subtitle: `${filteredDonations.length} total available donations`,
              trend: priorityMatchCount > 0 ? "New!" : "None",
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
                  <span className={`text-xs font-medium ${stat.trend === "None" ? "text-gray-500" : "text-green-600"}`}>
                    {stat.trend}
                  </span>
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
                    path: "/orphanageDashboard/requests",
                  },
                  {
                    title: "Add Service",
                    description: "Offer educational services",
                    icon: GraduationCap,
                    color: "from-purple-500 to-indigo-500",
                    path: "/orphanageDashboard/services",
                  },
                  {
                    title: "Start Fundraiser",
                    description: "Launch a fundraising campaign",
                    icon: DollarSign,
                    color: "from-green-500 to-emerald-500",
                    path: "/orphanageDashboard/fundraise",
                  },
                ].map((action, index) => (
                  <motion.button
                    key={action.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => (window.location.href = action.path)}
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
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  <span>{priorityMatchCount} Priority Matches</span>
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
