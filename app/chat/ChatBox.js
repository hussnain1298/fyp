import { useState, useEffect } from "react";
import { firestore, auth } from "@/lib/firebase";
import { collection, addDoc, getDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ChatBox({ chatId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔹 Get Authenticated User & Determine Role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Fetch user details from Firestore
        const userRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.userType || "Unknown");
          setUserName(userData.fullName || "Anonymous");
        } else {
          setError("User not found in Firestore.");
        }
      } else {
        setError("User not authenticated.");
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  // 🔹 Fetch Messages in Realtime from Firestore
  useEffect(() => {
    if (!chatId || !userId) return;

    setLoading(true);
    const checkChatParticipants = async () => {
      try {
        const chatRef = doc(firestore, "chats", chatId);
        const chatSnapshot = await getDoc(chatRef);
        if (chatSnapshot.exists()) {
          const participants = chatSnapshot.data().participants;

          // Check if the user is a participant (i.e., if userId is a key in participants object)
          if (!participants || !participants[userId]) {
            setError("You are not a participant in this chat.");
            setLoading(false);
            return;
          } else {
            console.log("User is a participant, ready to chat.");
          }
        } else {
          setError("Chat not found.");
          setLoading(false);
          return;
        }
      } catch (err) {
        setError("Error checking participants.");
        setLoading(false);
      }
    };

    checkChatParticipants();

    // Now fetch messages (only if user is a participant)
    const messagesRef = collection(firestore, `chats/${chatId}/messages`);
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, userId]);

  // 🔹 Send Message Function
  const sendMessage = async () => {
    if (!message.trim() || !userId || !chatId) return;

    try {
      const chatRef = doc(firestore, "chats", chatId);
      const chatSnapshot = await getDoc(chatRef);

      if (chatSnapshot.exists()) {
        const participants = chatSnapshot.data().participants;
        if (participants && participants[userId]) {
          // Send the message
          await addDoc(collection(firestore, `chats/${chatId}/messages`), {
            userId,
            senderName: userName,
            senderRole: userRole,
            text: message.trim(),
            timestamp: serverTimestamp(),
          });
          setMessage(""); // Clear input field
        } else {
          setError("You are not a participant in this chat.");
        }
      } else {
        setError("Chat not found.");
      }
    } catch (error) {
      console.error("🔥 Error sending message:", error);
      setError("Failed to send message.");
    }
  };

  return (
    <div className="mt-4">
      {/* Messages List */}
      <div className="h-64 overflow-y-auto bg-gray-200 p-2 rounded-md">
        {loading && <p className="text-center text-gray-600">Loading messages...</p>}
        {error && <p className="text-red-500 text-center">{error}</p>}
        {messages.length === 0 && !loading ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-md mb-1 ${
                msg.userId === userId
                  ? "bg-blue-500 text-white text-right"
                  : "bg-gray-300 text-black text-left"
              }`}
            >
              <small className="block text-xs font-bold">
                {msg.senderName} ({msg.senderRole})
              </small>
              {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Input Box */}
      <div className="flex mt-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full p-2 border rounded-md"
        />
        <button
          onClick={sendMessage}
          className="ml-2 p-2 bg-green-500 text-white rounded-md"
          disabled={!userId || !message.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
