import React, { useEffect, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useAppStore } from "../shared/store/useAppStore";

const VerifyPage = ({ code, apiBaseUrl, navigate }) => {
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { theme, setTheme } = useAppStore();

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
    <div className="verify-page">
      <Toaster position="bottom-right" />
      
      {/* Floating Theme Switcher */}
      <button 
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="verify-theme-btn"
      >
        {theme === "dark" ? (
          <>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>Dark Mode</span>
          </>
        )}
      </button>
 
      <div className="verify-card">
        {loading ? (
          <div className="verify-loading-container">
            <div className="verify-spinner"></div>
            <p className="verify-loading-text">
              Verifying authenticity...
            </p>
          </div>
        ) : error ? (
          <div className="verify-error-container">
            <div className="verify-badge-icon error">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2>Verification Failed</h2>
            <p className="verify-error-desc">
              {error}
            </p>
            <button 
              onClick={() => navigate("/user/login")}
              className="verify-btn"
            >
              Go to Studio
            </button>
          </div>
        ) : (
          <div>
            <div className="verify-badge-icon">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Verified Authentic</h2>
            <p className="verify-secured-text">
              Certificate Studio Secured
            </p>
 
            <div className="verify-details-grid">
              <div>
                <span className="verify-label">Recipient Name</span>
                <p className="verify-value">{cert.recipientName}</p>
              </div>
 
              <div>
                <span className="verify-label">Recipient Email</span>
                <p className="verify-value muted">{maskEmail(cert.recipientEmail)}</p>
              </div>
 
              <div className="verify-details-row">
                <div>
                  <span className="verify-label">Issue Date</span>
                  <p className="verify-value muted secondary">
                    {new Date(cert.issueDate).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </p>
                </div>
                <div>
                  <span className="verify-label">Issuer</span>
                  <p className="verify-value muted secondary">{cert.issuerName || "Certificate Studio User"}</p>
                </div>
              </div>
            </div>
 
            <div className="verify-actions">
              <a 
                href={cert.certificateUrl}
                target="_blank"
                rel="noreferrer"
                className="verify-btn"
              >
                View Certificate File
              </a>
              <button 
                onClick={() => navigate("/user/login")}
                className="verify-btn secondary"
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
