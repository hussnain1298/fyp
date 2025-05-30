import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";

export default function withAuth(Component, allowedRoles = []) {
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
            if (parsedUser?.uid && allowedRoles.includes(parsedUser.role)) {
              setUser(parsedUser);
              setLoading(false);
              return;
            } else {
              localStorage.removeItem("userSession");
            }
          }

          const currentUser = auth.currentUser;
          if (!currentUser) {
            router.push("/login");
            return;
          }

          const userRef = doc(firestore, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            router.push("/login");
            return;
          }

          const userData = userDoc.data();

          if (!allowedRoles.includes(userData.userType)) {
            router.push("/unauthorized");
            return;
          }

          const sessionData = {
            uid: currentUser.uid,
            email: currentUser.email,
            role: userData.userType,
          };

          setUser(sessionData);
          localStorage.setItem("userSession", JSON.stringify(sessionData));
          setLoading(false);
        } catch (error) {
          console.error("Error fetching user:", error);
          router.push("/login");
          setLoading(false);
        }
      };

      checkAuth();

      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          localStorage.removeItem("userSession");
          router.push("/login");
        }
      });

      return () => unsubscribe();
    }, [router, allowedRoles]);

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
