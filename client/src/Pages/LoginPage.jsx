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
    <div style={{ marginTop: 8 }}>
      <div className="strength-bar-bg">
        <div className="strength-bar" style={{ width: `${score}%`, backgroundColor: barColor }} />
      </div>
      <div className="strength-badges-list">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <span key={rule.label} className={`strength-badge ${ok ? "ok" : ""}`}>
              {ok ? (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : "\u2022"} {rule.label}
            </span>
          );
        })}
      </div>
      {label && <span style={{ fontSize: 11, color: barColor, marginTop: 4, display: "block" }}>{label}</span>}
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
    <div className="login-page">
      <Toaster position="bottom-right" />
      <div className="login-card-container">
        <div className="login-tabs">
          <button type="button" className={`login-tab-btn ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>Login</button>
          <button type="button" className={`login-tab-btn ${tab === "signup" ? "active" : ""}`} onClick={() => { setTab("signup"); setError(""); }}>Sign Up</button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="login-form-container">
            <div className="login-field-group">
              <label htmlFor="loginEmail">Email</label>
              <input id="loginEmail" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required disabled={isLoading}
                className="custom-input" />
            </div>
            <div className="login-field-group">
              <label htmlFor="loginPassword">Password</label>
              <div style={{ position: "relative" }}>
                <input id="loginPassword" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" required disabled={isLoading}
                  className="custom-input" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
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
            {error && <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={isLoading} className="login-button">
              {isLoading ? "Logging In..." : "Login"}
            </button>
            <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              Forgot your password?{" "}
              <button type="button" onClick={() => navigate("/forgot-password")}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: 0, textDecoration: "underline" }}>
                Reset it here
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="login-form-container">
            <div className="login-field-group">
              <label htmlFor="signupName">Display Name</label>
              <input id="signupName" type="text" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name" required disabled={isLoading}
                className="custom-input" />
            </div>
            <div className="login-field-group">
              <label htmlFor="signupEmail">Email</label>
              <input id="signupEmail" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required disabled={isLoading}
                className="custom-input" />
            </div>
            <div className="login-field-group">
              <label htmlFor="signupPassword">Password</label>
              <div style={{ position: "relative" }}>
                <input id="signupPassword" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" required disabled={isLoading}
                  className="custom-input" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
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
            <div className="login-field-group">
              <label htmlFor="signupConfirm">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input id="signupConfirm" type={showPassword ? "text" : "password"} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password" required disabled={isLoading}
                  className="custom-input"
                  style={{
                    paddingRight: 44,
                    borderColor: confirmPassword && password !== confirmPassword ? "var(--danger)" : ""
                  }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
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
            {error && <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={isLoading || !allRulesPass} className="login-button">
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
