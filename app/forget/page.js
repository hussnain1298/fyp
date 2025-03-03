"use client";
import { useState } from "react";
import { Overpass } from "next/font/google";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "../Navbar/page";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { FaFacebookF, FaGoogle, FaTwitter, FaGithub } from "react-icons/fa";

// Import Overpass font
const overpass = Overpass({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // Include weights you plan to use
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleResetPassword = (e) => {
    e.preventDefault();
    // Add logic to handle password reset here
    console.log("Password reset requested for:", email);
  };

  const handleSocialSignIn = (provider) => {
    console.log(`Sign in with ${provider} attempted`);
    // Integrate OAuth sign-in logic here
  };

  return (
    <div
      className={`${overpass.className} min-h-screen flex items-center justify-center bg-gray-100 p-4`}
    >
      <Navbar/>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>Enter your email to reset your password</CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <button className="w-full bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-900">
              Reset Password
            </button>

           
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}