import React from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../shared/store/useAppStore";

const EditorHeader = ({ navigate, onLogout }) => {
  const { theme, setTheme, currentPath, authUser } = useAppStore();
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-[100] flex items-center justify-between px-6 h-14 bg-bg-surface border-b border-border-custom">
      <div className="flex items-center gap-5 h-full">
        <span
          className="font-sans text-lg font-bold tracking-tight text-text-primary cursor-pointer select-none"
          onClick={() => navigate("/generate-certificate")}
        >
          Certificate Studio
        </span>
        <button
          type="button"
          className={`border-none px-3.5 py-1.5 font-sans text-sm font-bold cursor-pointer transition-all duration-150 rounded-full ${
            currentPath === "/generate-certificate" 
              ? "bg-accent text-black" 
              : "bg-transparent text-text-primary opacity-60 hover:opacity-100 hover:bg-bg-hover"
          }`}
          onClick={() => navigate("/generate-certificate")}
        >
          Generate
        </button>
        <button
          type="button"
          className={`border-none px-3.5 py-1.5 font-sans text-sm font-bold cursor-pointer transition-all duration-150 rounded-full ${
            currentPath === "/profile" 
              ? "bg-accent text-black" 
              : "bg-transparent text-text-primary opacity-60 hover:opacity-100 hover:bg-bg-hover"
          }`}
          onClick={() => navigate("/profile")}
        >
          Profile
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-secondary opacity-80 hidden sm:inline">{authUser || "Signed in"}</span>
        <button
          type="button"
          className="bg-transparent border border-border-custom text-text-secondary hover:text-text-primary cursor-pointer px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 inline-flex items-center gap-1.5 hover:border-accent"
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
          className="bg-transparent border-none text-text-secondary hover:text-accent font-semibold text-sm cursor-pointer transition-all duration-150 underline px-2 py-1"
          onClick={onLogout}
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;
