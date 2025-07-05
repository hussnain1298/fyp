"use client"
import { Suspense } from "react"
import LocationProvider from "./location-provider"
import RequestsDisplay from "./requests-display"
import UserCity from "./location"
import { Heart, Users, Globe, MapPin, Target, Handshake } from "lucide-react"

// Enhanced loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[500px]">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-6"></div>
        <Heart className="absolute inset-0 h-16 w-16 text-green-600 opacity-20 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Donation Requests</h3>
      <p className="text-gray-600 mb-1">Connecting hearts with those in need...</p>
      <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
        <div className="animate-pulse">•</div>
        <div className="animate-pulse delay-100">•</div>
        <div className="animate-pulse delay-200">•</div>
      </div>
    </div>
  </div>
)

// Enhanced hero section
const HeroSection = () => (
  <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-3xl p-8 mb-8 border border-green-100">
    {/* Background decoration */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-200/20 to-blue-200/20 rounded-full -translate-y-32 translate-x-32"></div>
    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/20 to-pink-200/20 rounded-full translate-y-24 -translate-x-24"></div>

    <div className="relative text-center max-w-5xl mx-auto">
      {/* Icon row */}
      <div className="flex justify-center items-center space-x-6 mb-8">
        <div className="group">
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <p className="text-xs text-gray-600 mt-2 font-medium">Love</p>
        </div>
        <div className="group">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Users className="h-8 w-8 text-white" />
          </div>
          <p className="text-xs text-gray-600 mt-2 font-medium">Unity</p>
        </div>
        <div className="group">
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <p className="text-xs text-gray-600 mt-2 font-medium">Hope</p>
        </div>
      </div>

      {/* Main title */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6">
        <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
          DONATION REQUESTS
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-gray-700 text-lg md:text-xl lg:text-2xl xl:text-3xl mb-8 leading-relaxed font-medium">
        <span className="text-green-600">Serving Humanity</span> is the{" "}
        <span className="text-blue-600">Spirit of All Religions</span>
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
              <Heart className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-3xl font-bold text-gray-800">1000+</span>
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Lives Touched</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Families and individuals who received support through our platform
          </p>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
              <Handshake className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-800">500+</span>
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Kind Hearts</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Generous donors making a difference in their communities
          </p>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-800">50+</span>
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Cities Served</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Communities across the country connected through compassion
          </p>
        </div>
      </div>

      {/* Call to action */}
      <div className="mt-12 p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-2xl border border-green-200">
        <p className="text-gray-700 text-lg font-medium mb-4">
          "The best way to find yourself is to lose yourself in the service of others." - Mahatma Gandhi
        </p>
        <div className="flex items-center justify-center space-x-2 text-green-600">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold">Find requests near you and start making a difference today</span>
        </div>
      </div>
    </div>
  </div>
)

export default function DonationRequest() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-black pt-20">
      <div className="container px-4 max-w-7xl mx-auto py-8">
        <HeroSection />

        <Suspense fallback={<LoadingSpinner />}>
          <UserCity />

          <LocationProvider>
            {(locationProps) => (
              <Suspense fallback={<LoadingSpinner />}>
                <RequestsDisplay {...locationProps} />
              </Suspense>
            )}
          </LocationProvider>
        </Suspense>
      </div>
    </main>
  )
}
