"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth"
import { getDoc, setDoc, doc } from "firebase/firestore"
import Loading from "./loading"
import { motion, AnimatePresence } from "framer-motion"
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Mail, Lock, Shield } from "lucide-react"

const LoginPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [donorCheck, setDonorCheck] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState("")
  const [pendingUser, setPendingUser] = useState(null)
  const [rememberMe, setRememberMe] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("redirect") === "donate") {
      setDonorCheck(true)
    }

    // Check for saved credentials
    const savedEmail = localStorage.getItem("rememberedEmail")
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [searchParams])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setResetMessage("")
    setVerifyMessage("")
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (!user.emailVerified) {
        setPendingUser(user)
        setShowVerifyModal(true)
        setLoading(false)
        return
      }

      // Remember email if checkbox is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email)
      } else {
        localStorage.removeItem("rememberedEmail")
      }

      const userDocRef = doc(firestore, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const role = userData.userType || null

        if (donorCheck && role !== "Donor") {
          setError("Only donors can proceed with donations.")
          setLoading(false)
          return
        }

        // Store user session with enhanced data
        const sessionData = {
          uid: user.uid,
          email: user.email,
          userType: role,
          fullName: userData.fullName || userData.orgName || "",
          timestamp: Date.now(),
          lastLogin: new Date().toISOString(),
        }
        localStorage.setItem("userSession", JSON.stringify(sessionData))

        toast.success(`Welcome back! Redirecting to your ${role.toLowerCase()} dashboard...`)

        // Add login activity to user document
        await setDoc(
          userDocRef,
          {
            ...userData,
            lastLogin: new Date(),
            loginCount: (userData.loginCount || 0) + 1,
          },
          { merge: true },
        )

        setTimeout(() => {
          if (role === "Donor") {
            router.push("/donorDashboard")
          } else if (role === "Orphanage") {
            router.push("/orphanageDashboard")
          } else if (role === "admin") {
            router.push("/admin")
          } else {
            setError("User role is missing. Please contact support.")
          }
        }, 1500)
      } else {
        const newUser = {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || "",
          contactNumber: "",
          userType: "Donor",
          createdAt: new Date(),
          emailVerified: true,
          lastLogin: new Date(),
          loginCount: 1,
        }
        await setDoc(userDocRef, newUser)

        localStorage.setItem(
          "userSession",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            userType: "Donor",
            fullName: user.displayName || "",
            timestamp: Date.now(),
          }),
        )

        toast.success("Welcome to CareConnect!")
        setTimeout(() => router.push("/donorDashboard"), 1500)
      }
    } catch (err) {
      console.error("Login error:", err)
      let errorMessage = "Invalid email or password. Please try again."

      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address."
          break
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again."
          break
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address."
          break
        case "auth/user-disabled":
          errorMessage = "This account has been disabled. Please contact support."
          break
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later."
          break
        default:
          errorMessage = err.message || errorMessage
      }

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setResetMessage("")
    if (!resetEmail) {
      setResetMessage("Please enter an email.")
      return
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetMessage("✅ Reset email sent. Check your inbox.")
      toast.success("Password reset email sent!")
    } catch (err) {
      const errorMessage = "❌ " + (err.message || "Failed to send reset email")
      setResetMessage(errorMessage)
      toast.error("Failed to send reset email")
    }
  }

  const handleResendVerification = async () => {
    if (!pendingUser) return

    try {
      await sendEmailVerification(pendingUser)
      setVerifyMessage("✅ Verification email sent.")
      toast.success("Verification email sent!")
    } catch (err) {
      const errorMessage = "❌ " + (err.message || "Failed to send verification email")
      setVerifyMessage(errorMessage)
      toast.error("Failed to send verification email")
    }
  }

  if (loading) return <Loading />

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-4 sm:px-6 lg:px-8">
      <ToastContainer position="top-right" autoClose={5000} />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-white text-2xl font-bold">CC</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your CareConnect account</p>
        </div>

        {donorCheck && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <p className="text-blue-700 text-center text-sm font-medium">
              🎯 Donor Login Required - Only donors can proceed with donations
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
          >
            <p className="text-red-700 text-center text-sm">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
          {/* Dummy inputs to prevent autofill */}
          <div style={{ display: "none" }}>
            <input type="text" name="fakeuser" autoComplete="off" />
            <input type="password" name="fakepass" autoComplete="off" />
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
              onClick={() => setShowResetModal(true)}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600  shadow-lg hover:shadow-xl"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing In...
              </div>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={() => router.push("/signup")}
              className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              disabled={loading}
            >
              Sign up here
            </button>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Shield className="w-4 h-4" />
            <span>Secured with enterprise-grade encryption</span>
          </div>
        </div>
      </motion.div>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">Reset Password</h2>
              <input
                type="email"
                placeholder="Enter your email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {resetMessage && (
                <div
                  className={`text-sm mb-4 p-3 rounded-xl ${
                    resetMessage.startsWith("✅")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {resetMessage}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResetModal(false)
                    setResetMessage("")
                    setResetEmail("")
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Verification Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">Email Verification Required</h2>
              <p className="text-sm mb-4 p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                {verifyMessage ||
                  "Please verify your email before logging in. Check your inbox for the verification link."}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowVerifyModal(false)
                    setPendingUser(null)
                    setVerifyMessage("")
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResendVerification}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all"
                >
                  Resend Verification Email
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

const LoginPageWithSuspense = () => (
  <Suspense fallback={<Loading />}>
    <LoginPage />
  </Suspense>
)

export default LoginPageWithSuspense
