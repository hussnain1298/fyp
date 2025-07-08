"use client"
import { motion } from "framer-motion"
import { Poppins } from "next/font/google"
import {
  CheckCircle,
  Shirt,
  UtensilsCrossed,
  DollarSign,
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Package,
  Gift,
  Heart,
} from "lucide-react"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function ReviewDonation({ donationAmount, donationType, setShowReview, setShowForm, donorInfo = {} }) {
  const getDonationIcon = () => {
    switch (donationType) {
      case "money":
        return <DollarSign className="text-green-500 text-4xl" />
      case "clothes":
        return <Shirt className="text-blue-500 text-4xl" />
      case "food":
        return <UtensilsCrossed className="text-orange-500 text-4xl" />
      default:
        return <Gift className="text-purple-500 text-4xl" />
    }
  }

  const getDonationColor = () => {
    switch (donationType) {
      case "money":
        return "from-green-500 to-emerald-600"
      case "clothes":
        return "from-blue-500 to-indigo-600"
      case "food":
        return "from-orange-500 to-red-600"
      default:
        return "from-purple-500 to-pink-600"
    }
  }

  const handleConfirmDonation = () => {
    // Show success message for all donation types
    alert(
      "✅ Thank you! Your donation has been successfully submitted. We will contact you soon for pickup/delivery arrangements.",
    )
    // Reset to start
    setShowReview(false)
    // Optionally redirect to home or reset the entire form
    window.location.reload()
  }

  return (
    <section className={`${poppins.className} container mx-auto px-4 sm:px-6 py-8 flex justify-center`}>
      <motion.div
        className="bg-white shadow-2xl rounded-3xl p-8 border border-gray-100 w-full max-w-4xl space-y-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${getDonationColor()} rounded-full mb-4`}
          >
            {getDonationIcon()}
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Review Your Donation</h2>
          <p className="text-gray-600 text-lg">Please verify all details before submitting</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Donation Summary */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Package className="w-6 h-6 text-gray-600" />
                Donation Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Donation Type:</span>
                  <span className="capitalize font-bold text-gray-900 flex items-center gap-2">
                    {donationType}
                    {donationType === "money" && <DollarSign className="w-4 h-4 text-green-600" />}
                    {donationType === "clothes" && <Shirt className="w-4 h-4 text-blue-600" />}
                    {donationType === "food" && <UtensilsCrossed className="w-4 h-4 text-orange-600" />}
                  </span>
                </div>

                {donationType === "money" && (
                  <div className="flex justify-between items-center py-3 bg-green-50 rounded-xl px-4 border-2 border-green-200">
                    <span className="font-bold text-green-800">Amount:</span>
                    <span className="text-green-700 font-bold text-xl">
                      Rs. {Number(donationAmount).toLocaleString()}
                    </span>
                  </div>
                )}

                {donationType === "clothes" && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <p className="font-semibold text-blue-800 mb-2">Description:</p>
                      <p className="text-blue-700">{donorInfo.clothesDesc || "N/A"}</p>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Quantity:</span>
                      <span className="font-bold text-blue-600">{donorInfo.clothesQty || "N/A"} items</span>
                    </div>
                  </div>
                )}

                {donationType === "food" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-700">Food Type:</span>
                      <span className="font-bold text-orange-600">{donorInfo.foodType || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-700">Quantity:</span>
                      <span className="font-bold text-orange-600">{donorInfo.foodQty || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Expiry Date:</span>
                      <span className="font-bold text-orange-600">{donorInfo.foodExpiry || "N/A"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Donor Information */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <User className="w-6 h-6 text-gray-600" />
                Donor Information
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3 py-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {donorInfo.firstName} {donorInfo.lastName}
                    </p>
                    <p className="text-sm text-gray-600">Full Name</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2">
                  <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-800">{donorInfo.address}</p>
                    <p className="text-gray-700">
                      {donorInfo.city}, {donorInfo.state} - {donorInfo.postcode}
                    </p>
                    <p className="text-sm text-gray-600">Address</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-semibold text-gray-800">{donorInfo.phone}</p>
                    <p className="text-sm text-gray-600">Phone Number</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Message */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <Heart className="w-6 h-6 text-green-600" />
                <h4 className="font-bold text-green-800">Your Impact</h4>
              </div>
              <p className="text-green-700 leading-relaxed">
                Your generous {donationType} donation will directly help children in need. Thank you for making a
                difference in their lives!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmDonation}
            className={`flex-1 bg-gradient-to-r ${getDonationColor()} hover:shadow-lg text-white py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-md`}
          >
            <CheckCircle className="w-5 h-5" />
            Submit Donation
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowReview(false)
              setShowForm(true)
            }}
            className="flex-1 sm:flex-none sm:px-8 border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Details
          </motion.button>
        </div>
      </motion.div>
    </section>
  )
}
