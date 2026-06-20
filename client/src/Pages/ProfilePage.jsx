import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { buildApiUrl } from "../utils/api";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';

const ProfilePage = ({ authUser, onLogout, apiBaseUrl = "", navigate }) => {
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: authUser || "",
    phone: ""
  });
  const [editData, setEditData] = useState({
    displayName: "",
    phone: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidPhone, setIsValidPhone] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [authUser]);

  const fetchProfile = async () => {
    if (!authUser) return;
    const getProfileUrl = buildApiUrl(apiBaseUrl, `api/auth/profile/${authUser}`);

    try {
      const response = await axios.get(getProfileUrl);
      setProfileData(response.data);
      setEditData({
        displayName: response.data.displayName || "",
        phone: response.data.phone || ""
      });
      validatePhone(response.data.phone || "");
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      // Fallback for name if fetch fails
      const fallbackName = authUser?.split("@")[0] || "User";
      setProfileData(prev => ({ ...prev, displayName: fallbackName }));
      setEditData(prev => ({ ...prev, displayName: fallbackName }));
    }
  };

  const validatePhone = (value) => {
    if (!value) {
      setIsValidPhone(false);
      return;
    }
    // PhoneInput gives value with country code like '88017...'
    // libphonenumber-js needs '+' prefix for best results with full numbers
    const phoneWithPlus = value.startsWith('+') ? value : `+${value}`;
    try {
      setIsValidPhone(isValidPhoneNumber(phoneWithPlus));
    } catch (e) {
      setIsValidPhone(false);
    }
  };

  const handlePhoneChange = (value) => {
    setEditData(prev => ({ ...prev, phone: value }));
    validatePhone(value);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading("Saving changes...");

    const updateProfileUrl = buildApiUrl(apiBaseUrl, "api/auth/update-profile");

    try {
      const response = await axios.post(updateProfileUrl, {
        email: authUser,
        displayName: editData.displayName,
        phone: editData.phone
      });

      setProfileData(response.data.user);
      setIsEditing(false);
      toast.success("Profile updated successfully!", { id: toastId });
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update profile.";
      toast.error(message, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }

    setIsChanging(true);
    const toastId = toast.loading("Changing password...");

    const changePasswordUrl = buildApiUrl(apiBaseUrl, "api/auth/change-password");

    try {
      const response = await axios.post(
        changePasswordUrl,
        {
          email: authUser,
          currentPassword,
          newPassword,
        }
      );

      toast.success(response.data.message || "Password updated successfully!", {
        id: toastId,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to change password.";
      toast.error(message, { id: toastId });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-bg-primary p-6 md:p-12 gap-6 font-sans relative overflow-hidden">
      {/* Subtle ambient glows for visual depth */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[140px] pointer-events-none" />

      <Toaster position="bottom-right" />
      <div className="max-w-[520px] w-full flex justify-start relative z-10">
        <button 
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-border-custom rounded-full bg-bg-elevated text-text-secondary text-sm font-semibold hover:bg-bg-surface hover:text-accent hover:border-accent transition-all duration-150 cursor-pointer" 
          onClick={() => navigate("/generate-certificate")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
      </div>

      <div className="max-w-[520px] w-full bg-bg-surface/80 backdrop-blur-xl border border-border-custom rounded-lg p-8 shadow-card relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-primary m-0 flex items-center gap-2">Profile</h2>
          {!isEditing ? (
            <button 
              className="px-4 py-2 border border-border-custom rounded-full bg-bg-elevated text-text-secondary text-xs font-bold hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer" 
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                className="px-4 py-2 border border-border-custom rounded-full bg-bg-elevated text-text-secondary text-xs font-bold hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer mr-2" 
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    displayName: profileData.displayName || "",
                    phone: profileData.phone || ""
                  });
                  validatePhone(profileData.phone || "");
                }} 
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-black font-bold uppercase tracking-wider rounded-full text-xs transition-all duration-150 cursor-pointer disabled:opacity-40" 
                onClick={handleUpdateProfile} 
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Name</label>
          {isEditing ? (
            <input
              type="text"
              value={editData.displayName}
              onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
              placeholder="Enter your name"
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow"
            />
          ) : (
            <input 
              type="text" 
              value={profileData.displayName || profileData.email?.split('@')[0] || "User"} 
              readOnly 
              className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none opacity-70 cursor-not-allowed shadow-inner"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email</label>
          <input 
            type="text" 
            value={profileData.email || ""} 
            readOnly 
            className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none opacity-70 cursor-not-allowed shadow-inner" 
          />
          <small className="text-xs text-text-muted mt-1 block">Email cannot be changed.</small>
        </div>

        <div className="flex flex-col gap-1.5 mb-4 relative">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Phone</label>
          {isEditing ? (
            <div className="relative flex items-center w-full">
              <PhoneInput
                country={'bd'}
                value={editData.phone}
                onChange={handlePhoneChange}
                disabled={isSaving}
                countryCodeEditable={false}
                inputProps={{
                  name: 'phone',
                  required: true,
                  autoFocus: true
                }}
                containerClass="!w-full !font-sans"
                inputClass="!w-full !h-auto !pl-14 !pr-10 !py-2.5 !border !border-border-custom !rounded-md !bg-bg-elevated !text-text-primary !text-sm !font-sans !outline-none !transition-all !duration-200 !shadow-inner focus:!border-accent focus:!bg-bg-surface focus:!ring-2 focus:!ring-accent-bg-glow"
              />
              {isValidPhone && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center z-10" title="Valid Phone Number">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#10b981" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <input 
              type="text" 
              value={profileData.phone || "Not provided"} 
              readOnly 
              className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none opacity-70 cursor-not-allowed shadow-inner"
            />
          )}
        </div>
      </div>

      <div className="max-w-[520px] w-full bg-bg-surface/80 backdrop-blur-xl border border-border-custom rounded-lg p-8 shadow-card relative z-10">
        <div>
          <h2 className="text-xl font-bold text-text-primary m-0 mb-4 flex items-center gap-2">Account Status</h2>
          <p style={{ margin: 0 }} className="text-sm text-text-secondary">
            <strong>Status:</strong>{" "}
            <span className="text-success font-semibold">Active - Full Access</span>
          </p>
        </div>
      </div>

      <div className="max-w-[520px] w-full bg-bg-surface/80 backdrop-blur-xl border border-border-custom rounded-lg p-8 shadow-card relative z-10">
        <h2 className="text-xl font-bold text-text-primary m-0 mb-2 flex items-center gap-2">Change Password</h2>
        <p className="text-sm text-text-secondary mb-4">
          Update your password by filling in the fields below.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleChangePassword}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="currentPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Current Password</label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={isChanging}
                className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">New Password</label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                autoComplete="new-password"
                disabled={isChanging}
                className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Confirm New Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={isChanging}
                className="w-full px-3.5 py-2.5 border border-border-custom rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow pr-11"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-accent rounded-md"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isChanging}
            className="w-full py-3 bg-accent text-black font-bold uppercase tracking-[1.5px] text-xs rounded-full hover:scale-[1.02] hover:bg-accent-hover active:scale-100 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {isChanging ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
