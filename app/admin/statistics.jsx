"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  Heart,
  Building,
  DollarSign,
  Shirt,
  Utensils,
  GraduationCap,
  HeartHandshake,
} from "lucide-react"
import { db } from "@/lib/firebase" // Corrected import from firestore to db
import { collection, getDocs } from "firebase/firestore"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart" // Added shadcn/ui chart components

export default function AdminStatistics() {
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
      totalDonations: 0, // New: from 'donations' collection
      totalDonationsAmount: 0, // New: from 'donations' collection
    },
    trends: {
      userGrowth: [],
      contentGrowth: [],
      messageGrowth: [],
    },
    distribution: {
      userTypes: [],
      contentTypes: [],
      requestTypes: [], // Will now include totalAmount and fulfilled
    },
    engagement: {
      dailyActive: [],
      monthlyStats: [],
    },
    requestQuantities: {
      // New section for detailed request quantities
      clothes: { count: 0, totalQuantity: 0, donated: 0 },
      food: { count: 0, totalQuantity: 0, donated: 0 },
      money: { count: 0, totalQuantity: 0, donated: 0 },
    
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

  const fetchStatistics = async () => {
    setLoading(true)
    setError(null)
    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Number.parseInt(timeRange))

      // Fetch all collections
      const [
        usersSnapshot,
        requestsSnapshot,
        servicesSnapshot,
        fundraisersSnapshot,
        messagesSnapshot,
        subscriptionsSnapshot,
        donationsSnapshot, // Fetch from 'donations' collection
      ] = await Promise.all([
        getDocs(collection(db, "users")), // Use db
        getDocs(collection(db, "requests")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "fundraisers")),
        getDocs(collection(db, "contact-us")),
        getDocs(collection(db, "subscriptions")),
        getDocs(collection(db, "donations")), // Fetch linked donations
      ])

      // Process users data
      const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const donors = users.filter((user) => user.userType === "Donor")
      const orphanages = users.filter((user) => user.userType === "Orphanage")

      // Add these two lines to create lookup maps for donors and orphanages:
      const donorMap = new Map(donors.map((d) => [d.id, d.fullName || d.name || "Anonymous Donor"]))
      const orphanageMap = new Map(orphanages.map((o) => [o.id, o.orgName || o.name || "Unknown Orphanage"]))

      // Process content data
      const requests = requestsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const services = servicesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const fundraisers = fundraisersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Process messages and subscriptions
      const messages = messagesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const subscriptions = subscriptionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Process donations data (from 'donations' collection)
      const donations = donationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      let totalDonationsAmount = 0

      // Sum from 'donations' collection
      donations.forEach((donation) => {
        if (donation.donationType === "money" && donation.amount) {
          totalDonationsAmount += Number(donation.amount)
        }
      })

      // Sum from 'fundraisers' collection
      fundraisers.forEach((fundraiser) => {
        if (fundraiser.raisedAmount) {
          totalDonationsAmount += Number(fundraiser.raisedAmount)
        }
      })

      // Sum from 'requests' collection (totalDonated field)
      requests.forEach((req) => {
        if (req.totalDonated && typeof req.totalDonated === "number") {
          totalDonationsAmount += req.totalDonated
        }
      })

      // Calculate overview stats
      const overview = {
        totalUsers: users.length,
        totalDonors: donors.length,
        totalOrphanages: orphanages.length,
        totalRequests: requests.length,
        totalServices: services.length,
        totalFundraisers: fundraisers.length,
        totalMessages: messages.length,
        totalSubscriptions: subscriptions.length,
        totalDonations: donations.length, // Updated
        totalDonationsAmount: totalDonationsAmount, // Updated
      }

      // Generate user growth trend
      const userGrowth = generateTimeSeriesData(users, timeRange, "createdAt")
      const contentGrowth = generateContentGrowthData([...requests, ...services, ...fundraisers], timeRange)
      const messageGrowth = generateTimeSeriesData(messages, timeRange, "createdAt")

      // Generate distribution data
      const userTypes = [
        { name: "Donors", value: donors.length, color: "#10B981" },
        { name: "Orphanages", value: orphanages.length, color: "#3B82F6" },
        { name: "Others", value: users.length - donors.length - orphanages.length, color: "#6B7280" },
      ]
      const contentTypes = [
        { name: "Requests", value: requests.length, color: "#EF4444" },
        { name: "Services", value: services.length, color: "#8B5CF6" },
        { name: "Fundraisers", value: fundraisers.length, color: "#F59E0B" },
      ]

      // Analyze request types and quantities for detailed view and pie chart
      const requestTypeDetails = {
        clothes: { count: 0, totalQuantity: 0, fulfilled: 0, icon: Shirt, color: "#3B82F6" }, // Blue
        food: { count: 0, totalQuantity: 0, fulfilled: 0, icon: Utensils, color: "#F59E0B" }, // Orange
        money: { count: 0, totalQuantity: 0, fulfilled: 0, icon: DollarSign, color: "#10B981" }, // Green
      
      }

      requests.forEach((req) => {
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

        if (requestTypeDetails[normalizedType]) {
          requestTypeDetails[normalizedType].count++
          const numericQuantity = Number(req.totalQuantity) || 0
          requestTypeDetails[normalizedType].totalQuantity += numericQuantity

          // Assuming 'totalDonated' field exists in 'requests' for fulfillment
          const totalDonated = req.totalDonated || 0
          requestTypeDetails[normalizedType].fulfilled += totalDonated
        }
      })

      const requestTypes = Object.entries(requestTypeDetails).map(([name, data]) => ({
        name,
        value: data.count, // For the pie chart, use the count of requests
        color: data.color,
        icon: data.icon,
        totalAmount: data.totalQuantity, // Total quantity requested
        fulfilled: data.fulfilled, // Total quantity donated/fulfilled
      }))

      // Generate engagement data (simulated for now)
      const dailyActive = generateDailyActiveData(timeRange)
      const monthlyStats = generateMonthlyStats()

      // Calculate Top Donors
      const donorContributions = {}
      donations.forEach((donation) => {
        const donorId = donation.donorId // Assuming donorId is present in the donation document
        const donorName = donorId ? donorMap.get(donorId) : donation.donorName || "Anonymous Donor"
        const amount = Number(donation.amount) || 0

        if (!donorContributions[donorId]) {
          donorContributions[donorId] = { name: donorName, amount: 0, donations: 0 }
        }
        donorContributions[donorId].amount += amount
        donorContributions[donorId].donations++
      })
      const topDonors = Object.values(donorContributions)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5) // Top 5 donors

      // Calculate Top Orphanages
      const orphanagePerformance = {}
      requests.forEach((req) => {
        const orphanageId = req.orphanageId // Assuming orphanageId is present in the request document
        const orphanageName = orphanageId ? orphanageMap.get(orphanageId) : req.orphanageName || "Unknown Orphanage"
        const quantity = req.quantity || 0
        let numericQuantity = 0
        if (typeof quantity === "string") {
          const match = quantity.match(/\d+/)
          numericQuantity = match ? Number.parseInt(match[0]) : 0
        } else if (typeof quantity === "number") {
          numericQuantity = quantity
        }
        const totalDonated = req.totalDonated || 0 // Assuming 'totalDonated' field exists in 'requests'

        if (!orphanagePerformance[orphanageId]) {
          orphanagePerformance[orphanageId] = { name: orphanageName, requests: 0, fulfilled: 0 }
        }
        orphanagePerformance[orphanageId].requests++
        orphanagePerformance[orphanageId].fulfilled += totalDonated // Sum of fulfilled quantities
      })
      const topOrphanages = Object.values(orphanagePerformance)
        .sort((a, b) => (b.fulfilled / b.requests || 0) - (a.fulfilled / a.requests || 0)) // Sort by fulfillment rate
        .slice(0, 5) // Top 5 orphanages

      setStats({
        overview,
        trends: {
          userGrowth,
          contentGrowth,
          messageGrowth,
        },
        distribution: {
          userTypes,
          contentTypes,
          requestTypes,
        },
        engagement: {
          dailyActive,
          monthlyStats,
        },
        requestQuantities: {
          clothes: {
            count: requestTypeDetails.clothes.count,
            totalQuantity: requestTypeDetails.clothes.totalQuantity,
            donated: requestTypeDetails.clothes.fulfilled,
          },
          food: {
            count: requestTypeDetails.food.count,
            totalQuantity: requestTypeDetails.food.totalQuantity,
            donated: requestTypeDetails.food.fulfilled,
          },
          money: {
            count: requestTypeDetails.money.count,
            totalQuantity: requestTypeDetails.money.totalQuantity,
            donated: requestTypeDetails.money.fulfilled,
          },
          
        },
        topPerformers: {
          topDonors,
          topOrphanages,
        },
      })
    } catch (err) {
      console.error("Error fetching statistics:", err)
      setError("Failed to load statistics.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [timeRange])

  const generateTimeSeriesData = (data, days, dateField) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const count = data.filter((item) => {
        const itemDate = item[dateField]?.toDate?.()
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
  }

  const generateContentGrowthData = (content, days) => {
    const result = []
    const endDate = new Date()
    for (let i = Number.parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const requests = content.filter((item) => {
        const itemDate = item.createdAt?.toDate?.() || item.timestamp?.toDate?.()
        if (!itemDate) return false
        return (
          itemDate.toISOString().split("T")[0] === dateStr &&
          item.collection !== "services" &&
          item.collection !== "fundraisers"
        )
      }).length
      const services = content.filter((item) => {
        const itemDate = item.createdAt?.toDate?.() || item.timestamp?.toDate?.()
        if (!itemDate) return false
        return itemDate.toISOString().split("T")[0] === dateStr && (item.serviceType || item.collection === "services")
      }).length
      const fundraisers = content.filter((item) => {
        const itemDate = item.createdAt?.toDate?.() || item.timestamp?.toDate?.()
        if (!itemDate) return false
        return (
          itemDate.toISOString().split("T")[0] === dateStr && (item.totalAmount || item.collection === "fundraisers")
        )
      }).length
      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        requests,
        services,
        fundraisers,
        total: requests + services + fundraisers,
      })
    }
    return result
  }

  const generateDailyActiveData = (days) => {
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
  }

  const generateMonthlyStats = () => {
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
  }

  const getRandomColor = () => {
    const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStatistics()
  }

  const exportData = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Users", stats.overview.totalUsers],
      ["Total Donors", stats.overview.totalDonors],
      ["Total Orphanages", stats.overview.totalOrphanages],
      ["Total Requests", stats.overview.totalRequests],
      ["Total Services", stats.overview.totalServices],
      ["Total Fundraisers", stats.overview.totalFundraisers],
      ["Total Messages", stats.overview.totalMessages],
      ["Total Subscriptions", stats.overview.totalSubscriptions],
      ["Total Linked Donations", stats.overview.totalDonations],
      ["Total Money Donated (Linked)", stats.overview.totalDonationsAmount],
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
    return <div className="text-center py-8 text-red-600">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Statistics</h1>
                <p className="text-gray-600">Comprehensive analytics and insights</p>
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

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Users",
              value: stats.overview.totalUsers,
              icon: Users,
              color: "from-blue-500 to-cyan-500",
            },
            {
              title: "Active Donors",
              value: stats.overview.totalDonors,
              icon: Heart,
              color: "from-green-500 to-emerald-500",
            },
            {
              title: "Orphanages",
              value: stats.overview.totalOrphanages,
              icon: Building,
              color: "from-purple-500 to-indigo-500",
            },
            {
              title: "Total Content",
              value: stats.overview.totalRequests + stats.overview.totalServices + stats.overview.totalFundraisers,
              icon: BarChart3,
              color: "from-orange-500 to-amber-500",
            },
            {
              title: "Total Linked Donations",
              value: stats.overview.totalDonations,
              icon: DollarSign,
              color: "from-pink-500 to-rose-500",
            },
            {
              title: "Total Money Donated",
              value: `Rs. ${stats.overview.totalDonationsAmount.toLocaleString()}`,
              icon: DollarSign,
              color: "from-teal-500 to-cyan-600",
            },
            {
              title: "Total Messages",
              value: stats.overview.totalMessages,
              icon: Eye, // Reusing Eye for messages, consider a specific icon if available
              color: "from-red-500 to-rose-600",
            },
            {
              title: "Total Subscriptions",
              value: stats.overview.totalSubscriptions,
              icon: Calendar, // Reusing Calendar for subscriptions
              color: "from-yellow-500 to-amber-600",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                {/* Removed hardcoded change percentage */}
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Written Statistics Overview - Detailed Request Quantities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detailed Request Quantities & Donations</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {Object.entries(stats.requestQuantities).map(([type, data]) => (
              <div key={type} className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  {type === "clothes" && <Shirt className="w-5 h-5 text-blue-600" />}
                  {type === "food" && <Utensils className="w-5 h-5 text-orange-600" />}
                  {type === "money" && <DollarSign className="w-5 h-5 text-green-600" />}
                 
                </div>
                <div>
                  <p className="font-semibold text-gray-700 capitalize">{type} Requests:</p>
                  <p className="text-lg font-bold text-gray-900">{data.count}</p>
                  <p className="text-xs text-gray-600">Total Requested Quantity: {data.totalQuantity}</p>
                  <p className="text-xs text-gray-600">Total Donated Quantity: {data.donated}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">User Growth</h3>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <ChartContainer
              config={{
                count: {
                  label: "Users",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="min-h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trends.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>
          {/* Content Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Content Growth</h3>
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
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
                  <YAxis stroke="#6b7280" fontSize={12} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="requests" fill="var(--color-requests)" name="Requests" />
                  <Bar dataKey="services" fill="var(--color-services)" name="Services" />
                  <Bar dataKey="fundraisers" fill="var(--color-fundraisers)" name="Fundraisers" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* User Types Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">User Types</h3>
            <ChartContainer
              config={stats.distribution.userTypes.reduce((acc, curr, idx) => {
                acc[curr.name.toLowerCase()] = { label: curr.name, color: curr.color }
                return acc
              }, {})}
              className="min-h-[250px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution.userTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.distribution.userTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>
          {/* Content Types Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Content Types</h3>
            <ChartContainer
              config={stats.distribution.contentTypes.reduce((acc, curr, idx) => {
                acc[curr.name.toLowerCase()] = { label: curr.name, color: curr.color }
                return acc
              }, {})}
              className="min-h-[250px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution.contentTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.distribution.contentTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>
          {/* Request Types Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Request Types</h3>
            <ChartContainer
              config={stats.distribution.requestTypes.reduce((acc, curr, idx) => {
                acc[curr.name.toLowerCase()] = { label: curr.name, color: curr.color }
                return acc
              }, {})}
              className="min-h-[250px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution.requestTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.distribution.requestTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>
        </div>

        {/* Engagement Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Active Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Daily Active Users</h3>
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
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
                  <YAxis stroke="#6b7280" fontSize={12} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
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
          </motion.div>
          {/* Monthly Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Monthly Overview</h3>
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
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
                  <YAxis stroke="#6b7280" fontSize={12} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
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
          </motion.div>
        </div>

        {/* Top Performers Section */}
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
