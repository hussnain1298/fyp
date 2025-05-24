import { firestore } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { donorId, donationType, amount, gateway, extraInfo } = req.body;

      const docRef = await addDoc(collection(firestore, "donations"), {
        donorId: donorId || null,
        type: donationType || "money",
        amount: amount || 0,
        gateway: gateway || "jazzcash",
        extraInfo: extraInfo || null,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      res.status(200).json({ success: true, docId: docRef.id });
    } catch (error) {
      console.error("Error saving donation:", error);
      res.status(500).json({ success: false, error: "Failed to save donation." });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
