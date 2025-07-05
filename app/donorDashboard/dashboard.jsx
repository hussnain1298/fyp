"use client"

import { useState, useEffect, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

export default function DonorDashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalAmount: 0,
    servicesFulfilled: 0,
    fundraisersSupported: 0,
  })
  const [loading, setLoading] = useState(true)

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

      // Fetch donation stats
      const donationsSnap = await getDocs(
        query(collection(firestore, "donations"), where("donorId", "==", currentUser.uid)),
      )

      let totalAmount = 0
      donationsSnap.forEach((doc) => {
        const data = doc.data()
        if (data.amount) totalAmount += data.amount
      })

      // Fetch services fulfilled
      const servicesSnap = await getDocs(
        query(collection(firestore, "services"), where("donorId", "==", currentUser.uid)),
      )

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

      setStats({
        totalDonations: donationsSnap.size,
        totalAmount,
        servicesFulfilled: servicesSnap.size,
        fundraisersSupported,
      })
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
        icon: "❤️",
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
      {
        title: "Total Amount",
        value: `Rs. ${stats.totalAmount.toLocaleString()}`,
        icon: "💰",
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      {
        title: "Services Fulfilled",
        value: stats.servicesFulfilled,
        icon: "🎓",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        title: "Fundraisers Supported",
        value: stats.fundraisersSupported,
        icon: "🎯",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
    ],
    [stats],
  )

  const quickActions = useMemo(
    () => [
      {
        title: "Make a Donation",
        description: "Help children in need by fulfilling their requests",
        icon: "❤️",
        color: "bg-red-50 hover:bg-red-100 text-red-700",
      },
      {
        title: "Offer Services",
        description: "Share your skills and knowledge with orphanages",
        icon: "🎓",
        color: "bg-blue-50 hover:bg-blue-100 text-blue-700",
      },
      {
        title: "Support Fundraisers",
        description: "Contribute to ongoing fundraising campaigns",
        icon: "💰",
        color: "bg-green-50 hover:bg-green-100 text-green-700",
      },
      {
        title: "Connect & Chat",
        description: "Chat directly with orphanages to coordinate help",
        icon: "💬",
        color: "bg-purple-50 hover:bg-purple-100 text-purple-700",
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
          Welcome back, {user?.fullName || user?.email?.split("@")[0] || "Donor"}!
        </h1>
        <p className="text-gray-600">
          Thank you for making a difference in the lives of children. Track your donations, chat with orphanages, and
          manage your account.
        </p>
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
        <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">What you can do:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                View and fulfill <span className="text-gray-800 font-medium mx-1">donation requests</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Chat with <span className="text-gray-800 font-medium mx-1">orphanages</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Offer your <span className="text-gray-800 font-medium mx-1">skills and services</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-600 rounded-full mr-3"></span>
                Track your <span className="text-gray-800 font-medium mx-1">donation history</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Your Impact:</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">
                  You've made <strong>{stats.totalDonations}</strong> donations
                </span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">
                  Contributed <strong>Rs. {stats.totalAmount.toLocaleString()}</strong> in total
                </span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">
                  Supported <strong>{stats.fundraisersSupported}</strong> fundraisers
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
