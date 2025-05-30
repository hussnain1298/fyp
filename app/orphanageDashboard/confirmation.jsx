'use client';

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  where,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";

const PAGE_SIZE = 5;

const ConfirmFund = () => {
  const [requests, setRequests] = useState([]);
  const [requestDonations, setRequestDonations] = useState([]);
  const [fundraiserDonations, setFundraiserDonations] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState("pending"); // pending, approved, rejected
  const [pageRequests, setPageRequests] = useState(1);
  const [pageServices, setPageServices] = useState(1);
  const [pageFunds, setPageFunds] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in");
        setLoading(false);
        return;
      }

      try {
        // Fetch requests
        const reqSnap = await getDocs(collection(firestore, "requests"));
        const reqList = reqSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRequests(reqList);

        // Fetch donations related to orphanage
        const dSnap = await getDocs(
          query(collection(firestore, "donations"), where("orphanageId", "==", user.uid))
        );

        // Separate donations into request donations and fundraiser donations later
        const allDonations = dSnap.docs.map((doc) => ({
          ...doc.data(),
          donationId: doc.id,
          from: "request", // default mark as request donation
        }));

        // Fetch fundraisers and their donations
        const fundraiserQuery = query(
          collection(firestore, "fundraisers"),
          where("orphanageId", "==", user.uid)
        );
        const fundraisersSnap = await getDocs(fundraiserQuery);
        const fDonations = [];
        for (const f of fundraisersSnap.docs) {
          const fDonSnap = await getDocs(collection(firestore, `fundraisers/${f.id}/donations`));
          fDonSnap.forEach((d) =>
            fDonations.push({ ...d.data(), fundraiserId: f.id, donationId: d.id, from: "fundraiser" })
          );
        }

        // Separate donations by source
        const reqDonations = allDonations.filter(d => !d.fundraiserId);
        setRequestDonations(reqDonations);
        setFundraiserDonations(fDonations);

        // Fetch services posted by orphanage
        const serviceQuery = query(
          collection(firestore, "services"),
          where("orphanageId", "==", user.uid),
          where("status", "in", ["Pending", "In Progress", "Fulfilled"])
        );
        const serviceSnap = await getDocs(serviceQuery);
        const serviceList = serviceSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(serviceList);

      } catch (err) {
        setError("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Status badge helper
  const renderStatusBadge = (status) => {
    const lower = (status || "").toLowerCase();
    let bgClass = "bg-gray-400 text-white";

    if (["pending", "pending approval", "in progress"].includes(lower)) {
      bgClass = "bg-yellow-400 text-yellow-900";
    } else if (["approved", "fulfilled", "confirmed"].includes(lower)) {
      bgClass = "bg-green-600 text-white";
    } else if (lower === "rejected") {
      bgClass = "bg-red-600 text-white";
    }

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${bgClass} w-max`}
      >
        {status}
      </span>
    );
  };

  // Filter function for statuses
  const matchesStatus = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    if (activeStatus === "pending") return ["pending", "pending approval", "in progress"].includes(s);
    if (activeStatus === "approved") return ["approved", "fulfilled", "confirmed"].includes(s);
    if (activeStatus === "rejected") return s === "rejected";
    return false;
  };

  // Filter data with status
  const filteredRequests = requests.filter((r) => matchesStatus(r.status));
  const filteredServices = services.filter((s) => matchesStatus(s.status));
  const filteredRequestDonations = requestDonations.filter(d =>
    matchesStatus(d.status || (d.confirmed ? "approved" : "pending"))
  );
  const filteredFundraiserDonations = fundraiserDonations.filter(d =>
    matchesStatus(d.status)
  );

  // Pagination helpers
  const getPageItems = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const paginatedRequests = getPageItems(filteredRequests, pageRequests);
  const paginatedRequestDonations = getPageItems(filteredRequestDonations, pageRequests);
  const paginatedServices = getPageItems(filteredServices, pageServices);
  const paginatedFundraiserDonations = getPageItems(filteredFundraiserDonations, pageFunds);

  // Approve donation/fundraiser
  const handleConfirmDonation = async (donation) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (donation.from === "fundraiser") {
        await updateDoc(
          doc(firestore, `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`),
          { status: "approved" }
        );
        await updateDoc(doc(firestore, "fundraisers", donation.fundraiserId), {
          raisedAmount: increment(Number(donation.amount)),
        });
      } else {
        await updateDoc(doc(firestore, "donations", donation.donationId), { confirmed: true });

        const allDonationsSnap = await getDocs(
          query(
            collection(firestore, "donations"),
            where("requestId", "==", donation.requestId),
            where("orphanageId", "==", user.uid),
            where("confirmed", "==", true)
          )
        );

        let total = 0;
        allDonationsSnap.forEach((d) => {
          const data = d.data();
          if (donation.donationType === "Money") total += Number(data.amount || 0);
          else if (donation.donationType === "Clothes") total += Number(data.numClothes || 0);
        });

        const reqDoc = await getDoc(doc(firestore, "requests", donation.requestId));
        const reqData = reqDoc.data();
        const required = Number(reqData?.quantity || 0);

        const progress = Math.min(Math.floor((total / required) * 100), 100);

        await updateDoc(doc(firestore, "requests", donation.requestId), {
          progress,
          ...(total >= required && { status: "Fulfilled" }),
        });
      }

      setRequestDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId
            ? { ...d, status: "approved", confirmed: true }
            : d
        )
      );
      setFundraiserDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId
            ? { ...d, status: "approved" }
            : d
        )
      );
    } catch (err) {
      console.error("Approval error", err);
    }
  };

  // Reject donation/fundraiser
  const handleRejectDonation = async (donation) => {
    try {
      if (donation.from === "fundraiser") {
        await updateDoc(
          doc(firestore, `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`),
          { status: "rejected" }
        );
      } else {
        await updateDoc(doc(firestore, "donations", donation.donationId), { confirmed: false });
      }
      setRequestDonations((prev) =>
        prev.map((d) => (d.donationId === donation.donationId ? { ...d, status: "rejected" } : d))
      );
      setFundraiserDonations((prev) =>
        prev.map((d) => (d.donationId === donation.donationId ? { ...d, status: "rejected" } : d))
      );
    } catch (err) {
      console.error("Rejection error", err);
    }
  };

  // Approve/Reject for request
  const handleConfirmRequest = async (requestId) => {
    try {
      await updateDoc(doc(firestore, "requests", requestId), {
        status: "approved",
      });
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "approved" } : req
        )
      );
    } catch (err) {
      console.error("Request approval error", err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await updateDoc(doc(firestore, "requests", requestId), {
        status: "rejected",
      });
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "rejected" } : req
        )
      );
    } catch (err) {
      console.error("Request rejection error", err);
    }
  };

  // Approve/Reject for service
  const handleConfirmService = async (serviceId) => {
    try {
      await updateDoc(doc(firestore, "services", serviceId), {
        status: "Fulfilled",
      });
      setServices((prev) =>
        prev.map((svc) => (svc.id === serviceId ? { ...svc, status: "Fulfilled" } : svc))
      );
    } catch (err) {
      console.error("Failed to confirm service fulfillment", err);
    }
  };

  const handleRejectService = async (serviceId) => {
    try {
      await updateDoc(doc(firestore, "services", serviceId), {
        status: "Rejected",
      });
      setServices((prev) =>
        prev.map((svc) => (svc.id === serviceId ? { ...svc, status: "Rejected" } : svc))
      );
    } catch (err) {
      console.error("Failed to reject service", err);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8 mt-16">
        <h2 className="text-3xl font-bold mb-8">Confirmations</h2>

        {/* Status Filters */}
        <div className="flex gap-3 mb-8">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setActiveStatus(status);
                setPageRequests(1);
                setPageServices(1);
                setPageFunds(1);
              }}
              className={`px-4 py-2 rounded font-semibold transition-colors duration-200 ${
                activeStatus === status
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-lg text-gray-600">Loading data...</p>
        ) : error ? (
          <p className="text-center text-red-600 font-medium mb-6">{error}</p>
        ) : (
          <>
            {/* Requests Section */}
            <section className="mb-10">
              <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2 text-gray-900">
                Requests
              </h3>
              {paginatedRequests.length === 0 && paginatedRequestDonations.length === 0 ? (
                <p className="text-gray-500">No requests found.</p>
              ) : (
                <>
                  <ul className="space-y-6">
                    {/* Requests */}
                    {paginatedRequests.map((request) => (
                      <li
                        key={request.id}
                        className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row justify-between items-center"
                      >
                        <div className="space-y-1 text-gray-800 max-w-lg">
                          <p className="font-semibold">Request Title: {request.title}</p>
                          <p>Description: {request.description || "N/A"}</p>
                          <p>Status: {renderStatusBadge(request.status || "Pending")}</p>
                        </div>
                        {(request.status?.toLowerCase() === "pending") && (
                          <div className="flex gap-4 mt-4 sm:mt-0 flex-shrink-0">
                            <button
                              onClick={() => handleConfirmRequest(request.id)}
                              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </li>
                    ))}

                    {/* Donations related to requests */}
                    {paginatedRequestDonations.map((donation) => (
                      <li
                        key={donation.donationId}
                        className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 text-gray-800">
                          <p className="font-semibold">Request Donation by Donor ID: {donation.donorId}</p>
                          {donation.amount && <p>Amount: Rs. {donation.amount}</p>}
                          {donation.numClothes && <p>Clothes: {donation.numClothes}</p>}
                          {donation.foodDescription && <p>Food: {donation.foodDescription}</p>}
                          {donation.description && <p>Note: {donation.description}</p>}
                          <p>
                            Status: {renderStatusBadge(donation.status || (donation.confirmed ? "approved" : "pending"))}
                          </p>
                          {donation.requestId && (
                            <p className="text-sm text-blue-600">
                              Progress: {requests.find((r) => r.id === donation.requestId)?.progress || 0}%
                            </p>
                          )}
                        </div>

                        {(donation.status?.toLowerCase() === "pending") && (
                          <div className="flex gap-4 mt-6 sm:mt-0">
                            <button
                              onClick={() => handleConfirmDonation(donation)}
                              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectDonation(donation)}
                              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={pageRequests}
                    totalPages={Math.ceil((filteredRequests.length + filteredRequestDonations.length) / PAGE_SIZE)}
                    onPageChange={setPageRequests}
                  />
                </>
              )}
            </section>

            {/* Services Section */}
            <section className="mb-10">
              <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2 text-gray-900">
                Services
              </h3>
              {paginatedServices.length === 0 ? (
                <p className="text-gray-500">No services found.</p>
              ) : (
                <>
                  <ul className="space-y-6">
                    {paginatedServices.map((service) => (
                      <li
                        key={service.id}
                        className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row justify-between items-center"
                      >
                        <div className="flex flex-col gap-1 max-w-lg w-full">
                          <h4 className="text-lg font-semibold text-green-900">{service.title}</h4>
                          <p className="text-gray-700 mb-1 max-w-md">{service.description}</p>
                          <p className="text-sm text-gray-600">
                            Last fulfillment note:{" "}
                            <span className="italic">{service.lastFulfillmentNote || "No notes"}</span>
                          </p>
                          {renderStatusBadge(service.status)}
                        </div>

                        {(service.status?.toLowerCase() === "pending" || service.status?.toLowerCase() === "in progress") && (
                          <div className="flex gap-4 mt-4 sm:mt-0 flex-shrink-0">
                            <button
                              onClick={() => handleConfirmService(service.id)}
                              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectService(service.id)}
                              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={pageServices}
                    totalPages={Math.ceil(filteredServices.length / PAGE_SIZE)}
                    onPageChange={setPageServices}
                  />
                </>
              )}
            </section>

            {/* Fund Raise Section */}
            <section>
              <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2 text-gray-900">
                Fund Raise
              </h3>
              {paginatedFundraiserDonations.length === 0 ? (
                <p className="text-gray-500">No fundraise donations found.</p>
              ) : (
                <>
                  <ul className="space-y-6">
                    {paginatedFundraiserDonations.map((donation) => (
                      <li
                        key={donation.donationId}
                        className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 text-gray-800">
                          <p className="font-semibold">Donor ID: {donation.donorId}</p>
                          {donation.amount && <p>Amount: Rs. {donation.amount}</p>}
                          {donation.numClothes && <p>Clothes: {donation.numClothes}</p>}
                          {donation.foodDescription && <p>Food: {donation.foodDescription}</p>}
                          {donation.description && <p>Note: {donation.description}</p>}
                          <p>
                            Status: {renderStatusBadge(donation.status)}
                          </p>
                        </div>

                        {(donation.status?.toLowerCase() === "pending") && (
                          <div className="flex gap-4 mt-6 sm:mt-0">
                            <button
                              onClick={() => handleConfirmDonation(donation)}
                              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectDonation(donation)}
                              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={pageFunds}
                    totalPages={Math.ceil(filteredFundraiserDonations.length / PAGE_SIZE)}
                    onPageChange={setPageFunds}
                  />
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

// Pagination component for reuse
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center space-x-3 mt-6">
      {[...Array(totalPages)].map((_, i) => {
        const pageNum = i + 1;
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200 ${
              page === pageNum ? "bg-blue-600 text-white shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            aria-current={page === pageNum ? "page" : undefined}
          >
            {pageNum}
          </button>
        );
      })}
    </div>
  );
};

export default ConfirmFund;
