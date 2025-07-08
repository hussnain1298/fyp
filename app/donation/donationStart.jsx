"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Gift, DollarSign, Shirt, UtensilsCrossed, ArrowRight, Heart } from "lucide-react"

export default function DonationStart({ setShowForm, setShowReview, setDonationAmount, setDonationType }) {
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("")

  const handleProceed = () => {
    if (!type) return alert("Please select a donation type.")
    if (type === "money" && (!amount || amount <= 0)) return alert("Please enter a valid amount.")

    setDonationType(type)
    if (type === "money") setDonationAmount(amount)

    setShowForm(true)
  }

  const donationTypes = [
    {
      value: "money",
      label: "Money Donation",
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      description: "Support with financial contribution",
    },
    {
      value: "clothes",
      label: "Clothes Donation",
      icon: Shirt,
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
      description: "Donate clothing items",
    },
    {
      value: "food",
      label: "Food Donation",
      icon: UtensilsCrossed,
      color: "from-orange-500 to-red-600",
      bgColor: "bg-orange-50",
      description: "Provide food supplies",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl p-8 space-y-8 border border-gray-100"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Start Your Donation</h2>
        <p className="text-gray-600 text-lg">Choose how you'd like to make a difference today</p>
      </div>

      {/* Donation Type Selection */}
      <div className="space-y-4">
        <label className="block font-semibold text-gray-700 text-lg mb-4">Select Donation Type</label>
        <div className="grid grid-cols-1 gap-4">
          {donationTypes.map((donationType) => {
            const IconComponent = donationType.icon
            return (
              <motion.div
                key={donationType.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setType(donationType.value)}
                className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                  type === donationType.value
                    ? "border-green-500 bg-green-50 shadow-lg"
                    : "border-gray-200 hover:border-green-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${donationType.color}`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{donationType.label}</h3>
                    <p className="text-gray-600">{donationType.description}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      type === donationType.value ? "border-green-500 bg-green-500" : "border-gray-300"
                    }`}
                  >
                    {type === donationType.value && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Amount Input for Money Donation */}
      {type === "money" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <label htmlFor="donationAmount" className="block font-semibold text-gray-700 text-lg">
            Donation Amount (PKR)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="donationAmount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
              placeholder="Enter amount (e.g. 1000)"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className="px-4 py-2 bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 rounded-lg transition-colors font-medium"
              >
                Rs. {preset}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Impact Message */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-800">Your Impact</span>
        </div>
        <p className="text-green-700">
          Every donation, no matter the size, makes a meaningful difference in the lives of children who need our
          support.
        </p>
      </div>

      {/* Proceed Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleProceed}
        disabled={!type || (type === "money" && (!amount || amount <= 0))}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg disabled:shadow-none"
      >
        Proceed to Donor Details
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  )
}
