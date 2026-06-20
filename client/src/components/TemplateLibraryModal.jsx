import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const TemplateLibraryModal = ({
  isOpen,
  onClose,
  userId,
  apiBaseUrl,
  onLoadTemplate,
  currentLayout,
  currentTemplateUrl,
  currentTemplateBackUrl,
}) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("Certificate");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    let currentUserId = userId || window.localStorage.getItem("certificate-studio-userId");
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/api/templates?userId=${currentUserId}`);
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load templates.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    let currentUserId = userId || window.localStorage.getItem("certificate-studio-userId");
    if (!currentUserId) {
      toast.error("You must be logged in to save a template.");
      return;
    }
    if (!saveName.trim()) {
      toast.error("Please enter a template name.");
      return;
    }
    if (!currentTemplateUrl) {
      toast.error("Please upload a template image first before saving.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving template...");
    try {
      const res = await axios.post(`${apiBaseUrl}/api/templates`, {
        userId: currentUserId,
        name: saveName.trim(),
        templateUrl: currentTemplateUrl,
        templateBackUrl: currentTemplateBackUrl,
        layout: currentLayout,
        category: saveCategory,
      });
      toast.success("Template saved successfully!", { id: toastId });
      setSaveName("");
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save template.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      await axios.delete(`${apiBaseUrl}/api/templates/${id}`);
      toast.success("Template deleted.");
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete template.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Template Library</h3>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Save Current Template Form */}
          <form onSubmit={handleSaveTemplate} className="save-template-form">
            <h4>Save Current Configuration</h4>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="tempName">Template Name</label>
                <input
                  id="tempName"
                  type="text"
                  placeholder="e.g. Graduation Certificate 2026"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="tempCat">Category</label>
                <select
                  id="tempCat"
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  disabled={isSaving}
                >
                  <option value="Certificate">Certificate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Award">Award</option>
                  <option value="Badge">Badge</option>
                  <option value="Voucher">Voucher</option>
                </select>
              </div>
              <button type="submit" className="save-btn" disabled={isSaving || !currentTemplateUrl}>
                {isSaving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
            {!currentTemplateUrl && (
              <p className="form-warning">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Upload a template image in the studio to save it here.</span>
              </p>
            )}
          </form>

          <hr className="modal-divider" />

          {/* Saved Templates Gallery */}
          <h4>Your Saved Templates</h4>
          {isLoading ? (
            <div className="loading-spinner">Loading library...</div>
          ) : templates.length === 0 ? (
            <div className="empty-library">
              <p>No saved templates found. Design one and save it above!</p>
            </div>
          ) : (
            <div className="templates-grid">
              {templates.map((temp) => (
                <div key={temp.id} className="template-card" onClick={() => onLoadTemplate(temp)}>
                  <div className="template-thumbnail">
                    <img src={temp.templateUrl} alt={temp.name} />
                    <button
                      className="delete-card-btn"
                      onClick={(e) => handleDeleteTemplate(temp.id, e)}
                      title="Delete template"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                  <div className="template-info">
                    <span className="template-title" title={temp.name}>{temp.name}</span>
                    <span className="template-badge">{temp.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateLibraryModal;
