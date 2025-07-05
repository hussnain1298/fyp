"use client"

import { useEffect, useState, useMemo } from "react"
import { firestore } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import dayjs from "dayjs"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { BarChart3, PieChartIcon, Users, TrendingUp, Download, Loader2 } from "lucide-react"

const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#F97316"]

const tabs = [
  { key: "requests", label: "Requests", icon: BarChart3 },
  { key: "services", label: "Services", icon: PieChartIcon },
  { key: "fundraisers", label: "Fundraisers", icon: TrendingUp },
  { key: "users", label: "Users", icon: Users },
  { key: "trends", label: "Signup Trends", icon: TrendingUp },
]

export default function Statistics() {
  const [requests, setRequests] = useState([])
  const [services, setServices] = useState([])
  const [fundraisers, setFundraisers] = useState([])
  const [users, setUsers] = useState([])
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
  const [selectedRole, setSelectedRole] = useState("All")
  const [activeTab, setActiveTab] = useState("requests")
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const unsubscribers = [
      onSnapshot(collection(firestore, "requests"), (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }),
      onSnapshot(collection(firestore, "services"), (snap) => {
        setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }),
      onSnapshot(collection(firestore, "fundraisers"), (snap) => {
        setFundraisers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }),
      onSnapshot(collection(firestore, "users"), (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }),
    ]
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [])

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const input = document.getElementById("chart-section")
      if (!input) {
        alert("Chart section not found.")
        return
      }

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("l", "mm", "a4")
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${activeTab}_Statistics_${dayjs().format("YYYY-MM-DD")}.pdf`)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  const chartData = useMemo(() => {
    const requestTypes = ["Money", "Food", "Clothes", "Other"]
    const serviceTypes = [
      "Academic Skills",
      "Technology & STEM",
      "Arts & Creativity",
      "Personal Development",
      "Career Training",
      "Social Learning",
    ]
    const fundraiserTypes = ["Books", "School Uniforms", "Nutrition", "Medical Aid", "Other"]
    const userRoles = ["admin", "Donor", "Orphanage"]

    return {
      requests: {
        bar: requestTypes.map((type) => {
          const typeRequests = requests.filter((r) => r.requestType === type)
          return {
            name: type,
            Fulfilled: typeRequests.filter((r) =>
              ["Fulfilled", "fulfilled", "Completed", "completed"].includes(r.status),
            ).length,
            Pending: typeRequests.filter(
              (r) => ["Pending", "pending", "Active", "active"].includes(r.status) || !r.status,
            ).length,
          }
        }),
        pie: requestTypes.map((type, idx) => ({
          name: type,
          value: requests.filter((r) => r.requestType === type).length,
          color: colors[idx % colors.length],
        })),
      },
      services: {
        bar: serviceTypes.map((type) => {
          const typeServices = services.filter((s) => s.title === type)
          return {
            name: type.replace(" & ", "\n& "),
            Fulfilled: typeServices.filter((s) => s.status === "Fulfilled").length,
            "In Progress": typeServices.filter((s) => s.status === "In Progress").length,
            Pending: typeServices.filter((s) => s.status === "Pending" || !s.status).length,
          }
        }),
        pie: serviceTypes.map((type, idx) => ({
          name: type,
          value: services.filter((s) => s.title === type).length,
          color: colors[idx % colors.length],
        })),
      },
      fundraisers: {
        bar: fundraiserTypes.map((type) => {
          const items = fundraisers.filter((f) => f.title === type)
          const raised = items.reduce((sum, f) => sum + (f.raisedAmount || 0), 0)
          const total = items.reduce((sum, f) => sum + (f.totalAmount || 0), 0)
          return {
            name: type,
            Raised: raised,
            Remaining: Math.max(0, total - raised),
          }
        }),
        pie: fundraiserTypes.map((type, idx) => ({
          name: type,
          value: fundraisers.filter((f) => f.title === type).length,
          color: colors[idx % colors.length],
        })),
      },
      users: userRoles.map((role, idx) => ({
        name: role === "admin" ? "Admin" : role,
        value: users.filter((u) => u.userType === role).length,
        color: colors[idx % colors.length],
      })),
      trends: Array.from({ length: 12 }, (_, i) => {
        const label = dayjs().month(i).format("MMM")
        const monthKey = dayjs(`${selectedYear}-${(i + 1).toString().padStart(2, "0")}`)
        const count = users.filter((user) => {
          const ts = user.createdAt?.toDate?.() || user.timestamp?.toDate?.()
          const roleMatch = selectedRole === "All" || user.userType === selectedRole
          return ts && dayjs(ts).format("YYYY-MM") === monthKey.format("YYYY-MM") && roleMatch
        }).length
        return { month: label, count }
      }),
    }
  }, [requests, services, fundraisers, users, selectedYear, selectedRole])

  const totalStats = useMemo(
    () => ({
      requests: requests.length,
      services: services.length,
      fundraisers: fundraisers.length,
      users: users.length,
      fulfilledRequests: requests.filter((r) => ["Fulfilled", "fulfilled", "Completed", "completed"].includes(r.status))
        .length,
      pendingRequests: requests.filter(
        (r) => ["Pending", "pending", "Active", "active"].includes(r.status) || !r.status,
      ).length,
    }),
    [requests, services, fundraisers, users],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive insights into platform performance</p>
          </div>
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            {exporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.requests}</p>
              <p className="text-xs text-green-600">
                {totalStats.fulfilledRequests} fulfilled, {totalStats.pendingRequests} pending
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="text-blue-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.services}</p>
              <p className="text-xs text-purple-600">Educational & skill services</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <PieChartIcon className="text-purple-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fundraisers</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.fundraisers}</p>
              <p className="text-xs text-orange-600">Active campaigns</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="text-orange-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.users}</p>
              <p className="text-xs text-green-600">Registered members</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="text-green-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        {tabs.map((tab) => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Charts Section */}
      <div id="chart-section" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeTab === "requests" && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Analytics</h2>
              <p className="text-gray-600">Overview of donation requests and their fulfillment status</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Request Fulfillment Status</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData.requests.bar} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Fulfilled" stackId="a" fill="#10B981" />
                    <Bar dataKey="Pending" stackId="a" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Requests by Type Distribution</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData.requests.pie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.requests.pie.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Analytics</h2>
              <p className="text-gray-600">Educational and skill development service statistics</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Service Status by Category</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData.services.bar} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Fulfilled" fill="#10B981" />
                    <Bar dataKey="In Progress" fill="#3B82F6" />
                    <Bar dataKey="Pending" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Services by Category</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData.services.pie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      label={({ name, percent }) => (percent > 0 ? `${(percent * 100).toFixed(0)}%` : "")}
                    >
                      {chartData.services.pie.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fundraisers" && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Fundraiser Analytics</h2>
              <p className="text-gray-600">Campaign performance and funding progress</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Fundraising Progress by Category</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData.fundraisers.bar}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`Rs. ${value}`, ""]} />
                    <Legend />
                    <Bar dataKey="Raised" fill="#10B981" />
                    <Bar dataKey="Remaining" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Fundraisers by Category</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData.fundraisers.pie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : "")}
                    >
                      {chartData.fundraisers.pie.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">User Analytics</h2>
              <p className="text-gray-600">Platform user distribution and demographics</p>
            </div>

            <div className="flex justify-center">
              <div className="bg-gray-50 p-6 rounded-xl w-full max-w-2xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Users by Role</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData.users}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={150}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    >
                      {chartData.users.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Signup Trends</h2>
              <p className="text-gray-600">User registration patterns over time</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Monthly Signups</h3>
                <select
                  className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const year = dayjs().year() - i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
                <select
                  className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="Donor">Donor</option>
                  <option value="Orphanage">Orphanage</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.trends}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: "#3B82F6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
