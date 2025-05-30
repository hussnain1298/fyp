// components/ServicesDashboard.jsx
"use client";

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const workshopCategories = [
  "Academic Skills",
  "Technology & STEM",
  "Arts & Creativity",
  "Life Skills & Personal Development",
  "Career & Vocational Training",
  "Social & Emotional Learning",
];

// Reusable form component for Add/Edit service
function ServiceForm({ service, onChange, onSubmit, loading, error, onCancel, isEdit = false }) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="text-center text-red-600 mb-4 font-medium">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Workshop Category
        </label>
        <select
          value={service.title}
          onChange={(e) => onChange("title", e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          required
        >
          <option value="" disabled>
            Select a category
          </option>
          {workshopCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={service.description}
          onChange={(e) => onChange("description", e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Class Frequency
        </label>
        <div className="flex space-x-6 mt-1">
          {["Daily", "Weekend"].map((freq) => (
            <label key={freq} className="flex items-center space-x-2">
              <input
                type="radio"
                name="frequency"
                value={freq}
                checked={service.frequency === freq}
                onChange={(e) => onChange("frequency", e.target.value)}
                className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300"
              />
              <span className="text-gray-700">{freq}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mode of Service
        </label>
        <div className="flex space-x-6 mt-1">
          {["Onsite", "Online"].map((m) => (
            <label key={m} className="flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={service.mode === m}
                onChange={(e) => onChange("mode", e.target.value)}
                className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300"
              />
              <span className="text-gray-700">{m}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duration
        </label>
        <select
          value={service.duration}
          onChange={(e) => onChange("duration", e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          required
        >
          <option value="One Day">One Day</option>
          <option value="One Week">One Week</option>
          <option value="One Month">One Month</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Students
        </label>
        <input
          type="number"
          min="1"
          value={service.numberOfStudents || ""}
          onChange={(e) =>
            onChange("numberOfStudents", e.target.value.replace(/\D/, ""))
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="e.g. 25"
          required
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? (isEdit ? "Saving..." : "Posting...") : isEdit ? "Save Changes" : "Submit Service"}
        </button>
      </div>
    </form>
  );
}

export default function ServicesDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "Weekend",
    duration: "One Month",
    mode: "Onsite",
    numberOfStudents: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Fetch services for logged-in orphanage
  const fetchServices = async () => {
    setLoading(true);
    setError("");
    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to view services.");
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(firestore, "services"),
        where("orphanageId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const serviceList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(serviceList);
    } catch (err) {
      setError("Failed to load services: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.frequency ||
      !formData.duration ||
      !formData.mode
    ) {
      setFormError("Please fill all required fields.");
      return;
    }
    if (
      !formData.numberOfStudents ||
      Number(formData.numberOfStudents) <= 0 ||
      isNaN(Number(formData.numberOfStudents))
    ) {
      setFormError("Please enter a valid positive number of students.");
      return;
    }
    setFormLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setFormError("You must be logged in to post a service request.");
      setFormLoading(false);
      return;
    }

    try {
      await addDoc(collection(firestore, "services"), {
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency,
        duration: formData.duration,
        mode: formData.mode,
        numberOfStudents: Number(formData.numberOfStudents),
        orphanageId: user.uid,
        orphanageEmail: user.email,
        status: "Pending",
        timestamp: serverTimestamp(),
      });
      setAddModalOpen(false);
      setFormData({
        title: "",
        description: "",
        frequency: "Weekend",
        duration: "One Month",
        mode: "Onsite",
        numberOfStudents: "",
      });
      fetchServices();
    } catch (err) {
      setFormError("Failed to post service request: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (service) => {
    setFormData({
      id: service.id,
      title: service.title,
      description: service.description,
      frequency: service.frequency || "Weekend",
      duration: service.duration || "One Month",
      mode: service.mode || "Onsite",
      numberOfStudents: service.numberOfStudents ?? "",
    });
    setIsEditing(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setFormError("");

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.frequency ||
      !formData.duration ||
      !formData.mode
    ) {
      setFormError("Please fill all required fields.");
      return;
    }
    if (
      !formData.numberOfStudents ||
      Number(formData.numberOfStudents) <= 0 ||
      isNaN(Number(formData.numberOfStudents))
    ) {
      setFormError("Please enter a valid positive number of students.");
      return;
    }
    if (!formData.id) {
      setFormError("Invalid service ID.");
      return;
    }

    setFormLoading(true);

    try {
      const serviceRef = doc(firestore, "services", formData.id);
      await updateDoc(serviceRef, {
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency,
        duration: formData.duration,
        mode: formData.mode,
        numberOfStudents: Number(formData.numberOfStudents),
      });

      setServices((prev) =>
        prev.map((svc) =>
          svc.id === formData.id ? { ...svc, ...formData } : svc
        )
      );

      setIsEditing(false);
    } catch (err) {
      setFormError("Failed to update service: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this service?")) return;

    try {
      setLoading(true);
      await deleteDoc(doc(firestore, "services", id));
      setServices((prev) => prev.filter((service) => service.id !== id));
    } catch (err) {
      alert("Failed to delete service: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen p-8 container mx-auto mt-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-gray-800">Your Services</h1>
        <button
          onClick={() => {
            setFormData({
              title: "",
              description: "",
              frequency: "Weekend",
              duration: "One Month",
              mode: "Onsite",
              numberOfStudents: "",
            });
            setAddModalOpen(true);
          }}
          className="bg-green-600 text-white font-medium py-2 px-4 rounded-md"
        >
          + Add a Service
        </button>
      </div>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      {loading && <p className="text-gray-500 text-center">Loading...</p>}

      {!loading && services.length === 0 && (
        <p className="text-center text-xl text-gray-500">No services yet.</p>
      )}

      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col"
          >
            <h2 className="text-lg font-bold">{service.title}</h2>
            <p className="text-gray-700">{service.description}</p>
            <p className="mt-2 text-sm">
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded-md text-white ${
                  service.status === "Pending"
                    ? "bg-yellow-400"
                    : service.status === "In Progress"
                    ? "bg-blue-500"
                    : "bg-green-500"
                }`}
              >
                {service.status || "Pending"}
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              <strong>Frequency:</strong> {service.frequency || "-"}
              <br />
              <strong>Duration:</strong> {service.duration || "-"}
              <br />
              <strong>Mode:</strong> {service.mode || "-"}
              <br />
              <strong>Number of Students:</strong>{" "}
              {service.numberOfStudents || "-"}
            </p>

            <div className="flex space-x-4 mt-4 items-center">
              <button
                onClick={() => handleEditClick(service)}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(service.id)}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {(isEditing || addModalOpen) && (
        <div
          className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditing(false);
              setAddModalOpen(false);
              setFormError("");
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => {
                setIsEditing(false);
                setAddModalOpen(false);
                setFormError("");
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 focus:outline-none"
              aria-label="Close modal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-3xl font-semibold mb-6 text-gray-900 text-center">
              {isEditing ? "Edit Service" : "Add a Service"}
            </h2>

            <ServiceForm
              service={formData}
              onChange={handleFormChange}
              onSubmit={isEditing ? handleSaveChanges : handleAddSubmit}
              loading={formLoading}
              error={formError}
              onCancel={() => {
                setIsEditing(false);
                setAddModalOpen(false);
                setFormError("");
              }}
              isEdit={isEditing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
