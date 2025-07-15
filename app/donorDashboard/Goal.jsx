"use client"
import { useEffect, useState } from "react"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from "firebase/firestore"
import {
  Calendar,
  Heart,
  Star,
  TrendingUp,
  Award,
  Target,
  Flame,
  Trophy,
  Gift,
  Users,
  Edit3,
  Save,
  X,
  Zap,
  Crown,
  Medal,
  Sparkles,
  Bell,
  Share2,
} from "lucide-react"
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"

export default function EnhancedGoalTracker() {
  // Enhanced State Management
  const [goals, setGoals] = useState({
    daily: { amount: 1000, type: "amount" },
    weekly: { amount: 7000, type: "amount" },
    monthly: { amount: 30000, type: "amount" },
    yearly: { amount: 365000, type: "amount" },
  })
  const [achievements, setAchievements] = useState([])
  const [streaks, setStreaks] = useState({
    current: 0,
    longest: 0,
    weekly: 0,
    monthly: 0,
  })
  const [analytics, setAnalytics] = useState({
    todayAmount: 0,
    weekAmount: 0,
    monthAmount: 0,
    yearAmount: 0,
    avgDailyDonation: 0,
    totalDonations: 0,
    impactScore: 0,
  })
  const [weeklyData, setWeeklyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [donationTypes, setDonationTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingGoal, setEditingGoal] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [milestones, setMilestones] = useState([])
  const [socialStats, setSocialStats] = useState({
    rank: 0,
    percentile: 0,
    communityImpact: 0,
  })
  const user = auth.currentUser

  // Enhanced Data Fetching
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const userRef = doc(firestore, "users", user.uid)
    const fetchUserData = async () => {
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const data = snap.data()
        if (data.goals) setGoals((prev) => ({ ...prev, ...data.goals }))
        if (data.achievements) setAchievements(data.achievements)
        if (data.streaks) setStreaks((prev) => ({ ...prev, ...data.streaks }))
        if (data.milestones) setMilestones(data.milestones || [])
      }
    }
    fetchUserData()

    // Real-time donation tracking
    const directDonationQuery = query(collection(firestore, "donations"), where("donorId", "==", user.uid))

    const unsubscribe = onSnapshot(directDonationQuery, async (snapshot) => {
      const directDonations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isFundraiserDonation: false, // Flag for direct donations
      }))

      // Fetch fundraiser donations (one-time fetch for now, could be real-time if needed)
      const allFundraiserDonations = []
      const fundraisersSnap = await getDocs(collection(firestore, "fundraisers"))
      for (const fundraiserDoc of fundraisersSnap.docs) {
        const donationsInFundraiserSnap = await getDocs(
          query(collection(firestore, "fundraisers", fundraiserDoc.id, "donations"), where("donorId", "==", user.uid)),
        )
        donationsInFundraiserSnap.docs.forEach((donationDoc) => {
          allFundraiserDonations.push({
            id: donationDoc.id,
            fundraiserId: fundraiserDoc.id,
            fundraiserTitle: fundraiserDoc.data().title,
            ...donationDoc.data(),
            donationType: "Fundraiser Donation", // Explicitly set type
            isFundraiserDonation: true, // Flag for fundraiser donations
          })
        })
      }

      const allCombinedDonations = [...directDonations, ...allFundraiserDonations].sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(0)
        const bTime = b.timestamp?.toDate?.() || new Date(0)
        return aTime.getTime() - bTime.getTime() // Sort ascending for streak calculation
      })

      calculateAnalytics(allCombinedDonations)
      calculateStreaks(allCombinedDonations)
      generateWeeklyData(allCombinedDonations)
      generateMonthlyData(allCombinedDonations)
      analyzeDonationTypes(allCombinedDonations)
      checkAchievements(allCombinedDonations)
      calculateSocialStats(allCombinedDonations)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, goals, streaks, achievements, donationTypes]) // Added dependencies for re-calculation when goals/streaks/achievements change

  // Enhanced Analytics Calculation
  const calculateAnalytics = (donations) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    let todayAmount = 0
    let weekAmount = 0
    let monthAmount = 0
    let yearAmount = 0
    let totalAmount = 0

    donations.forEach((donation) => {
      const donationDate = donation.timestamp?.toDate()
      // Ensure we only sum monetary amounts from 'Money' and 'Fundraiser Donation' types
      const amount =
        (donation.donationType === "Money" || donation.donationType === "Fundraiser Donation") &&
        typeof donation.amount === "number"
          ? donation.amount
          : 0

      if (donationDate) {
        totalAmount += amount
        if (donationDate >= today) todayAmount += amount
        if (donationDate >= weekStart) weekAmount += amount
        if (donationDate >= monthStart) monthAmount += amount
        if (donationDate >= yearStart) yearAmount += amount
      }
    })

    const avgDailyDonation =
      donations.length > 0
        ? totalAmount /
          Math.max(
            1,
            Math.ceil(
              (now.getTime() - (donations[0]?.timestamp?.toDate()?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0

    const impactScore = Math.floor(
      donations.length * 10 + totalAmount / 100 + streaks.current * 5 + achievements.length * 15,
    )

    setAnalytics({
      todayAmount,
      weekAmount,
      monthAmount,
      yearAmount,
      avgDailyDonation,
      totalDonations: donations.length,
      impactScore,
    })
  }

  // Enhanced Streak Calculation
  const calculateStreaks = (donations) => {
    const dailyGoalMetDates = new Set()
    const donationsByDay = new Map()

    donations.forEach((donation) => {
      const date = donation.timestamp?.toDate()
      if (!date) return

      const dateKey = date.toDateString()
      const amount =
        (donation.donationType === "Money" || donation.donationType === "Fundraiser Donation") &&
        typeof donation.amount === "number"
          ? donation.amount
          : 0

      donationsByDay.set(dateKey, (donationsByDay.get(dateKey) || 0) + amount)
    })

    // Determine which days met the daily goal
    for (const [dateKey, totalAmount] of donationsByDay.entries()) {
      if (totalAmount >= goals.daily.amount) {
        dailyGoalMetDates.add(dateKey)
      }
    }

    // Calculate current and longest streak
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    // Iterate backwards from today to calculate streaks
    for (let i = 0; i < 365; i++) {
      // Check up to a year back
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateKey = checkDate.toDateString()

      if (dailyGoalMetDates.has(dateKey)) {
        tempStreak++
        if (i === 0) {
          // If today met the goal, it contributes to current streak
          currentStreak = tempStreak
        }
      } else {
        // If the current day (i=0) didn't meet the goal, current streak is 0
        if (i === 0) {
          currentStreak = 0
        }
        // If a previous day didn't meet the goal, the streak is broken
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 0
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak) // Capture the last streak if it's the longest

    setStreaks((prev) => ({
      ...prev,
      current: currentStreak,
      longest: longestStreak,
    }))
  }

  // Generate Weekly Chart Data
  const generateWeeklyData = (donations) => {
    const weekData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0) // Normalize to start of day
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
      const dayTotal = donations
        .filter((d) => {
          const donationDate = d.timestamp?.toDate()
          return (
            donationDate &&
            donationDate.toDateString() === date.toDateString() &&
            (d.donationType === "Money" || d.donationType === "Fundraiser Donation")
          )
        })
        .reduce((sum, d) => sum + (d.amount || 0), 0)
      weekData.push({
        day: dayName,
        amount: dayTotal,
        goal: goals.daily.amount,
        date: date.toISOString().split("T")[0],
      })
    }
    setWeeklyData(weekData)
  }

  // Generate Monthly Chart Data
  const generateMonthlyData = (donations) => {
    const monthData = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      date.setDate(1) // Set to first day of month for consistent comparison
      date.setHours(0, 0, 0, 0) // Normalize to start of day
      const monthName = date.toLocaleDateString("en-US", { month: "short" })
      const monthTotal = donations
        .filter((d) => {
          const donationDate = d.timestamp?.toDate()
          return (
            donationDate &&
            donationDate.getMonth() === date.getMonth() &&
            donationDate.getFullYear() === date.getFullYear() &&
            (d.donationType === "Money" || d.donationType === "Fundraiser Donation")
          )
        })
        .reduce((sum, d) => sum + (d.amount || 0), 0)
      monthData.push({
        month: monthName,
        amount: monthTotal,
        goal: goals.monthly.amount,
      })
    }
    setMonthlyData(monthData)
  }

  // Analyze Donation Types
  const analyzeDonationTypes = (donations) => {
    const typeCount = {}
    donations.forEach((d) => {
      const type = d.donationType || "Other"
      // For pie chart, we want to sum the amounts for each type
      const amount =
        (d.donationType === "Money" || d.donationType === "Fundraiser Donation") && typeof d.amount === "number"
          ? d.amount
          : 0 // Only sum monetary values for these types

      typeCount[type] = (typeCount[type] || 0) + amount
    })
    const typeData = Object.entries(typeCount).map(([type, amount]) => ({
      name: type,
      value: amount,
      count: donations.filter((d) => (d.donationType || "Other") === type).length, // Still count total donations of that type
    }))
    setDonationTypes(typeData)
  }

  // Achievement System
  const checkAchievements = async (donations) => {
    const newAchievements = []
    const totalAmount = donations.reduce((sum, d) => {
      return (d.donationType === "Money" || d.donationType === "Fundraiser Donation") && typeof d.amount === "number"
        ? sum + d.amount
        : sum
    }, 0)
    const totalCount = donations.length

    // Achievement definitions
    const achievementRules = [
      {
        id: "first_donation",
        name: "First Steps",
        description: "Made your first donation",
        icon: "🎉",
        condition: () => totalCount >= 1,
      },
      {
        id: "generous_giver",
        name: "Generous Giver",
        description: "Donated Rs. 10,000+",
        icon: "💝",
        condition: () => totalAmount >= 10000,
      },
      {
        id: "consistent_donor",
        name: "Consistent Donor",
        description: "7-day donation streak",
        icon: "🔥",
        condition: () => streaks.current >= 7,
      },
      {
        id: "community_hero",
        name: "Community Hero",
        description: "50+ donations made",
        icon: "🦸",
        condition: () => totalCount >= 50,
      },
      {
        id: "major_contributor",
        name: "Major Contributor",
        description: "Donated Rs. 100,000+",
        icon: "💎",
        condition: () => totalAmount >= 100000,
      },
      {
        id: "streak_master",
        name: "Streak Master",
        description: "30-day donation streak",
        icon: "👑",
        condition: () => streaks.current >= 30,
      },
      {
        id: "diversity_champion",
        name: "Diversity Champion",
        description: "Donated 5+ different types",
        icon: "🌈",
        condition: () => donationTypes.length >= 5,
      },
    ]

    achievementRules.forEach((rule) => {
      if (rule.condition() && !achievements.find((a) => a.id === rule.id)) {
        newAchievements.push({
          ...rule,
          unlockedAt: new Date(),
        })
      }
    })

    if (newAchievements.length > 0) {
      const updatedAchievements = [...achievements, ...newAchievements]
      setAchievements(updatedAchievements)
      // Save to Firebase
      if (user) {
        await updateDoc(doc(firestore, "users", user.uid), {
          achievements: updatedAchievements,
        })
      }
      // Show notifications
      newAchievements.forEach((achievement) => {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            type: "achievement",
            title: `Achievement Unlocked: ${achievement.name}!`,
            message: achievement.description,
            icon: achievement.icon,
          },
        ])
      })
    }
  }

  // Social Stats Calculation
  const calculateSocialStats = (donations) => {
    // This would typically involve comparing with other users
    // For demo purposes, we'll simulate some values
    const totalAmount = donations.reduce((sum, d) => {
      return (d.donationType === "Money" || d.donationType === "Fundraiser Donation") && typeof d.amount === "number"
        ? sum + d.amount
        : sum
    }, 0)
    const rank = Math.max(1, Math.floor(Math.random() * 100))
    const percentile = Math.min(99, Math.floor(totalAmount / 1000 + Math.random() * 20))
    const communityImpact = Math.floor(totalAmount / 100)
    setSocialStats({ rank, percentile, communityImpact })
  }

  // Goal Management
  const updateGoal = async (period, newAmount) => {
    const updatedGoals = {
      ...goals,
      [period]: { ...goals[period], amount: newAmount },
    }
    setGoals(updatedGoals)
    if (user) {
      await updateDoc(doc(firestore, "users", user.uid), {
        goals: updatedGoals,
      })
    }
    setEditingGoal(null)
  }

  // Progress Calculations
  const getProgress = (period) => {
    const current = analytics[`${period}Amount`] || 0
    const goal = goals[period]?.amount || 1
    return Math.min((current / goal) * 100, 100)
  }

  const getProgressColor = (progress) => {
    if (progress >= 100) return "bg-green-500"
    if (progress >= 75) return "bg-blue-500"
    if (progress >= 50) return "bg-yellow-500"
    return "bg-gray-400"
  }

  // Chart Colors
  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#F97316"]

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-2xl shadow-lg border-l-4 border-yellow-600"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{notification.icon}</span>
                <div>
                  <h4 className="font-bold">{notification.title}</h4>
                  <p className="text-sm opacity-90">{notification.message}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {/* Enhanced Goal Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(goals).map(([period, goal]) => (
          <motion.div
            key={period}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`p-2 rounded-lg ${
                    period === "daily"
                      ? "bg-red-100"
                      : period === "weekly"
                        ? "bg-blue-100"
                        : period === "monthly"
                          ? "bg-green-100"
                          : "bg-purple-100"
                  }`}
                >
                  {period === "daily" && <Heart className="w-5 h-5 text-red-500" />}
                  {period === "weekly" && <Calendar className="w-5 h-5 text-blue-500" />}
                  {period === "monthly" && <TrendingUp className="w-5 h-5 text-green-500" />}
                  {period === "yearly" && <Trophy className="w-5 h-5 text-purple-500" />}
                </div>
                <h3 className="font-semibold text-gray-800 capitalize">{period} Goal</h3>
              </div>
              <button onClick={() => setEditingGoal(period)} className="text-gray-400 hover:text-gray-600">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            {editingGoal === period ? (
              <div className="space-y-3">
                <input
                  type="number"
                  defaultValue={goal.amount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      updateGoal(period, Number.parseInt(e.target.value))
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateGoal(period, Number.parseInt(document.querySelector("input").value))}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Save className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setEditingGoal(null)}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Rs. {analytics[`${period}Amount`]?.toLocaleString() || 0}</span>
                    <span>Rs. {goal.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(getProgress(period))}`}
                      style={{ width: `${getProgress(period)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-800">{Math.round(getProgress(period))}%</span>
                  <p className="text-xs text-gray-500">Complete</p>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
      {/* Streak & Achievement Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak Dashboard */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 shadow-lg border border-orange-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Donation Streaks</h2>
              <p className="text-sm text-gray-600">Keep the momentum going!</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{streaks.current}</div>
              <div className="text-sm text-gray-600">Current Streak</div>
              <div className="text-xs text-gray-500">days</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{streaks.longest}</div>
              <div className="text-sm text-gray-600">Longest Streak</div>
              <div className="text-xs text-gray-500">days</div>
            </div>
          </div>
          {streaks.current >= 3 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  🔥 You're on fire! {streaks.current} days strong!
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Achievements */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 shadow-lg border border-purple-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Achievements</h2>
              <p className="text-sm text-gray-600">{achievements.length} unlocked</p>
            </div>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Start donating to unlock achievements!</p>
              </div>
            ) : (
              achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-white/70 backdrop-blur-sm rounded-lg"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{achievement.name}</h4>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                  <Medal className="w-5 h-5 text-yellow-500" />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Enhanced Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-800">Weekly Trend</h2>
            </div>
            <div className="text-sm text-gray-500">Total: Rs. {analytics.weekAmount.toLocaleString()}</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`Rs. ${value.toLocaleString()}`, "Amount"]}
                labelFormatter={(label) => `Day: ${label}`}
              />
              <Area type="monotone" dataKey="amount" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAmount)" />
              <Bar dataKey="goal" fill="#E5E7EB" opacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Monthly Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-800">Monthly Overview</h2>
            </div>
            <div className="text-sm text-gray-500">This Year: Rs. {analytics.yearAmount.toLocaleString()}</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, "Amount"]} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Donation Types & Social Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Types Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Gift className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold text-gray-800">Donation Types</h2>
          </div>
          {donationTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={donationTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {donationTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No donation data available</p>
            </div>
          )}
        </div>
        {/* Social Impact Stats */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg border border-indigo-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Community Impact</h2>
              <p className="text-sm text-gray-600">Your social contribution</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-3">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-700">Community Rank</span>
              </div>
              <span className="text-xl font-bold text-indigo-600">#{socialStats.rank}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-700">Top Percentile</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{socialStats.percentile}%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-gray-700">Impact Score</span>
              </div>
              <span className="text-xl font-bold text-purple-600">{analytics.impactScore}</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-xl border border-green-200">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                You've helped {socialStats.communityImpact} children this year!
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-5 h-5 text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl hover:shadow-md transition-all">
            <Bell className="w-6 h-6 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Set Reminders</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:shadow-md transition-all">
            <Share2 className="w-6 h-6 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Share Progress</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all">
            <Trophy className="w-6 h-6 text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">View Leaderboard</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl hover:shadow-md transition-all">
            <Target className="w-6 h-6 text-yellow-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Set New Goals</span>
          </button>
        </div>
      </div>
    </div>
  )
}
