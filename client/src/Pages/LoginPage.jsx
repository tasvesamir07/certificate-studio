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

  let barColor = "#1f1f1f";
  let label = "";
  if (score > 0 && score <= 20) { barColor = "#f3727f"; label = "Weak"; }
  else if (score <= 40) { barColor = "#ffa42b"; label = "Fair"; }
  else if (score <= 60) { barColor = "#ffa42b"; label = "Good"; }
  else if (score <= 80) { barColor = "#1ed760"; label = "Strong"; }
  else if (score === 100) { barColor = "#1ed760"; label = "Very strong"; }

  if (!hasValue) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 4, background: "#1f1f1f", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 2, transition: "all 0.3s" }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <span key={rule.label} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 999,
              background: ok ? "rgba(30, 215, 96, 0.15)" : "#1f1f1f",
              color: ok ? "#1ed760" : "#b3b3b3",
              transition: "all 0.2s",
            }}>
              {ok ? "\u2713" : "\u2022"} {rule.label}
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

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 999, border: "none",
    background: "#1f1f1f", color: "#fff", fontSize: 14, outline: "none",
    boxSizing: "border-box", transition: "all 0.2s",
    boxShadow: "rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset",
  };

  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#b3b3b3", textTransform: "uppercase", letterSpacing: "1.4px", marginBottom: 6, display: "block" };

  const btnStyle = {
    width: "100%", padding: "12px 32px", border: "none", borderRadius: 999,
    background: "#1ed760", color: "#000", fontWeight: 700, fontSize: 14,
    textTransform: "uppercase", letterSpacing: "1.4px", cursor: isLoading ? "not-allowed" : "pointer",
    opacity: isLoading ? 0.6 : 1, transition: "all 0.2s", marginTop: 8,
  };

  const tabStyle = (isActive) => ({
    flex: 1, padding: "10px 0", border: "none", borderRadius: 999,
    background: isActive ? "#1f1f1f" : "transparent",
    color: isActive ? "#fff" : "#b3b3b3",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
    textTransform: "uppercase", letterSpacing: "1.4px",
    transition: "all 0.2s",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", width: "100%", padding: 24,
      background: "#121212", position: "relative", boxSizing: "border-box",
    }}>
      <Toaster position="bottom-right" />
      <div style={{
        background: "#181818", borderRadius: 8, padding: 32,
        maxWidth: 420, width: "100%", boxShadow: "rgba(0,0,0,0.5) 0px 8px 24px",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", gap: 4, background: "#121212", borderRadius: 999, padding: 4, marginBottom: 24 }}>
          <button type="button" style={tabStyle(tab === "login")} onClick={() => { setTab("login"); setError(""); }}>Login</button>
          <button type="button" style={tabStyle(tab === "signup")} onClick={() => { setTab("signup"); setError(""); }}>Sign Up</button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="loginEmail" style={labelStyle}>Email</label>
              <input id="loginEmail" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required disabled={isLoading}
                style={inputStyle} />
            </div>
            <div>
              <label htmlFor="loginPassword" style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input id="loginPassword" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" required disabled={isLoading}
                  style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#b3b3b3", fontSize: 16, padding: 4 }}>
                  {showPassword ? "\u{1F648}" : "\u{1F441}"}
                </button>
              </div>
            </div>
            {error && <p style={{ color: "#f3727f", margin: 0, fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={isLoading} style={btnStyle}>
              {isLoading ? "Logging In..." : "Login"}
            </button>
            <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: 13, color: "#b3b3b3" }}>
              Forgot your password?{" "}
              <button type="button" onClick={() => navigate("/forgot-password")}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: 0, textDecoration: "underline" }}>
                Reset it here
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="signupName" style={labelStyle}>Display Name</label>
              <input id="signupName" type="text" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name" required disabled={isLoading}
                style={inputStyle} />
            </div>
            <div>
              <label htmlFor="signupEmail" style={labelStyle}>Email</label>
              <input id="signupEmail" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required disabled={isLoading}
                style={inputStyle} />
            </div>
            <div>
              <label htmlFor="signupPassword" style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input id="signupPassword" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" required disabled={isLoading}
                  style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#b3b3b3", fontSize: 16, padding: 4 }}>
                  {showPassword ? "\u{1F648}" : "\u{1F441}"}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>
            <div>
              <label htmlFor="signupConfirm" style={labelStyle}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input id="signupConfirm" type={showPassword ? "text" : "password"} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password" required disabled={isLoading}
                  style={{
                    ...inputStyle, paddingRight: 44,
                    boxShadow: confirmPassword && password !== confirmPassword
                      ? "0 0 0 1px #f3727f"
                      : "rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset",
                  }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#b3b3b3", fontSize: 16, padding: 4 }}>
                  {showPassword ? "\u{1F648}" : "\u{1F441}"}
                </button>
              </div>
            </div>
            {error && <p style={{ color: "#f3727f", margin: 0, fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={isLoading || !allRulesPass} style={btnStyle}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
