"use client"

import { useState, useEffect, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { motion } from "framer-motion"
import {
  Heart,
  DollarSign,
  GraduationCap,
  TrendingUp,
  Gift,
  Target,
  Award,
  ArrowRight,
  Sparkles,
  Activity,
  Users,
  Calendar,
  Star,
  CheckCircle,
  Clock,
} from "lucide-react"
import AIDonationSuggestionBot from "@/components/aibot"
export default function DonorDashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalAmount: 0,
    servicesFulfilled: 0,
    fundraisersSupported: 0,
    monthlyDonations: 0,
    impactScore: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([])
  const [achievements, setAchievements] = useState([])

  useEffect(() => {
    fetchUserAndStats()
  }, [])

  const fetchUserAndStats = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setLoading(false)
      return
    }

    try {
      // Fetch user data
      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
      setUser(userDoc.exists() ? userDoc.data() : { email: currentUser.email })

      // Set up real-time listeners for better performance
      const donationsQuery = query(collection(firestore, "donations"), where("donorId", "==", currentUser.uid))
      const servicesQuery = query(collection(firestore, "services"), where("donorId", "==", currentUser.uid))

      // Real-time donations listener
      const unsubscribeDonations = onSnapshot(donationsQuery, (donationsSnap) => {
        let totalAmount = 0
        const donations = donationsSnap.docs.map((doc) => doc.data())

        donations.forEach((data) => {
          if (data.amount) totalAmount += data.amount
        })

        // Calculate monthly donations
        const thisMonth = new Date()
        thisMonth.setDate(1)
        const monthlyDonations = donations.filter((d) => {
          const donationDate = d.timestamp?.toDate()
          return donationDate && donationDate >= thisMonth
        }).length

        setStats((prev) => ({
          ...prev,
          totalDonations: donations.length,
          totalAmount,
          monthlyDonations,
          impactScore: Math.floor((donations.length * 10 + totalAmount / 100) / 10),
        }))

        // Set recent activity
        const recentDonations = donations
          .sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0))
          .slice(0, 5)
          .map((donation) => ({
            id: donation.id || Math.random(),
            type: "donation",
            title: `Donated ${donation.donationType}`,
            description: donation.description || "Thank you for your contribution",
            timestamp: donation.timestamp?.toDate(),
            amount: donation.amount,
          }))

        setRecentActivity(recentDonations)
      })

      // Real-time services listener
      const unsubscribeServices = onSnapshot(servicesQuery, (servicesSnap) => {
        setStats((prev) => ({
          ...prev,
          servicesFulfilled: servicesSnap.size,
        }))
      })

      // Fetch fundraiser donations
      const fundraisersSnap = await getDocs(collection(firestore, "fundraisers"))
      let fundraisersSupported = 0

      for (const fundraiserDoc of fundraisersSnap.docs) {
        const donationsInFundraiser = await getDocs(
          query(
            collection(firestore, "fundraisers", fundraiserDoc.id, "donations"),
            where("donorId", "==", currentUser.uid),
          ),
        )
        if (donationsInFundraiser.size > 0) {
          fundraisersSupported++
        }
      }

      setStats((prev) => ({
        ...prev,
        fundraisersSupported,
      }))

      // Calculate achievements
      const userAchievements = []
      if (stats.totalDonations >= 1) userAchievements.push({ title: "First Donation", icon: "🎉" })
      if (stats.totalDonations >= 5) userAchievements.push({ title: "Generous Giver", icon: "💝" })
      if (stats.totalDonations >= 10) userAchievements.push({ title: "Community Hero", icon: "🦸" })
      if (stats.totalAmount >= 1000) userAchievements.push({ title: "Major Contributor", icon: "💎" })

      setAchievements(userAchievements)

      return () => {
        unsubscribeDonations()
        unsubscribeServices()
      }
    } catch (error) {
      console.error("Failed to fetch user data and stats:", error)
      setUser({ email: currentUser.email })
    } finally {
      setLoading(false)
    }
  }

  const statCards = useMemo(
    () => [
      {
        title: "Total Donations",
        value: stats.totalDonations,
        icon: Heart,
        color: "from-red-500 to-pink-500",
        bgColor: "bg-red-50",
        description: "Acts of kindness",
        trend: `+${stats.monthlyDonations} this month`,
      },
      {
        title: "Amount Donated",
        value: `Rs. ${stats.totalAmount.toLocaleString()}`,
        icon: DollarSign,
        color: "from-green-500 to-emerald-500",
        bgColor: "bg-green-50",
        description: "Total contribution",
        trend: "Keep it up!",
      },
      {
        title: "Services Provided",
        value: stats.servicesFulfilled,
        icon: GraduationCap,
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-50",
        description: "Educational support",
        trend: "Making a difference",
      },
      {
        title: "Impact Score",
        value: stats.impactScore,
        icon: Star,
        color: "from-purple-500 to-indigo-500",
        bgColor: "bg-purple-50",
        description: "Community impact",
        trend: "Growing strong",
      },
    ],
    [stats],
  )

  const quickActions = useMemo(
    () => [
      {
        title: "Make a Donation",
        description: "Help children in need by fulfilling their requests",
        icon: Heart,
        color: "from-red-500 to-pink-500",
        href: "/DonationRequests",
      },
      {
        title: "Offer Services",
        description: "Share your skills and knowledge with orphanages",
        icon: GraduationCap,
        color: "from-blue-500 to-cyan-500",
        href: "/donorDashboard/fullfillServices",
      },
      {
        title: "Support Fundraisers",
        description: "Contribute to ongoing fundraising campaigns",
        icon: DollarSign,
        color: "from-green-500 to-emerald-500",
        href: "/FundRaise",
      },
      {
        title: "View History",
        description: "Track your donations and contributions",
        icon: TrendingUp,
        color: "from-purple-500 to-indigo-500",
        href: "/donorDashboard/donationHistory",
      },
    ],
    [],
  )

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
        {/* Enhanced Welcome Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white bg-opacity-10 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold">
                        Welcome back, {user?.fullName || user?.email?.split("@")[0] || "Donor"}! 👋
                      </h1>
                      <p className="text-green-100 text-lg mt-2">
                        Thank you for making a difference in children's lives
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-green-100 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      <span>Active Donor</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>Community Helper</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      <span>Impact Score: {stats.impactScore}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Gift className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Donation Suggestion Bot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-8"
        >
          <AIDonationSuggestionBot donationHistory={recentActivity} userStats={stats} />
        </motion.div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
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
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{stat.title}</p>
                <p className="text-sm text-gray-500 mb-2">{stat.description}</p>
                <span className="text-xs text-green-600 font-medium">{stat.trend}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Your Achievements</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.title}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-full border border-yellow-200"
                  >
                    <span className="text-lg">{achievement.icon}</span>
                    <span className="font-medium text-gray-800">{achievement.title}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r ${action.color} group-hover:scale-110 transition-transform`}
                      >
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{action.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
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
                    <p className="text-sm">Start donating to see your impact!</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Heart className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {activity.timestamp?.toLocaleDateString() || "Recently"}
                          </span>
                        </div>
                      </div>
                      {activity.amount && (
                        <span className="text-sm font-medium text-green-600">Rs. {activity.amount}</span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Impact Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Your Impact Dashboard</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-700 mb-4 text-lg">What you can do:</h3>
              <div className="space-y-3">
                {[
                  { text: "View and fulfill donation requests", icon: CheckCircle },
                  { text: "Offer your skills and services", icon: GraduationCap },
                  { text: "Support fundraising campaigns", icon: Target },
                  { text: "Track your donation history", icon: Clock },
                  { text: "Connect with orphanages", icon: Users },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="p-1 bg-green-100 rounded-full">
                      <item.icon className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-600">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-4 text-lg">Your Achievements:</h3>
              <div className="space-y-4">
                {[
                  { label: "Donations Made", value: stats.totalDonations, color: "bg-red-500", icon: Heart },
                  {
                    label: "Amount Contributed",
                    value: `Rs. ${stats.totalAmount.toLocaleString()}`,
                    color: "bg-green-500",
                    icon: DollarSign,
                  },
                  {
                    label: "Fundraisers Supported",
                    value: stats.fundraisersSupported,
                    color: "bg-purple-500",
                    icon: Target,
                  },
                  {
                    label: "Impact Score",
                    value: stats.impactScore,
                    color: "bg-yellow-500",
                    icon: Star,
                  },
                ].map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 ${achievement.color} rounded-full`}></div>
                      <achievement.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{achievement.label}</span>
                    </div>
                    <span className="font-bold text-gray-900">{achievement.value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
