// client/src/Pages/PricingPage.jsx
import React, { useEffect, useState } from "react";

const PricingPage = ({ navigate }) => {
  const plans = [
    {
      title: "Standard Access (1 Month)",
      price: "50 TK",
      amount: 50,
      days: 30,
      accent: "#667eea",
      bg: "rgba(102, 126, 234, 0.05)",
      bullets: [
        "Unlimited Certificate Generation.",
        "Unlimited Email Sends.",
        "Access is valid for 1 month from the purchase date.",
      ],
      buttonBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      title: "3-Month Access",
      price: "120 TK",
      amount: 120,
      days: 90,
      accent: "#fb923c",
      bg: "rgba(251, 146, 60, 0.08)",
      bullets: [
        "Unlimited Certificate Generation.",
        "Unlimited Email Sends.",
        "Access is valid for 3 months from the purchase date.",
      ],
      buttonBg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    },
    {
      title: "6-Month Access",
      price: "220 TK",
      amount: 220,
      days: 180,
      accent: "#22c55e",
      bg: "rgba(34, 197, 94, 0.08)",
      bullets: [
        "Unlimited Certificate Generation.",
        "Unlimited Email Sends.",
        "Access is valid for 6 months from the purchase date.",
      ],
      buttonBg: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    },
    {
      title: "1-Year Access",
      price: "400 TK",
      amount: 400,
      days: 365,
      accent: "#a855f7",
      bg: "rgba(168, 85, 247, 0.08)",
      bullets: [
        "Unlimited Certificate Generation.",
        "Unlimited Email Sends.",
        "Access is valid for 12 months from the purchase date.",
      ],
      buttonBg: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    },
  ];
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    if (status === "failed") {
      setBanner("Payment failed or was cancelled. Please try again.");
    }
  }, []);

  return (
    <div className="profile-page">
      <div className="floating-action-bar">
        <button
          type="button"
          className="action-button"
          onClick={() => navigate("/user/login")}
        >
          Login
        </button>
      </div>
      <div className="pricing-card">
        {banner && <p className="payment-banner error">{banner}</p>}
        <h2>Pricing & Purchase</h2>
        <p className="profile-note">
          Purchase access to generate and send personalized certificates. Once
          payment is verified, a unique link will be emailed to you for instant
          access.
        </p>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.title}
              className="plan-card"
              style={{
                border: `1px solid ${plan.accent}`,
                background: plan.bg,
              }}
            >
              <h3 style={{ color: plan.accent }}>
                {plan.title}
              </h3>
              <p className="price">
                {plan.price}
              </p>
              <ul>
                {plan.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                className="purchase-btn"
                style={{
                  background: plan.buttonBg,
                }}
                onClick={() =>
                  navigate(
                    `/pricing/generate-password?amount=${
                      plan.amount
                    }&days=${plan.days}&plan=${encodeURIComponent(plan.title)}`
                  )
                }
              >
                Continue to Purchase
              </button>
            </div>
          ))}
        </div>

        <p className="profile-note">
          Note: This is a simulation. The "Continue to Purchase" button will
          take you to a page to enter your email for simulated payment/access
          verification.
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
