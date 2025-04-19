"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function AddServiceRequest() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("Weekend");
  const [duration, setDuration] = useState("One Month");
  const [mode, setMode] = useState("Onsite");
  const [numStudents, setNumStudents] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to post a service request.");
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(firestore, "services"), {
        title,
        description,
        frequency,
        duration,
        mode,
        numberOfStudents: parseInt(numStudents),
        orphanageId: user.uid,
        orphanageEmail: user.email,
        status: "Pending",
        timestamp: new Date(),
      });

      setTitle("");
      setDescription("");
      setFrequency("Weekend");
      setDuration("One Month");
      setMode("Onsite");
      setNumStudents("");

      router.push("/orphanageDashboard");
    } catch (err) {
      setError("Failed to post service request: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-md shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Post a Service Request</h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="Enter service title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the service needed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>


        {/* Frequency */}
        <div>
          <Label>Class Frequency</Label>
          <div className="flex space-x-4 mt-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="frequency"
                value="Daily"
                checked={frequency === "Daily"}
                onChange={(e) => setFrequency(e.target.value)}
              />
              <span>Daily</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="frequency"
                value="Weekend"
                checked={frequency === "Weekend"}
                onChange={(e) => setFrequency(e.target.value)}
              />
              <span>Weekend</span>
            </label>
          </div>
        </div>

        {/* Mode */}
        <div>
          <Label>Mode of Service</Label>
          <div className="flex space-x-4 mt-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                value="Onsite"
                checked={mode === "Onsite"}
                onChange={(e) => setMode(e.target.value)}
              />
              <span>Onsite</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                value="Online"
                checked={mode === "Online"}
                onChange={(e) => setMode(e.target.value)}
              />
              <span>Online</span>
            </label>
          </div>
        </div>

{/* Duration */}
<div>
          <Label htmlFor="duration">Duration</Label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="One Day">One Day</option>
            <option value="One Week">One Week</option>
            <option value="One Month">One Month</option>
          </select>
        </div>
        
        {/* Number of Students */}
        <div>
          <Label htmlFor="numStudents">Number of Students</Label>
          <Input
            id="numStudents"
            type="number"
            min="1"
            placeholder="e.g. 25"
            value={numStudents}
            onChange={(e) => setNumStudents(e.target.value)}
            required
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-green-500 text-white hover:bg-green-600"
          disabled={loading}
        >
          {loading ? "Posting..." : "Submit Service Request"}
        </Button>
      </form>
    </div>
  );
}
