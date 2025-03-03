"use client";
import { useState } from "react";

import DonorForm from "./donorform";
import ProceedPayment from "./proceedpayment";
import DonationStart from "./donationStart";
import ReviewDonation from "./reviewdonation";
import Navbar from "../Navbar/page";

// Importing Poppins Font

export default function DonationComponent() {
  const [showForm, setShowForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <section className="container mx-auto px-6 py-12 flex flex-col items-center gap-10 mt-14 lg:mt-36">
      <Navbar />
      {showPayment ? (
        <ProceedPayment
          setShowPayment={setShowPayment}
          setShowReview={setShowReview}
        />
      ) : showReview ? (
        <ReviewDonation
          setShowReview={setShowReview}
          setShowForm={setShowForm}
          setShowPayment={setShowPayment}
        />
      ) : showForm ? (
        <DonorForm setShowForm={setShowForm} setShowReview={setShowReview} />
      ) : (
        <DonationStart setShowForm={setShowForm} />
      )}
    </section>
  );
}
