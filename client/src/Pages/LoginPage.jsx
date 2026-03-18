// client/src/Pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

const LoginPage = ({ defaultEmail = "", onSuccess, apiBaseUrl, navigate }) => {
  // ... (Your existing LoginPage.jsx code) ...
  const [email, setEmail] = useState(defaultEmail || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail || "");
  }, [defaultEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const paymentEmail = params.get("email");
    if (paymentStatus === "success") {
      const msg = paymentEmail
        ? `Payment successful! A temporary password was sent to ${paymentEmail}.`
        : "Payment successful! Check your email for the temporary password.";
      setPaymentMessage(msg);
      toast.success(msg);
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Enter your email and password.");
      toast.error("Enter your email and password.");
      return;
    }

    setIsLoggingIn(true);
    const toastId = toast.loading("Verifying credentials...");

    try {
      const requestUrl = apiBaseUrl.replace(/\/+$/, "");
      const loginUrl = requestUrl.endsWith("/api") 
        ? `${requestUrl}/auth/login`.replace(/\/+/g, "/").replace(":/", "://")
        : `${requestUrl}/api/auth/login`.replace(/\/+/g, "/").replace(":/", "://");

      const response = await axios.post(loginUrl, {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const { sessionToken } = response.data;

      setError("");
      toast.success("Login successful!", { id: toastId });
      onSuccess?.({ email: trimmedEmail, code: sessionToken });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Login failed. Please check your credentials or access status.";
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="App login-screen">
      <Toaster position="bottom-right" />
      <div className="floating-action-bar">
        <button
          type="button"
          className="action-button secondary"
          onClick={() => navigate("/pricing")}
        >
          Pricing
        </button>
      </div>
      <div className="login-card">
        {paymentMessage && (
          <p
            className="payment-banner success"
            style={{ marginBottom: "12px" }}
          >
            {paymentMessage}
          </p>
        )}
        <h1>Member Login</h1>
        <p>
          Use the credentials sent to your email after purchase to access the
          studio.
        </p>
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="loginEmail">Email</label>
          <input
            id="loginEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={isLoggingIn}
          />
          <label htmlFor="loginPassword">Password</label>
          <div className="password-input-wrapper">
            <input
              id="loginPassword"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isLoggingIn}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-button" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging In..." : "Login"}
          </button>
        </form>

        <p
          className="login-hint"
          style={{ marginTop: "12px", textAlign: "center" }}
        >
          Forgot your password?{" "}
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate("/forgot-password")}
            style={{ padding: "0", background: "none", color: "#6d28d9" }}
          >
            Reset it here
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
