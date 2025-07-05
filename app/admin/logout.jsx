"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export default function useLogoutEffect(activeTab, setUser) {
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser

      if (activeTab === "Logout") {
        await auth.signOut()
        router.push("/login")
        return
      }

      if (!currentUser) {
        router.push("/login")
        return
      }

      try {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.userType !== "admin") {
            router.push("/unauthorized")
            return
          }
          setUser(data)
        } else {
          router.push("/unauthorized")
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
        router.push("/unauthorized")
      }
    }
    fetchUser()
  }, [router, activeTab])
}
