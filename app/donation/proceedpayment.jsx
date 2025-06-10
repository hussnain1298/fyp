"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import ReCAPTCHA from "react-google-recaptcha";
import {
  FaArrowLeft,
  FaLock,
} from "react-icons/fa";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function ProceedPayment({ setShowPayment, setShowReview }) {
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleCaptchaVerify = (value) => {
    if (value) setCaptchaVerified(true);
  };

  return (
    <section className={`${poppins.className} container mx-auto px-4 sm:px-6 py-8 flex justify-center`}>
  <motion.div
    className="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-200 w-full max-w-lg space-y-6"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
  >
    {/* Header */}
    <div className="flex items-center gap-3 border-b pb-4">
      <FaLock className="text-green-600 text-xl sm:text-2xl" />
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Secure Local Payment</h2>
    </div>

    {/* reCAPTCHA */}
    <div className="text-center">
      <p className="text-sm text-gray-500 mb-3">Please verify to enable payment</p>
      <div className="flex justify-center">
        <ReCAPTCHA
          sitekey="6LctMsgqAAAAAMIrY5yVfLrLAQ88imkQ5GTycsgR"
          onChange={handleCaptchaVerify}
        />
      </div>
    </div>

    {/* JazzCash Button */}
    <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/jazzcash.png" alt="JazzCash" className="w-6 h-6" />
        <span className="text-gray-800 font-semibold">Pay with JazzCash</span>
      </div>
      <button
        onClick={async () => {
          const res = await fetch("/api/initiate-jazzcash", { method: "POST" });
          const { url } = await res.json();
          window.location.href = url;
        }}
        disabled={!captchaVerified}
        className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
          captchaVerified
            ? "bg-[#ec1c24] text-white hover:bg-red-700"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        Proceed
      </button>
    </div>

    {/* Back Button */}
    <button
      onClick={() => {
        setShowPayment(false);
        setShowReview(true);
      }}
      className="w-full flex justify-center items-center gap-2 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-100 transition mt-6"
    >
      <FaArrowLeft /> Back to Review
    </button>
  </motion.div>
</section>

  );
}
