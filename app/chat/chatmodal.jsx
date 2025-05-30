import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";

export default function ChatModal({
  messages,
  user,
  orphanageId,
  orphanageName,
  donorName,
  newMessage,
  setNewMessage,
  sendMessage,
  closeChatModal,
  profilesCache,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getInitial = (name) => name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end sm:items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col h-[80vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-white">
          <div className="flex items-center gap-3">
            {profilesCache[orphanageId]?.profilePhoto ? (
              <img
                src={profilesCache[orphanageId].profilePhoto}
                className="w-10 h-10 rounded-full"
                alt="Orphanage"
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-600 text-white font-bold">
                {getInitial(orphanageName)}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-sm text-gray-900">{orphanageName}</h2>
              <p className="text-xs text-gray-500">End-to-end encrypted</p>
            </div>
          </div>
          <button onClick={closeChatModal} className="text-gray-400 hover:text-black text-lg">
            <FaTimes />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.uid ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-2 max-w-[70%] text-sm shadow ${
                  msg.senderId === user?.uid
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={sendMessage}
            className="text-green-600 hover:text-green-700 disabled:opacity-50"
            disabled={!newMessage.trim()}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.94 2.94a1.5 1.5 0 012.12 0l12 12a1.5 1.5 0 01-2.12 2.12l-12-12a1.5 1.5 0 010-2.12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
