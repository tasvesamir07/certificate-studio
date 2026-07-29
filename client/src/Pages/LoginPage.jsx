import React, { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";
import { buildApiUrl } from "../utils/api";

const PASSWORD_RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Number", test: (p) => /\d/.test(p) },
  { label: "Special symbol", test: (p) => /[\W_]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }) => {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const score = password.length === 0 ? 0 : Math.round((passed / PASSWORD_RULES.length) * 100);
  const hasValue = password.length > 0;

  if (!hasValue) return null;

  let colorClass = "bg-rose-500";
  let labelText = "Weak";
  if (score > 40 && score <= 80) {
    colorClass = "bg-amber-500";
    labelText = "Medium";
  } else if (score > 80) {
    colorClass = "bg-emerald-500";
    labelText = "Strong";
  }

  return (
    <div className="mt-2.5">
      <div className="flex justify-between items-center mb-1.5 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Password strength</span>
        <span className={`font-semibold ${score > 80 ? "text-emerald-600 dark:text-emerald-400" : score > 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
          {labelText}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex gap-1.5 flex-wrap mt-2.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <span key={rule.label} className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition-all duration-200 ${
              ok 
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300" 
                : "bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500"
            }`}>
              {ok ? "✓" : "•"} {rule.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const LoginPage = ({ defaultEmail = "", onSuccess, apiBaseUrl, navigate }) => {
  const [tab, setTab] = useState("login");
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
      toast.success("Welcome back!", { id: toastId });
      onSuccess?.({ email: trimmedEmail, code: sessionToken, id });
    } catch (err) {
      const message = err.response?.data?.message || "Invalid credentials.";
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

      toast.success("Account created successfully! Please log in.", { id: toastId });
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
    <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 sm:p-6 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Visual background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-200/40 to-teal-200/30 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-full blur-[140px] pointer-events-none" />

      <Toaster position="bottom-right" />
      
      <div className="relative z-10 w-full max-w-[440px] bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col backdrop-blur-sm">
        
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center mb-3">
            <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[14px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-600 dark:text-emerald-400 fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0">Certificate Studio</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center font-medium">Create, issue & verify official certificates</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-6 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800">
          <button 
            type="button" 
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 ${
              tab === "login" 
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-semibold" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`} 
            onClick={() => { setTab("login"); setError(""); }}
          >
            Log In
          </button>
          <button 
            type="button" 
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 ${
              tab === "signup" 
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-semibold" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`} 
            onClick={() => { setTab("signup"); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loginEmail" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input 
                id="loginEmail" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email" 
                required 
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="loginPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <button 
                  type="button" 
                  onClick={() => navigate("/forgot-password")}
                  className="bg-transparent border-none text-emerald-600 dark:text-emerald-400 cursor-pointer text-xs font-medium hover:underline p-0"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <input 
                  id="loginPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password" 
                  required 
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-11" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1 flex items-center justify-center rounded-lg"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading} 
              className="mt-1 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : "Log In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
              <input 
                id="signupName" 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name" 
                required 
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupEmail" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input 
                id="signupEmail" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email" 
                required 
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative flex items-center">
                <input 
                  id="signupPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  autoComplete="new-password" 
                  required 
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-11" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1 flex items-center justify-center rounded-lg"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signupConfirm" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm Password</label>
              <input 
                id="signupConfirm" 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password" 
                required 
                disabled={isLoading}
                className={`w-full px-3.5 py-2.5 border rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 text-slate-900 dark:text-white text-sm outline-none transition-all duration-150 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 ${
                  confirmPassword && password !== confirmPassword 
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" 
                    : "border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                }`} 
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading || !allRulesPass} 
              className="mt-1 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
