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
  Database,
  Globe,
  Zap,
  UserCheck,
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
            {trend > 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
            <span className="font-medium">{Math.abs(trend)}% from last month</span>
          </div>
        )}
      </div>
      <div
        className={`p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}
        style={{ backgroundColor: color }}
      >
        <Icon className="h-8 w-8 text-white" />
      </div>
    </div>
  </motion.div>
)

const ActivityItem = ({ icon: Icon, title, description, time, color, type, priority }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors group"
  >
    <div
      className={`p-3 rounded-full shadow-sm group-hover:shadow-md transition-shadow ${
        priority === "high" ? "ring-2 ring-red-200" : ""
      }`}
      style={{ backgroundColor: color }}
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <div className="flex items-center mt-2">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            type === "success"
              ? "bg-green-100 text-green-800"
              : type === "warning"
                ? "bg-yellow-100 text-yellow-800"
                : type === "error"
                  ? "bg-red-100 text-red-800"
                  : type === "info"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
          }`}
        >
          {type === "success"
            ? "Completed"
            : type === "warning"
              ? "Pending"
              : type === "error"
                ? "Error"
                : type === "info"
                  ? "New"
                  : "System"}
        </span>
        {priority === "high" && (
          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            High Priority
          </span>
        )}
      </div>
    </div>
  </motion.div>
)

const QuickActionCard = ({ icon: Icon, title, description, color, onClick, badge }) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full p-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 text-left group relative"
  >
    {badge && (
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
        {badge}
      </div>
    )}
    <div className="flex items-center space-x-4">
      <div
        className={`p-4 rounded-2xl shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all`}
        style={{ backgroundColor: color }}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </motion.button>
)

export default function AdminHome({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalOrphanages: 0,
    totalRequests: 0,
    totalServices: 0,
    totalFundraisers: 0,
    totalMessages: 0,
    totalSubscriptions: 0,
    activeUsers: 0,
    pendingRequests: 0,
    totalDonations: 0,
    systemHealth: 98,
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([])
  const [systemAlerts, setSystemAlerts] = useState([])

  useEffect(() => {
    const unsubscribers = []

    // Enhanced real-time listeners with better error handling
    try {
      // Users stats with real-time updates
      const usersUnsub = onSnapshot(
        collection(firestore, "users"),
        (snapshot) => {
          const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          const activeUsers = users.filter((u) => u.isActive !== false)
          setStats((prev) => ({
            ...prev,
            totalUsers: users.length,
            totalDonors: users.filter((u) => u.userType === "Donor").length,
            totalOrphanages: users.filter((u) => u.userType === "Orphanage").length,
            activeUsers: activeUsers.length,
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

      // Requests stats
      const requestsUnsub = onSnapshot(
        collection(firestore, "requests"),
        (snapshot) => {
          const requests = snapshot.docs.map((doc) => doc.data())
          setStats((prev) => ({
            ...prev,
            totalRequests: snapshot.size,
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

      // Donations stats
      const donationsUnsub = onSnapshot(
        collection(firestore, "donations"),
        (snapshot) => {
          setStats((prev) => ({ ...prev, totalDonations: snapshot.size }))
        },
        (error) => console.error("Error fetching donations:", error),
      )
      unsubscribers.push(donationsUnsub)

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

      // Load recent activity
      loadRecentActivity()
    } catch (error) {
      console.error("Error setting up listeners:", error)
      setLoading(false)
    }

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [])

  const loadRecentActivity = async () => {
    try {
      // Simulate recent activity data
      const activities = [
        {
          id: 1,
          icon: Users,
          title: "New user registered",
          description: "John Doe joined as a donor from Karachi",
          time: "2 min ago",
          color: "#10B981",
          type: "success",
        },
        {
          id: 2,
          icon: MessageSquare,
          title: "New donation request",
          description: "Hope Orphanage requested food supplies for 50 children",
          time: "5 min ago",
          color: "#3B82F6",
          type: "info",
        },
        {
          id: 3,
          icon: TrendingUp,
          title: "Fundraiser milestone",
          description: "Education fund reached 75% of Rs. 100,000 goal",
          time: "10 min ago",
          color: "#8B5CF6",
          type: "success",
        },
        {
          id: 4,
          icon: Mail,
          title: "New contact message",
          description: "Support inquiry from donor about donation process",
          time: "15 min ago",
          color: "#F59E0B",
          type: "warning",
        },
        {
          id: 5,
          icon: AlertCircle,
          title: "System notification",
          description: "Weekly backup completed successfully",
          time: "1 hour ago",
          color: "#6B7280",
          type: "system",
        },
        {
          id: 6,
          icon: Shield,
          title: "Security alert",
          description: "Multiple failed login attempts detected",
          time: "2 hours ago",
          color: "#EF4444",
          type: "error",
          priority: "high",
        },
      ]

      setRecentActivity(activities)
    } catch (error) {
      console.error("Error loading recent activity:", error)
    }
  }

  const statCards = useMemo(
    () => [
      {
        title: "Total Users",
        value: stats.totalUsers,
        icon: Users,
        color: "#3B82F6",
        trend: 12,
        subtitle: `${stats.activeUsers} active users`,
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
        title: "Contact Messages",
        value: stats.totalMessages,
        icon: MessageSquare,
        color: "#EF4444",
        trend: -3,
        subtitle: "Support inquiries",
        onClick: () => console.log("Navigate to messages"),
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

  const quickActions = [
    {
      icon: BarChart3,
      title: "View Analytics",
      description: "Check detailed platform statistics",
      color: "#3B82F6",
      onClick: () => console.log("Navigate to analytics"),
    },
    {
      icon: Users,
      title: "Manage Users",
      description: "Add, edit, or remove users",
      color: "#10B981",
      onClick: () => console.log("Navigate to user management"),
      badge: stats.pendingRequests > 0 ? stats.pendingRequests : null,
    },
    {
      icon: MessageSquare,
      title: "Check Messages",
      description: "Review contact form submissions",
      color: "#8B5CF6",
      onClick: () => console.log("Navigate to messages"),
      badge: stats.totalMessages > 10 ? "!" : null,
    },
    {
      icon: Mail,
      title: "Email Subscribers",
      description: "Send newsletter to subscribers",
      color: "#F59E0B",
      onClick: () => console.log("Navigate to email"),
    },
    {
      icon: Shield,
      title: "Security Center",
      description: "Monitor system security",
      color: "#EF4444",
      onClick: () => console.log("Navigate to security"),
    },
    {
      icon: Database,
      title: "Database Health",
      description: "Check database performance",
      color: "#6366F1",
      onClick: () => console.log("Navigate to database"),
    },
  ]

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
                      Welcome back, {user?.fullName || "Admin"}! 👋
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
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>System Health: {stats.systemHealth}%</span>
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

        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">System Alerts</h3>
              </div>
              <div className="space-y-2">
                {systemAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-red-800">{alert.title}</p>
                      <p className="text-sm text-red-600">{alert.description}</p>
                    </div>
                    <span className="text-xs text-red-500">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                      <p className="text-gray-600 text-sm mt-1">Latest platform updates and notifications</p>
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                    View all
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ActivityItem {...activity} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                  <p className="text-gray-600 text-sm mt-1">Frequently used admin tools</p>
                </div>
              </div>
              <div className="space-y-4">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <QuickActionCard {...action} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        
      </div>
    </div>
  )
}