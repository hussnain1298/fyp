"use client"

import { useState } from "react"
import { firestore } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { User, Mail, Phone, MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react"

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState("")

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) return "Name is required"
    if (name.length < 2) return "Name must be at least 2 characters"
    if (name.length > 50) return "Name must be less than 50 characters"
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Name can only contain letters and spaces"
    return ""
  }

  const validateEmail = (email) => {
    if (!email.trim()) return "Email is required"
    if (email.length > 100) return "Email must be less than 100 characters"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return "Please enter a valid email address"
    return ""
  }

  const validatePhone = (phone) => {
    if (!phone.trim()) return "Phone number is required"
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanPhone.length < 10) return "Phone number must be at least 10 digits"
    if (cleanPhone.length > 15) return "Phone number must be less than 15 digits"

    // Pakistani phone number patterns
    const pakistaniPatterns = [
      /^(\+92|0092|92)?3[0-9]{9}$/, // Mobile numbers
      /^(\+92|0092|92)?[2-9][0-9]{7,10}$/, // Landline numbers
    ]

    const isValidPakistani = pakistaniPatterns.some((pattern) => pattern.test(cleanPhone))
    if (!isValidPakistani) return "Please enter a valid Pakistani phone number"

    return ""
  }

  const validateMessage = (message) => {
    if (!message.trim()) return "Message is required"
    if (message.length < 10) return "Message must be at least 10 characters"
    if (message.length > 1000) return "Message must be less than 1000 characters"
    return ""
  }

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    const cleanValue = value.replace(/\D/g, "")

    if (cleanValue.startsWith("92")) {
      // Format: +92-XXX-XXX-XXXX
      const formatted = cleanValue.replace(/^92(\d{3})(\d{3})(\d{4}).*/, "+92-$1-$2-$3")
      return formatted.length > 4 ? formatted : `+92-${cleanValue.slice(2)}`
    } else if (cleanValue.startsWith("03")) {
      // Format: 03XX-XXX-XXXX
      const formatted = cleanValue.replace(/^(\d{4})(\d{3})(\d{4}).*/, "$1-$2-$3")
      return formatted.length > 4 ? formatted : cleanValue
    } else {
      // Default formatting
      return cleanValue.replace(/(\d{3})(\d{3})(\d{4}).*/, "$1-$2-$3")
    }
  }

  // Handle input changes with validation
  const handleChange = (e) => {
    const { name, value } = e.target
    let processedValue = value

    // Special handling for different fields
    if (name === "name") {
      // Remove numbers and special characters from name
      processedValue = value.replace(/[^a-zA-Z\s]/g, "")
    } else if (name === "phone") {
      // Format phone number
      processedValue = formatPhoneNumber(value)
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }

    // Clear success message when user starts editing
    if (success) {
      setSuccess("")
    }
  }

  // Validate all fields
  const validateForm = () => {
    const newErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      message: validateMessage(formData.message),
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error !== "")
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Clean phone number for storage (digits only)
      const cleanPhone = formData.phone.replace(/\D/g, "")

      await addDoc(collection(firestore, "contact-us"), {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: cleanPhone,
        message: formData.message.trim(),
        timestamp: new Date(),
        status: "new",
      })

      setSuccess("Thank you! Your message has been sent successfully. We'll get back to you soon.")
      setFormData({ name: "", email: "", phone: "", message: "" })
      setErrors({})
    } catch (err) {
      console.error("Error sending message:", err)
      setErrors({ submit: "Failed to send message. Please try again later." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Send us a Message</h2>
        <p className="text-gray-600">Fill out the form below and we'll get back to you as soon as possible</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
              errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            maxLength={50}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="inline h-4 w-4 mr-1" />
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
              errors.email ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            maxLength={100}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="inline h-4 w-4 mr-1" />
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+92-XXX-XXX-XXXX or 03XX-XXX-XXXX"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
              errors.phone ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.phone}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Supported formats: +92-XXX-XXX-XXXX, 03XX-XXX-XXXX</p>
        </div>

        {/* Message Field */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="inline h-4 w-4 mr-1" />
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us how we can help you..."
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-vertical ${
              errors.message ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.message ? (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.message}
              </p>
            ) : (
              <span></span>
            )}
            <span className="text-xs text-gray-500">{formData.message.length}/1000 characters</span>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </button>
        </div>

        {/* Error Messages */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {errors.submit}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              {success}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
