"use client"
import { motion } from "framer-motion"
import { Poppins } from "next/font/google"
import { Formik, Form, Field, ErrorMessage } from "formik"
import * as Yup from "yup"
import { User, MapPin, Phone, Shirt, UtensilsCrossed, Calendar, ArrowLeft, Send } from "lucide-react"

// Firestore integration
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { firestore } from "@/lib/firebase"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function DonorForm({ setShowForm, setShowReview, donationType, donationAmount, setDonorInfo }) {
  const validationSchema = Yup.object({
    firstName: Yup.string()
      .matches(/^[A-Za-z]+$/, "First name must contain only characters")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters")
      .required("First name is required"),
    lastName: Yup.string()
      .matches(/^[A-Za-z]+$/, "Last name must contain only characters")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters")
      .required("Last name is required"),
    address: Yup.string()
      .max(200, "Address cannot exceed 200 characters")
      .required("Address is required"),
    city: Yup.string()
      .matches(/^[A-Za-z\s]+$/, "City must be a valid name with only letters and spaces")
      .min(2, "City must be at least 2 characters")
      .max(100, "City must be less than 100 characters")
      .required("City is required"),
    state: Yup.string().required("State is required"),
    postcode: Yup.string()
      .matches(/^\d{5}$/, "Must be 5 digits")
      .required("Postcode is required"),
    phone: Yup.string()
      .matches(/^\+92\d{10}$/, "Phone number must be in the format +92XXXXXXXXXX")
      .required("Phone is required"),
    clothesDesc: donationType === "clothes" 
      ? Yup.string().max(300, "Clothes description cannot exceed 300 characters").required("Clothes description is required") 
      : Yup.string(),
    clothesQty: donationType === "clothes"
  ? Yup.number().min(1, "Quantity must be at least 1")
      .max(100, "Quantity cannot exceed 100 items")  // Max limit added here
      .required("Quantity is required")
  : Yup.number(),
    foodType: donationType === "food" 
      ? Yup.string().matches(/^[A-Za-z\s]+$/, "Food type must be a valid string with letters and spaces")
        .min(2, "Food type must be at least 2 characters")
        .max(50, "Food type must be less than 50 characters")
        .required("Food type is required")
      : Yup.string(),
    
foodQty: donationType === "food"
  ? Yup.number().min(1, "Quantity must be at least 1")
      .max(100, "Quantity cannot exceed 100 items")  // Max limit added here
      .required("Food quantity is required")
  : Yup.string(),
    foodExpiry:
      donationType === "food"
        ? Yup.date().min(new Date(), "Expiry date must be in the future").required("Expiry date is required")
        : Yup.date(),
    foodDesc: donationType === "food" 
      ? Yup.string().max(300, "Food description cannot exceed 300 characters").required("Food description is required")
      : Yup.string(),
  })

  return (
    <motion.div
      className={`${poppins.className} max-w-4xl mx-auto bg-white p-8 shadow-2xl rounded-3xl border border-gray-100`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Donor Information</h2>
        <p className="text-gray-600">Please provide your details to complete the donation</p>
      </div>

      <Formik
        initialValues={{
          firstName: "",
          lastName: "",
          address: "",
          city: "",
          state: "Punjab",
          postcode: "",
          phone: "",
          clothesDesc: "",
          clothesQty: "",
          foodType: "",
          foodQty: "",
          foodExpiry: "",
        }}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await addDoc(collection(firestore, "publicDonations"), {
              ...values,
              donationType,
              donationAmount: donationType === "money" ? donationAmount : "",
              timestamp: Timestamp.now(),
            })
            setDonorInfo(values)
            setShowReview(true)
            setShowForm(false)
          } catch (error) {
            console.error("❌ Firestore error:", error)
            alert("Something went wrong while submitting your donation. Please try again.")
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-gray-700 font-semibold mb-2">
                    First Name *
                  </label>
                  <Field
                    id="firstName"
                    name="firstName"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter your first name"
                    autoComplete="given-name"
                  />
                  <ErrorMessage name="firstName" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-gray-700 font-semibold mb-2">
                    Last Name *
                  </label>
                  <Field
                    id="lastName"
                    name="lastName"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter your last name"
                    autoComplete="family-name"
                  />
                  <ErrorMessage name="lastName" component="div" className="text-red-500 text-sm mt-1" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-gray-800">Contact Information</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="address" className="block text-gray-700 font-semibold mb-2">
                    Address *
                  </label>
                  <Field
                    id="address"
                    name="address"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="Enter your complete address"
                    autoComplete="street-address"
                  />
                  <ErrorMessage name="address" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="city" className="block text-gray-700 font-semibold mb-2">
                      City *
                    </label>
                    <Field
                      id="city"
                      name="city"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      placeholder="Enter your city"
                      autoComplete="address-level2"
                    />
                    <ErrorMessage name="city" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-gray-700 font-semibold mb-2">
                      State *
                    </label>
                    <Field
                      as="select"
                      id="state"
                      name="state"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      autoComplete="address-level1"
                    >
                      <option value="Punjab">Punjab</option>
                      <option value="Sindh">Sindh</option>
                      <option value="KPK">KPK</option>
                      <option value="Balochistan">Balochistan</option>
                    </Field>
                    <ErrorMessage name="state" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="postcode" className="block text-gray-700 font-semibold mb-2">
                      Postcode *
                    </label>
                    <Field
                      id="postcode"
                      name="postcode"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      placeholder="Enter 5-digit postcode"
                      autoComplete="postal-code"
                    />
                    <ErrorMessage name="postcode" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-gray-700 font-semibold mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Field
                        id="phone"
                        name="phone"
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        placeholder="+92XXXXXXXXXX"
                        autoComplete="tel"
                      />
                    </div>
                    <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Clothes Donation Details */}
            {donationType === "clothes" && (
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-3 mb-6">
                  <Shirt className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">Clothes Donation Details</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="clothesDesc" className="block text-gray-700 font-semibold mb-2">
                      Clothes Description *
                    </label>
                    <Field
                      id="clothesDesc"
                      name="clothesDesc"
                      as="textarea"
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      placeholder="Describe the clothes you're donating (e.g., shirts, trousers, winter clothes, sizes, condition)"
                    />
                    <ErrorMessage name="clothesDesc" component="div" className="text-red-500 text-sm mt-1" />
                  </div>

                  <div>
                    <label htmlFor="clothesQty" className="block text-gray-700 font-semibold mb-2">
                      Quantity (Number of Items) *
                    </label>
                    <Field
                      id="clothesQty"
                      name="clothesQty"
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter number of clothing items"
                    />
                    <ErrorMessage name="clothesQty" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                </div>
              </div>
            )}

            {/* Food Donation Details */}
            {donationType === "food" && (
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200">
                <div className="flex items-center gap-3 mb-6">
                  <UtensilsCrossed className="w-6 h-6 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-800">Food Donation Details</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="foodType" className="block text-gray-700 font-semibold mb-2">
                      Food Type *
                    </label>
                    <Field
                      id="foodType"
                      name="foodType"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="e.g., Rice, Lentils, Canned goods, Fresh fruits"
                    />
                    <ErrorMessage name="foodType" component="div" className="text-red-500 text-sm mt-1" />
                  </div>

                  <div>
                    <label htmlFor="foodQty" className="block text-gray-700 font-semibold mb-2">
                      Quantity *
                    </label>
                    <Field
                      id="foodQty"
                      name="foodQty"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="e.g., 5 kg, 10 boxes, 20 cans"
                    />
                    <ErrorMessage name="foodQty" component="div" className="text-red-500 text-sm mt-1" />
                  </div>

                  <div>
                    <label htmlFor="foodExpiry" className="block text-gray-700 font-semibold mb-2">
                      Expiry Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Field
                        id="foodExpiry"
                        name="foodExpiry"
                        type="date"
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <ErrorMessage name="foodExpiry" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Review Donation
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 sm:flex-none sm:px-8 border-2 border-gray-300 hover:border-gray-400 py-4 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Donation Type
              </motion.button>
            </div>
          </Form>
        )}
      </Formik>
    </motion.div>
  )
}
