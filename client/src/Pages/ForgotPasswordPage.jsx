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
      toast.success("OTP sent! Check your inbox.", { id: toastId });
      setOtp(["", "", "", "", "", ""]);
      setStep(2);
      startTimer();
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
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

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
      const message = err.response?.data?.message || "Failed to reset password.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const timerProgress = step === 2 ? secondsLeft / OTP_DURATION_SECONDS : 0;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 sm:p-6 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-200/40 to-teal-200/30 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-full blur-[140px] pointer-events-none" />

      <Toaster position="bottom-right" />
      
      {/* Top back button */}
      <div className="absolute top-5 left-5 z-50">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-150 cursor-pointer shadow-sm"
          onClick={() => navigate("/user/login")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Login
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col backdrop-blur-sm">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-center gap-2 mb-7">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 ${
            step > 1 ? "bg-emerald-600 text-white" : step === 1 ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
          }`}>
            {step > 1 ? "✓" : "1"}
          </div>
          <div className={`w-12 h-0.5 rounded-full transition-all duration-200 ${step > 1 ? "bg-emerald-600" : "bg-slate-200 dark:bg-zinc-800"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 ${
            step > 2 ? "bg-emerald-600 text-white" : step === 2 ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
          }`}>
            {step > 2 ? "✓" : "2"}
          </div>
          <div className={`w-12 h-0.5 rounded-full transition-all duration-200 ${step > 2 ? "bg-emerald-600" : "bg-slate-200 dark:bg-zinc-800"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 ${
            step > 3 ? "bg-emerald-600 text-white" : step === 3 ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
          }`}>
            {step > 3 ? "✓" : "3"}
          </div>
        </div>

        {/* === Step 1: Email === */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0 mb-1">Reset Password</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Enter your account email to receive a verification code</p>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSendOTP}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="forgotEmail" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  id="forgotEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          </>
        )}

        {/* === Step 2: OTP === */}
        {step === 2 && (
          <>
            <div className="text-center mb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0 mb-1">Enter Verification Code</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Sent to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>
              </p>
            </div>

            {/* Countdown timer ring */}
            <div className="flex flex-col items-center my-3 relative">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
                <circle
                  className="fill-none stroke-slate-100 dark:stroke-zinc-800 stroke-[4px]"
                  cx="40"
                  cy="40"
                  r="35"
                />
                <circle
                  className="fill-none stroke-emerald-500 stroke-[4px] stroke-linecap-round stroke-dasharray-[220] transition-all duration-1000 ease-linear"
                  cx="40"
                  cy="40"
                  r="35"
                  style={{
                    strokeDashoffset: `${220 - 220 * timerProgress}`,
                  }}
                />
              </svg>
              <span
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-xs ${timerExpired ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}
              >
                {timerExpired ? "Expired" : formatTime(secondsLeft)}
              </span>
            </div>

            {/* OTP Inputs */}
            <form className="flex gap-2 justify-center my-4" onSubmit={handleVerifyOTP}>
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
                  className="w-10 h-12 text-center text-lg font-bold border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white outline-none transition-all duration-150 focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                />
              ))}
            </form>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={isLoading || timerExpired || otp.join("").length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading || (!timerExpired && secondsLeft > 0)}
                className="w-full py-2.5 bg-transparent border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? "Sending..." : "Resend Verification Code"}
              </button>
            </div>
          </>
        )}

        {/* === Step 3: New Password === */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0 mb-1">Set New Password</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Create a strong new password for your account</p>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newResetPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                <div className="relative flex items-center">
                  <input
                    id="newResetPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    disabled={isLoading}
                    autoFocus
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute right-3 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 flex items-center justify-center transition-colors"
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmResetPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm Password</label>
                <div className="relative flex items-center">
                  <input
                    id="confirmResetPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 flex items-center justify-center transition-colors"
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {/* === Step 4: Success === */}
        {step === 4 && (
          <div className="text-center py-4 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-4 shadow-sm">
              ✓
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">Password Reset Complete</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">Your password has been successfully updated. You can now log in.</p>
            <button
              type="button"
              onClick={() => navigate("/user/login")}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
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
