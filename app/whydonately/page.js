"use client";
import React from "react";

export default function WhyDonatelySection() {
  const features = [
    {
      icon: "📝", // Replace with actual SVG or icon
      title: "Provision of Essential Goods",
      description:
        "Ensure orphanages receive daily necessities such as food, and other essential supplies to support the basic needs of children.",
    },
    {
      icon: "🏷️", // Replace with actual SVG or icon
      title: "Empowering Orphanages to Communicate Needs",
      description:
        "Provide a dedicated platform where orphanages can clearly list their specific needs, allowing donors to offer targeted, meaningful, and timely support.",
    },
    {
      icon: "🔒", // Replace with actual SVG or icon
      title: "Safe and secure",
      description:
        "Employ robust encryption for sensitive data, implement multi-factor authentication, and conduct regular security audits. Ensure compliance with data protection laws such as GDPR or local equivalents.",
    },
    {
      icon: "💬", // Replace with actual SVG or icon
      title: "Support",
      description:
        "Provide a responsive, intuitive UI with regular updates and support channels.",
    },
  ];

  return (
    <section className="bg-white py-16 ml-8 mr-8">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">
          Why CareConnect?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-150 p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl text-green-600 mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-center">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
