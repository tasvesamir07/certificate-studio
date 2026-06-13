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
    <div className="top-nav">
      <div className="nav-left">
        <span
          className="nav-brand"
          onClick={() => navigate("/generate-certifcate")}
        >
          Certificate Studio
        </span>
        <button
          type="button"
          className={`nav-link ${
            currentPath === "/generate-certifcate" ? "active" : ""
          }`}
          onClick={() => navigate("/generate-certifcate")}
        >
          Generate
        </button>
        <button
          type="button"
          className={`nav-link ${currentPath === "/profile" ? "active" : ""}`}
          onClick={() => navigate("/profile")}
        >
          Profile
        </button>
      </div>
      <div className="nav-right">
        <span className="nav-user">{authUser || "Signed in"}</span>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleLanguage}
          title="Toggle Language"
          style={{ marginRight: "8px" }}
        >
          🌐 {i18n.language === "en" ? "Español" : "English"}
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle color theme"
          style={{ marginRight: "8px" }}
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
        <button type="button" className="nav-logout" onClick={onLogout}>
          {t("logout")}
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;

