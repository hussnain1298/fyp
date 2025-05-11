import ChatContainer from "@/components/chat/chat-container"

export default function OrphanageChatPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat with Donors</h1>
      <ChatContainer userType="ORPHANAGE" />
    </div>
  )
}
