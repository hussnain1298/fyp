"use client"

import { useState, useEffect } from "react"
import { auth, firestore } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { TrendingUp, Brain, Target, Calendar, Lightbulb } from "lucide-react"

export default function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState({
    nextMonthDonation: 0,
    goalAchievementProbability: 0,
    recommendedDonationAmount: 0,
    bestDonationDays: [],
    trendAnalysis: "stable",
  })

  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generatePredictions()
  }, [])

  const generatePredictions = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      // Fetch donation history
      const donationsQuery = query(collection(firestore, "donations"), where("donorId", "==", user.uid))
      const snapshot = await getDocs(donationsQuery)
      const donations = snapshot.docs.map((doc) => doc.data())

      // Perform predictive analysis
      const analysis = performPredictiveAnalysis(donations)
      setPredictions(analysis.predictions)
      setInsights(analysis.insights)
    } catch (error) {
      console.error("Error generating predictions:", error)
    } finally {
      setLoading(false)
    }
  }

  const performPredictiveAnalysis = (donations) => {
    // Simple ML-like analysis (in production, you'd use actual ML models)
    const monthlyTotals = calculateMonthlyTotals(donations)
    const weeklyPatterns = analyzeWeeklyPatterns(donations)
    const seasonalTrends = analyzeSeasonalTrends(donations)

    // Predict next month donation using linear regression
    const nextMonthPrediction = predictNextMonth(monthlyTotals)

    // Calculate goal achievement probability
    const goalProbability = calculateGoalProbability(donations)

    // Generate insights
    const generatedInsights = generateInsights(donations, weeklyPatterns, seasonalTrends)

    return {
      predictions: {
        nextMonthDonation: nextMonthPrediction,
        goalAchievementProbability: goalProbability,
        recommendedDonationAmount: Math.round(nextMonthPrediction / 30),
        bestDonationDays: weeklyPatterns.bestDays,
        trendAnalysis: analyzeTrend(monthlyTotals),
      },
      insights: generatedInsights,
    }
  }

  const calculateMonthlyTotals = (donations) => {
    const monthlyData = {}
    donations.forEach((donation) => {
      const date = donation.timestamp?.toDate()
      if (date && donation.amount) {
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + donation.amount
      }
    })
    return Object.values(monthlyData)
  }

  const analyzeWeeklyPatterns = (donations) => {
    const dayTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    donations.forEach((donation) => {
      const date = donation.timestamp?.toDate()
      if (date && donation.amount) {
        dayTotals[date.getDay()] += donation.amount
      }
    })

    const bestDays = Object.entries(dayTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day])

    return { dayTotals, bestDays }
  }

  const analyzeSeasonalTrends = (donations) => {
    const seasonalData = { spring: 0, summer: 0, fall: 0, winter: 0 }
    donations.forEach((donation) => {
      const date = donation.timestamp?.toDate()
      if (date && donation.amount) {
        const month = date.getMonth()
        if (month >= 2 && month <= 4) seasonalData.spring += donation.amount
        else if (month >= 5 && month <= 7) seasonalData.summer += donation.amount
        else if (month >= 8 && month <= 10) seasonalData.fall += donation.amount
        else seasonalData.winter += donation.amount
      }
    })
    return seasonalData
  }

  const predictNextMonth = (monthlyTotals) => {
    if (monthlyTotals.length < 2) return 0

    // Simple linear regression
    const n = monthlyTotals.length
    const sumX = (n * (n + 1)) / 2
    const sumY = monthlyTotals.reduce((a, b) => a + b, 0)
    const sumXY = monthlyTotals.reduce((sum, y, i) => sum + (i + 1) * y, 0)
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return Math.max(0, slope * (n + 1) + intercept)
  }

  const calculateGoalProbability = (donations) => {
    // Calculate based on historical goal achievement rate
    const dailyGoal = 1000 // This should come from user settings
    const recentDonations = donations.slice(-30) // Last 30 donations
    const goalMetDays = recentDonations.filter((d) => d.amount >= dailyGoal).length
    return Math.round((goalMetDays / Math.max(1, recentDonations.length)) * 100)
  }

  const analyzeTrend = (monthlyTotals) => {
    if (monthlyTotals.length < 3) return "insufficient_data"

    const recent = monthlyTotals.slice(-3)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length
    const lastMonth = recent[recent.length - 1]

    if (lastMonth > avg * 1.1) return "increasing"
    if (lastMonth < avg * 0.9) return "decreasing"
    return "stable"
  }

  const generateInsights = (donations, weeklyPatterns, seasonalTrends) => {
    const insights = []

    // Weekly pattern insights
    if (weeklyPatterns.bestDays.length > 0) {
      insights.push({
        type: "pattern",
        title: "Best Donation Days",
        message: `You tend to donate more on ${weeklyPatterns.bestDays.join(", ")}. Consider setting reminders for these days.`,
        icon: Calendar,
        color: "blue",
      })
    }

    // Trend insights
    const avgDonation = donations.reduce((sum, d) => sum + (d.amount || 0), 0) / donations.length
    if (avgDonation > 0) {
      insights.push({
        type: "trend",
        title: "Donation Consistency",
        message: `Your average donation is Rs. ${Math.round(avgDonation)}. ${
          avgDonation > 500 ? "Great consistency!" : "Consider increasing your regular donation amount."
        }`,
        icon: TrendingUp,
        color: avgDonation > 500 ? "green" : "yellow",
      })
    }

    // Goal insights
    const recentGoalMet = donations.slice(-7).filter((d) => d.amount >= 1000).length
    if (recentGoalMet < 3) {
      insights.push({
        type: "goal",
        title: "Goal Achievement",
        message:
          "You've met your daily goal only " +
          recentGoalMet +
          " times this week. Consider adjusting your goal or donation frequency.",
        icon: Target,
        color: "orange",
      })
    }

    return insights
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Predictions Dashboard */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg border border-indigo-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">AI Predictions</h2>
            <p className="text-sm text-gray-600">Data-driven insights for better giving</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">
              Rs. {predictions.nextMonthDonation.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Predicted Next Month</div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{predictions.goalAchievementProbability}%</div>
            <div className="text-sm text-gray-600">Goal Achievement Chance</div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">Rs. {predictions.recommendedDonationAmount}</div>
            <div className="text-sm text-gray-600">Recommended Daily Amount</div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-blue-600 capitalize">{predictions.trendAnalysis}</div>
            <div className="text-sm text-gray-600">Donation Trend</div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-800">Smart Insights</h2>
        </div>

        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border-l-4 ${
                insight.color === "blue"
                  ? "bg-blue-50 border-blue-500"
                  : insight.color === "green"
                    ? "bg-green-50 border-green-500"
                    : insight.color === "yellow"
                      ? "bg-yellow-50 border-yellow-500"
                      : "bg-orange-50 border-orange-500"
              }`}
            >
              <div className="flex items-start space-x-3">
                <insight.icon
                  className={`w-5 h-5 mt-0.5 ${
                    insight.color === "blue"
                      ? "text-blue-500"
                      : insight.color === "green"
                        ? "text-green-500"
                        : insight.color === "yellow"
                          ? "text-yellow-500"
                          : "text-orange-500"
                  }`}
                />
                <div>
                  <h4 className="font-medium text-gray-800">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
