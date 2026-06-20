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
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-6 box-border transition-all duration-300 relative overflow-hidden font-sans">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />
      
      <Toaster position="bottom-right" />
      
      {/* Floating Theme Switcher */}
      <button 
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-5 right-6 bg-bg-elevated border border-border-custom rounded-md px-4 py-2.5 cursor-pointer text-text-primary text-xs font-bold transition-all duration-200 flex items-center gap-2 hover:bg-bg-surface hover:border-accent z-50"
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
 
      <div className="relative z-10 bg-bg-surface/80 backdrop-blur-xl border border-border-custom rounded-2xl p-8 md:p-10 max-w-[500px] w-full shadow-2xl text-center box-border transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.15)] hover:border-accent/30">
        <div className="absolute top-0 inset-x-0 h-1 border-b border-hairline" />
        {loading ? (
          <div className="py-10">
            <div className="w-10 h-10 border-3 border-border-light border-t-accent rounded-full mx-auto mb-4 animate-spin"></div>
            <p className="text-text-muted m-0 font-medium">
              Verifying authenticity...
            </p>
          </div>
        ) : error ? (
          <div className="py-5">
            <div className="w-[72px] h-[72px] rounded-full bg-danger/10 text-danger flex items-center justify-center text-3xl mx-auto mb-6 border border-danger/20">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Verification Failed</h2>
            <p className="text-sm m-0 mb-6 leading-relaxed text-text-secondary">
              {error}
            </p>
            <button 
              onClick={() => navigate("/user/login")}
              className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all duration-200 border-none cursor-pointer hover:-translate-y-0.5 shadow-xs"
            >
              Go to Studio
            </button>
          </div>
        ) : (
          <div>
            <div className="w-[72px] h-[72px] rounded-full bg-accent/10 text-accent flex items-center justify-center text-3xl mx-auto mb-6 border border-accent/20">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Verified Authentic</h2>
            <p className="text-accent text-[13px] font-bold uppercase tracking-wider m-0 mb-8">
              Certificate Studio Secured
            </p>
 
            <div className="grid gap-4 bg-bg-elevated p-6 rounded-md border border-border-custom text-left mb-8">
              <div>
                <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Recipient Name</span>
                <p className="text-base font-bold mt-1 text-text-primary">{cert.recipientName}</p>
              </div>
 
              <div>
                <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Recipient Email</span>
                <p className="text-base font-medium mt-1 text-text-primary">{maskEmail(cert.recipientEmail)}</p>
              </div>
 
              <div className="flex justify-between gap-4">
                <div>
                  <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Issue Date</span>
                  <p className="text-sm font-medium mt-1 text-text-primary">
                    {new Date(cert.issueDate).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Issuer</span>
                  <p className="text-sm font-medium mt-1 text-text-primary">{cert.issuerName || "Certificate Studio User"}</p>
                </div>
              </div>
            </div>
 
            <div className="flex gap-3 justify-center">
              <a 
                href={cert.certificateUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all duration-200 border-none cursor-pointer hover:-translate-y-0.5 shadow-xs"
              >
                View Certificate File
              </a>
              <button 
                onClick={() => navigate("/user/login")}
                className="bg-bg-elevated text-text-primary border border-border-custom hover:bg-bg-surface hover:border-accent px-6 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-none"
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
