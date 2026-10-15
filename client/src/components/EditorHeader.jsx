import React from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../shared/store/useAppStore";

const EditorHeader = ({ navigate, onLogout }) => {
  const { theme, setTheme, currentPath, authUser } = useAppStore();
  const { t } = useTranslation();

  // Extract initials or fallback
  const userInitials = React.useMemo(() => {
    if (!authUser) return "CS";
    const namePart = authUser.split("@")[0];
    return namePart.slice(0, 2).toUpperCase();
  }, [authUser]);

  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between px-4 sm:px-6 h-14 bg-bg-surface/90 backdrop-blur-md border-b border-border-custom">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-4 sm:gap-6 h-full">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => navigate("/generate-certificate")}
        >
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent group-hover:scale-105 transition-transform duration-200 shadow-xs">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="7" y1="8" x2="17" y2="8" />
              <line x1="7" y1="12" x2="13" y2="12" />
              <circle cx="15" cy="15" r="2" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-base font-extrabold tracking-tight text-text-primary group-hover:text-accent transition-colors">
              Certificate Studio
            </span>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <nav className="flex items-center bg-bg-elevated/80 p-0.5 rounded-full border border-border-custom">
          <button
            type="button"
            className={`border-none px-3.5 py-1 text-xs font-bold cursor-pointer transition-all duration-150 rounded-full select-none ${
              currentPath === "/generate-certificate"
                ? "bg-accent text-black shadow-xs"
                : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-hover"
            }`}
            onClick={() => navigate("/generate-certificate")}
          >
            Studio
          </button>
          <button
            type="button"
            className={`border-none px-3.5 py-1 text-xs font-bold cursor-pointer transition-all duration-150 rounded-full select-none ${
              currentPath === "/profile"
                ? "bg-accent text-black shadow-xs"
                : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-hover"
            }`}
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
        </nav>
      </div>

      {/* Right: User Profile, Theme & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Account Chip */}
        <div className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-bg-elevated/70 border border-border-custom text-text-primary text-xs font-semibold shadow-xs">
          <div className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-[10px] flex items-center justify-center">
            {userInitials}
          </div>
          <span className="max-w-[140px] md:max-w-[180px] truncate text-text-secondary">
            {authUser || "Signed in"}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" title="Online" />
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="bg-bg-elevated/80 hover:bg-bg-hover border border-border-custom hover:border-text-muted/40 text-text-secondary hover:text-text-primary cursor-pointer px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 inline-flex items-center gap-1.5 shadow-xs"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle color theme"
        >
          {theme === "dark" ? (
            <>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
              <span className="hidden md:inline text-[11px]">Light</span>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="hidden md:inline text-[11px]">Dark</span>
            </>
          )}
        </button>

        {/* Logout Button */}
        <button
          type="button"
          className="border border-border-custom/50 hover:border-danger/30 bg-bg-elevated/50 hover:bg-danger/10 text-text-secondary hover:text-danger font-bold text-xs cursor-pointer transition-all duration-150 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs"
          onClick={onLogout}
          title="Sign out"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
};

export default EditorHeader;
