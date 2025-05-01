import { database, ref, push } from "@/lib/firebase";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Parse incoming JSON request
    const { userId, text } = await req.json();

    // Check if the required fields are missing
    if (!userId || !text) {
      return NextResponse.json({ error: "Missing Fields" }, { status: 400 });
    }

    // 🔹 Define the Firebase Realtime Database reference for messages
    const messagesRef = ref(database, "chats/messages");  // Structure data under 'chats/messages'

    // 🔹 Push the message data to Firebase
    await push(messagesRef, {
      userId,
      text,
      timestamp: Date.now(),
    });

    // 🔹 Return success response
    return NextResponse.json({ success: true, message: "Message sent!" });

  } catch (error) {
    // Handle any errors
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
