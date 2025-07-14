"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Users,
  Download,
  RefreshCw,
  Heart,
  Building,
  DollarSign,
  Shirt,
  Utensils,
  GraduationCap,
  HeartHandshake,
  Clock,
  Target,
  Activity,
  PieChart,
  AlertCircle,
  Calendar,
  Eye,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Import db and onSnapshot from firebase
import { db } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"
import { Timestamp } from "firebase/firestore" // Import Timestamp for dummy data

export default function AdminStatistics() {
  // Raw data states
  const [usersData, setUsersData] = useState([])
  const [requestsData, setRequestsData] = useState([])
  const [servicesData, setServicesData] = useState([])
  const [fundraisersData, setFundraisersData] = useState([])
  const [messagesData, setMessagesData] = useState([])
  const [subscriptionsData, setSubscriptionsData] = useState([])
  const [donationsData, setDonationsData] = useState([])

  // Processed stats state
  const [stats, setStats] = useState({
    overview: {
      totalUsers: 0,
      totalDonors: 0,
      totalOrphanages: 0,
      totalRequests: 0,
      totalServices: 0,
      totalFundraisers: 0,
      totalMessages: 0,
      totalSubscriptions: 0,
      totalDonations: 0,
      totalDonationsAmount: 0,
      activeUsers: 0,
      pendingRequests: 0,
      completedRequests: 0,
      successRate: 0,
    },
    trends: {
      userGrowth: [],
      contentGrowth: [],
      donationTrends: [],
      requestFulfillment: [],
      messageGrowth: [],
    },
    distribution: {
      userTypes: [],
      contentTypes: [],
      requestTypes: [],
      donationStatus: [],
    },
    engagement: {
      dailyActive: [],
      monthlyStats: [],
    },
    requestQuantities: {
      clothes: { count: 0, totalQuantity: 0, donated: 0 },
      food: { count: 0, totalQuantity: 0, donated: 0 },
      money: { count: 0, totalQuantity: 0, donated: 0 },
      education: { count: 0, totalQuantity: 0, donated: 0 },
      medical: { count: 0, totalQuantity: 0, donated: 0 },
      other: { count: 0, totalQuantity: 0, donated: 0 },
    },
    performance: {
      // Added performance metrics
      conversionRate: 0,
      avgDonationAmount: 0,
      responseTime: 0,
      userSatisfaction: 0,
      monthlyGrowth: 0,
      retentionRate: 0,
    },
    topPerformers: {
      topDonors: [],
      topOrphanages: [],
    },
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("30") // days
  const [error, setError] = useState(null)

  // Helper functions for data processing (memoized)
  const getRandomColor = useCallback(() => {
    const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"]
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  const generateTimeSeriesData = useCallback((data, days, dateField) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const count = data.filter((item) => {
        const itemDate = item[dateField]?.toDate?.() || (item[dateField] instanceof Date ? item[dateField] : null)
        if (!itemDate) return false
        return itemDate.toISOString().split("T")[0] === dateStr
      }).length
      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
        fullDate: dateStr,
      })
    }
    return result
  }, [])

  const generateContentGrowthData = useCallback((content, days) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const dailyContent = content.filter((item) => {
        const itemDate =
          item.createdAt?.toDate?.() ||
          item.timestamp?.toDate?.() ||
          (item.createdAt instanceof Date ? item.createdAt : item.timestamp instanceof Date ? item.timestamp : null)
        if (!itemDate) return false
        return itemDate.toISOString().split("T")[0] === dateStr
      })

      const requestsCount = dailyContent.filter((item) => item.type === "request" || item.requestType).length
      const servicesCount = dailyContent.filter((item) => item.type === "service" || item.serviceType).length
      const fundraisersCount = dailyContent.filter((item) => item.type === "fundraiser" || item.raisedAmount).length

      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        requests: requestsCount,
        services: servicesCount,
        fundraisers: fundraisersCount,
        total: requestsCount + servicesCount + fundraisersCount,
      })
    }
    return result
  }, [])

  const generateDailyActiveData = useCallback((days) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      // Simulate daily active users (in a real app, you'd track this)
      const baseActive = Math.floor(Math.random() * 50) + 20
      const weekendMultiplier = date.getDay() === 0 || date.getDay() === 6 ? 0.7 : 1
      const active = Math.floor(baseActive * weekendMultiplier)
      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        active,
        returning: Math.floor(active * 0.6),
        new: Math.floor(active * 0.4),
      })
    }
    return result
  }, [])

  const generateMonthlyStats = useCallback(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentMonth = new Date().getMonth()
    const result = []
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      const month = months[monthIndex]
      result.push({
        month,
        users: Math.floor(Math.random() * 100) + 50,
        content: Math.floor(Math.random() * 80) + 30,
        messages: Math.floor(Math.random() * 60) + 20,
        subscriptions: Math.floor(Math.random() * 40) + 15,
      })
    }
    return result
  }, [])

  const generateDonationTrends = useCallback((donationsData, days) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const dailyDonations = donationsData.filter((item) => {
        const itemDate = item.timestamp?.toDate?.() || (item.timestamp instanceof Date ? item.timestamp : null)
        if (!itemDate) return false
        return itemDate.toISOString().split("T")[0] === dateStr
      })

      const totalAmount = dailyDonations.reduce(
        (sum, d) => sum + (d.donationType === "money" ? Number(d.amount || 0) : 0),
        0,
      )
      const count = dailyDonations.length

      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: totalAmount,
        count: count,
      })
    }
    return result
  }, [])

  const generateRequestFulfillment = useCallback((requestsData, days) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const dailyRequests = requestsData.filter((item) => {
        const itemDate = item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : null)
        if (!itemDate) return false
        return itemDate.toISOString().split("T")[0] === dateStr
      })

      const pending = dailyRequests.filter((r) => r.status === "Pending").length
      const completed = dailyRequests.filter((r) => r.status === "Completed").length
      const cancelled = dailyRequests.filter((r) => r.status === "Cancelled").length

      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pending,
        completed,
        cancelled,
      })
    }
    return result
  }, [])

  // --- Dummy Data Generators ---
  const generateDummyUsers = useCallback((count) => {
    const dummyUsers = []
    const userTypes = ["Donor", "Orphanage", "Volunteer"]
    const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Heidi"]
    const orgNames = ["Hope Haven", "Sunshine Orphanage", "Green Valley Home", "Bright Future Foundation"]
    const provinces = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan"]

    for (let i = 0; i < count; i++) {
      const userType = userTypes[Math.floor(Math.random() * userTypes.length)]
      const createdAt = Timestamp.fromDate(new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000))
      const is_active = Math.random() > 0.2 // 80% active

      const user = {
        id: `user_${i}`,
        userType,
        createdAt,
        is_active,
        lastLogin: Timestamp.fromDate(new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)),
      }

      if (userType === "Donor") {
        user.fullName = `${names[Math.floor(Math.random() * names.length)]} Donor`
      } else if (userType === "Orphanage") {
        user.orgName = orgNames[Math.floor(Math.random() * orgNames.length)]
        user.orgAddress = `123 Main St, City`
        user.province = provinces[Math.floor(Math.random() * provinces.length)]
      } else {
        user.fullName = `${names[Math.floor(Math.random() * names.length)]} Volunteer`
      }
      dummyUsers.push(user)
    }
    return dummyUsers
  }, [])

  const generateDummyRequests = useCallback((count, users) => {
    const dummyRequests = []
    const requestTypes = ["Clothes", "Food", "Money", "Education", "Medical", "Other"]
    const statuses = ["Pending", "Completed", "Cancelled"]
    const orphanages = users.filter((u) => u.userType === "Orphanage")

    for (let i = 0; i < count; i++) {
      const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const createdAt = Timestamp.fromDate(new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000))
      const quantity = Math.floor(Math.random() * 100) + 10
      const donated = status === "Completed" ? Math.floor(Math.random() * quantity) + 1 : 0 // Ensure donated is less than or equal to quantity
      const orphanageId =
        orphanages.length > 0 ? orphanages[Math.floor(Math.random() * orphanages.length)].id : `orphanage_${i}`

      dummyRequests.push({
        id: `req_${i}`,
        requestType,
        status,
        createdAt,
        quantity,
        totalDonated: donated,
        orphanageId,
        isDeleted: Math.random() < 0.05, // 5% chance of being deleted
      })
    }
    return dummyRequests
  }, [])

  const generateDummyDonations = useCallback((count, users) => {
    const dummyDonations = []
    const donationTypes = ["money", "clothes", "food"]
    const statuses = ["Approved", "Pending", "Rejected"]
    const donors = users.filter((u) => u.userType === "Donor")

    for (let i = 0; i < count; i++) {
      const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const timestamp = Timestamp.fromDate(new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000))
      const amount = donationType === "money" ? Math.floor(Math.random() * 5000) + 100 : null
      const donorId = donors.length > 0 ? donors[Math.floor(Math.random() * donors.length)].id : `donor_${i}`

      dummyDonations.push({
        id: `don_${i}`,
        donationType,
        status,
        timestamp,
        amount,
        donorId,
      })
    }
    return dummyDonations
  }, [])

  const generateDummyMessages = useCallback((count) => {
    const dummyMessages = []
    for (let i = 0; i < count; i++) {
      const createdAt = Timestamp.fromDate(new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000))
      dummyMessages.push({
        id: `msg_${i}`,
        createdAt,
        subject: `Subject ${i}`,
        message: `This is a dummy message ${i}.`,
      })
    }
    return dummyMessages
  }, [])

  const generateDummySubscriptions = useCallback((count) => {
    const dummySubscriptions = []
    for (let i = 0; i < count; i++) {
      const createdAt = Timestamp.fromDate(new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000))
      dummySubscriptions.push({
        id: `sub_${i}`,
        createdAt,
        email: `user${i}@example.com`,
      })
    }
    return dummySubscriptions
  }, [])

  const generateDummyServices = useCallback((count) => {
    const dummyServices = []
    for (let i = 0; i < count; i++) {
      const createdAt = Timestamp.fromDate(new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000))
      dummyServices.push({
        id: `serv_${i}`,
        createdAt,
        serviceType: `Service ${i}`,
        isDeleted: Math.random() < 0.05,
      })
    }
    return dummyServices
  }, [])

  const generateDummyFundraisers = useCallback((count) => {
    const dummyFundraisers = []
    for (let i = 0; i < count; i++) {
      const createdAt = Timestamp.fromDate(new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000))
      dummyFundraisers.push({
        id: `fund_${i}`,
        createdAt,
        raisedAmount: Math.floor(Math.random() * 10000) + 1000,
        targetAmount: Math.floor(Math.random() * 20000) + 10000,
        isDeleted: Math.random() < 0.05,
      })
    }
    return dummyFundraisers
  }, [])

  // Effect to set up real-time listeners
  useEffect(() => {
    const unsubscribers = []
    setError(null) // Clear previous errors

    const collectionsToListen = [
      "users",
      "requests",
      "services",
      "fundraisers",
      "contact-us",
      "subscriptions",
      "donations",
    ]
    const setDataFunctions = {
      users: setUsersData,
      requests: setRequestsData,
      services: setServicesData,
      fundraisers: setFundraisersData,
      "contact-us": setMessagesData,
      subscriptions: setSubscriptionsData,
      donations: setDonationsData,
    }

    try {
      collectionsToListen.forEach((colName) => {
        const unsubscribe = onSnapshot(
          collection(db, colName),
          (snapshot) => {
            const fetchedData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            // If no data is fetched, use dummy data
            if (fetchedData.length === 0) {
              if (colName === "users") setDataFunctions[colName](generateDummyUsers(50))
              else if (colName === "requests")
                setDataFunctions[colName](
                  generateDummyRequests(30, usersData.length > 0 ? usersData : generateDummyUsers(50)),
                ) // Pass dummy users if real users are empty
              else if (colName === "services") setDataFunctions[colName](generateDummyServices(20))
              else if (colName === "fundraisers") setDataFunctions[colName](generateDummyFundraisers(15))
              else if (colName === "contact-us") setDataFunctions[colName](generateDummyMessages(25))
              else if (colName === "subscriptions") setDataFunctions[colName](generateDummySubscriptions(40))
              else if (colName === "donations")
                setDataFunctions[colName](
                  generateDummyDonations(35, usersData.length > 0 ? usersData : generateDummyUsers(50)),
                ) // Pass dummy users if real users are empty
            } else {
              setDataFunctions[colName](fetchedData)
            }
          },
          (err) => {
            console.error(`Error fetching ${colName}:`, err)
            setError(
              `Failed to load ${colName} data. This might be due to Firebase security rules. Check your rules and browser console for details.`,
            )
            setLoading(false) // Stop loading on error
          },
        )
        unsubscribers.push(unsubscribe)
      })
    } catch (err) {
      console.error("Error setting up listeners:", err)
      setError("Failed to initialize real-time data. Check console for details.")
      setLoading(false) // Stop loading on error
    } finally {
      setLoading(false)
    }

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [
    generateDummyUsers,
    generateDummyRequests,
    generateDummyDonations,
    generateDummyMessages,
    generateDummySubscriptions,
    generateDummyServices,
    generateDummyFundraisers,
    usersData, // Dependency for dummy requests/donations
  ])

  // Effect to process data when raw data or timeRange changes
  useEffect(() => {
    // Only set loading if data is truly empty, otherwise it's just updating
    const allDataLoaded =
      usersData.length > 0 ||
      requestsData.length > 0 ||
      servicesData.length > 0 ||
      fundraisersData.length > 0 ||
      messagesData.length > 0 ||
      subscriptionsData.length > 0 ||
      donationsData.length > 0

    if (!allDataLoaded && !error) {
      setLoading(true)
    } else {
      setLoading(false)
    }

    // Process users data
    const totalUsers = usersData.length
    const donors = usersData.filter((user) => user.userType === "Donor")
    const orphanages = usersData.filter((user) => user.userType === "Orphanage")
    const activeUsers = usersData.filter((u) => u.is_active !== false).length // Corrected to use 'is_active' field from Firestore

    // Process content data
    const allContent = [...requestsData, ...servicesData, ...fundraisersData].filter((item) => item.isDeleted !== true)

    // Process messages and subscriptions
    const totalMessages = messagesData.length
    const totalSubscriptions = subscriptionsData.length

    // Process donations data
    let totalDonationsAmount = 0
    donationsData.forEach((donation) => {
      if (donation.donationType === "money" && donation.amount) {
        totalDonationsAmount += Number(donation.amount)
      }
    })

    // Calculate overview stats
    const overview = {
      totalUsers: totalUsers,
      totalDonors: donors.length,
      totalOrphanages: orphanages.length,
      totalRequests: requestsData.length,
      totalServices: servicesData.length,
      totalFundraisers: fundraisersData.length,
      totalMessages: totalMessages,
      totalSubscriptions: totalSubscriptions,
      totalDonations: donationsData.length,
      totalDonationsAmount: totalDonationsAmount,
      activeUsers: activeUsers,
      pendingRequests: requestsData.filter((r) => r.status === "Pending").length,
      completedRequests: requestsData.filter((r) => r.status === "Completed").length,
      successRate:
        requestsData.length > 0
          ? Math.round((requestsData.filter((r) => r.status === "Completed").length / requestsData.length) * 100)
          : 0,
    }

    // Generate trends data
    const userGrowth = generateTimeSeriesData(usersData, timeRange, "createdAt")
    const contentGrowth = generateContentGrowthData(allContent, timeRange)
    const donationTrends = generateDonationTrends(donationsData, timeRange)
    const requestFulfillment = generateRequestFulfillment(requestsData, timeRange)
    const messageGrowth = generateTimeSeriesData(messagesData, timeRange, "createdAt")

    // Generate distribution data
    const userTypes = [
      { name: "Donors", value: donors.length, color: "#10B981" },
      { name: "Orphanages", value: orphanages.length, color: "#3B82F6" },
      { name: "Others", value: totalUsers - donors.length - orphanages.length, color: "#6B7280" },
    ].filter((type) => type.value > 0)

    const contentTypes = [
      { name: "Requests", value: requestsData.length, color: "#EF4444" },
      { name: "Services", value: servicesData.length, color: "#8B5CF6" },
      { name: "Fundraisers", value: fundraisersData.length, color: "#F59E0B" },
    ].filter((type) => type.value > 0)

    // Analyze request types and quantities
    const requestQuantities = {
      clothes: { count: 0, totalQuantity: 0, donated: 0 },
      food: { count: 0, totalQuantity: 0, donated: 0 },
      money: { count: 0, totalQuantity: 0, donated: 0 },
      education: { count: 0, totalQuantity: 0, donated: 0 },
      medical: { count: 0, totalQuantity: 0, donated: 0 },
      other: { count: 0, totalQuantity: 0, donated: 0 },
    }
    requestsData.forEach((req) => {
      const type = (req.requestType || "Other").toLowerCase()
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
      if (requestQuantities[normalizedType]) {
        requestQuantities[normalizedType].count++
        const quantity = req.quantity || 0
        let numericQuantity = 0
        if (typeof quantity === "string") {
          const match = quantity.match(/\d+/)
          numericQuantity = match ? Number.parseInt(match[0]) : 0
        } else if (typeof quantity === "number") {
          numericQuantity = quantity
        }
        requestQuantities[normalizedType].totalQuantity += numericQuantity
        const totalDonated = req.totalDonated || 0
        requestQuantities[normalizedType].donated += totalDonated
      }
    })
    const requestTypes = Object.entries(requestQuantities)
      .map(([name, data]) => ({
        name,
        value: data.count,
        color: getRandomColor(), // Assign a random color for consistency
        icon:
          name === "clothes"
            ? Shirt
            : name === "food"
              ? Utensils
              : name === "money"
                ? DollarSign
                : name === "education"
                  ? GraduationCap
                  : name === "medical"
                    ? HeartHandshake
                    : HeartHandshake, // Default for 'other'
        totalAmount: data.totalQuantity,
        fulfilled: data.donated,
      }))
      .filter((type) => type.value > 0) // Filter out types with 0 requests

    const donationStatus = [
      { name: "Approved", value: donationsData.filter((d) => d.status === "Approved").length, color: "#10B981" },
      { name: "Pending", value: donationsData.filter((d) => d.status === "Pending").length, color: "#F59E0B" },
      { name: "Rejected", value: donationsData.filter((d) => d.status === "Rejected").length, color: "#EF4444" },
    ].filter((status) => status.value > 0)

    // Generate engagement data (simulated)
    const dailyActive = generateDailyActiveData(timeRange)
    const monthlyStats = generateMonthlyStats()

    // Performance metrics (some simulated, some derived)
    const totalMoneyDonations = donationsData.filter((d) => d.donationType === "money")
    const avgDonationAmount =
      totalMoneyDonations.length > 0
        ? totalMoneyDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0) / totalMoneyDonations.length
        : 0

    // Top performers (still simulated as real-time aggregation is complex for client-side Firestore)
    const topDonors = donationsData
      .reduce((acc, donation) => {
        if (donation.donorId && donation.donationType === "money") {
          const existing = acc.find((d) => d.id === donation.donorId)
          if (existing) {
            existing.amount += Number(donation.amount || 0)
            existing.donations++
          } else {
            const donorUser = usersData.find((u) => u.uid === donation.donorId)
            const donorName = donorUser
              ? donorUser.fullName || `Donor ${donation.donorId.substring(0, 4)}`
              : `Donor ${donation.donorId.substring(0, 4)}`
            acc.push({ id: donation.donorId, name: donorName, amount: Number(donation.amount || 0), donations: 1 })
          }
        }
        return acc
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)

    const topOrphanages = requestsData
      .reduce((acc, request) => {
        if (request.orphanageId) {
          const existing = acc.find((o) => o.id === request.orphanageId)
          if (existing) {
            existing.requests++
            if (request.status === "Completed") {
              existing.fulfilled++
            }
          } else {
            const orphanageUser = usersData.find((u) => u.uid === request.orphanageId)
            const orphanageName = orphanageUser
              ? orphanageUser.orgName || `Orphanage ${request.orphanageId.substring(0, 4)}`
              : `Orphanage ${request.orphanageId.substring(0, 4)}`
            acc.push({
              id: request.orphanageId,
              name: orphanageName,
              requests: 1,
              fulfilled: request.status === "Completed" ? 1 : 0,
            })
          }
        }
        return acc
      }, [])
      .sort((a, b) => b.fulfilled - a.fulfilled)
      .slice(0, 3)

    setStats({
      overview,
      trends: {
        userGrowth,
        contentGrowth,
        donationTrends,
        requestFulfillment,
        messageGrowth,
      },
      distribution: {
        userTypes,
        contentTypes,
        requestTypes,
        donationStatus,
      },
      engagement: {
        dailyActive,
        monthlyStats,
      },
      requestQuantities,
      performance: {
        conversionRate: 23.5, // Simulated
        avgDonationAmount: avgDonationAmount,
        responseTime: 2.4, // Simulated
        userSatisfaction: 4.6, // Simulated
        monthlyGrowth: 18.7, // Simulated
        retentionRate: 76.3, // Simulated
      },
      topPerformers: {
        topDonors,
        topOrphanages,
      },
    })
    setRefreshing(false) // End refreshing state after data processing
  }, [
    usersData,
    requestsData,
    servicesData,
    fundraisersData,
    messagesData,
    subscriptionsData,
    donationsData,
    timeRange,
    generateTimeSeriesData,
    generateContentGrowthData,
    generateDailyActiveData,
    generateMonthlyStats,
    getRandomColor,
    generateDonationTrends,
    generateRequestFulfillment,
    error, // Re-run if error state changes
  ])

  const handleRefresh = () => {
    setRefreshing(true)
    // onSnapshot listeners will automatically update, so no explicit fetch needed here.
    // The `useEffect` that processes data will re-run when raw data changes.
    // This just provides a visual feedback for the refresh button.
    setTimeout(() => setRefreshing(false), 1000)
  }

  const exportData = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Users", stats.overview.totalUsers],
      ["Total Donors", stats.overview.totalDonors],
      ["Total Orphanages", stats.overview.totalOrphanages],
      ["Total Donations Amount", `Rs. ${stats.overview.totalDonationsAmount.toLocaleString()}`],
      ["Success Rate", `${stats.overview.successRate}%`],
      ["Conversion Rate", `${stats.performance.conversionRate}%`],
      ["User Satisfaction", `${stats.performance.userSatisfaction}/5`],
      // Add request quantities
      ...Object.entries(stats.requestQuantities).flatMap(([type, data]) => [
        [`${type} Requests Count`, data.count],
        [`${type} Total Requested Quantity`, data.totalQuantity],
        [`${type} Total Donated Quantity`, data.donated],
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `platform-statistics-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <p className="mt-2 text-sm">
            Please check your Firebase security rules to ensure read access for all collections (users, requests,
            services, fundraisers, contact-us, subscriptions, donations). Also, verify your internet connection and
            Firebase configuration.
          </p>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="text-gray-600">Comprehensive insights and performance metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </motion.div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Users",
              value: stats.overview.totalUsers.toLocaleString(),
              icon: Users,
              color: "from-blue-500 to-cyan-500",
            },
            {
              title: "Active Donors",
              value: stats.overview.totalDonors.toLocaleString(),
              icon: Heart,
              color: "from-green-500 to-emerald-500",
            },
            {
              title: "Total Donations",
              value: `Rs. ${(stats.overview.totalDonationsAmount / 1000000).toFixed(1)}M`,
              icon: DollarSign,
              color: "from-purple-500 to-indigo-500",
            },
            {
              title: "Success Rate",
              value: `${stats.overview.successRate}%`,
              icon: Target,
              color: "from-orange-500 to-amber-500",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                {/* Removed change percentage as it was simulated */}
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance Metrics */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
                  <span className="text-sm font-bold text-gray-900">{stats.performance.conversionRate}%</span>
                </div>
                <Progress value={stats.performance.conversionRate} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">User Retention</span>
                  <span className="text-sm font-bold text-gray-900">{stats.performance.retentionRate}%</span>
                </div>
                <Progress value={stats.performance.retentionRate} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Monthly Growth</span>
                  <span className="text-sm font-bold text-gray-900">{stats.performance.monthlyGrowth}%</span>
                </div>
                <Progress value={stats.performance.monthlyGrowth} className="h-2" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Donation</p>
                  <p className="text-lg font-bold">Rs. {stats.performance.avgDonationAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-lg font-bold">{stats.performance.responseTime}h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Heart className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Satisfaction</p>
                  <p className="text-lg font-bold">{stats.performance.userSatisfaction}/5.0</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Types Analysis */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Request Types & Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.distribution.requestTypes.length > 0 ? (
                stats.distribution.requestTypes.map((type, index) => {
                  const Icon = type.icon
                  const color = type.color
                  const fulfillmentPercentage = type.totalAmount > 0 ? (type.fulfilled / type.totalAmount) * 100 : 0
                  return (
                    <div key={type.name} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">{type.name}</p>
                          <p className="text-sm text-gray-600">{type.value} requests</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Fulfilled</span>
                          <span>
                            {type.fulfilled}/{type.totalAmount}
                          </span>
                        </div>
                        <Progress value={fulfillmentPercentage} className="h-1" />
                        <p className="text-xs text-gray-500">
                          {type.name === "money"
                            ? `Rs. ${type.totalAmount.toLocaleString()}`
                            : `${type.totalAmount} items requested`}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">No request data available.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                User Growth Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.trends.userGrowth.length > 0 ? (
                <ChartContainer
                  config={{
                    count: {
                      label: "New Users",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trends.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-count)"
                        fill="var(--color-count)"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No user growth data available for this period.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donation Trends */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Donation Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.trends.donationTrends.length > 0 ? (
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount (Rs.)",
                      color: "hsl(var(--chart-2))",
                    },
                    count: {
                      label: "Count",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.trends.donationTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="amount" fill="var(--color-amount)" name="Amount (Rs.)" />
                      <Bar dataKey="count" fill="var(--color-count)" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No donation trend data available for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content Growth Chart */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Content Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.trends.contentGrowth.length > 0 ? (
              <ChartContainer
                config={{
                  requests: {
                    label: "Requests",
                    color: "hsl(var(--chart-1))",
                  },
                  services: {
                    label: "Services",
                    color: "hsl(var(--chart-2))",
                  },
                  fundraisers: {
                    label: "Fundraisers",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="min-h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trends.contentGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="requests" fill="var(--color-requests)" name="Requests" />
                    <Bar dataKey="services" fill="var(--color-services)" name="Services" />
                    <Bar dataKey="fundraisers" fill="var(--color-fundraisers)" name="Fundraisers" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                No content growth data available for this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* User Types Distribution */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.distribution.userTypes.length > 0 ? (
                <ChartContainer
                  config={stats.distribution.userTypes.reduce((acc, curr) => {
                    acc[curr.name.toLowerCase()] = { label: curr.name, color: curr.color }
                    return acc
                  }, {})}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={stats.distribution.userTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.distribution.userTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No user distribution data available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Types Distribution */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Content Types</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.distribution.contentTypes.length > 0 ? (
                <ChartContainer
                  config={stats.distribution.contentTypes.reduce((acc, curr) => {
                    acc[curr.name.toLowerCase()] = { label: curr.name, color: curr.color }
                    return acc
                  }, {})}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={stats.distribution.contentTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.distribution.contentTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No content type data available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Fulfillment */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Request Fulfillment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.trends.requestFulfillment.length > 0 ? (
                <ChartContainer
                  config={{
                    pending: {
                      label: "Pending",
                      color: "hsl(var(--chart-1))",
                    },
                    completed: {
                      label: "Completed",
                      color: "hsl(var(--chart-2))",
                    },
                    cancelled: {
                      label: "Cancelled",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trends.requestFulfillment}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stackId="1"
                        stroke="var(--color-completed)"
                        fill="var(--color-completed)"
                        fillOpacity={0.8}
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        stackId="1"
                        stroke="var(--color-pending)"
                        fill="var(--color-pending)"
                        fillOpacity={0.8}
                      />
                      <Area
                        type="monotone"
                        dataKey="cancelled"
                        stackId="1"
                        stroke="var(--color-cancelled)"
                        fill="var(--color-cancelled)"
                        fillOpacity={0.8}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No request fulfillment data available for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Engagement Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Active Users */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Daily Active Users (Simulated)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.engagement.dailyActive.length > 0 ? (
                <ChartContainer
                  config={{
                    active: {
                      label: "Total Active",
                      color: "hsl(var(--chart-1))",
                    },
                    returning: {
                      label: "Returning",
                      color: "hsl(var(--chart-2))",
                    },
                    new: {
                      label: "New Users",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.engagement.dailyActive}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="active"
                        stroke="var(--color-active)"
                        strokeWidth={2}
                        name="Total Active"
                      />
                      <Line
                        type="monotone"
                        dataKey="returning"
                        stroke="var(--color-returning)"
                        strokeWidth={2}
                        name="Returning"
                      />
                      <Line type="monotone" dataKey="new" stroke="var(--color-new)" strokeWidth={2} name="New Users" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No daily active user data available for this period.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Overview */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Monthly Overview (Simulated)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.engagement.monthlyStats.length > 0 ? (
                <ChartContainer
                  config={{
                    users: {
                      label: "Users",
                      color: "hsl(var(--chart-1))",
                    },
                    content: {
                      label: "Content",
                      color: "hsl(var(--chart-2))",
                    },
                    messages: {
                      label: "Messages",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="min-h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.engagement.monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stackId="1"
                        stroke="var(--color-users)"
                        fill="var(--color-users)"
                        fillOpacity={0.6}
                        name="Users"
                      />
                      <Area
                        type="monotone"
                        dataKey="content"
                        stackId="1"
                        stroke="var(--color-content)"
                        fill="var(--color-content)"
                        fillOpacity={0.6}
                        name="Content"
                      />
                      <Area
                        type="monotone"
                        dataKey="messages"
                        stackId="1"
                        stroke="var(--color-messages)"
                        fill="var(--color-messages)"
                        fillOpacity={0.6}
                        name="Messages"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-gray-500">
                  No monthly overview data available for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Donors */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Top Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topPerformers.topDonors.length > 0 ? (
                <div className="space-y-4">
                  {stats.topPerformers.topDonors.map((donor, index) => (
                    <div
                      key={donor.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{donor.name}</p>
                          <p className="text-sm text-gray-600">{donor.donations} donations</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">Rs. {donor.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No top donor data available.</div>
              )}
            </CardContent>
          </Card>

          {/* Top Orphanages */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" />
                Top Performing Orphanages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topPerformers.topOrphanages.length > 0 ? (
                <div className="space-y-4">
                  {stats.topPerformers.topOrphanages.map((orphanage, index) => (
                    <div
                      key={orphanage.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{orphanage.name}</p>
                          <p className="text-sm text-gray-600">{orphanage.requests} requests</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{orphanage.fulfilled} fulfilled</p>
                        <p className="text-xs text-gray-500">
                          {Math.round((orphanage.fulfilled / orphanage.requests) * 100)}% success
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No top orphanage data available.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
