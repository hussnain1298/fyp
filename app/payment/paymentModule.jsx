"use client";
import React from "react";
import { useState } from "react";
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
    cardTypes: ["Visa", "Mastercard"],
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

export default function PaymentModule({
  isOpen,
  onClose,
  amount,
  onPaymentSuccess,
}) {
  const [currentStep, setCurrentStep] = useState("bank-selection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [filteredBanks, setFilteredBanks] = useState(pakistaniBanks);

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
    // Simulate OTP sending
    setTimeout(() => {
      setOtpSent(true);
      setOtpTimer(120); // 2 minutes
      setCurrentStep("otp-verification");
      setIsProcessing(false);
      alert(`OTP sent to ${cardDetails.phoneNumber}`);
    }, 2000);
  };

  const handleOtpVerification = async () => {
    if (!otp || otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }

    setIsProcessing(true);
    // Simulate OTP verification
    setTimeout(() => {
      setCurrentStep("success");
      setIsProcessing(false);
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
    }, 2000);
  };

  const handleResendOtp = () => {
    setOtpTimer(120);
    alert(`OTP resent to ${cardDetails.phoneNumber}`);
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
    setFilteredBanks(pakistaniBanks); // Reset filtered banks too

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
      setFilteredBanks(pakistaniBanks);
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
          maxHeight: "85vh", // Reduced from 90vh to 85vh
          margin: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* All your existing modal content remains the same */}
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
            {/* All your existing step content remains exactly the same */}
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
                    <p className="text-xs text-gray-500 mt-1">
                      OTP will be sent to this number
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
                    We've sent a 6-digit OTP to{" "}
                    <strong>{cardDetails.phoneNumber}</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Enter OTP
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 6) {
                        setOtp(value);
                      }
                    }}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
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
                  >
                    Resend OTP
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
          <div className="w-80 bg-gray-50 p-6 border-l overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Donataion</CardTitle>
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
