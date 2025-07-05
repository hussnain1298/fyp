import { MapPin, Phone, Mail } from "lucide-react"

export default function ContactInfo() {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
        <p className="text-gray-600">We're here to help and answer any questions you might have</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex-shrink-0">
            <MapPin className="h-6 w-6 text-green-500 mt-1" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
            <p className="text-gray-600">House#19 Faisal City, Faisalabad</p>
            <p className="text-sm text-gray-500 mt-1">Punjab, Pakistan</p>
          </div>
        </div>

        <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex-shrink-0">
            <Phone className="h-6 w-6 text-green-500 mt-1" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
            <p className="text-gray-600">+92-321 8582020</p>
            <p className="text-sm text-gray-500 mt-1">Available 9 AM - 6 PM</p>
          </div>
        </div>

        <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex-shrink-0">
            <Mail className="h-6 w-6 text-green-500 mt-1" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
            <p className="text-gray-600">hunnybunny112200@gmail.com</p>
            <p className="text-sm text-gray-500 mt-1">We'll respond within 24 hours</p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
        <h3 className="font-semibold text-gray-900 mb-2">Office Hours</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
          <p>Saturday: 10:00 AM - 4:00 PM</p>
          <p>Sunday: Closed</p>
        </div>
      </div>
    </div>
  )
}
