"use client"

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore"

import { firestore } from "../../lib/firebase";
import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Heart,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Gift,
} from "lucide-react"

export default function LiveDonationFeedSlider() {
  const [donations, setDonations] = useState([])
  const [isPaused, setIsPaused] = useState(false)

  const getDonationIcon = useCallback((type) => {
    switch (type) {
      case "Money":
        return <DollarSign className="w-4 h-4 text-green-600" />
      case "Clothes":
        return <Shirt className="w-4 h-4 text-blue-600" />
      case "Food":
        return <UtensilsCrossed className="w-4 h-4 text-orange-600" />
      default:
        return <Gift className="w-4 h-4 text-purple-600" />
    }
  }, [])

  const formatDonationAmount = useCallback((donation) => {
    switch (donation.donationType) {
      case "Money":
        return `Rs. ${(Number(donation.amount) || 0).toLocaleString()}`
      case "Clothes": {
        const count = Number(donation.numClothes) || 0
        return `${count} ${count === 1 ? "item" : "items"} of clothing`
      }
      case "Food": {
        const count = Number(donation.numMeals) || 0
        return `${count} ${count === 1 ? "meal" : "meals"}`
      }
      default:
        return "a generous donation"
    }
  }, [])

  const getDonorName = useCallback((donation) => {
    if (donation.donorEmail) {
      const name = donation.donorEmail.split("@")[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return "Anonymous Donor"
  }, [])

  useEffect(() => {
    const q = query(
      collection(firestore, "donations"),
      orderBy("timestamp", "desc"),
      limit(10)
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const valid = docs.filter((d) => d.orphanageId && d.donationType)

      const orphanageMap = {}
      await Promise.all(
        [...new Set(valid.map((d) => d.orphanageId))].map(async (id) => {
          const snap = await getDoc(doc(firestore, "users", id))
          orphanageMap[id] = snap.exists()
            ? snap.data().orgName || "Unknown Orphanage"
            : "Unknown Orphanage"
        })
      )

      const enriched = valid.map((d) => ({
        ...d,
        orphanageName: orphanageMap[d.orphanageId] || "Unknown Orphanage",
      }))

      setDonations(enriched)
    })

    return () => unsubscribe()
  }, [])

  const donationItems = useMemo(() => {
    return donations.flatMap((d, i) => {
      const item = (keySuffix) => (
        <span
          key={`${d.id}-${i}-${keySuffix}`}
          className="flex items-center gap-2 text-sm text-gray-800 whitespace-nowrap px-6 py-2"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {getDonationIcon(d.donationType)}
          <Heart className="w-3 h-3 text-red-500 animate-pulse" />
          <strong className="text-green-700">{getDonorName(d)}</strong> donated{" "}
          <strong className="text-green-700">{formatDonationAmount(d)}</strong> to{" "}
          <strong className="text-green-700">{d.orphanageName}</strong>.
        </span>
      )
      return [item("a"), item("b")]
    })
  }, [donations])

  if (!donations.length) return null

  return (
    <div className="w-full overflow-hidden py-4 bg-transparent">
      <div className="relative w-full">
        <div
          className={`flex gap-8 animate-marquee ${isPaused ? "paused" : ""}`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {donationItems}
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 20s linear infinite;
          white-space: nowrap;
        }
        .paused {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (max-width: 768px) {
          .animate-marquee {
            animation-duration: 15s;
          }
        }
        @media (max-width: 500px) {
          .animate-marquee {
            animation-duration: 10s;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
