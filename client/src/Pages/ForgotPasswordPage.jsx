// client/src/Pages/ForgotPasswordPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const OTP_DURATION_SECONDS = 120; // 2 minutes

const ForgotPasswordPage = ({ navigate, apiBaseUrl = "" }) => {
  // Steps: 1 = email, 2 = otp, 3 = new password, 4 = success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const timerRef = useRef(null);
  const otpRefs = useRef([]);

  // Timer logic
  const startTimer = useCallback(() => {
    setSecondsLeft(OTP_DURATION_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const timerExpired = secondsLeft === 0 && step === 2;

  // --- Step 1: Send OTP ---
  const handleSendOTP = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Sending OTP...");

    try {
      await axios.post(`${apiBaseUrl}/api/auth/forgot-password`, {
        email: trimmed,
      });
      toast.success("OTP sent! Check your email.", { id: toastId });
      setOtp(["", "", "", "", "", ""]);
      setStep(2);
      startTimer();
      // Focus first OTP input after render
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to send OTP.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Resend OTP ---
  const handleResendOTP = async () => {
    setOtp(["", "", "", "", "", ""]);
    await handleSendOTP();
  };

  // --- OTP input handlers ---
  const handleOtpChange = (index, value) => {
    // Allow only single alphanumeric character
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto-focus next input
    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || "";
      }
      setOtp(newOtp);
      // Focus the last filled or the next empty
      const focusIdx = Math.min(pasted.length, 5);
      otpRefs.current[focusIdx]?.focus();
    }
  };

  // --- Step 2: Verify OTP ---
  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the full 6-character OTP.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Verifying OTP...");

    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/verify-otp`, {
        email: email.trim(),
        otp: otpString,
      });
      toast.success("OTP verified!", { id: toastId });
      setResetToken(response.data.resetToken);
      if (timerRef.current) clearInterval(timerRef.current);
      setStep(3);
    } catch (err) {
      const message = err.response?.data?.message || "OTP verification failed.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 3: Reset Password ---
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Resetting password...");

    try {
      await axios.post(`${apiBaseUrl}/api/auth/reset-password`, {
        email: email.trim(),
        resetToken,
        newPassword,
      });
      toast.success("Password reset successfully!", { id: toastId });
      setStep(4);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to reset password.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Timer progress for visual ring
  const timerProgress =
    step === 2 ? secondsLeft / OTP_DURATION_SECONDS : 0;

  return (
    <div className="App login-screen">
      <Toaster position="bottom-right" />
      <div className="floating-action-bar">
        <button
          type="button"
          className="action-button secondary"
          onClick={() => navigate("/user/login")}
        >
          Back to Login
        </button>
      </div>

      <div className="login-card forgot-password-card">
        {/* Step indicators */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
            {step > 1 ? "✓" : "1"}
          </div>
          <div className={`step-line ${step > 1 ? "active" : ""}`} />
          <div className={`step-dot ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
            {step > 2 ? "✓" : "2"}
          </div>
          <div className={`step-line ${step > 2 ? "active" : ""}`} />
          <div className={`step-dot ${step >= 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}>
            {step > 3 ? "✓" : "3"}
          </div>
        </div>

        {/* === Step 1: Email === */}
        {step === 1 && (
          <>
            <h1>Reset Password</h1>
            <p>Enter your email to receive a one-time password (OTP).</p>
            <form className="login-form" onSubmit={handleSendOTP}>
              <label htmlFor="forgotEmail">Email Address</label>
              <input
                id="forgotEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          </>
        )}

        {/* === Step 2: OTP === */}
        {step === 2 && (
          <>
            <h1>Enter OTP</h1>
            <p>
              A 6-character OTP was sent to <strong>{email}</strong>
            </p>

            {/* Timer */}
            <div className="otp-timer-wrapper">
              <svg className="otp-timer-ring" viewBox="0 0 80 80">
                <circle
                  className="otp-timer-bg"
                  cx="40"
                  cy="40"
                  r="35"
                />
                <circle
                  className="otp-timer-progress"
                  cx="40"
                  cy="40"
                  r="35"
                  style={{
                    strokeDashoffset: `${220 - 220 * timerProgress}`,
                  }}
                />
              </svg>
              <span
                className={`otp-timer-text ${timerExpired ? "expired" : ""}`}
              >
                {timerExpired ? "Expired" : formatTime(secondsLeft)}
              </span>
            </div>

            {/* OTP Inputs */}
            <form
              className="otp-input-group"
              onSubmit={handleVerifyOTP}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  disabled={isLoading || timerExpired}
                  autoComplete="one-time-code"
                />
              ))}
            </form>

            <div className="otp-actions">
              <button
                type="button"
                className="login-button"
                onClick={handleVerifyOTP}
                disabled={isLoading || timerExpired || otp.join("").length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResendOTP}
                disabled={isLoading || (!timerExpired && secondsLeft > 0)}
              >
                {isLoading ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          </>
        )}

        {/* === Step 3: New Password === */}
        {step === 3 && (
          <>
            <h1>Set New Password</h1>
            <p>Enter your new password below.</p>
            <form className="login-form" onSubmit={handleResetPassword}>
              <label htmlFor="newResetPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="newResetPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                >
                  {showNewPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <label htmlFor="confirmResetPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmResetPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {/* === Step 4: Success === */}
        {step === 4 && (
          <div className="reset-success">
            <div className="success-icon">✅</div>
            <h1>Password Reset!</h1>
            <p>Your password has been updated. You can now log in.</p>
            <button
              type="button"
              className="login-button"
              onClick={() => navigate("/user/login")}
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
