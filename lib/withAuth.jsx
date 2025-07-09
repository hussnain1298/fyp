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
    const [authChecked, setAuthChecked] = useState(false);
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Check session in localStorage first
          const storedUser = localStorage.getItem("userSession");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser?.uid && allowedRoles.includes(parsedUser.userType)) {
              setUser(parsedUser);
              setLoading(false);
              setAuthChecked(true);
              return;
            } else {
              localStorage.removeItem("userSession");
            }
          }

          // Wait for Firebase auth state to be determined
          const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
              setLoading(false);
              setAuthChecked(true);
              if (authChecked) {
                router.push("/login");
              }
              return;
            }

            try {
              const userRef = doc(firestore, "users", currentUser.uid);
              const userDoc = await getDoc(userRef);

              if (!userDoc.exists()) {
                setLoading(false);
                setAuthChecked(true);
                router.push("/login");
                return;
              }

              const userData = userDoc.data();

              // Check if user has the required role
              if (!allowedRoles.includes(userData.userType)) {
                setLoading(false);
                setAuthChecked(true);
                router.push("/unauthorized");
                return;
              }

              // All good — set session
              const sessionData = {
                uid: currentUser.uid,
                email: currentUser.email,
                userType: userData.userType,
                ...userData,
              };

              setUser(sessionData);
              localStorage.setItem("userSession", JSON.stringify(sessionData));
              setLoading(false);
              setAuthChecked(true);
            } catch (error) {
              console.error("Error fetching user:", error);
              setLoading(false);
              setAuthChecked(true);
              router.push("/login");
            }
          });

          return () => unsubscribe();
        } catch (error) {
          console.error("Error in auth check:", error);
          setLoading(false);
          setAuthChecked(true);
          router.push("/login");
        }
      };

      checkAuth();
    }, [router]);

    // Show loading while checking authentication
    if (loading || !authChecked) {
      return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1 }}
            className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"
          />
          <p className="text-gray-600 mt-4">Checking authentication...</p>
        </div>
      );
    }

    // Don't render component if user is not authenticated
    if (!user) {
      return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      );
    }

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

  AuthenticatedComponent.displayName = `withAuth(${
    Component.displayName || Component.name || "Component"
  })`;
  return AuthenticatedComponent;
}
