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
      await axios.post(`${apiBaseUrl}/api/templates`, {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-light rounded-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border-light">
          <h3 className="text-base font-bold text-text-primary m-0">Template Library</h3>
          <button className="bg-transparent border-none text-text-muted hover:text-text-primary text-xl cursor-pointer p-1 rounded-md transition-colors duration-150" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Save Current Template Form */}
          <form onSubmit={handleSaveTemplate} className="bg-bg-elevated/40 border border-border-light p-4 rounded-xl flex flex-col gap-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide m-0">Save Current Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tempName" className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Template Name</label>
                <input
                  id="tempName"
                  type="text"
                  placeholder="e.g. Graduation Certificate 2026"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  disabled={isSaving}
                  required
                  className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-xs outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tempCat" className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Category</label>
                <select
                  id="tempCat"
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-xs outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
                >
                  <option value="Certificate" className="bg-bg-surface text-text-primary">Certificate</option>
                  <option value="Diploma" className="bg-bg-surface text-text-primary">Diploma</option>
                  <option value="Award" className="bg-bg-surface text-text-primary">Award</option>
                  <option value="Badge" className="bg-bg-surface text-text-primary">Badge</option>
                  <option value="Voucher" className="bg-bg-surface text-text-primary">Voucher</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 px-4 bg-gradient-to-br from-accent to-accent-hover text-white font-bold rounded-lg shadow-sm hover:shadow-md uppercase tracking-wider text-[11px] transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed h-9 flex items-center justify-center" disabled={isSaving || !currentTemplateUrl}>
                {isSaving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
            {!currentTemplateUrl && (
              <p className="flex items-center gap-1.5 text-xs text-amber-500 font-medium mt-1">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Upload a template image in the studio to save it here.</span>
              </p>
            )}
          </form>

          <hr className="border-none h-[1px] bg-border-light my-2" />

          {/* Saved Templates Gallery */}
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide m-0">Your Saved Templates</h4>
          {isLoading ? (
            <div className="py-8 text-center text-text-muted text-xs animate-pulse">Loading library...</div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-xs">
              <p>No saved templates found. Design one and save it above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {templates.map((temp) => (
                <div key={temp.id} className="group flex flex-col bg-bg-elevated border border-border-light rounded-xl overflow-hidden shadow-sm hover:border-accent transition-all duration-150 cursor-pointer" onClick={() => onLoadTemplate(temp)}>
                  <div className="relative aspect-[4/3] bg-black/25 flex items-center justify-center overflow-hidden w-full">
                    <img src={temp.templateUrl} alt={temp.name} className="w-full h-full object-cover" />
                    <button
                      className="absolute top-2 right-2 w-7 h-7 bg-danger/90 hover:bg-danger text-white rounded-full flex items-center justify-center shadow transition-all duration-150 cursor-pointer border-none scale-0 group-hover:scale-100 z-10"
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
                  <div className="p-3 flex items-center justify-between border-t border-border-light bg-bg-elevated">
                    <span className="text-xs font-semibold text-text-primary truncate max-w-[65%]" title={temp.name}>{temp.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-accent font-bold">{temp.category}</span>
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
