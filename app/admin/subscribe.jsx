"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import { Search, Mail, Calendar, Trash2, Download } from "lucide-react"
import dayjs from "dayjs"

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [dateFilter, setDateFilter] = useState("all")

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, "subscriptions"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setSubscriptions(data)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching subscriptions:", error)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const deleteSubscription = async (subscriptionId) => {
    if (window.confirm("Are you sure you want to remove this subscription?")) {
      try {
        await deleteDoc(doc(firestore, "subscriptions", subscriptionId))
      } catch (error) {
        console.error("Error deleting subscription:", error)
        alert("Error removing subscription. Please try again.")
      }
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Email", "Date", "Time"],
      ...filteredSubscriptions.map((sub) => [
        sub.email,
        sub.timestamp ? dayjs(sub.timestamp.toDate()).format("M/D/YYYY") : "N/A",
        sub.timestamp ? dayjs(sub.timestamp.toDate()).format("h:mm A") : "N/A",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `subscriptions-${dayjs().format("YYYY-MM-DD")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getDateFilteredSubscriptions = (subs) => {
    if (dateFilter === "all") return subs

    const now = new Date()
    const filterDate = new Date()

    switch (dateFilter) {
      case "today":
        filterDate.setHours(0, 0, 0, 0)
        return subs.filter((sub) => sub.timestamp?.toDate() >= filterDate)
      case "week":
        filterDate.setDate(now.getDate() - 7)
        return subs.filter((sub) => sub.timestamp?.toDate() >= filterDate)
      case "month":
        filterDate.setMonth(now.getMonth() - 1)
        return subs.filter((sub) => sub.timestamp?.toDate() >= filterDate)
      default:
        return subs
    }
  }

  const filteredSubscriptions = useMemo(() => {
    return getDateFilteredSubscriptions(subscriptions)
      .filter((sub) => sub.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (b.timestamp?.toDate() || new Date()) - (a.timestamp?.toDate() || new Date())
        } else if (sortBy === "oldest") {
          return (a.timestamp?.toDate() || new Date()) - (b.timestamp?.toDate() || new Date())
        } else if (sortBy === "email") {
          return (a.email || "").localeCompare(b.email || "")
        }
        return 0
      })
  }, [subscriptions, searchTerm, sortBy, dateFilter])

  const stats = useMemo(
    () => ({
      total: subscriptions.length,
      today: subscriptions.filter((sub) => {
        if (!sub.timestamp) return false
        const today = new Date()
        const subDate = sub.timestamp.toDate()
        return subDate.toDateString() === today.toDateString()
      }).length,
      thisWeek: subscriptions.filter((sub) => {
        if (!sub.timestamp) return false
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return sub.timestamp.toDate() > weekAgo
      }).length,
      thisMonth: subscriptions.filter((sub) => {
        if (!sub.timestamp) return false
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return sub.timestamp.toDate() > monthAgo
      }).length,
    }),
    [subscriptions],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Subscriptions</h1>
            <p className="text-gray-600">Manage newsletter subscribers and email list</p>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.today}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-orange-600">{stats.thisMonth}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="email">Email A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || dateFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No email subscriptions have been received yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{sub.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {sub.timestamp ? dayjs(sub.timestamp.toDate()).format("MMM D, YYYY") : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.timestamp ? dayjs(sub.timestamp.toDate()).format("h:mm A") : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <a
                          href={`mailto:${sub.email}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => deleteSubscription(sub.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Remove Subscription"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {filteredSubscriptions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
            </span>
            <span>
              Latest:{" "}
              {subscriptions.length > 0 && subscriptions[0]?.timestamp
                ? dayjs(
                    subscriptions
                      .sort((a, b) => (b.timestamp?.toDate() || new Date()) - (a.timestamp?.toDate() || new Date()))[0]
                      .timestamp.toDate(),
                  ).format("MMM D, YYYY")
                : "N/A"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
