import { useState } from "react";
import DonorForm from "./donorform";
import ProceedPayment from "./proceedpayment";
import DonationStart from "./donationStart";
import ReviewDonation from "./reviewdonation";
import Navbar from "../Navbar/page";

export default function DonationComponent() {
  const [showForm, setShowForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [donationType, setDonationType] = useState("");
  const [donorInfo, setDonorInfo] = useState({}); // ✅ NEW state

  return (
    <section className="container mx-auto px-6 py-12 flex flex-col items-center gap-10 mt-14 lg:mt-36">
      <Navbar />

      {showPayment ? (
        <ProceedPayment
          setShowPayment={setShowPayment}
          setShowReview={setShowReview}
          donationAmount={donationAmount}
        />
      ) : showReview ? (
        <ReviewDonation
          setShowReview={setShowReview}
          setShowForm={setShowForm}
          setShowPayment={setShowPayment}
          donationAmount={donationAmount}
          donationType={donationType}
          donorInfo={donorInfo} // ✅ Pass collected form data
        />
      ) : showForm ? (
       <DonorForm
  setShowForm={setShowForm}
  setShowReview={setShowReview}
  donationAmount={donationAmount}
  donationType={donationType}
  setDonorInfo={setDonorInfo} // ✅ Add this line
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
  );
}
