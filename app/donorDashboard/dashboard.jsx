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
  Sparkles,
  Users,
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
  // States to hold raw data from real-time listeners and one-time fetches
  const [allDonations, setAllDonations] = useState([])
  const [allServices, setAllServices] = useState([])
  const [allFundraiserDonations, setAllFundraiserDonations] = useState([]) // State for fundraiser donations
  const [achievements, setAchievements] = useState([])

  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setLoading(false)
      return
    }

    const setupListenersAndFetchData = async () => {
      try {
        // Fetch user data
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
        setUser(userDoc.exists() ? userDoc.data() : { email: currentUser.email })

        // Set up real-time listeners for donations
        const donationsQuery = query(collection(firestore, "donations"), where("donorId", "==", currentUser.uid))
        const unsubscribeDonations = onSnapshot(donationsQuery, (donationsSnap) => {
          const donations = donationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          setAllDonations(donations)
        })

        // Fetch fundraiser donations (one-time fetch, as subcollections don't support direct `where` queries across all parents)
        const fetchFundraiserDonations = async () => {
          const fundraisersSnap = await getDocs(collection(firestore, "fundraisers"))
          let supportedCount = 0
          const fundraiserDonationsList = []
          for (const fundraiserDoc of fundraisersSnap.docs) {
            const donationsInFundraiserSnap = await getDocs(
              query(
                collection(firestore, "fundraisers", fundraiserDoc.id, "donations"),
                where("donorId", "==", currentUser.uid),
              ),
            )
            if (!donationsInFundraiserSnap.empty) {
              supportedCount++
              donationsInFundraiserSnap.docs.forEach((donationDoc) => {
                fundraiserDonationsList.push({
                  id: donationDoc.id,
                  fundraiserId: fundraiserDoc.id,
                  fundraiserTitle: fundraiserDoc.data().title, // Get title from parent fundraiser
                  ...donationDoc.data(),
                })
              })
            }
          }
          setAllFundraiserDonations(fundraiserDonationsList)
          setStats((prev) => ({
            ...prev,
            fundraisersSupported: supportedCount,
          }))
        }
        fetchFundraiserDonations()

        return () => {
          unsubscribeDonations()
        }
      } catch (error) {
        console.error("Failed to fetch initial data or set up listeners:", error)
        setUser({ email: auth.currentUser.email })
        setLoading(false) // Ensure loading is false on error
      }
    }
    setupListenersAndFetchData()
  }, []) // Empty dependency array for initial setup of listeners and one-time fetches

  // Effect to process raw data from listeners and update aggregated stats/recentActivity
  useEffect(() => {
    let totalAmount = 0
    // Sum from direct donations
    allDonations.forEach((data) => {
      if (data.donationType === "Money" && typeof data.amount === "number") {
        totalAmount += data.amount
      }
    })
    // Sum from fundraiser donations
    allFundraiserDonations.forEach((data) => {
      if (typeof data.amount === "number") {
        totalAmount += data.amount
      }
    })

    const thisMonth = new Date()
    thisMonth.setDate(1)
    const monthlyDonations = allDonations.filter((d) => {
      const donationDate = d.timestamp?.toDate()
      return donationDate && donationDate >= thisMonth
    }).length

    let fulfilledServicesCount = 0
    const serviceFulfillmentDonations = allDonations.filter(
      (d) => d.donationType === "Service Fulfillment" && d.serviceId,
    )

    // Fetch all linked service documents for service fulfillment donations
    const servicePromises = serviceFulfillmentDonations.map((donation) => {
      return getDoc(doc(firestore, "services", donation.serviceId))
        .then((serviceDoc) => {
          return serviceDoc.exists() ? serviceDoc.data() : null
        })
        .catch((error) => {
          console.error("Error fetching linked service for dashboard:", donation.serviceId, error)
          return null
        })
    })

    Promise.all(servicePromises).then((linkedServices) => {
      linkedServices.forEach((serviceData) => {
        if (serviceData && serviceData.status === "Fulfilled") {
          fulfilledServicesCount++
        }
      })

      setStats((prev) => {
        const newTotalDonations = allDonations.length + allFundraiserDonations.length // Count all types of donations
        const newImpactScore = Math.floor((newTotalDonations * 10 + totalAmount / 100) / 10)
        return {
          ...prev,
          totalDonations: newTotalDonations,
          totalAmount,
          monthlyDonations,
          servicesFulfilled: fulfilledServicesCount,
          impactScore: newImpactScore,
        }
      })

      // Combine and sort recent activity
      const processActivity = () => {
        const processedDonations = allDonations.map((donation) => {
          if (donation.serviceId) {
            const serviceDoc = allServices.find((service) => service.id === donation.serviceId)
            if (serviceDoc) {
              return {
                id: donation.id,
                type: "Service Fulfillment",
                title: serviceDoc.title || "Service Fulfillment",
                description: donation.donationNote || serviceDoc.description || "Service Fulfilled",
                timestamp: donation.timestamp?.toDate(),
                status: serviceDoc.status || "Pending",
                amount: null,
              }
            }
          }
          return {
            id: donation.id,
            type: donation.donationType,
            title: `Donated ${donation.donationType}`,
            description: donation.description || "Thank you for your contribution",
            timestamp: donation.timestamp?.toDate(),
            amount: donation.amount,
            status: donation.confirmed ? "Approved" : "Pending",
          }
        })

        const processedFundraiserDonations = allFundraiserDonations.map((donation) => ({
          id: donation.id,
          type: "Fundraiser Donation",
          title: donation.fundraiserTitle || "Fundraiser Donation",
          description: `Contributed Rs. ${Number(donation.amount).toLocaleString()} to ${donation.fundraiserTitle}`,
          timestamp: donation.timestamp?.toDate(),
          amount: donation.amount,
          status: donation.status === "pending" ? "Pending" : "Approved",
        }))

        const combinedActivity = [...processedDonations, ...processedFundraiserDonations]
        const sortedRecentActivity = combinedActivity
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 5)
        setRecentActivity(sortedRecentActivity)

        // Calculate achievements based on updated stats
        const userAchievements = []
        const newTotalDonations = allDonations.length + allFundraiserDonations.length // Declare newTotalDonations here
        if (newTotalDonations >= 1) userAchievements.push({ title: "First Donation", icon: "🎉" })
        if (newTotalDonations >= 5) userAchievements.push({ title: "Generous Giver", icon: "💝" })
        if (newTotalDonations >= 10) userAchievements.push({ title: "Community Hero", icon: "🦸" })
        if (totalAmount >= 1000) userAchievements.push({ title: "Major Contributor", icon: "💎" })
        setAchievements(userAchievements)
        setLoading(false) // Set loading to false once all data is processed
      }
      processActivity()
    })
  }, [allDonations, allServices, allFundraiserDonations, user]) // Dependencies for this effect

  const statCards = useMemo(
    () => [
      {
        title: "Total Donations",
        value: stats.totalDonations,
        icon: Heart,
        color: "from-red-500 to-pink-500",
        bgColor: "bg-red-50",
        description: "Acts of kindness",
        trend: ` this month`,
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

  // Quick actions are removed as per request.

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 text-lg font-medium">
            Loading your dashboard...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
