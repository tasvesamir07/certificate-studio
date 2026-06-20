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
    <div className="sticky top-0 z-[100] flex items-center justify-between px-6 h-14 bg-bg-surface/80 backdrop-blur-xl border-b border-border-custom shadow-sm">
      <div className="flex items-center gap-5 h-full">
        <span
          className="font-sans text-[1.2rem] font-[800] gradient-text cursor-pointer select-none tracking-[-0.03em]"
          onClick={() => navigate("/generate-certifcate")}
        >
          Certificate Studio
        </span>
        <button
          type="button"
          className={`border-none bg-transparent px-3.5 py-1.5 font-sans font-medium text-sm text-text-secondary cursor-pointer transition-all duration-200 rounded-lg hover:text-accent hover:bg-accent-bg-glow ${
            currentPath === "/generate-certifcate" ? "text-accent font-bold bg-accent-bg-glow border border-border-custom" : ""
          }`}
          onClick={() => navigate("/generate-certifcate")}
        >
          Generate
        </button>
        <button
          type="button"
          className={`border-none bg-transparent px-3.5 py-1.5 font-sans font-medium text-sm text-text-secondary cursor-pointer transition-all duration-200 rounded-lg hover:text-accent hover:bg-accent-bg-glow ${
            currentPath === "/profile" ? "text-accent font-bold bg-accent-bg-glow border border-border-custom" : ""
          }`}
          onClick={() => navigate("/profile")}
        >
          Profile
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-secondary hidden sm:inline">{authUser || "Signed in"}</span>
        <button
          type="button"
          className="btn-outline px-2.5 py-1.5 text-xs rounded-lg inline-flex items-center gap-1.5"
          onClick={toggleLanguage}
          title="Toggle Language"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="hidden sm:inline">{i18n.language === "en" ? "Español" : "English"}</span>
        </button>
        <button
          type="button"
          className="btn-outline px-2.5 py-1.5 text-xs rounded-lg inline-flex items-center gap-1.5"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle color theme"
        >
          {theme === "dark" ? (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="bg-transparent border-none text-text-muted font-semibold text-sm cursor-pointer transition-all duration-200 underline px-2 py-1 hover:text-danger"
          onClick={onLogout}
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;
