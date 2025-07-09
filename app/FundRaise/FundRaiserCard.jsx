"use client"
import { useState, useEffect } from "react"
import React from "react"
import PaymentModule from "../payment/paymentModule"
import { firestore } from "@/lib/firebase"
import {
  doc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore"
import { createPortal } from "react-dom"

// Amount Input Modal Component with Portal
const AmountInputModal = ({
  isOpen,
  onClose,
  onConfirm,
  orphanageName,
  totalAmount,
  raisedAmount,
  amountModalAnimation,
}) => {
  const [amount, setAmount] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [selectedAmount, setSelectedAmount] = useState(null)

  // Calculate remaining amount
  const remainingAmount = Math.max(0, totalAmount - (raisedAmount || 0))
  const isCompleted = remainingAmount <= 0

  // Update calculatePredefinedAmounts function:
  const calculatePredefinedAmounts = () => {
    if (isCompleted) return [] // No amounts if completed
    const percentages = [2.5, 5, 10, 20, 30, 40]
    const amounts = percentages
      .map((percentage) => {
        const amount = Math.round((totalAmount * percentage) / 100)
        return amount
      })
      .filter((amount) => amount >= 100 && amount <= remainingAmount) // Filter by remaining amount

    // Remove duplicates and sort
    const uniqueAmounts = [...new Set(amounts)].sort((a, b) => a - b)

    // If we have less than 4 amounts, add some standard ones
    if (uniqueAmounts.length < 4) {
      const standardAmounts = [100, 500, 1000, 2000]
      standardAmounts.forEach((amt) => {
        if (amt <= remainingAmount && !uniqueAmounts.includes(amt)) {
          uniqueAmounts.push(amt)
        }
      })
      uniqueAmounts.sort((a, b) => a - b)
    }

    return uniqueAmounts.slice(0, 6) // Maximum 6 amounts
  }

  const predefinedAmounts = calculatePredefinedAmounts()

  const handleClose = () => {
    setAmount("")
    setCustomAmount("")
    setSelectedAmount(null)
    onClose()
  }

  // Update handleConfirm function:
  const handleConfirm = () => {
    const finalAmount = selectedAmount === "custom" ? Number.parseInt(customAmount) : selectedAmount

    if (!finalAmount || finalAmount < 100) {
      alert("Minimum donation amount is Rs. 100")
      return
    }

    if (finalAmount > remainingAmount) {
      alert(`Maximum donation amount is Rs. ${remainingAmount.toLocaleString()} (remaining amount)`)
      return
    }

    onConfirm(finalAmount)
    handleClose()
  }

  const handleAmountSelect = (value) => {
    setSelectedAmount(value)
    if (value !== "custom") {
      setCustomAmount("")
    }
  }

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  if (!isOpen) return null

  const modalContent = (
    <div
      className={`fixed inset-0 z-[99998] bg-black transition-all duration-300 ease-out flex items-center justify-center p-4 ${
        amountModalAnimation ? "bg-opacity-50" : "bg-opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: "1rem",
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-md transition-all duration-300 ease-out transform ${
          amountModalAnimation ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 99999,
          maxWidth: "28rem",
          width: "100%",
          margin: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Enter Donation Amount</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Add remaining amount display in modal: */}
          <p className="text-gray-600 mb-4">
            How much would you like to donate to <strong>{orphanageName}</strong>?
            <br />
            <span className="text-sm text-green-600">
              Remaining: Rs. {remainingAmount.toLocaleString()} of Rs. {totalAmount.toLocaleString()}
            </span>
          </p>

          {/* Predefined Amounts */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {predefinedAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => handleAmountSelect(amt)}
                className={`p-3 rounded-md border-2 transition-colors ${
                  selectedAmount === amt
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                Rs. {amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <button
              onClick={() => handleAmountSelect("custom")}
              className={`w-full p-3 rounded-md border-2 transition-colors mb-3 ${
                selectedAmount === "custom"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-green-300"
              }`}
            >
              Custom Amount
            </button>
            {selectedAmount === "custom" && (
              <input
                type="number"
                placeholder={`Enter amount (max Rs. ${remainingAmount.toLocaleString()})`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                min="100"
                max={remainingAmount}
                autoFocus
              />
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedAmount || (selectedAmount === "custom" && !customAmount)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof window !== "undefined" && document.body ? createPortal(modalContent, document.body) : null
}

const FundRaiserCard = ({
  id,
  bgImage,
  title,
  description,
  raisedAmount: initialRaised,
  totalAmount,
  orphanageName,
  user,
}) => {
  const [showAmountModal, setShowAmountModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [donationAmount, setDonationAmount] = useState(0)
  const [donating, setDonating] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [raisedAmount, setRaisedAmount] = useState(initialRaised)
  const [modalAnimation, setModalAnimation] = useState(false)
  const [amountModalAnimation, setAmountModalAnimation] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(firestore, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          setUserRole(snap.data().userType)
        }
      })
    }
  }, [user])

  useEffect(() => {
    // Set up real-time listener for fundraiser updates with soft delete filter
    const unsub = onSnapshot(
      query(collection(firestore, "fundraisers"), where("__name__", "==", id), where("isDeleted", "!=", true)),
      (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data()
          setRaisedAmount(data.raisedAmount || 0)
        }
      },
      (error) => {
        console.warn("Fundraiser listener error:", error)
        // Fallback to direct document listener
        const fallbackUnsub = onSnapshot(doc(firestore, "fundraisers", id), (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            // Only update if not soft deleted
            if (!data.isDeleted) {
              setRaisedAmount(data.raisedAmount || 0)
            }
          }
        })
        return fallbackUnsub
      },
    )

    return () => unsub()
  }, [id])

  // Reset all states when modals close
  const resetAllStates = () => {
    setShowAmountModal(false)
    setShowPaymentModal(false)
    setShowCardModal(false)
    setDonationAmount(0)
  }

  const closeAmountModal = () => {
    setAmountModalAnimation(false)
    setTimeout(() => setShowAmountModal(false), 300)
  }

  const closePaymentModal = () => {
    setShowPaymentModal(false)
  }

  // Step 1: Show amount input modal
  const handleDonate = () => {
    setShowAmountModal(true)
    setTimeout(() => setAmountModalAnimation(true), 10)
  }

  // Step 2: Amount confirmed, show payment modal
  const handleAmountConfirm = (amount) => {
    setDonationAmount(amount)
    setShowAmountModal(false)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (paymentData) => {
    setDonating(true)
    try {
      console.log("Payment successful:", paymentData)

      // Save donation to Firestore
      await addDoc(collection(firestore, "fundraisers", id, "donations"), {
        donorId: user?.uid || "anonymous",
        donorEmail: user?.email || "",
        amount: paymentData.amount,
        status: "completed",
        paymentMethod: paymentData.bank.name,
        transactionId: paymentData.transactionId,
        timestamp: serverTimestamp(),
        isDeleted: false, // Add soft delete field
      })

      // Update fundraiser raised amount
      const fundraiserRef = doc(firestore, "fundraisers", id)
      const fundraiserSnap = await getDoc(fundraiserRef)
      if (fundraiserSnap.exists()) {
        const currentData = fundraiserSnap.data()
        // Only update if not soft deleted
        if (!currentData.isDeleted) {
          const newRaisedAmount = (currentData.raisedAmount || 0) + Number(paymentData.amount)
          await updateDoc(fundraiserRef, {
            raisedAmount: newRaisedAmount,
          })
        }
      }

      alert(`Thank you for your donation of Rs. ${Number(paymentData.amount).toLocaleString()}!`)

      // Reset all states after successful payment
      resetAllStates()
    } catch (err) {
      console.error("Donation failed:", err)
      alert("Payment successful, but error saving donation. Please contact support.")
    } finally {
      setDonating(false)
    }
  }

  // Calculate remaining amount and completion status
  const remainingAmount = Math.max(0, totalAmount - raisedAmount)
  const isCompleted = remainingAmount <= 0
  const progressPercentage = Math.min((raisedAmount / totalAmount) * 100, 100)

  const closeCardModal = () => {
    setShowCardModal(false)
    setTimeout(() => setShowCardModal(false), 300)
  }

  return (
    <>
      <div className="w-[360px] bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ease-in-out border border-gray-100 mb-4">
        {/* Card structure with fixed heights for consistent layout */}
        <div className="relative h-60 overflow-hidden">
          <img
            src={bgImage || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-300 ease-in-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        </div>

        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-2">{title}</h2>

          {/* Fixed height description area */}
          <div className="h-[50px] mb-14">
            <p className="text-sm text-gray-600 leading-relaxed">
              {description.length <= 120 ? description : `${description.slice(0, 120)}...`}
            </p>
            {description.length > 120 && (
              <span
                className="text-green-600 text-sm cursor-pointer hover:text-green-700 hover:underline transition-colors block mt-1"
                onClick={() => {
                  setShowCardModal(true)
                  setTimeout(() => setModalAnimation(true), 10)
                }}
              >
                Read more
              </span>
            )}
          </div>

          {/* Orphanage info with fixed height */}
          <div className="h-[40px] mb-0 ">
            {orphanageName && (
              <div className="p-2 pl-0 rounded-md">
                <p className="text-xs font-medium text-gray-600 ">
                  Orphanage: <span className="font-normal">{orphanageName}</span>
                </p>
              </div>
            )}
          </div>

          {/* Progress section */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner mb-3">
            <div
              className={`h-full transition-all duration-500 ease-in-out ${
                isCompleted
                  ? "bg-gradient-to-r from-green-500 to-green-600"
                  : "bg-gradient-to-r from-green-400 to-green-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="text-sm text-gray-700 font-medium mb-4">
            <div className="flex justify-between items-center">
              <span>
                <span className="text-green-600 font-semibold">Rs. {raisedAmount.toLocaleString()}</span>
              </span>
              <span className="text-gray-500 text-xs">of Rs. {totalAmount.toLocaleString()}</span>
            </div>
            {!isCompleted && (
              <div className="text-xs text-gray-500 mt-1">Rs. {remainingAmount.toLocaleString()} remaining</div>
            )}
            {isCompleted && <div className="text-xs text-green-600 mt-1 font-semibold">Target Achieved!</div>}
          </div>

          {/* Donate button */}
          <button
            onClick={handleDonate}
            disabled={isCompleted}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
              isCompleted
                ? "bg-green-600 text-white cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            }`}
          >
            {isCompleted ? "Completed" : "Donate"}
          </button>
        </div>
      </div>

      {/* Amount Input Modal */}
      <AmountInputModal
        isOpen={showAmountModal}
        onClose={closeAmountModal}
        onConfirm={handleAmountConfirm}
        orphanageName={orphanageName}
        totalAmount={totalAmount}
        raisedAmount={raisedAmount}
        amountModalAnimation={amountModalAnimation}
      />

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModule
          isOpen={showPaymentModal}
          onClose={closePaymentModal}
          amount={donationAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Card Details Modal - With Smooth Animation */}
      {showCardModal &&
        typeof window !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99996] bg-black transition-all duration-300 ease-out flex items-center justify-center p-4 ${
              modalAnimation ? "bg-opacity-50" : "bg-opacity-0"
            }`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeCardModal()
              }
            }}
          >
            <div
              className={`bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col transition-all duration-300 ease-out transform ${
                modalAnimation ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
              }`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxHeight: "85vh",
                maxWidth: "450px",
                width: "90%",
                height: "auto",
                minHeight: "400px",
              }}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <button
                  onClick={closeCardModal}
                  className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(85vh - 140px)" }}>
                {/* Image */}
                <div className="relative h-40 overflow-hidden rounded-lg mb-4">
                  <img
                    src={bgImage || "/placeholder.svg"}
                    alt={title}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                </div>

                {/* Full Description */}
                <div className="mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
                </div>

                {/* Orphanage Info */}
                {orphanageName && (
                  <div className="mb-4 p-3 pl-0 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">
                      Orphanage: <span className="font-normal">{orphanageName}</span>
                    </p>
                  </div>
                )}

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-500 ease-in-out ${
                        isCompleted
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : "bg-gradient-to-r from-green-400 to-green-500"
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600">
                      <span className="font-semibold text-green-600">Rs. {raisedAmount.toLocaleString()}</span> raised
                    </span>
                    <span className="text-gray-500">of Rs. {totalAmount.toLocaleString()}</span>
                  </div>

                  {!isCompleted && (
                    <div className="text-xs text-gray-500 text-center">
                      Rs. {remainingAmount.toLocaleString()} remaining
                    </div>
                  )}
                  {isCompleted && (
                    <div className="text-xs text-green-600 font-semibold text-center">Target Achieved!</div>
                  )}
                </div>
              </div>

              {/* Fixed Footer with Donate Button */}
              <div className="border-t p-4 flex-shrink-0">
                <button
                  onClick={() => {
                    closeCardModal()
                    setTimeout(() => handleDonate(), 300)
                  }}
                  disabled={isCompleted}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isCompleted
                      ? "bg-green-600 text-white cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
                >
                  {isCompleted ? "Completed" : "Donate Now"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default FundRaiserCard
