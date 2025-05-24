import ChatContainer from "@/components/chat/chat-container"

export default function DonorChatPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat with Orphanages</h1>
      <ChatContainer userType="DONOR" />
    </div>
  )
}
