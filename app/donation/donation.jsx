"use client";
import { useState } from "react";

import DonorForm from "./donorform";
import ProceedPayment from "./proceedpayment";
import DonationStart from "./donationStart";
import ReviewDonation from "./reviewdonation";
import Navbar from "../Navbar/page";

export default function DonationComponent() {
  const [showForm, setShowForm] = useState(false); // Controls Donor Form visibility
  const [showReview, setShowReview] = useState(false); // Controls Review Donation visibility
  const [showPayment, setShowPayment] = useState(false); // Controls Proceed Payment visibility
  const [donationAmount, setDonationAmount] = useState(""); // Track the entered donation amount

  return (
    <section className="container mx-auto px-6 py-12 flex flex-col items-center gap-10 mt-14 lg:mt-36">
      <Navbar />
      
      {showPayment ? (
        <ProceedPayment
          setShowPayment={setShowPayment}
          setShowReview={setShowReview}
          donationAmount={donationAmount} // Pass donationAmount to ProceedPayment
        />
      ) : showReview ? (
        <ReviewDonation
          setShowReview={setShowReview}
          setShowForm={setShowForm}
          setShowPayment={setShowPayment}
          donationAmount={donationAmount} // Pass donationAmount to ReviewDonation
        />
      ) : showForm ? (
        <DonorForm 
          setShowForm={setShowForm} 
          setShowReview={setShowReview} 
          donationAmount={donationAmount} // Pass donationAmount to DonorForm
          setDonationAmount={setDonationAmount} // Allow DonorForm to update donationAmount
        />
      ) : (
        <DonationStart 
          setShowForm={setShowForm} 
          setShowReview={setShowReview} 
          setDonationAmount={setDonationAmount} // Set donationAmount from DonationStart
        />
      )}
    </section>
  );
}
