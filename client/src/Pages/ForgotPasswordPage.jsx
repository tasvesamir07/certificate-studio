// client/src/Pages/ForgotPasswordPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { buildApiUrl } from "../utils/api";

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
    const forgotPasswordUrl = buildApiUrl(apiBaseUrl, "api/auth/forgot-password");

    try {
      await axios.post(forgotPasswordUrl, {
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
      const verifyOtpUrl = buildApiUrl(apiBaseUrl, "api/auth/verify-otp");

      const response = await axios.post(verifyOtpUrl, {
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
      const resetPasswordUrl = buildApiUrl(apiBaseUrl, "api/auth/reset-password");

      await axios.post(resetPasswordUrl, {
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
    <div className="w-full min-h-screen flex items-center justify-center bg-bg-primary p-6 box-border font-sans relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />
      
      <Toaster position="bottom-right" />
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border-light rounded-lg bg-bg-elevated text-text-secondary text-sm font-semibold hover:bg-bg-surface hover:text-text-primary hover:border-accent/40 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          onClick={() => navigate("/user/login")}
        >
          Back to Login
        </button>
      </div>

      <div className="relative z-10 bg-bg-surface/80 backdrop-blur-xl border border-border-custom rounded-2xl p-8 md:p-10 max-w-[420px] w-full shadow-2xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.15)] hover:border-accent/30">
        <div className="absolute top-0 inset-x-0 h-1 border-b border-hairline" />
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0 mb-6">
          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-200 ${
            step > 1 ? "bg-success text-bg-primary" : step >= 1 ? "bg-accent text-bg-primary" : "bg-bg-elevated text-text-muted"
          }`}>
            {step > 1 ? "✓" : "1"}
          </div>
          <div className={`w-10 h-0.5 rounded-[2px] transition-all duration-200 ${step > 1 ? "bg-accent" : "bg-border-light"}`} />
          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-200 ${
            step > 2 ? "bg-success text-bg-primary" : step >= 2 ? "bg-accent text-bg-primary" : "bg-bg-elevated text-text-muted"
          }`}>
            {step > 2 ? "✓" : "2"}
          </div>
          <div className={`w-10 h-0.5 rounded-[2px] transition-all duration-200 ${step > 2 ? "bg-accent" : "bg-border-light"}`} />
          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-200 ${
            step > 3 ? "bg-success text-bg-primary" : step >= 3 ? "bg-accent text-bg-primary" : "bg-bg-elevated text-text-muted"
          }`}>
            {step > 3 ? "✓" : "3"}
          </div>
        </div>

        {/* === Step 1: Email === */}
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold text-text-primary text-center m-0 mb-2">Reset Password</h1>
            <p className="text-sm text-text-secondary text-center m-0 mb-6">Enter your email to receive a one-time password (OTP).</p>
            <form className="grid gap-4" onSubmit={handleSendOTP}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="forgotEmail" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email Address</label>
                <input
                  id="forgotEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-accent text-black font-bold uppercase tracking-[1.5px] text-xs rounded-full hover:scale-[1.02] hover:bg-accent-hover active:scale-100 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          </>
        )}

        {/* === Step 2: OTP === */}
        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-text-primary text-center m-0 mb-2">Enter OTP</h1>
            <p className="text-sm text-text-secondary text-center m-0 mb-4">
              A 6-character OTP was sent to <strong className="text-text-primary">{email}</strong>
            </p>

            {/* Timer */}
            <div className="flex flex-col items-center my-5 relative">
              <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 80 80">
                <circle
                  className="fill-none stroke-border-light stroke-[4px]"
                  cx="40"
                  cy="40"
                  r="35"
                />
                <circle
                  className="fill-none stroke-accent stroke-[4px] stroke-linecap-round stroke-dasharray-[220] transition-all duration-1000 ease-linear"
                  cx="40"
                  cy="40"
                  r="35"
                  style={{
                    strokeDashoffset: `${220 - 220 * timerProgress}`,
                  }}
                />
              </svg>
              <span
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-base ${timerExpired ? "text-danger text-xs" : "text-accent"}`}
              >
                {timerExpired ? "Expired" : formatTime(secondsLeft)}
              </span>
            </div>

            {/* OTP Inputs */}
            <form
              className="flex gap-2 justify-center my-4"
              onSubmit={handleVerifyOTP}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  disabled={isLoading || timerExpired}
                  autoComplete="one-time-code"
                  className="w-11 h-[52px] text-center text-xl font-bold border border-border-light rounded-lg bg-bg-elevated text-text-primary outline-none transition-all duration-200 focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow disabled:opacity-50"
                />
              ))}
            </form>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={isLoading || timerExpired || otp.join("").length !== 6}
                className="w-full py-3 bg-accent text-black font-bold uppercase tracking-[1.5px] text-xs rounded-full hover:scale-[1.02] hover:bg-accent-hover active:scale-100 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading || (!timerExpired && secondsLeft > 0)}
                className="w-full py-2.5 bg-transparent border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:border-accent hover:text-accent transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          </>
        )}

        {/* === Step 3: New Password === */}
        {step === 3 && (
          <>
            <h1 className="text-xl font-bold text-text-primary text-center m-0 mb-2">Set New Password</h1>
            <p className="text-sm text-text-secondary text-center m-0 mb-6">Enter your new password below.</p>
            <form className="grid gap-4" onSubmit={handleResetPassword}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newResetPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">New Password</label>
                <div className="relative">
                  <input
                    id="newResetPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    disabled={isLoading}
                    autoFocus
                    className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md"
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmResetPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirmResetPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md"
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-accent text-black font-bold uppercase tracking-[1.5px] text-xs rounded-full hover:scale-[1.02] hover:bg-accent-hover active:scale-100 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {/* === Step 4: Success === */}
        {step === 4 && (
          <div className="text-center py-5 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center text-3xl mb-5">✅</div>
            <h1 className="text-xl font-bold text-text-primary mb-2">Password Reset!</h1>
            <p className="text-sm text-text-secondary mb-6">Your password has been updated. You can now log in.</p>
            <button
              type="button"
              onClick={() => navigate("/user/login")}
              className="w-full py-3 bg-accent text-black font-bold uppercase tracking-[1.5px] text-xs rounded-full hover:scale-[1.02] hover:bg-accent-hover active:scale-100 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
