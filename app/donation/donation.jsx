"use client"
import { useState } from "react"
import DonorForm from "./donorform"
import DonationStart from "./donationStart"
import ReviewDonation from "./reviewdonation"
import Navbar from "../Navbar/page"

export default function DonationComponent() {
  const [showForm, setShowForm] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [donationAmount, setDonationAmount] = useState("")
  const [donationType, setDonationType] = useState("")
  const [donorInfo, setDonorInfo] = useState({})

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar />

      <section className="container mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-10 mt-14 lg:mt-20">
        {/* Progress Indicator */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-2 ${!showForm && !showReview ? "text-green-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${!showForm && !showReview ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                1
              </div>
              <span className="font-medium">Choose Type</span>
            </div>

            <div className={`flex items-center gap-2 ${showForm ? "text-green-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${showForm ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                2
              </div>
              <span className="font-medium">Your Details</span>
            </div>

            <div className={`flex items-center gap-2 ${showReview ? "text-green-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${showReview ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                3
              </div>
              <span className="font-medium">Review & Submit</span>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: showReview ? "100%" : showForm ? "66%" : "33%",
              }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        {showReview ? (
          <ReviewDonation
            setShowReview={setShowReview}
            setShowForm={setShowForm}
            donationAmount={donationAmount}
            donationType={donationType}
            donorInfo={donorInfo}
          />
        ) : showForm ? (
          <DonorForm
            setShowForm={setShowForm}
            setShowReview={setShowReview}
            donationAmount={donationAmount}
            donationType={donationType}
            setDonorInfo={setDonorInfo}
          />
        ) : (
          <DonationStart
            setShowForm={setShowForm}
            setShowReview={setShowReview}
            setDonationAmount={setDonationAmount}
            setDonationType={setDonationType}
          />
        )}
      </section>
    </div>
  )
}
