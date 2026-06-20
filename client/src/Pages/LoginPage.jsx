import React, { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";
import { buildApiUrl } from "../utils/api";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
  { label: "One special character", test: (p) => /[\W_]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }) => {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const score = password.length === 0 ? 0 : Math.round((passed / PASSWORD_RULES.length) * 100);
  const hasValue = password.length > 0;

  let barColor = "var(--border-light)";
  let label = "";
  if (score > 0 && score <= 20) { barColor = "var(--danger)"; label = "Weak"; }
  else if (score <= 40) { barColor = "var(--accent)"; label = "Fair"; }
  else if (score <= 60) { barColor = "var(--accent)"; label = "Good"; }
  else if (score <= 80) { barColor = "var(--accent)"; label = "Strong"; }
  else if (score === 100) { barColor = "var(--accent)"; label = "Very strong"; }

  if (!hasValue) return null;

  return (
    <div className="mt-2">
      <div className="h-[4px] bg-border-light rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300 ease-in-out" style={{ width: `${score}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex gap-1.5 flex-wrap mt-2.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <span key={rule.label} className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-200 inline-flex items-center gap-1 ${
              ok ? "bg-success/15 border-success/30 text-success" : "bg-bg-elevated border-border-light text-text-muted"
            }`}>
              {ok ? (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : "\u2022"} {rule.label}
            </span>
          );
        })}
      </div>
      {label && <span style={{ fontSize: 11, color: barColor, marginTop: 4, display: "block" }} className="font-semibold">{label}</span>}
    </div>
  );
};

const LoginPage = ({ defaultEmail = "", onSuccess, apiBaseUrl, navigate }) => {
  const [tab, setTab] = useState("signup");
  const [email, setEmail] = useState(defaultEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail || "");
  }, [defaultEmail]);

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

    setIsLoading(true);
    const toastId = toast.loading("Verifying credentials...");

    try {
      const response = await axios.post(buildApiUrl(apiBaseUrl, "api/auth/login"), {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const { sessionToken, id } = response.data;
      setError("");
      toast.success("Login successful!", { id: toastId });
      onSuccess?.({ email: trimmedEmail, code: sessionToken, id });
    } catch (err) {
      const message = err.response?.data?.message || "Login failed.";
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !password || !trimmedName) {
      setError("All fields are required.");
      toast.error("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    if (!allRulesPass) {
      setError("Please meet all password requirements.");
      toast.error("Please meet all password requirements.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Creating your account...");

    try {
      await axios.post(buildApiUrl(apiBaseUrl, "api/auth/signup"), {
        email: trimmedEmail,
        password,
        displayName: trimmedName,
      });

      toast.success("Account created! You can now log in.", { id: toastId });
      setTab("login");
      setPassword("");
      setConfirmPassword("");
      setDisplayName("");
    } catch (err) {
      const message = err.response?.data?.message || "Signup failed.";
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-bg-primary p-6 box-border font-sans relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />
      
      <Toaster position="bottom-right" />
      
      <div className="relative z-10 w-full max-w-[440px] bg-bg-surface/80 backdrop-blur-xl border border-border-custom rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.15)] hover:border-accent/30">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent rounded-t-2xl" />
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mb-3 animate-pulse">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 11 11 13 15 9"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Certificate Studio</h1>
          <p className="text-xs text-text-secondary mt-1 text-center">Design, verify, and email professional credentials</p>
        </div>

        {/* Tab switchers */}
        <div className="flex mb-6 bg-bg-elevated rounded-xl p-1 gap-1 border border-border-light">
          <button 
            type="button" 
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg cursor-pointer transition-all duration-200 ${
              tab === "login" 
                ? "bg-bg-surface text-text-primary shadow-sm border border-border-light" 
                : "text-text-muted hover:text-text-primary"
            }`} 
            onClick={() => { setTab("login"); setError(""); }}
          >
            Login
          </button>
          <button 
            type="button" 
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg cursor-pointer transition-all duration-200 ${
              tab === "signup" 
                ? "bg-bg-surface text-text-primary shadow-sm border border-border-light" 
                : "text-text-muted hover:text-text-primary"
            }`} 
            onClick={() => { setTab("signup"); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loginEmail" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email</label>
              <input 
                id="loginEmail" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" 
                required 
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loginPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Password</label>
              <div className="relative">
                <input 
                  id="loginPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" 
                  required 
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md hover:bg-accent-subtle"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-danger m-0 text-[13px]">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white font-bold rounded-xl shadow-lg hover:shadow-accent/25 uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? "Logging In..." : "Login"}
            </button>
            <p className="mt-1 text-center text-[13px] text-text-muted">
              Forgot your password?{" "}
              <button 
                type="button" 
                onClick={() => navigate("/forgot-password")}
                className="bg-transparent border-none text-accent cursor-pointer text-[13px] font-bold p-0 underline hover:text-accent-hover"
              >
                Reset it here
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupName" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Display Name</label>
              <input 
                id="signupName" 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name" 
                required 
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupEmail" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email</label>
              <input 
                id="signupEmail" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" 
                required 
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Password</label>
              <div className="relative">
                <input 
                  id="signupPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" 
                  required 
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md hover:bg-accent-subtle"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupConfirm" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Confirm Password</label>
              <div className="relative">
                <input 
                  id="signupConfirm" 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password" 
                  required 
                  disabled={isLoading}
                  className={`w-full px-3.5 py-2.5 border rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11 ${
                    confirmPassword && password !== confirmPassword ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border-light focus:border-accent"
                  }`} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md hover:bg-accent-subtle"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-danger m-0 text-[13px]">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading || !allRulesPass} 
              className="w-full py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white font-bold rounded-xl shadow-lg hover:shadow-accent/25 uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
