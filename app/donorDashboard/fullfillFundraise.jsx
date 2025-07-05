"use client"

import { useState, useEffect } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, query, getDocs, doc, addDoc, updateDoc, serverTimestamp, where } from "firebase/firestore"

export default function FulfillFundRaise() {
  const [fundraisers, setFundraisers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeModalId, setActiveModalId] = useState(null)
  const [donationAmount, setDonationAmount] = useState("")
  const [amountError, setAmountError] = useState("")
  const [donating, setDonating] = useState(false)
  const user = auth.currentUser

  useEffect(() => {
    const fetchFundraisers = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(query(collection(firestore, "fundraisers")))
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((f) => f.status === "Pending")

        const orphanageIds = [...new Set(list.map((f) => f.orphanageId).filter(Boolean))]
        const orphanageMap = {}

        if (orphanageIds.length > 0) {
          const batches = []
          while (orphanageIds.length) {
            batches.push(orphanageIds.splice(0, 10))
          }

          for (const batch of batches) {
            const orphanSnap = await getDocs(query(collection(firestore, "users"), where("__name__", "in", batch)))
            orphanSnap.forEach((doc) => {
              orphanageMap[doc.id] = doc.data()
            })
          }
        }

        const enriched = list.map((f) => ({
          ...f,
          orphanageName: orphanageMap[f.orphanageId]?.orgName || "N/A",
          orphanageLocation: orphanageMap[f.orphanageId]?.city || "N/A",
        }))

        setFundraisers(enriched)
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFundraisers()
  }, [])

  const closeModal = () => {
    setActiveModalId(null)
    setDonationAmount("")
    setAmountError("")
  }

  const handleDonate = async (fundraiserId) => {
    if (!user) return alert("Please log in as donor to donate.")

    const trimmed = donationAmount.trim()
    const amountNum = Number(trimmed)

    if (!trimmed || isNaN(amountNum)) {
      setAmountError("Please enter a valid numeric amount.")
      return
    }

    if (amountNum <= 0 || /^0\d+/.test(trimmed)) {
      setAmountError("Amount must be greater than zero, no leading zeros.")
      return
    }

    if (amountNum > 1000000) {
      setAmountError("Amount must be ≤ 1,000,000.")
      return
    }

    setAmountError("")
    setDonating(true)

    try {
      // Add donation record
      await addDoc(collection(firestore, "fundraisers", fundraiserId, "donations"), {
        donorId: user.uid,
        amount: amountNum,
        status: "pending",
        timestamp: serverTimestamp(),
      })

      // Get fundraiser doc
      const fundraiserRef = doc(firestore, "fundraisers", fundraiserId)
      const fundraiserSnap = await getDocs(
        query(collection(firestore, "fundraisers"), where("__name__", "==", fundraiserId)),
      )
      const fundraiserDoc = fundraiserSnap.docs[0]
      const current = fundraiserDoc?.data()

      const updatedRaised = (current?.raisedAmount || 0) + amountNum
      const isFulfilled = updatedRaised >= (current?.totalAmount || Number.POSITIVE_INFINITY)

      if (isFulfilled) {
        await updateDoc(fundraiserRef, {
          status: "Fulfilled",
          raisedAmount: updatedRaised,
        })
      } else {
        await updateDoc(fundraiserRef, {
          raisedAmount: updatedRaised,
        })
      }

      alert("✅ Thank you! Awaiting orphanage confirmation.")
      closeModal()
    } catch (err) {
      console.error("Donation failed:", err)
      setAmountError("Donation failed: " + err.message)
    } finally {
      setDonating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Fundraiser Requests</h2>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="space-y-4">
        {fundraisers.map((f) => (
          <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-600 mb-3">{f.description}</p>
            <p className="text-sm mb-2">
              Raised: Rs. {f.raisedAmount || 0} of Rs. {f.totalAmount}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Orphanage:</strong> {f.orphanageName}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Location:</strong> {f.orphanageLocation}
            </p>

            <button
              onClick={() => setActiveModalId(f.id)}
              className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Donate
            </button>
          </div>
        ))}
      </div>

      {/* Donation Modal */}
      {activeModalId && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Donate to Fundraiser</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter amount (1 to 1,000,000)"
              value={donationAmount}
              onChange={(e) => {
                const input = e.target.value
                if (/^\d*$/.test(input)) {
                  setDonationAmount(input)
                  setAmountError("")
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {amountError && <p className="text-sm text-red-600 mb-3">{amountError}</p>}

            <button
              onClick={() => handleDonate(activeModalId)}
              disabled={donating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {donating ? "Processing..." : "Donate Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
