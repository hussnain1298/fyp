"use client";
import React from "react";
import { useState, useEffect } from "react"; // useEffect import kiya gaya hai
import { createPortal } from "react-dom";
import {
  Search,
  X,
  CreditCard,
  Smartphone,
  Building2,
  ArrowLeft,
  Check,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore"; // Firebase imports
import { firestore } from "@/lib/firebase"; // Firebase firestore instance

const pakistaniBanks = [
  {
    id: "hbl",
    name: "Habib Bank Limited (HBL)",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
    popular: true,
  },
  {
    id: "ubl",
    name: "United Bank Limited (UBL)",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
    popular: true,
  },
  {
    id: "mcb",
    name: "Muslim Commercial Bank (MCB)",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
    popular: true,
  },
  {
    id: "nbl",
    name: "National Bank of Pakistan (NBP)",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
  },
  {
    id: "abl",
    name: "Allied Bank Limited (ABL)",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
  },
  {
    id: "bafl",
    name: "Bank Alfalah Limited",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
  },
  {
    id: "meezanbank",
    name: "Meezan Bank",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
  },
  {
    id: "faysal",
    name: "Faysal Bank",
    type: "bank",
    logo: "🏦",
  },
  {
    id: "askari",
    name: "Askari Bank",
    type: "bank",
    logo: "🏦",
    cardTypes: ["Visa", "Mastercard"],
  },
  {
    id: "jazzcash",
    name: "JazzCash",
    type: "mobile",
    logo: "📱",
    cardTypes: ["Mobile Wallet"],
    popular: true,
  },
  {
    id: "easypaisa",
    name: "Easypaisa",
    type: "mobile",
    logo: "📱",
    cardTypes: ["Mobile Wallet"],
    popular: true,
  },
  {
    id: "sadapay",
    name: "SadaPay",
    type: "mobile",
    logo: "📱",
    cardTypes: ["Digital Wallet"],
  },
  {
    id: "nayapay",
    name: "NayaPay",
    type: "mobile",
    logo: "📱",
    cardTypes: ["Digital Wallet"],
  },
  {
    id: "konnect",
    name: "Konnect by HBL",
    type: "mobile",
    logo: "📱",
    cardTypes: ["Digital Wallet"],
  },
];

// Custom components to replace shadcn/ui
const Button = ({ children, onClick, disabled, className, variant, size }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-colors ${
      variant === "ghost"
        ? "hover:bg-gray-100"
        : variant === "outline"
        ? "border border-gray-300 hover:bg-gray-50"
        : variant === "link"
        ? "text-blue-600 hover:underline p-0"
        : "bg-blue-600 text-white hover:bg-blue-700"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ""}`}
  >
    {children}
  </button>
);

const Input = ({
  type,
  placeholder,
  value,
  onChange,
  className,
  maxLength,
  list,
}) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    maxLength={maxLength}
    list={list}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      className || ""
    }`}
  />
);

const Card = ({ children, className, onClick }) => (
  <div
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${
      className || ""
    }`}
    onClick={onClick}
  >
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">{children}</div>
);

const CardTitle = ({ children, className }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className || ""}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className }) => (
  <div className={`px-6 py-4 ${className || ""}`}>{children}</div>
);

const Badge = ({ children, variant, className }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      variant === "secondary"
        ? "bg-gray-100 text-gray-800"
        : variant === "outline"
        ? "border border-gray-300 text-gray-700"
        : "bg-blue-100 text-blue-800"
    } ${className || ""}`}
  >
    {children}
  </span>
);

// OTP Service Class
class OTPService {
  constructor() {
    this.otpStorage = new Map();
    this.twilioClient = null;
    this.initTwilio();
  }

  async initTwilio() {
    // Only initialize if we're in browser and have credentials
    // In production, you'd want to use server-side API
    this.mockMode = true;
    console.log("OTP Service initialized in mock mode");
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  formatPhoneNumber(phoneNumber) {
    // Format for Pakistan (+92)
    if (phoneNumber.startsWith("+92")) {
      return phoneNumber;
    }
    if (phoneNumber.startsWith("0")) {
      return `+92${phoneNumber.slice(1)}`;
    }
    return `+92${phoneNumber}`;
  }

  async sendOTP(phoneNumber) {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const otp = this.generateOTP();

      // Store OTP with 5 minute expiry
      this.otpStorage.set(phoneNumber, {
        otp,
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        attempts: 0,
      });

      if (this.mockMode) {
        // Mock mode - show OTP in console and alert
        console.log(`🔐 OTP for ${formattedNumber}: ${otp}`);

        // Show OTP in a non-intrusive way
        const otpDisplay = document.createElement("div");
        otpDisplay.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
          z-index: 999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        otpDisplay.innerHTML = `
          <div><strong>Development OTP</strong></div>
          <div>Phone: ${formattedNumber}</div>
          <div>Code: <strong>${otp}</strong></div>
        `;

        document.body.appendChild(otpDisplay);

        // Remove after 10 seconds
        setTimeout(() => {
          if (document.body.contains(otpDisplay)) {
            document.body.removeChild(otpDisplay);
          }
        }, 10000);

        return {
          success: true,
          message: "OTP sent successfully (Development Mode)",
          sid: `mock_${Date.now()}`,
        };
      }

      // Real Twilio implementation would go here
      // For now, using mock mode
      return {
        success: true,
        message: "OTP sent successfully",
        sid: `mock_${Date.now()}`,
      };
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw new Error("Failed to send OTP");
    }
  }

  async verifyOTP(phoneNumber, otp) {
    try {
      const storedData = this.otpStorage.get(phoneNumber);

      if (!storedData) {
        throw new Error("OTP not found or expired");
      }

      // Check if OTP is expired
      if (Date.now() > storedData.expires) {
        this.otpStorage.delete(phoneNumber);
        throw new Error("OTP has expired");
      }

      // Increment attempts
      storedData.attempts += 1;

      // Check max attempts (3 attempts allowed)
      if (storedData.attempts > 3) {
        this.otpStorage.delete(phoneNumber);
        throw new Error("Too many attempts. Please request a new OTP");
      }

      // Verify OTP
      if (storedData.otp !== otp) {
        // Update attempts in storage
        this.otpStorage.set(phoneNumber, storedData);
        throw new Error(
          `Invalid OTP. ${3 - storedData.attempts} attempts remaining`
        );
      }

      // OTP verified successfully, remove from storage
      this.otpStorage.delete(phoneNumber);

      return {
        success: true,
        message: "OTP verified successfully",
      };
    } catch (error) {
      throw error;
    }
  }
}

// Initialize OTP service
const otpService = new OTPService();

// Helper function to format bank account for display
const formatBankAccountForDisplay = (accountNumber) => {
  if (!accountNumber) return "";
  const digits = accountNumber.replace(/\D/g, ""); // Remove non-digits
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
};

export default function PaymentModule({
  isOpen,
  onClose,
  amount,
  onPaymentSuccess,
  orphanageId,
}) {
  const [currentStep, setCurrentStep] = useState("bank-selection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [filteredBanks, setFilteredBanks] = useState(pakistaniBanks);
  const [orphanageDetails, setOrphanageDetails] = useState(null); // Orphanage details state
  const [loadingOrphanage, setLoadingOrphanage] = useState(true); // Loading state for orphanage details

  // Card details state
  const [cardDetails, setCardDetails] = useState({
    cardType: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    phoneNumber: "",
  });

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Fetch orphanage details when modal opens or orphanageId changes
  useEffect(() => {
    const fetchOrphanageData = async () => {
      if (!orphanageId) {
        setLoadingOrphanage(false);
        setOrphanageDetails(null);
        return;
      }
      setLoadingOrphanage(true);
      try {
        const docRef = doc(firestore, "users", orphanageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setOrphanageDetails(docSnap.data());
        } else {
          console.log("No such orphanage document!");
          setOrphanageDetails(null);
        }
      } catch (error) {
        console.error("Error fetching orphanage details:", error);
        setOrphanageDetails(null);
      } finally {
        setLoadingOrphanage(false);
      }
    };

    if (isOpen) {
      fetchOrphanageData();
    }
  }, [isOpen, orphanageId]);

  // Filter banks based on search query
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      // Show popular banks first when no search
      const popular = pakistaniBanks.filter((bank) => bank.popular);
      const others = pakistaniBanks.filter((bank) => !bank.popular);
      setFilteredBanks([...popular, ...others]);
    } else {
      const filtered = pakistaniBanks.filter((bank) =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
  }, [searchQuery]);

  // OTP Timer
  React.useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setCardDetails((prev) => ({
      ...prev,
      cardType: bank.cardTypes[0],
    }));
    setCurrentStep("card-details");
  };

  const handleCardDetailsSubmit = async () => {
    // Validate card details
    if (
      !cardDetails.cardNumber ||
      !cardDetails.expiryMonth ||
      !cardDetails.expiryYear ||
      !cardDetails.cvv
    ) {
      alert("Please fill all card details");
      return;
    }

    if (!cardDetails.phoneNumber || cardDetails.phoneNumber.length < 11) {
      alert("Please enter a valid phone number");
      return;
    }

    setIsProcessing(true);
    setOtpError("");

    try {
      // Send OTP using our service
      const result = await otpService.sendOTP(cardDetails.phoneNumber);

      if (result.success) {
        setOtpSent(true);
        setOtpTimer(300); // 5 minutes
        setCurrentStep("otp-verification");
        alert(`${result.message}\nPhone: ${cardDetails.phoneNumber}`);
      } else {
        throw new Error(result.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      alert(`Failed to send OTP: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsProcessing(true);
    setOtpError("");

    try {
      // Verify OTP using our service
      const result = await otpService.verifyOTP(cardDetails.phoneNumber, otp);

      if (result.success) {
        setCurrentStep("success");
        // Call success callback after 2 seconds
        setTimeout(() => {
          onPaymentSuccess({
            bank: selectedBank,
            amount,
            cardDetails,
            transactionId: `TXN${Date.now()}`,
            timestamp: new Date().toISOString(),
          });
          handleClose();
        }, 2000);
      } else {
        setOtpError(result.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpError(error.message || "Failed to verify OTP. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendOtp = async () => {
    setIsProcessing(true);
    setOtpError("");

    try {
      const result = await otpService.sendOTP(cardDetails.phoneNumber);

      if (result.success) {
        setOtpTimer(300); // Reset timer to 5 minutes
        alert(`${result.message}\nPhone: ${cardDetails.phoneNumber}`);
      } else {
        throw new Error(result.message || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      alert(`Failed to resend OTP: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Reset all states immediately
    setCurrentStep("bank-selection");
    setSearchQuery("");
    setSelectedBank(null);
    setCardDetails({
      cardType: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      phoneNumber: "",
    });
    setOtp("");
    setOtpSent(false);
    setOtpTimer(0);
    setIsProcessing(false);
    setOtpError("");
    setFilteredBanks(pakistaniBanks); // Reset filtered banks too
    setOrphanageDetails(null); // Orphanage details bhi reset karein
    setLoadingOrphanage(true); // Loading state bhi reset karein

    // Call parent close function
    onClose();
  };

  const handleBack = () => {
    if (currentStep === "card-details") {
      setCurrentStep("bank-selection");
    } else if (currentStep === "otp-verification") {
      setCurrentStep("card-details");
    }
  };

  // Handle escape key and body scroll
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset everything when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      // Reset all states when modal is closed
      setCurrentStep("bank-selection");
      setSearchQuery("");
      setSelectedBank(null);
      setCardDetails({
        cardType: "",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        phoneNumber: "",
      });
      setOtp("");
      setOtpSent(false);
      setOtpTimer(0);
      setIsProcessing(false);
      setOtpError("");
      setFilteredBanks(pakistaniBanks);
      setOrphanageDetails(null); // Orphanage details bhi reset karein
      setLoadingOrphanage(true); // Loading state bhi reset karein
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Portal content with enhanced positioning
  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: "1rem",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 10000,
          maxWidth: "64rem",
          width: "100%",
          maxHeight: "85vh",
          margin: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            {currentStep !== "bank-selection" && currentStep !== "success" && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-xl font-semibold">
              {currentStep === "bank-selection" && "Select Payment Method"}
              {currentStep === "card-details" && "Payment Details"}
              {currentStep === "otp-verification" && "Verify OTP"}
              {currentStep === "success" && "Payment Successful"}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Bank Selection Step */}
            {currentStep === "bank-selection" && (
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search banks or mobile wallets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Banks List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredBanks.map((bank) => (
                    <Card
                      key={bank.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-green-200"
                      onClick={() => handleBankSelect(bank)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{bank.logo}</div>
                            <div>
                              <h3 className="font-medium">{bank.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {bank.type === "bank" ? (
                                  <Building2 className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <Smartphone className="w-3 h-3 text-gray-500" />
                                )}
                                <span className="text-xs text-gray-500 capitalize">
                                  {bank.type}
                                </span>
                                {bank.popular && (
                                  <Badge variant="secondary">Popular</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {bank.cardTypes.map((cardType) => (
                              <Badge
                                key={cardType}
                                variant="outline"
                                className="text-xs"
                              >
                                {cardType}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {filteredBanks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No banks found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Card Details Step */}
            {currentStep === "card-details" && selectedBank && (
              <div className="space-y-6 flex flex-col h-full">
                <div className="flex-1 space-y-6 overflow-y-auto">
                  {/* Selected Bank Info */}
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{selectedBank.logo}</div>
                        <div>
                          <h3 className="font-medium">{selectedBank.name}</h3>
                          <p className="text-sm text-gray-600">
                            Selected Payment Method
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Card Type Selection */}
                  {selectedBank.type === "bank" && (
                    <div>
                      <label className="block text-sm font-medium mb-3">
                        Card Type *
                      </label>
                      <div className="flex gap-4">
                        {selectedBank.cardTypes.map((cardType) => (
                          <label
                            key={cardType}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="cardType"
                              value={cardType}
                              checked={cardDetails.cardType === cardType}
                              onChange={(e) =>
                                setCardDetails((prev) => ({
                                  ...prev,
                                  cardType: e.target.value,
                                }))
                              }
                              className="w-4 h-4"
                            />
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              <span>{cardType}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Card Details Form */}
                  {selectedBank.type === "bank" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Card Number *
                        </label>
                        <Input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardDetails.cardNumber}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .replace(/(\d{4})(?=\d)/g, "$1 ");
                            if (value.length <= 19) {
                              setCardDetails((prev) => ({
                                ...prev,
                                cardNumber: value,
                              }));
                            }
                          }}
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Expiry Month *
                          </label>
                          <select
                            value={cardDetails.expiryMonth}
                            onChange={(e) =>
                              setCardDetails((prev) => ({
                                ...prev,
                                expiryMonth: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Month</option>
                            {Array.from({ length: 12 }, (_, i) => (
                              <option
                                key={i + 1}
                                value={String(i + 1).padStart(2, "0")}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Expiry Year *
                          </label>
                          <select
                            value={cardDetails.expiryYear}
                            onChange={(e) =>
                              setCardDetails((prev) => ({
                                ...prev,
                                expiryYear: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Year</option>
                            {Array.from({ length: 10 }, (_, i) => {
                              const year = new Date().getFullYear() + i;
                              return (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            CVV *
                          </label>
                          <Input
                            type="text"
                            placeholder="123"
                            value={cardDetails.cvv}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              if (value.length <= 4) {
                                setCardDetails((prev) => ({
                                  ...prev,
                                  cvv: value,
                                }));
                              }
                            }}
                            maxLength={4}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            3 or 4 digit number on the back of your card
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phone Number *
                    </label>
                    <Input
                      type="tel"
                      placeholder="03xxxxxxxxx"
                      value={cardDetails.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 11) {
                          setCardDetails((prev) => ({
                            ...prev,
                            phoneNumber: value,
                          }));
                        }
                      }}
                      maxLength={11}
                    />
                    <p className="text-xs text-green-600 mt-1">
                      📱 Real SMS will be sent to this number
                    </p>
                  </div>
                </div>
                {/* Sticky Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t bg-white sticky bottom-0">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 bg-transparent"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCardDetailsSubmit}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? "Processing..." : "Send OTP"}
                  </Button>
                </div>
              </div>
            )}

            {/* OTP Verification Step */}
            {currentStep === "otp-verification" && (
              <div className="space-y-6 text-center">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    Verify Your Phone Number
                  </h3>
                  <p className="text-gray-600">
                    We've sent a 6-digit OTP via SMS to{" "}
                    <strong>{cardDetails.phoneNumber}</strong>
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    📱 Check your phone messages for the OTP code
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Enter OTP from SMS
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 6) {
                        setOtp(value);
                        setOtpError(""); // Clear error when user types
                      }
                    }}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  {otpError && (
                    <p className="text-red-500 text-sm mt-2">{otpError}</p>
                  )}
                </div>
                {otpTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend OTP in {Math.floor(otpTimer / 60)}:
                    {(otpTimer % 60).toString().padStart(2, "0")}
                  </p>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    className="text-green-600"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Sending..." : "Resend OTP"}
                  </Button>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 bg-transparent"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleOtpVerification}
                    disabled={isProcessing || otp.length !== 6}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? "Verifying..." : "Verify & Pay"}
                  </Button>
                </div>
              </div>
            )}

            {/* Success Step */}
            {currentStep === "success" && (
              <div className="space-y-6 text-center">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    Payment Successful!
                  </h3>
                  <p className="text-gray-600">
                    Your donation has been processed successfully.
                  </p>
                </div>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">
                          Rs. {amount && amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Method:</span>
                        <span className="font-medium">
                          {selectedBank && selectedBank.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction ID:</span>
                        <span className="font-medium">TXN{Date.now()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-80 bg-gray-50 p-6 border-l overflow-y-auto space-y-6">
            {" "}
            {/* Added space-y-6 for gap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Donation Amount</span>
                    <span className="text-xl font-bold">
                      Rs. {amount && amount.toLocaleString()}
                    </span>
                  </div>
                  {selectedBank && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">
                        Payment Method
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{selectedBank.logo}</span>
                        <span className="text-sm font-medium">
                          {selectedBank.name}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span>Secure Payment</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Your payment information is encrypted and secure
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Transferred To Box */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transferred To</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOrphanage ? (
                  <div className="text-center text-gray-500">
                    Loading orphanage details...
                  </div>
                ) : orphanageDetails ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Account Title
                      </p>
                      <p className="text-base font-medium text-gray-800">
                        {orphanageDetails.orgName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Account Number
                      </p>
                      <p className="text-base font-medium text-gray-800">
                        {formatBankAccountForDisplay(
                          orphanageDetails.bankAccount
                        ) || "N/A"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-red-500">
                    Orphanage details not found.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced portal rendering with additional safety checks
  return typeof window !== "undefined" && document.body
    ? createPortal(modalContent, document.body)
    : null;
}
