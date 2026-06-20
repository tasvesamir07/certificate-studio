import React from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../shared/store/useAppStore";

const EditorHeader = ({ navigate, onLogout }) => {
  const { theme, setTheme, currentPath, authUser } = useAppStore();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLng = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(nextLng);
  };

  return (
    <div className="sticky top-0 z-[100] flex items-center justify-between px-6 h-14 bg-canvas border-b border-hairline">
      <div className="flex items-center gap-5 h-full">
        <span
          className="font-sans text-lg font-[540] tracking-[-0.01em] text-ink cursor-pointer select-none"
          onClick={() => navigate("/generate-certifcate")}
        >
          Certificate Studio
        </span>
        <button
          type="button"
          className={`border-none bg-transparent px-3.5 py-1.5 font-sans text-sm font-[480] text-ink cursor-pointer transition-all duration-100 rounded-[var(--radius-pill)] ${
            currentPath === "/generate-certifcate" ? "bg-ink text-canvas" : "opacity-50 hover:opacity-100 hover:bg-surface-soft"
          }`}
          onClick={() => navigate("/generate-certifcate")}
        >
          Generate
        </button>
        <button
          type="button"
          className={`border-none bg-transparent px-3.5 py-1.5 font-sans text-sm font-[480] text-ink cursor-pointer transition-all duration-100 rounded-[var(--radius-pill)] ${
            currentPath === "/profile" ? "bg-ink text-canvas" : "opacity-50 hover:opacity-100 hover:bg-surface-soft"
          }`}
          onClick={() => navigate("/profile")}
        >
          Profile
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-[450] text-ink opacity-50 hidden sm:inline">{authUser || "Signed in"}</span>
        <button
          type="button"
          className="bg-transparent border border-hairline text-ink opacity-60 hover:opacity-100 cursor-pointer px-2.5 py-1.5 text-xs font-[480] rounded-[var(--radius-pill)] transition-all duration-100 inline-flex items-center gap-1.5 hover:border-ink"
          onClick={toggleLanguage}
          title="Toggle Language"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="hidden sm:inline">{i18n.language === "en" ? "Español" : "English"}</span>
        </button>
        <button
          type="button"
          className="bg-transparent border border-hairline text-ink opacity-60 hover:opacity-100 cursor-pointer px-2.5 py-1.5 text-xs font-[480] rounded-[var(--radius-pill)] transition-all duration-100 inline-flex items-center gap-1.5 hover:border-ink"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle color theme"
        >
          {theme === "dark" ? (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="bg-transparent border-none text-ink opacity-50 hover:opacity-100 font-[480] text-sm cursor-pointer transition-all duration-100 underline px-2 py-1"
          onClick={onLogout}
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;
