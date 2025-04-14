import { doc, setDoc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const createChatIfNotExists = async (donorId, orphanageId, chatId) => {
    const chatRef = doc(firestore, "chats", chatId);
    const chatSnapshot = await getDoc(chatRef);
  
    if (!chatSnapshot.exists()) {
      await setDoc(chatRef, {
        participants: {
          [donorId]: true, 
          [orphanageId]: true
        }, 
        createdAt: new Date(),
      });
    }
  };

