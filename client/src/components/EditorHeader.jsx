import React from "react";

const EditorHeader = ({ currentPath, navigate, authUser, onLogout }) => {
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
        <button type="button" className="nav-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default EditorHeader;
