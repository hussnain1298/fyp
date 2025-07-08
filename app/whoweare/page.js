"use client"
import Image from "next/image"
import { Poppins } from "next/font/google"
import Navbar from "../Navbar/page"
import Footer from "../footer/page"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function WhoWeAre() {
  return (
    <div className={`${poppins.className} min-h-screen bg-gradient-to-br from-gray-50 to-gray-100`}>
      <Navbar />

      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Who We Are</h1>
          <div className="w-24 h-1 bg-green-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connecting hearts, transforming lives through technology-driven charitable solutions
          </p>
        </div>

        {/* Main Content */}
        <div className="lg:flex lg:items-start lg:space-x-12 max-w-7xl mx-auto">
          {/* Left Section - Content */}
          <div className="flex-1 space-y-8">
            {/* Who We Are Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-green-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-red-100 p-2 rounded-lg mr-3">👥</span>
                Who We Are
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We are a technology-driven platform that bridges the gap between generous donors and orphanages in need.
                Our mission is to modernize charitable giving by creating a centralized, transparent, and efficient
                system that connects local communities with orphanages.
              </p>
            </div>

            {/* What We Do Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 p-2 rounded-lg mr-3">🚀</span>
                What We Do
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We provide a centralized platform where orphanages can post their specific needs and donors can
                contribute meaningfully through various forms of support.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">Connect donors with orphanages</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">Facilitate transparent donations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">Enable skill-based volunteering</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">Support fundraising campaigns</span>
                </div>
              </div>
            </div>

            {/* Purpose Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-green-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-green-100 p-2 rounded-lg mr-3">🎯</span>
                Our Purpose
              </h2>
              <p className="text-gray-700 leading-relaxed">
                To solve the disconnect between willing donors and orphanages in need. Traditional donation systems are
                fragmented and inefficient. We create a transparent, secure, and user-friendly ecosystem that builds
                trust and enables meaningful contributions that directly impact children's lives.
              </p>
            </div>

            {/* Objectives Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-purple-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-purple-100 p-2 rounded-lg mr-3">📋</span>
                Our Objectives
              </h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    1
                  </span>
                  <p className="text-gray-700">
                    Support orphanages with essential needs, medical supplies, and resources
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    2
                  </span>
                  <p className="text-gray-700">Enable education and mentorship programs for skill development</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    3
                  </span>
                  <p className="text-gray-700">Build a transparent and secure platform that fosters trust</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    4
                  </span>
                  <p className="text-gray-700">Create lasting donor-orphanage relationships through technology</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Image & Stats */}
          <div className="flex-1 mt-10 lg:mt-0 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Image src="/raise.jpg" alt="Technology for Good" className="rounded-lg w-full" width={600} height={400} />
            </div>

            {/* Impact Stats */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-center">Our Impact</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">100+</div>
                  <div className="text-sm opacity-90">Orphanages Connected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">500+</div>
                  <div className="text-sm opacity-90">Active Donors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">1000+</div>
                  <div className="text-sm opacity-90">Children Helped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-sm opacity-90">Cities Reached</div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Join Our Mission</h3>
              <p className="text-gray-600 mb-4">Be part of the change. Every contribution makes a difference.</p>
              <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                Start Donating Today
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
