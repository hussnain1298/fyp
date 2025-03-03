"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import ReCAPTCHA from "react-google-recaptcha"; // Import reCAPTCHA

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function ProceedPayment({ setShowPayment, setShowReview }) {
  const [captchaVerified, setCaptchaVerified] = useState(false); // Track reCAPTCHA status

  const handleCaptchaVerify = (value) => {
    if (value) {
      setCaptchaVerified(true);
    }
  };

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex justify-center`}>
      <motion.div
        className="bg-white shadow-md rounded-lg p-6 border w-full max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header */}
        <h2 className="text-xl font-bold border-b pb-2 text-gray-800">PROCEED TO PAYMENT</h2>

        {/* Payment Options */}
        <div className="mt-4">
          <p className="text-gray-700">Choose a payment method:</p>
          <div className="mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="paymentMethod" className="accent-green-500" />
              <span className="text-gray-700">Credit/Debit Card</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="radio" name="paymentMethod" className="accent-green-500" />
              <span className="text-gray-700">PayPal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="radio" name="paymentMethod" className="accent-green-500" />
              <span className="text-gray-700">Bank Transfer</span>
            </label>
          </div>
        </div>

        {/* reCAPTCHA */}
        <div className="mt-6 flex justify-center">
          <ReCAPTCHA
            sitekey="6LctMsgqAAAAAMIrY5yVfLrLAQ88imkQ5GTycsgR"  // Replace with your actual site key
            onChange={handleCaptchaVerify}
          />
        </div>

        {/* Pay Now Button */}
        <button
          className={`mt-4 w-full bg-green-600 text-white py-3 px-6 font-semibold hover:bg-green-700 transition-all shadow-md ${
            captchaVerified ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
          disabled={!captchaVerified} // Disable if reCAPTCHA is not verified
        >
          PAY NOW
        </button>

        {/* Back Button */}
        <button
          onClick={() => {
            setShowPayment(false);  // Hide ProceedPayment
            setShowReview(true);  // Show ReviewDonation
          }}
          className="mt-4 w-full px-6 py-3 border border-gray-400 rounded-lg text-gray-700 font-semibold hover:bg-gray-200 transition-all"
        >
          BACK TO REVIEW DONATION
        </button>
      </motion.div>
    </section>
  );
}
