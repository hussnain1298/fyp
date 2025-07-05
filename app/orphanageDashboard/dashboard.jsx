"use client"

import { useEffect, useState, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

export default function OrphanageDashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalServices: 0,
    totalFundraisers: 0,
    totalDonations: 0,
    pendingApprovals: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser
      if (!currentUser) {
        setLoading(false)
        return
      }

      try {
        const docRef = doc(firestore, "users", currentUser.uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setUser({ ...data, email: currentUser.email })
        } else {
          setUser({ email: currentUser.email })
        }

        // Fetch statistics
        await fetchStats(currentUser.uid)
      } catch (err) {
        console.error("Error fetching user data:", err)
        setUser({ email: currentUser.email })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const fetchStats = async (userId) => {
    try {
      const [requestsSnap, servicesSnap, fundraisersSnap, donationsSnap] = await Promise.all([
        getDocs(query(collection(firestore, "requests"), where("orphanageId", "==", userId))),
        getDocs(query(collection(firestore, "services"), where("orphanageId", "==", userId))),
        getDocs(query(collection(firestore, "fundraisers"), where("orphanageId", "==", userId))),
        getDocs(query(collection(firestore, "donations"), where("orphanageId", "==", userId))),
      ])

      const pendingDonations = donationsSnap.docs.filter(
        (doc) => !doc.data().confirmed || doc.data().status === "pending",
      ).length

      setStats({
        totalRequests: requestsSnap.size,
        totalServices: servicesSnap.size,
        totalFundraisers: fundraisersSnap.size,
        totalDonations: donationsSnap.size,
        pendingApprovals: pendingDonations,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const statCards = useMemo(
    () => [
      {
        title: "Total Requests",
        value: stats.totalRequests,
        icon: "📋",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        title: "Services Offered",
        value: stats.totalServices,
        icon: "🎓",
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      {
        title: "Fundraisers",
        value: stats.totalFundraisers,
        icon: "💰",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
      {
        title: "Total Donations",
        value: stats.totalDonations,
        icon: "❤️",
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
    ],
    [stats],
  )

  const quickActions = useMemo(
    () => [
      {
        title: "Create Request",
        description: "Post new donation requests for your needs",
        icon: "📋",
        color: "bg-blue-50 hover:bg-blue-100 text-blue-700",
      },
      {
        title: "Offer Services",
        description: "List educational services you need",
        icon: "🎓",
        color: "bg-green-50 hover:bg-green-100 text-green-700",
      },
      {
        title: "Start Fundraiser",
        description: "Launch fundraising campaigns for projects",
        icon: "💰",
        color: "bg-purple-50 hover:bg-purple-100 text-purple-700",
      },
      {
        title: "Chat with Donors",
        description: "Connect and communicate with supporters",
        icon: "💬",
        color: "bg-orange-50 hover:bg-orange-100 text-orange-700",
      },
    ],
    [],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
          Welcome back, {user?.orgName || user?.fullName || user?.email?.split("@")[0] || "Organization"}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your organization today. Manage requests, connect with donors, and track your
          impact.
        </p>
        {stats.pendingApprovals > 0 && (
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-yellow-800">
              <strong>{stats.pendingApprovals}</strong> donations awaiting your approval
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={stat.title} className={`${stat.bgColor} rounded-xl p-6 border border-gray-100`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className="text-3xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <div
              key={action.title}
              className={`${action.color} rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-100`}
            >
              <div className="text-3xl mb-4">{action.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
              <p className="text-sm opacity-80">{action.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-gray-50 rounded-xl p-6 lg:p-8 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Organization Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">What you can do:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Create and manage <span className="text-gray-800 font-medium mx-1">donation requests</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Chat with <span className="text-gray-800 font-medium mx-1">generous donors</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Update your <span className="text-gray-800 font-medium mx-1">organization profile</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Track <span className="text-gray-800 font-medium mx-1">fundraising progress</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Recent Activity:</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Dashboard loaded successfully</span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">
                  <strong>{stats.totalRequests}</strong> active requests
                </span>
              </div>
              {stats.pendingApprovals > 0 && (
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">
                    <strong>{stats.pendingApprovals}</strong> donations awaiting approval
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
