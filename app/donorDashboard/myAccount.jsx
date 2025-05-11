"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Poppins } from "next/font/google"
import { auth } from "@/lib/firebase" // Import auth for logout
import { ChatProvider } from "@/components/chat/chat-context"
import MessageNotification from "@/components/chat/message-notification"
import AddressSection from "./addressSection"
import AccountDetails from "./accountDetails"
import FulfillRequests from "./fulfillRequest"
import FulfillServices from "./fullfillServices"
import FulfillFundraise from "./fullfillFundraise"
import Dashboard from "./dashboard"
import DonationsHistory from "./donationHistory"
import Link from "next/link" // Import Link for navigation

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState("Dashboard")
  const router = useRouter()
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Wait for component to mount before showing notification to avoid hydration issues
    setShowNotification(true)
  }, [])

  // Proper Logout Function
  const handleLogout = async () => {
    try {
      await auth.signOut() // Sign the user out of Firebase
      localStorage.removeItem("userSession") // Remove session data
      router.push("/login") // Redirect to login
    } catch (error) {
      console.error("Error Logging Out:", error.message)
    }
  }

  return (
    <ChatProvider>
      <section className={`${poppins.className} container mx-auto`}>
        {/* Main Account Section */}
        <div className="flex flex-col lg:flex-row mt-8 gap-10">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-1/4 bg-white shadow-md p-6 mt-10">
            {/* Message Notification Button */}
            {showNotification && (
              <div className="mb-6">
                <MessageNotification className="w-full justify-center" />
              </div>
            )}

            <ul className="space-y-2">
              {[
                "Dashboard",
                "Fulfill Requests",
                "Fulfill Services",
                "Fulfill FundRaise",
                "Donations",
                "Addresses",
                "Account details",
                "Messages",
                "Logout",
              ].map((tab) => (
                <li
                  key={tab}
                  onClick={() => {
                    if (tab === "Logout") {
                      handleLogout() // Call Logout Function
                    } else if (tab === "Messages") {
                      router.push("/messages") // Navigate to messages page
                    } else {
                      setActiveTab(tab)
                    }
                  }}
                  className={`p-3 cursor-pointer ${activeTab === tab ? "bg-gray-200 font-bold" : "hover:bg-gray-100"}`}
                >
                  {tab}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main Content Section */}
          <div className="w-full lg:w-3/4 mt-18">
            {/* Greeting Message - Always Visible */}
            <p className="text-lg font-medium">
              Hello <span className="font-bold">hunnybunny112200</span> (not{" "}
              <span className="font-bold">hunnybunny112200</span>?{" "}
              <Link href="#" onClick={handleLogout} className="text-blue-500 ml-1">
                Log out
              </Link>
              )
            </p>

            {/* Dynamic Content Based on Active Tab */}
            {activeTab === "Dashboard" && <Dashboard />}
            {activeTab === "Addresses" && <AddressSection />}
            {activeTab === "Account details" && <AccountDetails />}
            {activeTab === "Fulfill Requests" && <FulfillRequests />}
            {activeTab === "Fulfill Services" && <FulfillServices />}
            {activeTab === "Fulfill FundRaise" && <FulfillFundraise />}
            {activeTab === "Donations" && <DonationsHistory />}
          </div>
        </div>
      </section>
    </ChatProvider>
  )
}
