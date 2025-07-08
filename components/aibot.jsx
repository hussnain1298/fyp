"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, RefreshCw, X, Lightbulb, Heart, Loader2 } from "lucide-react"

export default function AIDonationSuggestionBot({ donationHistory = [], userStats = {}, className = "" }) {
  const [suggestion, setSuggestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isAI, setIsAI] = useState(false)
  const [error, setError] = useState("")

  const fetchSuggestion = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/donation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donationHistory: donationHistory.slice(0, 10), // Send only recent 10 donations
          userStats,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSuggestion(data.suggestion || "Keep up your amazing work! Every donation makes a difference.")
      setIsAI(data.isAI || false)
    } catch (err) {
      console.error("Failed to fetch suggestion:", err)
      setError("Unable to load suggestion")
      setSuggestion("Your donations make a real difference! Consider exploring new ways to help orphanages.")
      setIsAI(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Auto-fetch suggestion when component mounts or data changes
    if (donationHistory.length > 0 || Object.keys(userStats).length > 0) {
      fetchSuggestion()
    }
  }, [donationHistory, userStats]) // Use exhaustive dependencies

  if (!isVisible) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        title="Show AI Suggestions"
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              {isAI && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">AI</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 flex items-center space-x-2">
                <span>Smart Donation Assistant</span>
                {isAI && <Lightbulb className="w-4 h-4 text-yellow-500" />}
              </h3>
              <p className="text-sm text-gray-600">
                {isAI ? "AI-powered personalized suggestions" : "Personalized suggestions for you"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSuggestion}
              disabled={isLoading}
              className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh suggestion"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Minimize"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {error ? (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-purple-100">
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">Generating personalized suggestion...</span>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <p className="text-gray-700 leading-relaxed">{suggestion}</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Stats Summary */}
          {!isLoading && userStats.totalDonations > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-600">{userStats.totalDonations}</div>
                <div className="text-xs text-gray-600">Total Donations</div>
              </div>
              <div className="bg-white/50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-pink-600">
                  Rs. {(userStats.totalAmount || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Amount Donated</div>
              </div>
            </div>
          )}

          {/* Call to Action */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center space-x-2 pt-2"
            >
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-600 font-medium">Ready to make a difference?</span>
              <Heart className="w-4 h-4 text-red-500" />
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
