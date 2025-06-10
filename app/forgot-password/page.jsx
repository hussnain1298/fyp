"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useForm } from "react-hook-form"
import Loading from "@/components/loading"

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, data.email)
      setEmailSent(true)
      toast.success("Password reset email sent! Check your inbox.", { position: "top-right" })
    } catch (error) {
      let errorMessage = "Failed to send reset email"

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address"
      } else {
        errorMessage = error.message
      }

      toast.error(`❌ Error: ${errorMessage}`, { position: "top-right" })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4 sm:px-8">
      <ToastContainer />
      <div className="w-full max-w-md p-6 sm:p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Reset Password</h2>

        {emailSent ? (
          <div className="text-center">
            <div className="mb-4 text-green-600 text-5xl flex justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-700 mb-6">
              We've sent a password reset link to your email address. Please check your inbox and follow the
              instructions.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => setEmailSent(false)}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
              >
                Send Again
              </button>
              <Link
                href="/login"
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                      message: "Invalid email address",
                    },
                  })}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700">
                Send Reset Link
              </button>
            </form>

            <p className="text-center mt-6 text-gray-600">
              Remember your password?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
