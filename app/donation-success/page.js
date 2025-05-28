export default function DonationSuccess() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-6 bg-white shadow-md rounded-lg text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Donation Submitted!</h1>
        <p className="text-gray-700">Thank you for your generosity.</p>
        <p className="text-gray-600 mt-2">
          Your donation is pending approval by the orphanage. You will be notified once it is confirmed.
        </p>
      </div>
    </div>
  );
}
