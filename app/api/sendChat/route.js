import { database, ref, push } from "@/lib/firebase";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userId, text } = await req.json();
    if (!userId || !text) return NextResponse.json({ error: "Missing Fields" }, { status: 400 });

    // 🔹 Push Message to Firebase
    const messagesRef = ref(database, "chats");
    await push(messagesRef, { userId, text, timestamp: Date.now() });

    return NextResponse.json({ success: true, message: "Message sent!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
