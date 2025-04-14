import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion"; // ✅ Framer Motion for smooth transitions

export default function withAuth(Component, allowedRoles) {
  return function AuthenticatedComponent(props) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          let storedUser = localStorage.getItem("userSession");

          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            
            // ✅ Ensure session is valid before using it
            if (parsedUser?.uid && allowedRoles.includes(parsedUser.role)) {
              console.log("🔥 Using Stored Session:", parsedUser);
              setUser(parsedUser);
              setLoading(false);
              return;
            } else {
              console.warn("⚠️ Invalid or unauthorized session found. Clearing...");
              localStorage.removeItem("userSession");
            }
          }

          // ✅ Check Firebase Authentication
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.log("🚨 No user logged in. Redirecting to login...");
            router.push("/login");
            return;
          }

          // ✅ Fetch user role from Firestore if session is missing or invalid
          const userRef = doc(firestore, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("🔥 Logged-in User:", currentUser.email, "| Role:", userData.userType);

            const sessionData = {
              uid: currentUser.uid,
              email: currentUser.email,
              role: userData.userType,
            };

            setUser(sessionData);
            localStorage.setItem("userSession", JSON.stringify(sessionData));

            if (!allowedRoles.includes(userData.userType)) {
              console.log("🚨 Unauthorized Access! Redirecting...");
              router.push("/unauthorized");
              return;
            }
          } else {
            console.log("🚨 User not found in Firestore! Redirecting...");
            router.push("/login");
            return;
          }
        } catch (error) {
          console.error("🔥 Error fetching user:", error);
          router.push("/login");
        } finally {
          setTimeout(() => setLoading(false), 1000); // ✅ Smooth delay for animation
        }
      };

      checkAuth();

      // ✅ Auto-check if Firebase logs out the user
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          console.warn("⚠️ User signed out. Clearing session...");
          localStorage.removeItem("userSession");
          router.push("/login");
        }
      });

      return () => unsubscribe();
    }, [router]);

    // ✅ If still loading, show animation
    if (loading)
      return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          />
          <p className="text-gray-600 mt-4">Checking authentication...</p>
        </div>
      );

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Component {...props} user={user} />
      </motion.div>
    );
  };
}
