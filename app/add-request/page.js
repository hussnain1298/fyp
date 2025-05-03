"use client";

import { useState } from "react"; 
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AddRequest() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState(""); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to add a request.");
      setLoading(false);
      return;
    }

    if (!requestType) {
      setError("Please select a request type.");
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(firestore, "requests"), {
        title,
        description,
        requestType, // Store the request type (Food, Clothes, Money)
        orphanageId: user.uid, 
        orphanageEmail: user.email, 
        status: "Pending", 
        timestamp: new Date(),
      });

      setTitle("");
      setDescription("");
      setRequestType(""); 
      router.push("/orphanageDashboard"); 
    } catch (err) {
      setError("Failed to add request: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Add a Request</h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Request Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="Enter request title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-3 rounded-md border-none shadow-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="requestType">Request For</Label>
          <select
            id="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            required
            className="w-full p-3 rounded-md shadow-md text-gray-800"
          >
            <option value="">Select Request Type</option>
            <option value="Food">Food</option>
            <option value="Clothes">Clothes</option>
            <option value="Money">Money</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your request..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-3 rounded-md border-none shadow-md"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition ease-in-out duration-300"
          disabled={loading}
        >
          {loading ? "Adding Request..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
