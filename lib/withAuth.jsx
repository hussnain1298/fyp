"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";

export function withAuth(Component, allowedRoles = []) {
  function AuthenticatedComponent(props) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Check session in localStorage
          const storedUser = localStorage.getItem("userSession");
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

          // If no session, check current Firebase auth state
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

          // All good — set session
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

      // Listen for auth changes
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          localStorage.removeItem("userSession");
          router.push("/login");
        }
      });

      return () => unsubscribe();
    }, [router]);

    if (loading)
      return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"
          />
          <p className="text-gray-600 mt-4">Checking authentication...</p>
        </div>
      );

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Component {...props} user={user} />
      </motion.div>
    );
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name || "Component"})`;
  return AuthenticatedComponent;
}
