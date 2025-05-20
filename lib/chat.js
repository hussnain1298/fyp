// /lib/chat.js
import { firestore } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";

export async function createChatWithOrgName(donorId, orphanageId) {
  const orphanageDocRef = doc(firestore, "users", orphanageId);
  const orphanageSnap = await getDoc(orphanageDocRef);
  if (!orphanageSnap.exists()) throw new Error("Orphanage not found");

  const orgName = orphanageSnap.data().orgName || "Unknown Orphanage";

  const chatsRef = collection(firestore, "chats");
  const newChatRef = doc(chatsRef);

  await setDoc(newChatRef, {
    participants: [donorId, orphanageId],
    orgName,
    createdAt: new Date(),
  });

  return newChatRef.id;
}
