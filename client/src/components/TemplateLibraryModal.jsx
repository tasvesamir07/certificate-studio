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
          <button className="close-button" onClick={onClose}>&times;</button>
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
              <p className="form-warning">⚠️ Upload a template image in the studio to save it here.</p>
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
                      🗑️
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

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content.template-modal {
          background: #181818;
          color: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          width: 90%;
          max-width: 800px;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .template-modal .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .template-modal .modal-header h3 {
          margin: 0;
          font-weight: 800;
          font-size: 1.3rem;
        }
        .template-modal .close-button {
          background: none;
          border: none;
          font-size: 1.6rem;
          color: #a3a3a3;
          cursor: pointer;
          transition: color 0.2s;
        }
        .template-modal .close-button:hover {
          color: #f3727f;
        }
        .template-modal .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .save-template-form {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 14px;
          margin-bottom: 24px;
        }
        .save-template-form h4 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          font-weight: 700;
        }
        .form-grid {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .form-field {
          flex: 1;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-field label {
          font-size: 11px;
          font-weight: 700;
          color: #b3b3b3;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .form-field input, .form-field select {
          background: #121212;
          border: 1px solid rgba(255,255,255,0.1);
          color: #ffffff;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .save-btn {
          background: #1ed760;
          color: #000000;
          border: none;
          padding: 11px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-btn:hover {
          background: #1db954;
          transform: translateY(-1px);
        }
        .save-btn:disabled {
          background: #2a2a2a;
          color: #727272;
          cursor: not-allowed;
          transform: none;
        }
        .form-warning {
          color: #ffa42b;
          font-size: 12px;
          margin: 10px 0 0 0;
          font-weight: 500;
        }
        .modal-divider {
          border: 0;
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 24px 0;
        }
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 20px;
          margin-top: 16px;
        }
        .template-card {
          background: #1f1f1f;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .template-card:hover {
          transform: translateY(-4px);
          border-color: #1ed760;
          box-shadow: 0 8px 20px rgba(30, 215, 96, 0.15);
        }
        .template-thumbnail {
          aspect-ratio: 4/3;
          background: #121212;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        .template-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .delete-card-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          border: none;
          color: #ffffff;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }
        .delete-card-btn:hover {
          background: #f3727f;
        }
        .template-info {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .template-title {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .template-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1ed760;
          background: rgba(30, 215, 96, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
        }
        .empty-library {
          text-align: center;
          padding: 40px;
          color: #727272;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default TemplateLibraryModal;
