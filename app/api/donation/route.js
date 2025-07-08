import { NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req) {
  try {
    const { donationHistory, userStats } = await req.json()

    if (!OPENAI_API_KEY) {
      // Fallback to rule-based suggestions if no API key
      return NextResponse.json({
        suggestion: getFallbackSuggestion(donationHistory, userStats),
        isAI: false,
      })
    }

    // Create a comprehensive prompt for OpenAI
    const prompt = createDonationPrompt(donationHistory, userStats)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a compassionate donation assistant helping donors make meaningful contributions to orphanages. Provide personalized, encouraging suggestions based on their donation history. Keep responses under 100 words and be specific about donation types (Money, Clothes, Food, Services, Fundraisers).",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 120,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const suggestion = data.choices[0]?.message?.content || getFallbackSuggestion(donationHistory, userStats)

    return NextResponse.json({
      suggestion: suggestion.trim(),
      isAI: true,
    })
  } catch (error) {
    console.error("OpenAI suggestion error:", error)

    // Fallback to rule-based suggestions
    const { donationHistory, userStats } = await req.json()
    return NextResponse.json({
      suggestion: getFallbackSuggestion(donationHistory, userStats),
      isAI: false,
    })
  }
}

function createDonationPrompt(history, stats) {
  const recentDonations = history.slice(0, 5)
  const donationTypes = [...new Set(history.map((d) => d.donationType || d.type))].filter(Boolean)
  const lastDonationDate = history[0]?.date ? new Date(history[0].date) : null
  const daysSinceLastDonation = lastDonationDate
    ? Math.floor((new Date() - lastDonationDate) / (1000 * 60 * 60 * 24))
    : null

  return `
Donor Profile:
- Total donations: ${stats.totalDonations || 0}
- Total amount donated: Rs. ${stats.totalAmount || 0}
- Services fulfilled: ${stats.servicesFulfilled || 0}
- Fundraisers supported: ${stats.fundraisersSupported || 0}
- Days since last donation: ${daysSinceLastDonation || "Unknown"}

Recent donation types: ${donationTypes.join(", ") || "None"}

Recent donations:
${recentDonations.map((d) => `- ${d.donationType || d.type}: ${d.description || "No description"} (${d.date ? new Date(d.date).toLocaleDateString() : "Unknown date"})`).join("\n")}

Please suggest a personalized next donation action that would complement their giving pattern and help orphanages most effectively.
  `.trim()
}

function getFallbackSuggestion(history, stats) {
  const suggestions = [
    "Your generosity makes a real difference! Consider donating clothes for the upcoming season.",
    "You've been amazing with food donations! How about supporting an educational service next?",
    "Your financial contributions help so much! Maybe try donating essential items like clothes or food.",
    "You're doing great with services! Consider supporting a fundraising campaign to amplify your impact.",
    "Every donation counts! Try exploring different ways to help - money, clothes, food, or services.",
    "Your consistent giving is inspiring! Consider diversifying your donations to meet various orphanage needs.",
  ]

  if (!history || history.length === 0) {
    return "Welcome to giving! Start your journey by exploring donation requests that resonate with you."
  }

  const lastDonationType = history[0]?.donationType || history[0]?.type
  const daysSinceLastDonation = history[0]?.date
    ? Math.floor((new Date() - new Date(history[0].date)) / (1000 * 60 * 60 * 24))
    : 0

  if (daysSinceLastDonation > 30) {
    return "It's been a while since your last donation. Welcome back! Consider starting with a small contribution to reconnect with your giving journey."
  }

  if (lastDonationType === "Money") {
    return "Your financial support is valuable! Consider complementing it with clothes or food donations for a more holistic impact."
  }

  if (lastDonationType === "Food") {
    return "Your food donations feed hungry children! How about adding educational services or clothes to support their overall development?"
  }

  if (lastDonationType === "Clothes") {
    return "Clothing donations keep children warm and dignified! Consider supporting their nutrition with food donations or education with services."
  }

  return suggestions[Math.floor(Math.random() * suggestions.length)]
}
