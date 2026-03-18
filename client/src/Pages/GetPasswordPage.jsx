// client/src/Pages/GetPasswordPage.jsx
import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

const GetPasswordPage = ({ navigate, defaultEmail = "", apiBaseUrl }) => {
  const [email, setEmail] = useState(defaultEmail || "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(50);
  const [days, setDays] = useState(30);
  const [planLabel, setPlanLabel] = useState("1 Month");
  const [error, setError] = useState("");
  const [isPurchaseInitiated, setIsPurchaseInitiated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const amt = parseFloat(params.get("amount"));
    const d = parseInt(params.get("days"), 10);
    const plan = params.get("plan");
    if (!Number.isNaN(amt) && amt > 0) {
      setAmount(amt);
    }
    if (!Number.isNaN(d) && d > 0) {
      setDays(d);
    }
    if (plan) setPlanLabel(plan);
  }, []);

  const handleInitiatePurchase = async (event) => {
    event.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const numericAmount = Number(amount) || 50;

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!trimmedName) {
      setError("Please enter your name.");
      toast.error("Please enter your name.");
      return;
    }
    if (!trimmedPhone) {
      setError("Please enter your phone number.");
      toast.error("Please enter your phone number.");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(
      "Processing access request. Checking subscription status..."
    );

    try {
      const requestUrl = apiBaseUrl.replace(/\/+$/, "");
      const verifyUrl = requestUrl.endsWith("/api") 
        ? `${requestUrl}/auth/verify-purchase`.replace(/\/+/g, "/").replace(":/", "://")
        : `${requestUrl}/api/auth/verify-purchase`.replace(/\/+/g, "/").replace(":/", "://");

      const response = await axios.post(
        verifyUrl,
        {
          email: trimmedEmail,
          name: trimmedName,
          phone: trimmedPhone,
          totalAmount: numericAmount,
          days: days,
          planName: planLabel,
        }
      );

      const payload = response.data || {};

      if (payload.paymentUrl) {
        toast.success(
          payload.message ||
            "Redirecting to payment to complete your purchase.",
          { id: toastId }
        );
        window.location.href = payload.paymentUrl;
        return;
      }

      if (payload.status === "active") {
        // User is already active, direct them to login
        toast.success(
          payload.message || "You are already subscribed. Please log in.",
          { id: toastId }
        );
        setTimeout(() => navigate("/user/login"), 1000);
      } else if (payload.status === "payment_pending" && payload.paymentUrl) {
        toast.success(
          payload.message ||
            "Redirecting to payment to complete your purchase.",
          { id: toastId }
        );
        window.location.href = payload.paymentUrl;
      } else if (payload.status === "new_access" || response.status === 200) {
        setIsPurchaseInitiated(true);
        toast.success(
          payload.message ||
            "Account setup successful! Check your email for your temporary password.",
          { id: toastId }
        );
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to process request. Please check your email or try again.";
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isPurchaseInitiated) {
    return (
      <div className="App login-screen">
        <Toaster position="bottom-right" />
        <div className="login-card">
          <h1>Action Required</h1>
          <p>
            Your temporary password has been sent to <strong>{email}</strong>.
            Please check your inbox (and spam folder).
          </p>
          <button
            type="button"
            className="login-button"
            onClick={() => navigate("/user/login")}
            style={{
              marginTop: "20px",
              background: "linear-gradient(135deg, #6d28d9 0%, #3b82f6 100%)",
            }}
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App login-screen">
      <Toaster position="bottom-right" />
      <div className="login-card">
        <h1>Get Access / Renew Plan</h1>
        <p>
          Enter your email address below to simulate the purchase of a 30-day
          plan. You will receive a temporary password by email to log in.
        </p>
        <form className="login-form" onSubmit={handleInitiatePurchase}>
          <label>Selected Plan</label>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              marginBottom: "4px",
              fontWeight: "700",
            }}
          >
            {planLabel} — {amount} TK
          </div>
          <label htmlFor="accessName">Full Name</label>
          <input
            id="accessName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isProcessing}
          />
          <label htmlFor="accessPhone">Phone Number</label>
          <input
            id="accessPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={isProcessing}
          />
          <label htmlFor="accessEmail">Email Address</label>
          <input
            id="accessEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={isProcessing}
          />
          {error && <p className="login-error">{error}</p>}
          <button
            type="submit"
            className="login-button"
            disabled={isProcessing}
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            {isProcessing
              ? "Processing Request..."
              : "Simulate Purchase & Get Password"}
          </button>
        </form>
        <p
          className="login-hint"
          style={{ marginTop: "16px", textAlign: "center" }}
        >
          Already have a password?{" "}
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate("/user/login")}
            style={{ padding: "0", background: "none", color: "#6d28d9" }}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default GetPasswordPage;
