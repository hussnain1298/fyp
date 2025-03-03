import { MapPin, Phone, Mail } from "lucide-react";

export default function ContactInfo() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
      <div className="flex items-center space-x-3">
        <MapPin className="h-5 w-5 text-green-500" />
        <span>House#19 Faisal City, Faisalabad</span>
      </div>
      <div className="flex items-center space-x-3">
        <Phone className="h-5 w-5 text-green-500" />
        <span>+92-321 8582020</span>
      </div>
      <div className="flex items-center space-x-3">
        <Mail className="h-5 w-5 text-green-500" />
        <span>hunnybunny112200@gmail.com</span>
      </div>
    </div>
  );
}
