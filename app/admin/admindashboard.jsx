"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import {
  BarChart3,
  Users,
  MessageSquare,
  Mail,
  Home,
  LogOut,
  Shield,
} from "lucide-react"

import AdminHome from "./dashboard"
import Statistics from "./statistics"
import Contact from "./contact"
import Subscriptions from "./subscribe"
import UserManagement from "./users"
import Navbar from "../Navbar/navbar"
import Footer from "../footer/page"
import ManageContent from "./manage-content"
import Messages from "./messages"
import AdminDonations from "./donations"
import DonationsHistory from "./donation-history"

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, component: AdminHome },
  { id: "messages", label: "Messages", icon: MessageSquare, component: Messages },
  { id: "users", label: "Users", icon: Users, component: UserManagement },
  { id: "statistics", label: "Statistics", icon: BarChart3, component: Statistics },
  { id: "contact", label: "Contact", icon: MessageSquare, component: Contact },
  { id: "subscriptions", label: "Subscriptions", icon: Mail, component: Subscriptions },
  { id: "history", label: "History", icon: Shield, component: DonationsHistory },
  { id: "content", label: "Content Management", icon: Shield, component: ManageContent },
  { id: "donation", label: "Donations Management", icon: Shield, component: AdminDonations },
]

export default function AdminDashboard({ user: initialUser }) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [user, setUser] = useState(initialUser)
  const [loading, setLoading] = useState(!initialUser)
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      if (initialUser) {
        setUser(initialUser)
        setLoading(false)
        return
      }

      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push("/login")
        return
      }

      try {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.userType !== "admin") {
            router.push("/unauthorized")
            return
          }
          setUser(userData)
        } else {
          router.push("/unauthorized")
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [initialUser, router])

  const handleLogout = async () => {
    try {
      await auth.signOut()
      localStorage.removeItem("userSession")
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const ActiveComponent = useMemo(() => {
    const item = navigationItems.find((item) => item.id === activeTab)
    return item?.component || AdminHome
  }, [activeTab])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 mt-10">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-6 mt-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-80">
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 sticky top-24">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Panel</h2>
                <div className="h-1 w-12 bg-gray-600 rounded"></div>
              </div>

              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.id
                          ? "bg-gray-100 text-gray-800 border-l-4 border-gray-600 font-medium"
                          : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </button>
                  )
                })}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <div className="flex items-center space-x-3">
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                  </div>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl min-h-[600px] p-6">
              <ActiveComponent user={user} />
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
