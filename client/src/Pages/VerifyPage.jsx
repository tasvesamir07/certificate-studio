import React, { useEffect, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const VerifyPage = ({ code, apiBaseUrl, navigate }) => {
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const fetchCert = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${apiBaseUrl}/api/verify/${code}`);
        setCert(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Certificate verification failed. The code may be invalid.");
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchCert();
    } else {
      setError("No verification code provided.");
      setLoading(false);
    }
  }, [code, apiBaseUrl]);

  const maskEmail = (email) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 
      ? name[0] + "*".repeat(name.length - 2) + name[name.length - 1]
      : name[0] + "*";
    return `${maskedName}@${domain}`;
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", width: "100%", padding: 24,
      background: theme === "dark" ? "#121212" : "#f8fafc",
      color: theme === "dark" ? "#ffffff" : "#0f172a",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box",
      transition: "background 0.3s, color 0.3s",
    }}>
      <Toaster position="bottom-right" />
      
      {/* Floating Theme Switcher */}
      <button 
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        style={{
          position: "absolute", top: 20, right: 24,
          background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          borderRadius: 999, padding: "10px 16px", cursor: "pointer",
          color: "inherit", fontWeight: 700, fontSize: 13,
          transition: "all 0.2s ease",
        }}
      >
        {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>

      <div style={{
        background: theme === "dark" ? "rgba(24, 24, 24, 0.85)" : "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: 24, padding: 40,
        maxWidth: 500, width: "100%",
        boxShadow: theme === "dark" ? "0 24px 60px rgba(0, 0, 0, 0.5)" : "0 24px 60px rgba(0, 0, 0, 0.05)",
        textAlign: "center", boxSizing: "border-box",
        position: "relative",
      }}>
        
        {loading ? (
          <div style={{ padding: "40px 0" }}>
            <div className="spinner-mini" style={{ width: 40, height: 40, borderThickness: 3, margin: "0 auto 16px auto" }}></div>
            <p style={{ color: theme === "dark" ? "#b3b3b3" : "#64748b", margin: 0, fontWeight: 500 }}>
              Verifying authenticity...
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: "20px 0" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999,
              background: "rgba(243, 114, 127, 0.1)",
              color: "#f3727f", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 20px auto",
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 12px 0" }}>Verification Failed</h2>
            <p style={{ color: theme === "dark" ? "#b3b3b3" : "#64748b", fontSize: 14, margin: "0 0 24px 0", lineHeight: "1.6" }}>
              {error}
            </p>
            <button 
              onClick={() => navigate("/user/login")}
              style={{
                background: "linear-gradient(135deg, #6d28d9 0%, #3b82f6 100%)",
                border: "none", color: "#fff", padding: "12px 28px", borderRadius: 999,
                fontWeight: 700, cursor: "pointer", fontSize: 13, textTransform: "uppercase",
                letterSpacing: "1.2px", boxShadow: "0 8px 24px rgba(59, 130, 246, 0.25)",
              }}
            >
              Go to Studio
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              width: 72, height: 72, borderRadius: 999,
              background: "rgba(30, 215, 96, 0.1)",
              color: "#1ed760", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 24px auto",
              border: "1px solid rgba(30, 215, 96, 0.2)",
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Verified Authentic</h2>
            <p style={{ color: "#1ed760", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 32px 0" }}>
              Certificate Studio Secured
            </p>

            <div style={{
              display: "grid", gap: 16,
              background: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
              padding: 24, borderRadius: 16, border: theme === "dark" ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.03)",
              textAlign: "left", marginBottom: 32,
            }}>
              <div>
                <span style={{ fontSize: 11, color: theme === "dark" ? "#727272" : "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Recipient Name</span>
                <p style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 0 0" }}>{cert.recipientName}</p>
              </div>

              <div>
                <span style={{ fontSize: 11, color: theme === "dark" ? "#727272" : "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Recipient Email</span>
                <p style={{ fontSize: 16, fontWeight: 500, margin: "4px 0 0 0" }}>{maskEmail(cert.recipientEmail)}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: theme === "dark" ? "#727272" : "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Issue Date</span>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "4px 0 0 0" }}>
                    {new Date(cert.issueDate).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: theme === "dark" ? "#727272" : "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Issuer</span>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "4px 0 0 0" }}>{cert.issuerName || "Certificate Studio User"}</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <a 
                href={cert.certificateUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "linear-gradient(135deg, #1ed760 0%, #1db954 100%)",
                  color: "#000000", padding: "12px 24px", borderRadius: 999,
                  fontWeight: 700, textDecoration: "none", fontSize: 13, textTransform: "uppercase",
                  letterSpacing: "1.2px", display: "inline-block",
                  boxShadow: "0 8px 24px rgba(30, 215, 96, 0.2)",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                View Certificate File
              </a>
              <button 
                onClick={() => navigate("/user/login")}
                style={{
                  background: theme === "dark" ? "#1f1f1f" : "#e2e8f0",
                  border: "none", color: "inherit", padding: "12px 24px", borderRadius: 999,
                  fontWeight: 700, cursor: "pointer", fontSize: 13, textTransform: "uppercase",
                  letterSpacing: "1.2px", transition: "transform 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Create Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyPage;
