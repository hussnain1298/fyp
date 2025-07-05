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
} from "lucide-react"
import { firestore } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"

const StatCard = ({ title, value, icon: Icon, color, trend, loading, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
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
      <div className={`p-4 rounded-2xl shadow-lg`} style={{ backgroundColor: color }}>
        <Icon className="h-8 w-8 text-white" />
      </div>
    </div>
  </motion.div>
)

const ActivityItem = ({ icon: Icon, title, description, time, color, type }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors group"
  >
    <div
      className={`p-3 rounded-full shadow-sm group-hover:shadow-md transition-shadow`}
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
                : type === "info"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {type === "success" ? "Completed" : type === "warning" ? "Pending" : type === "info" ? "New" : "System"}
        </span>
      </div>
    </div>
  </motion.div>
)

const QuickActionCard = ({ icon: Icon, title, description, color, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full p-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 text-left group"
  >
    <div className="flex items-center space-x-4">
      <div
        className={`p-4 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow`}
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
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribers = []

    // Users stats
    const usersUnsub = onSnapshot(collection(firestore, "users"), (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setStats((prev) => ({
        ...prev,
        totalUsers: users.length,
        totalDonors: users.filter((u) => u.userType === "Donor").length,
        totalOrphanages: users.filter((u) => u.userType === "Orphanage").length,
      }))
    })
    unsubscribers.push(usersUnsub)

    // Requests stats
    const requestsUnsub = onSnapshot(collection(firestore, "requests"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalRequests: snapshot.size }))
    })
    unsubscribers.push(requestsUnsub)

    // Services stats
    const servicesUnsub = onSnapshot(collection(firestore, "services"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalServices: snapshot.size }))
    })
    unsubscribers.push(servicesUnsub)

    // Fundraisers stats
    const fundraisersUnsub = onSnapshot(collection(firestore, "fundraisers"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalFundraisers: snapshot.size }))
    })
    unsubscribers.push(fundraisersUnsub)

    // Contact messages stats
    const contactUnsub = onSnapshot(collection(firestore, "contact-us"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalMessages: snapshot.size }))
    })
    unsubscribers.push(contactUnsub)

    // Subscriptions stats
    const subscriptionsUnsub = onSnapshot(collection(firestore, "subscriptions"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalSubscriptions: snapshot.size }))
      setLoading(false)
    })
    unsubscribers.push(subscriptionsUnsub)

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
        subtitle: "Active platform members",
      },
      {
        title: "Active Donors",
        value: stats.totalDonors,
        icon: Users,
        color: "#10B981",
        trend: 8,
        subtitle: "Generous contributors",
      },
      {
        title: "Orphanages",
        value: stats.totalOrphanages,
        icon: Users,
        color: "#8B5CF6",
        trend: 5,
        subtitle: "Partner organizations",
      },
      {
        title: "Total Requests",
        value: stats.totalRequests,
        icon: MessageSquare,
        color: "#F59E0B",
        trend: 15,
        subtitle: "Help requests received",
      },
      {
        title: "Services Offered",
        value: stats.totalServices,
        icon: Activity,
        color: "#6366F1",
        trend: 7,
        subtitle: "Educational programs",
      },
      {
        title: "Active Fundraisers",
        value: stats.totalFundraisers,
        icon: TrendingUp,
        color: "#EC4899",
        trend: 20,
        subtitle: "Ongoing campaigns",
      },
      {
        title: "Contact Messages",
        value: stats.totalMessages,
        icon: MessageSquare,
        color: "#EF4444",
        trend: -3,
        subtitle: "Support inquiries",
      },
      {
        title: "Newsletter Subscribers",
        value: stats.totalSubscriptions,
        icon: Mail,
        color: "#14B8A6",
        trend: 25,
        subtitle: "Email subscribers",
      },
    ],
    [stats],
  )

  const recentActivity = [
    {
      icon: Users,
      title: "New user registered",
      description: "John Doe joined as a donor from Karachi",
      time: "2 min ago",
      color: "#10B981",
      type: "success",
    },
    {
      icon: MessageSquare,
      title: "New donation request",
      description: "Hope Orphanage requested food supplies for 50 children",
      time: "5 min ago",
      color: "#3B82F6",
      type: "info",
    },
    {
      icon: TrendingUp,
      title: "Fundraiser milestone",
      description: "Education fund reached 75% of Rs. 100,000 goal",
      time: "10 min ago",
      color: "#8B5CF6",
      type: "success",
    },
    {
      icon: Mail,
      title: "New contact message",
      description: "Support inquiry from donor about donation process",
      time: "15 min ago",
      color: "#F59E0B",
      type: "warning",
    },
    {
      icon: AlertCircle,
      title: "System notification",
      description: "Weekly backup completed successfully",
      time: "1 hour ago",
      color: "#6B7280",
      type: "system",
    },
  ]

  const quickActions = [
    {
      icon: BarChart3,
      title: "View Analytics",
      description: "Check detailed platform statistics",
      color: "#3B82F6",
      onClick: () => {},
    },
    {
      icon: Users,
      title: "Manage Users",
      description: "Add, edit, or remove users",
      color: "#10B981",
      onClick: () => {},
    },
    {
      icon: MessageSquare,
      title: "Check Messages",
      description: "Review contact form submissions",
      color: "#8B5CF6",
      onClick: () => {},
    },
    {
      icon: Mail,
      title: "Email Subscribers",
      description: "Send newsletter to subscribers",
      color: "#F59E0B",
      onClick: () => {},
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
          <div className="w-full h-full bg-white rounded-full transform translate-x-20 -translate-y-20"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-3">Welcome back, {user?.fullName || "Admin"}! 👋</h1>
              <p className="text-blue-100 text-lg mb-4">Here's what's happening with your platform today.</p>
              <div className="flex items-center space-x-6 text-sm">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl shadow-lg border border-gray-100"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                  <p className="text-gray-600 text-sm mt-1">Latest platform updates and notifications</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                  View all
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
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
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
              <p className="text-gray-600 text-sm mt-1">Frequently used admin tools</p>
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
  )
}
