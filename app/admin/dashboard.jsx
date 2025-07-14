"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Users,
  MessageSquare,
  BarChart3,
  Mail,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Shield,
  UserCheck,
  Package,
  DollarSign,
  Shirt,
  Utensils,
  UserX,
} from "lucide-react"
import { firestore } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"


const StatCard = ({ title, value, icon: Icon, color, trend, loading, subtitle, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
    onClick={onClick}
    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden cursor-pointer group"
  >
    <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon className="w-full h-full" style={{ color }} />
    </div>

    <div className="flex items-start justify-between relative z-10">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        {loading ? (
          <div className="h-8 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        )}
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
          
            
          </div>
        )}
      </div>
      <div
        className={`p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}
        style={{ backgroundColor: color }}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </motion.div>
)

const RequestTypeCard = ({ type, count, totalQuantity, icon: Icon, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg`} style={{ backgroundColor: color + "20" }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h4 className="font-semibold text-gray-900">{type}</h4>
      </div>
      <span className="text-2xl font-bold text-gray-900">{count}</span>
    </div>
    {totalQuantity && (
      <div className="text-sm text-gray-600">
        <span className="font-medium">Total Quantity: </span>
        <span className="text-gray-900 font-semibold">{totalQuantity}</span>
      </div>
    )}
  </motion.div>
)

export default function AdminHome({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalOrphanages: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalRequests: 0,
    totalServices: 0,
    totalFundraisers: 0,
    totalMessages: 0,
    totalSubscriptions: 0,
    pendingRequests: 0,
    totalDonations: 0,
    systemHealth: 98,
  })

  const [requestStats, setRequestStats] = useState({
    clothes: { count: 0, totalQuantity: 0, donated: 0 },
    food: { count: 0, totalQuantity: 0, donated: 0 },
    money: { count: 0, totalQuantity: 0, donated: 0 },
    education: { count: 0, totalQuantity: 0, donated: 0 },
    medical: { count: 0, totalQuantity: 0, donated: 0 },
    other: { count: 0, totalQuantity: 0, donated: 0 },
  })

  const [loading, setLoading] = useState(true)
  const [systemAlerts, setSystemAlerts] = useState([])

  useEffect(() => {
    const unsubscribers = []

    try {
      // Enhanced users stats with active/inactive tracking
      const usersUnsub = onSnapshot(
        collection(firestore, "users"),
        (snapshot) => {
          const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          const activeUsers = users.filter((u) => u.isActive !== false)
          const inactiveUsers = users.filter((u) => u.isActive === false)

          setStats((prev) => ({
            ...prev,
            totalUsers: users.length,
            totalDonors: users.filter((u) => u.userType === "Donor").length,
            totalOrphanages: users.filter((u) => u.userType === "Orphanage").length,
            activeUsers: activeUsers.length,
            inactiveUsers: inactiveUsers.length,
          }))
        },
        (error) => {
          console.error("Error fetching users:", error)
          setSystemAlerts((prev) => [
            ...prev,
            {
              id: Date.now(),
              type: "error",
              title: "Database Connection Issue",
              description: "Failed to fetch user data",
              time: "Just now",
            },
          ])
        },
      )
      unsubscribers.push(usersUnsub)

      // Enhanced requests stats with type breakdown
      const requestsUnsub = onSnapshot(
        collection(firestore, "requests"),
        (snapshot) => {
          const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

          // Calculate request type statistics
          const typeStats = {
            clothes: { count: 0, totalQuantity: 0, donated: 0 },
            food: { count: 0, totalQuantity: 0, donated: 0 },
            money: { count: 0, totalQuantity: 0, donated: 0 },
            education: { count: 0, totalQuantity: 0, donated: 0 },
            medical: { count: 0, totalQuantity: 0, donated: 0 },
            other: { count: 0, totalQuantity: 0, donated: 0 },
          }

          requests.forEach((request) => {
            const type = (request.requestType || "other").toLowerCase()
            const normalizedType = type.includes("cloth")
              ? "clothes"
              : type.includes("food")
                ? "food"
                : type.includes("money") || type.includes("financial")
                  ? "money"
                  : type.includes("education") || type.includes("school")
                    ? "education"
                    : type.includes("medical") || type.includes("health")
                      ? "medical"
                      : "other"

            if (typeStats[normalizedType]) {
              typeStats[normalizedType].count++

              // Parse quantity (handle different formats)
              const quantity = request.quantity || 0
              let numericQuantity = 0

              if (typeof quantity === "string") {
                // Extract numbers from string (e.g., "50 pieces", "Rs. 1000", "10 kg")
                const match = quantity.match(/\d+/)
                numericQuantity = match ? Number.parseInt(match[0]) : 0
              } else if (typeof quantity === "number") {
                numericQuantity = quantity
              }

              typeStats[normalizedType].totalQuantity += numericQuantity

              // Calculate donated amount
              const totalDonated = request.totalDonated || 0
              typeStats[normalizedType].donated += totalDonated
            }
          })

          setRequestStats(typeStats)
          setStats((prev) => ({
            ...prev,
            totalRequests: requests.length,
            pendingRequests: requests.filter((r) => r.status === "Pending").length,
          }))
        },
        (error) => console.error("Error fetching requests:", error),
      )
      unsubscribers.push(requestsUnsub)

      // Services stats
      const servicesUnsub = onSnapshot(
        collection(firestore, "services"),
        (snapshot) => {
          setStats((prev) => ({ ...prev, totalServices: snapshot.size }))
        },
        (error) => console.error("Error fetching services:", error),
      )
      unsubscribers.push(servicesUnsub)

      // Fundraisers stats
      const fundraisersUnsub = onSnapshot(
        collection(firestore, "fundraisers"),
        (snapshot) => {
          setStats((prev) => ({ ...prev, totalFundraisers: snapshot.size }))
        },
        (error) => console.error("Error fetching fundraisers:", error),
      )
      unsubscribers.push(fundraisersUnsub)

      // Contact messages stats
      const contactUnsub = onSnapshot(
        collection(firestore, "contact-us"),
        (snapshot) => {
          setStats((prev) => ({ ...prev, totalMessages: snapshot.size }))
        },
        (error) => console.error("Error fetching contact messages:", error),
      )
      unsubscribers.push(contactUnsub)

      // Subscriptions stats
      const subscriptionsUnsub = onSnapshot(
        collection(firestore, "subscriptions"),
        (snapshot) => {
          setStats((prev) => ({ ...prev, totalSubscriptions: snapshot.size }))
          setLoading(false)
        },
        (error) => {
          console.error("Error fetching subscriptions:", error)
          setLoading(false)
        },
      )
      unsubscribers.push(subscriptionsUnsub)
    } catch (error) {
      console.error("Error setting up listeners:", error)
      setLoading(false)
    }

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [])

  const statCards = useMemo(
    () => [
      {
        title: "Total Users",
        value: stats.totalUsers,
        icon: Users,
        color: "#3B82F6",
        trend: 12,
        subtitle: `${stats.activeUsers} active, ${stats.inactiveUsers} inactive`,
        onClick: () => console.log("Navigate to users"),
      },
      {
        title: "Active Donors",
        value: stats.totalDonors,
        icon: UserCheck,
        color: "#10B981",
        trend: 8,
        subtitle: "Generous contributors",
        onClick: () => console.log("Navigate to donors"),
      },
      {
        title: "Orphanages",
        value: stats.totalOrphanages,
        icon: Users,
        color: "#8B5CF6",
        trend: 5,
        subtitle: "Partner organizations",
        onClick: () => console.log("Navigate to orphanages"),
      },
      {
        title: "Inactive Users",
        value: stats.inactiveUsers,
        icon: UserX,
        color: "#EF4444",
        trend: -10,
        subtitle: "Deactivated accounts",
        onClick: () => console.log("Navigate to inactive users"),
      },
      {
        title: "Total Requests",
        value: stats.totalRequests,
        icon: MessageSquare,
        color: "#F59E0B",
        trend: 15,
        subtitle: `${stats.pendingRequests} pending`,
        onClick: () => console.log("Navigate to requests"),
      },
      {
        title: "Services Offered",
        value: stats.totalServices,
        icon: Activity,
        color: "#6366F1",
        trend: 7,
        subtitle: "Educational programs",
        onClick: () => console.log("Navigate to services"),
      },
      {
        title: "Active Fundraisers",
        value: stats.totalFundraisers,
        icon: TrendingUp,
        color: "#EC4899",
        trend: 20,
        subtitle: "Ongoing campaigns",
        onClick: () => console.log("Navigate to fundraisers"),
      },
      {
        title: "Newsletter Subscribers",
        value: stats.totalSubscriptions,
        icon: Mail,
        color: "#14B8A6",
        trend: 25,
        subtitle: "Email subscribers",
        onClick: () => console.log("Navigate to subscribers"),
      },
    ],
    [stats],
  )



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 text-lg font-medium">
            Loading admin dashboard...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
         
    
        {/* Enhanced Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden mb-8"
        >
          <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
            <div className="w-full h-full bg-white rounded-full transform translate-x-20 -translate-y-20"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
            <div className="w-full h-full bg-white rounded-full transform -translate-x-16 translate-y-16"></div>
          </div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                      Welcome back, {user?.displayName || user?.email?.split("@")[0] || "Admin"}! 👋
                    </h1>
                    <p className="text-green-100 text-lg">Here's what's happening with your platform today.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>System Online</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCard {...card} loading={loading} />
            </motion.div>
          ))}
        </div>

    
        
      </div>
    </div>
  )
}
