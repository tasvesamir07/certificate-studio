import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
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
    try {
      const response = await axios.get(`${apiBaseUrl}/api/auth/profile/${authUser}`);
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

    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/update-profile`, {
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

    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/auth/change-password`,
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
    <div className="profile-page">
      <div className="back-button-container">
        <button className="profile-back-btn" onClick={() => navigate("/generate-certifcate")}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
      </div>
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile</h2>
          {!isEditing ? (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="cancel-edit-btn" onClick={() => {
                setIsEditing(false);
                setEditData({
                  displayName: profileData.displayName || "",
                  phone: profileData.phone || ""
                });
                validatePhone(profileData.phone || "");
              }} disabled={isSaving}>
                Cancel
              </button>
              <button className="save-profile-btn" onClick={handleUpdateProfile} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        <div className="profile-field">
          <label>Name</label>
          {isEditing ? (
            <input
              type="text"
              value={editData.displayName}
              onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
              placeholder="Enter your name"
              disabled={isSaving}
            />
          ) : (
            <input type="text" value={profileData.displayName || profileData.email?.split('@')[0] || "User"} readOnly />
          )}
        </div>

        <div className="profile-field">
          <label>Email</label>
          <input type="text" value={profileData.email || ""} readOnly className="read-only-email" />
          <small className="field-note">Email cannot be changed.</small>
        </div>

        <div className="profile-field phone-field-container">
          <label>Phone</label>
          {isEditing ? (
            <div className="phone-input-wrapper">
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
                containerClass="custom-phone-container"
                inputClass="custom-phone-input"
              />
              {isValidPhone && (
                <div className="phone-valid-indicator" title="Valid Phone Number">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#10b981" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <input type="text" value={profileData.phone || "Not provided"} readOnly />
          )}
        </div>
      </div>

      <div className="profile-card change-password-card">
        <h2>Change Password</h2>
        <p className="profile-note" style={{ marginBottom: "16px" }}>
          Update your password by filling in the fields below.
        </p>
        <form className="change-password-form" onSubmit={handleChangePassword}>
          <div className="profile-field">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="password-input-wrapper">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={isChanging}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                autoComplete="new-password"
                disabled={isChanging}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={isChanging}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="change-password-btn"
            disabled={isChanging}
          >
            {isChanging ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
