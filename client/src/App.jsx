import React, { useEffect } from "react";
import axios from "axios";
import "./App.css";
import { useAppStore } from "./shared/store/useAppStore";
import LoginPage from "./Pages/LoginPage";
import ForgotPasswordPage from "./Pages/ForgotPasswordPage";
import VerifyPage from "./Pages/VerifyPage";
import { resolveApiBase } from "./utils/textHelpers";
import { buildApiUrl } from "./utils/api";

const EditorPage = React.lazy(() => import("./Pages/EditorPage"));
const ProfilePage = React.lazy(() => import("./Pages/ProfilePage"));
const LandingPage = React.lazy(() => import("./Pages/LandingPage"));
const AUTH_KEYS = { auth: "certificate-studio-auth", user: "certificate-studio-user", token: "certificate-studio-session" };
const API_BASE_URL = resolveApiBase();

function App() {
  const {
    isAuthenticated, setIsAuthenticated, authUser, setAuthUser, authUserId, setAuthUserId,
    loginPrefill, setLoginPrefill, theme, isCanvaConnected, setIsCanvaConnected, currentPath, setCurrentPath
  } = useAppStore();

  const navigate = (path) => {
    const norm = path.split("?")[0] || path;
    window.history[window.location.pathname !== norm ? "pushState" : "replaceState"]({}, "", path);
    setCurrentPath(norm);
  };

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem("certificate-studio-theme", theme);
  }, [theme]);

  useEffect(() => {
    const restore = async () => {
      const storedAuth = localStorage.getItem(AUTH_KEYS.auth);
      const storedUser = localStorage.getItem(AUTH_KEYS.user);
      const storedToken = localStorage.getItem(AUTH_KEYS.token);
      const storedUserId = localStorage.getItem("certificate-studio-userId");

      if (storedAuth === "true" && storedUser && storedToken) {
        setIsAuthenticated(true);
        setAuthUser(storedUser);
        setAuthUserId(storedUserId || "");
        
        try {
          const res = await axios.get(buildApiUrl(API_BASE_URL, `api/canva/check-connection?userId=${storedUserId}`));
          setIsCanvaConnected(res.data.isConnected);
        } catch (err) {}
      }
    };
    restore();
  }, [setIsAuthenticated, setAuthUser, setAuthUserId, setIsCanvaConnected]);

  useEffect(() => {
    const handlePop = () => setCurrentPath(window.location.pathname || "/");
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [setCurrentPath]);

  const effAuth = isAuthenticated || (localStorage.getItem(AUTH_KEYS.auth) === "true" && localStorage.getItem(AUTH_KEYS.user));

  useEffect(() => {
    if (effAuth && currentPath === "/") {
      navigate("/generate-certificate");
    }
  }, [effAuth, currentPath]);

  const handleLogout = () => {
    Object.values(AUTH_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem("certificate-studio-userId");
    setIsAuthenticated(false); setAuthUser(""); setAuthUserId(""); setLoginPrefill("");
    window.location.href = "/user/login";
  };

  const handleLoginSuccess = ({ email, code, id }) => {
    setIsAuthenticated(true); setAuthUser(email); setAuthUserId(id); setLoginPrefill(email);
    localStorage.setItem(AUTH_KEYS.auth, "true");
    localStorage.setItem(AUTH_KEYS.user, email);
    localStorage.setItem("certificate-studio-userId", id);
    localStorage.setItem(AUTH_KEYS.token, code);
    navigate("/generate-certificate");
  };

  const isVerifyPath = currentPath.startsWith("/verify/");
  const verifyCode = isVerifyPath ? currentPath.split("/verify/")[1] : "";

  if (isVerifyPath) {
    return <VerifyPage code={verifyCode} apiBaseUrl={API_BASE_URL} navigate={navigate} />;
  }

  if (currentPath === "/") {
    if (effAuth) {
      return <div className="loading-screen">Redirecting to Studio...</div>;
    }
    return (
      <React.Suspense fallback={<div className="loading-screen">Loading...</div>}>
        <LandingPage navigate={navigate} />
      </React.Suspense>
    );
  }

  if (!effAuth) {
    if (currentPath === "/forgot-password") return <ForgotPasswordPage apiBaseUrl={API_BASE_URL} navigate={navigate} />;
    if (currentPath === "/canva-success") return <div className="loading-screen">Finalizing Canva connection...</div>;
    return <LoginPage defaultEmail={loginPrefill || authUser} onSuccess={handleLoginSuccess} apiBaseUrl={API_BASE_URL} navigate={navigate} />;
  }

  if (currentPath === "/forgot-password") return <ForgotPasswordPage apiBaseUrl={API_BASE_URL} navigate={navigate} />;
  if (currentPath === "/profile") {
    return <React.Suspense fallback={<div className="loading-screen">Loading Profile...</div>}><ProfilePage authUser={authUser} onLogout={handleLogout} apiBaseUrl={API_BASE_URL} navigate={navigate} /></React.Suspense>;
  }

  return (
    <React.Suspense fallback={<div className="loading-screen">Loading Editor...</div>}>
      <EditorPage authUser={authUser} onLogout={handleLogout} navigate={navigate} />
    </React.Suspense>
  );
}

export default App;
