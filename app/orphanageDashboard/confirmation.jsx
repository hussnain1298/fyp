"use client"

import { useState, useEffect, useMemo } from "react"
import { auth, firestore } from "@/lib/firebase"
import RequestConfirmations from "./RequestConfirmation"
import ServiceConfirmations from "./ServiceConfirmation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { motion } from "framer-motion"
import { FaClipboardList, FaDollarSign, FaCog, FaFilter } from "react-icons/fa"

const ConfirmFund = () => {
  const [activeStatus, setActiveStatus] = useState("pending")
  const [activeCategory, setActiveCategory] = useState("requests")
  const [counts, setCounts] = useState({ requests: 0, services: 0 })
  const [loading, setLoading] = useState(true)

  const matchesStatus = useMemo(
    () => (status) => {
      if (!status) return false
      const s = status.toLowerCase()
      switch (activeStatus) {
        case "pending":
          return ["pending", "pending approval", "in progress"].includes(s)
        case "approved":
          return ["approved", "fulfilled", "confirmed"].includes(s)
        case "rejected":
          return s === "rejected"
        default:
          return false
      }
    },
    [activeStatus],
  )

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true)
      const user = auth.currentUser
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const [requestsSnap,  servicesSnap] = await Promise.all([
          getDocs(query(collection(firestore, "requests"), where("orphanageId", "==", user.uid))),
         
          getDocs(query(collection(firestore, "services"), where("orphanageId", "==", user.uid))),
        ])

        setCounts({
          requests: requestsSnap.size,
       
          services: servicesSnap.size,
        })
      } catch (error) {
        console.error("Error fetching counts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [])

  const categoryConfig = [
    {
      key: "requests",
      label: "Requests",
      icon: FaClipboardList,
      color: "blue",
      description: "Donation requests from your organization",
    },

    {
      key: "services",
      label: "Services",
      icon: FaCog,
      color: "purple",
      description: "Service requests and offerings",
    },
  ]

  const statusConfig = [
    {
      key: "pending",
      label: "Pending",
      color: "yellow",
      description: "Awaiting your review",
    },
    {
      key: "approved",
      label: "Approved",
      color: "green",
      description: "Confirmed and processed",
    },
    {
      key: "rejected",
      label: "Rejected",
      color: "red",
      description: "Declined or cancelled",
    },
  ]

  const getColorClasses = (color, isActive) => {
    const colors = {
      blue: isActive
        ? "bg-blue-600 text-white shadow-lg border-blue-600"
        : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50",
      green: isActive
        ? "bg-green-600 text-white shadow-lg border-green-600"
        : "bg-white text-green-600 border-green-200 hover:bg-green-50",
      purple: isActive
        ? "bg-purple-600 text-white shadow-lg border-purple-600"
        : "bg-white text-purple-600 border-purple-200 hover:bg-purple-50",
      yellow: isActive
        ? "bg-yellow-500 text-white shadow-lg border-yellow-500"
        : "bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50",
      red: isActive
        ? "bg-red-600 text-white shadow-lg border-red-600"
        : "bg-white text-red-600 border-red-200 hover:bg-red-50",
    }
    return colors[color] || colors.blue
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FaFilter className="text-3xl text-gray-600 mr-3" />
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">Confirm Donations</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Review and manage donation requests, fundraisers, and services. Use the filters below to organize by
            category and status.
          </p>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
         
          <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
            {categoryConfig.map(({ key, label, icon: Icon, color, description }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center px-4 py-3 rounded-lg border-2 font-semibold transition-all duration-200 ${getColorClasses(
                  color,
                  activeCategory === key,
                )}`}
                title={description}
              >
                <Icon className="mr-2" />
                <span className="hidden sm:inline">{label.toUpperCase()}</span>
                <span className="sm:hidden">{label}</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Status Filters */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
       
          <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
            {statusConfig.map(({ key, label, color, description }) => (
              <button
                key={key}
                onClick={() => setActiveStatus(key)}
                className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all duration-200 ${getColorClasses(
                  color,
                  activeStatus === key,
                )}`}
                title={description}
              >
                <span className="hidden sm:inline">{label.toUpperCase()}</span>
                <span className="sm:hidden">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6"
        >
          {activeCategory === "requests" && (
            <RequestConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
          )}
        
          {activeCategory === "services" && (
            <ServiceConfirmations activeStatus={activeStatus} matchesStatus={matchesStatus} />
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default ConfirmFund
