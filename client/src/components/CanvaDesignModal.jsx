import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const CanvaDesignModal = ({ isOpen, onClose, onSelect, userId, apiBaseUrl }) => {
  const [designs, setDesigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customizingDesignId, setCustomizingDesignId] = useState(null);
  const [pageSelection, setPageSelection] = useState({ front: 1, back: 2 });
  const [useBackSide, setUseBackSide] = useState(false);
  const [canvaProfile, setCanvaProfile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDesigns();
    }
  }, [isOpen]);

  // AUTO-SYNC: When the user returns to this tab from Canva, refresh the list automatically
  useEffect(() => {
    if (!isOpen) return;

    const handleFocus = () => {
      console.log("Window focused, refreshing Canva designs...");
      fetchDesigns(true); // silent refresh
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen]);
  

  const fetchDesigns = async (isSilent = false) => {
    let currentUserId = userId;
    
    // Fallback: If userId prop is missing but we have it in localStorage, use it
    if (!currentUserId) {
      currentUserId = window.localStorage.getItem("certificate-studio-userId");
    }

    if (!currentUserId) {
      console.warn("CanvaDesignModal: No userId available for fetchDesigns.");
      return; 
    }

    if (!isSilent) setIsLoading(true);
    setIsSyncing(true);
    try {
      // Add a timestamp to bypass any local/CDN caching
      const response = await axios.get(`${apiBaseUrl}/api/canva/designs?userId=${currentUserId}&t=${Date.now()}`);
      setDesigns(response.data.items || []);
      if (response.data.profile) {
        setCanvaProfile(response.data.profile);
      }
      if (isSilent) {
        // Optional: show a small non-intrusive notification or just let it update
      }
    } catch (err) {
      console.error("Failed to fetch Canva designs:", err);
      if (!isSilent) toast.error("Failed to load your Canva designs.");
    } finally {
      if (!isSilent) setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleCreateNew = () => {
    // Open Canva's certificate templates page in a new tab
    window.open("https://www.canva.com/certificates/templates", "_blank");
    toast("Opening Canva templates... create your design and come back here to sync!", { icon: "🎨" });
  };

  const handleEditDesign = (e, designId) => {
    if (e) e.stopPropagation();
    // Open the specific design in Canva's editor
    window.open(`https://www.canva.com/design/${designId}/edit`, "_blank");
    toast("Opening design in Canva...", { icon: "✏️" });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content canva-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <h3>Canva Workspace</h3>
            <button className={`refresh-btn ${isSyncing ? "loading" : ""}`} onClick={fetchDesigns} title="Refresh designs list" disabled={isSyncing}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`refresh-icon ${isSyncing ? "rotating" : ""}`} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{isSyncing ? "Syncing..." : "Sync Designs"}</span>
            </button>
            {canvaProfile && (
              <div className="canva-user-badge" title="This is the Canva account currently connected to the app.">
                <span className="user-dot"></span> Connected as: <strong>{canvaProfile.display_name}</strong>
              </div>
            )}
            <button className="create-new-btn" onClick={handleCreateNew}>
              <span className="plus-icon">+</span> Design from Scratch
            </button>
          </div>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="sync-banner">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p style={{ display: "inline", margin: 0 }}>Design in the new tab, then return here. Your latest work will <strong>sync</strong> when you click the button or return to this window.</p>
          </div>

          {isLoading ? (
            <div className="loading-spinner">Loading designs...</div>
          ) : (
            <>
              {designs.length > 0 && <h4 className="section-title">Your Recent Designs</h4>}
              <div className="designs-grid">
                {designs.map((design) => {
                  const isCustomizing = customizingDesignId === design.id;
                  
                  return (
                    <div key={design.id} className={`design-card ${isCustomizing ? "customizing" : ""}`}>
                      <div className="design-thumbnail" onClick={() => !isCustomizing && onSelect(design.id)}>
                        {design.thumbnail?.url ? (
                          <img src={design.thumbnail.url} alt={design.title} />
                        ) : (
                          <div className="design-placeholder">No Preview</div>
                        )}
                        {!isCustomizing && (
                          <div className="card-overlay">
                            <button className="edit-overlay-btn" onClick={(e) => handleEditDesign(e, design.id)}>
                              Edit in Canva
                            </button>
                            <button className="select-overlay-btn" onClick={(e) => { e.stopPropagation(); onSelect(design.id, [1]); }}>
                              Quick Import (Page 1)
                            </button>
                            {(!design.page_count || design.page_count > 1) && (
                              <button className="custom-overlay-btn" onClick={(e) => { e.stopPropagation(); setCustomizingDesignId(design.id); }}>
                                Select Pages
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isCustomizing ? (
                          <div className="custom-page-selection">
                            <h5>Import Configuration</h5>
                            <div className="selection-fields-vertical">
                              {design.page_count && (
                                <div className="page-count-info">
                                  <span>Design has {design.page_count} pages</span>
                                </div>
                              )}
                              <div className="field-row">
                                <label>Front Page Number</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max={design.page_count}
                                  value={pageSelection.front} 
                                  onChange={(e) => setPageSelection(prev => ({ ...prev, front: parseInt(e.target.value) || 1 }))}
                                />
                              </div>
                              {(!design.page_count || design.page_count > 1) && (
                                <>
                                  <div className="field-row-toggle">
                                    <label className="clean-checkbox">
                                      <input 
                                        type="checkbox" 
                                        checked={useBackSide} 
                                        onChange={(e) => setUseBackSide(e.target.checked)} 
                                      /> 
                                      <span>Add a Back Side Page</span>
                                    </label>
                                  </div>
                                  {useBackSide && (
                                    <div className="field-row">
                                      <label>Back Page Number</label>
                                      <input 
                                        type="number" 
                                        min="1" 
                                        max={design.page_count}
                                        value={pageSelection.back} 
                                        onChange={(e) => setPageSelection(prev => ({ ...prev, back: parseInt(e.target.value) || 2 }))}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="selection-actions">
                              <button className="import-confirm-btn" onClick={() => onSelect(design.id, useBackSide ? [pageSelection.front, pageSelection.back] : [pageSelection.front])}>
                                Confirm Import
                              </button>
                              <button className="import-cancel-btn" onClick={() => setCustomizingDesignId(null)}>
                                Back to designs
                              </button>
                            </div>
                          </div>
                      ) : (
                        <div className="design-info">
                          <span className="design-title" title={design.title}>{design.title || "Untitled Design"}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {designs.length === 0 && (
                <div className="no-designs">
                  <p>No designs found in your Canva account.</p>
                  <button className="btn-primary" onClick={handleCreateNew}>
                    Create Your First Design
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CanvaDesignModal;
