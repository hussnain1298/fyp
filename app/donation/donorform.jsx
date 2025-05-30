"use client";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

// Firestore integration
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase"; // ✅ YOUR export

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function DonorForm({ setShowForm, setShowReview, donationType, donationAmount, setDonorInfo }) {
  const validationSchema = Yup.object({
    firstName: Yup.string().required("Required"),
    lastName: Yup.string().required("Required"),
    address: Yup.string().required("Required"),
    city: Yup.string().required("Required"),
    state: Yup.string().required("Required"),
    postcode: Yup.string().matches(/^\d{5}$/, "Must be 5 digits").required("Required"),
    phone: Yup.string().matches(/^\+92\d{10}$/, "Use +92XXXXXXXXXX format").required("Required"),
    clothesDesc: donationType === "clothes" ? Yup.string().required("Required") : Yup.string(),
    clothesQty: donationType === "clothes" ? Yup.number().min(1).required("Required") : Yup.number(),
    foodType: donationType === "food" ? Yup.string().required("Required") : Yup.string(),
    foodQty: donationType === "food" ? Yup.string().required("Required") : Yup.string(),
    foodExpiry: donationType === "food" ? Yup.date().required("Required") : Yup.date(),
  });

  return (
    <motion.div
      className={`${poppins.className} max-w-2xl mx-auto bg-white p-8 shadow-xl rounded-2xl border border-gray-200`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 text-center">Donor Information</h2>

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
        onSubmit={async (values) => {
          try {
            await addDoc(collection(firestore, "publicDonations"), {
              ...values,
              donationType,
              donationAmount: donationType === "money" ? donationAmount : null,
              timestamp: Timestamp.now(),
            });
            setDonorInfo(values);
            setShowReview(true);
            setShowForm(false);
          } catch (error) {
            console.error("❌ Firestore error:", error);
            alert("Something went wrong while submitting your donation.");
          }
        }}
      >
        {() => (
          <Form className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="text-gray-700 font-medium">First Name *</label>
                  <Field id="firstName" name="firstName" className="input-field" placeholder="Ali" autoComplete="given-name" />
                  <ErrorMessage name="firstName" component="div" className="error-text" />
                </div>
                <div>
                  <label htmlFor="lastName" className="text-gray-700 font-medium">Last Name *</label>
                  <Field id="lastName" name="lastName" className="input-field" placeholder="Hussnain" autoComplete="family-name" />
                  <ErrorMessage name="lastName" component="div" className="error-text" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Contact Information</h3>
              <label htmlFor="address" className="text-gray-700 font-medium">Address *</label>
              <Field id="address" name="address" className="input-field" placeholder="Street, Area" autoComplete="street-address" />
              <ErrorMessage name="address" component="div" className="error-text" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="text-gray-700 font-medium">City *</label>
                <Field id="city" name="city" className="input-field" placeholder="City" autoComplete="address-level2" />
                <ErrorMessage name="city" component="div" className="error-text" />
              </div>
              <div>
                <label htmlFor="state" className="text-gray-700 font-medium">State *</label>
                <Field as="select" id="state" name="state" className="input-field" autoComplete="address-level1">
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh">Sindh</option>
                  <option value="KPK">KPK</option>
                  <option value="Balochistan">Balochistan</option>
                </Field>
                <ErrorMessage name="state" component="div" className="error-text" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="postcode" className="text-gray-700 font-medium">Postcode *</label>
                <Field id="postcode" name="postcode" className="input-field" placeholder="38000" autoComplete="postal-code" />
                <ErrorMessage name="postcode" component="div" className="error-text" />
              </div>
              <div>
                <label htmlFor="phone" className="text-gray-700 font-medium">Phone *</label>
                <Field id="phone" name="phone" className="input-field" placeholder="+92XXXXXXXXXX" autoComplete="tel" />
                <ErrorMessage name="phone" component="div" className="error-text" />
              </div>
            </div>

            {donationType === "clothes" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Clothes Donation</h3>
                <label htmlFor="clothesDesc" className="text-gray-700 font-medium">Clothes Description *</label>
                <Field id="clothesDesc" name="clothesDesc" className="input-field" placeholder="Shirts, trousers..." />
                <ErrorMessage name="clothesDesc" component="div" className="error-text" />

                <label htmlFor="clothesQty" className="text-gray-700 font-medium mt-3 block">Quantity *</label>
                <Field id="clothesQty" name="clothesQty" type="number" className="input-field" placeholder="e.g. 10" />
                <ErrorMessage name="clothesQty" component="div" className="error-text" />
              </div>
            )}

            {donationType === "food" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Food Donation</h3>
                <label htmlFor="foodType" className="text-gray-700 font-medium">Food Type *</label>
                <Field id="foodType" name="foodType" className="input-field" placeholder="Rice, beans, etc." />
                <ErrorMessage name="foodType" component="div" className="error-text" />

                <label htmlFor="foodQty" className="text-gray-700 font-medium mt-3 block">Quantity *</label>
                <Field id="foodQty" name="foodQty" className="input-field" placeholder="e.g. 5 boxes" />
                <ErrorMessage name="foodQty" component="div" className="error-text" />

                <label htmlFor="foodExpiry" className="text-gray-700 font-medium mt-3 block">Expiry Date *</label>
                <Field id="foodExpiry" name="foodExpiry" type="date" className="input-field" />
                <ErrorMessage name="foodExpiry" component="div" className="error-text" />
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 font-semibold rounded-lg hover:bg-green-700 transition"
              >
                {donationType === "money" ? "Review & Payment" : "Submit Donation"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full border border-gray-400 py-3 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                ← Back to Donation Type
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </motion.div>
  );
}
