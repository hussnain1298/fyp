"use client"

import { useEffect } from "react"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { LogOut, CheckCircle } from "lucide-react"

const AdminLogout = () => {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut(auth)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } catch (error) {
        console.error("Error signing out:", error)
        router.push("/login")
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-8 shadow-lg text-center max-w-md w-full mx-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
        >
          <CheckCircle className="w-8 h-8 text-green-600" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Logged Out Successfully
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6"
        >
          You have been successfully logged out of the admin panel.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 text-blue-600"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Redirecting to login page...</span>
        </motion.div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.6, duration: 2 }}
          className="mt-4 h-1 bg-blue-600 rounded-full"
        />
      </motion.div>
    </div>
  )
}

export default AdminLogout
