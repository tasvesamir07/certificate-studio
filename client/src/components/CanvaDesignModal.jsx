import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const CanvaDesignModal = ({ isOpen, onClose, onSelect, onDesignButtonExport, userId, apiBaseUrl }) => {
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
              <span className={`refresh-icon ${isSyncing ? "rotating" : ""}`}>🔄</span> {isSyncing ? "Syncing..." : "Sync Designs"}
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
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="sync-banner">
            <span className="info-icon">💡</span>
            <p>Design in the new tab, then return here. Your latest work will <strong>sync</strong> when you click the button or return to this window.</p>
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
        .modal-content.canva-modal {
          background: #f8fafc;
          border-radius: 20px;
          width: 90%;
          max-width: 900px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .canva-modal .modal-header {
          padding: 20px 24px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sync-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.95rem;
          color: #1e40af;
        }
        .latency-tip {
          font-size: 0.75rem;
          color: #60a5fa;
          margin: 0;
        }
        .canva-user-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          margin-right: auto;
        }
        .user-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
        }
        .sync-banner strong {
          color: #1d4ed8;
        }
        .refresh-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          cursor: pointer;
          margin-right: 8px;
        }
        .refresh-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
          transform: translateY(-1px);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .modal-header h3 {
          margin: 0;
          color: #1e293b;
          font-weight: 700;
        }
        .create-new-btn {
          background: #7d2ae8;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .create-new-btn:hover {
          background: #6b21c9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(125, 42, 232, 0.3);
        }
        .plus-icon {
          font-size: 1.2rem;
          font-weight: 400;
        }
        .section-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin: 0 0 16px 0;
          font-weight: 700;
        }
        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .designs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }
        .design-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          position: relative;
        }
        .design-card:hover {
          transform: translateY(-4px);
          border-color: #7d2ae8;
          box-shadow: 0 10px 15px -3px rgba(125, 42, 232, 0.2);
        }
        .design-thumbnail {
          aspect-ratio: 4/3;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        .card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(125, 42, 232, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .design-card:hover .card-overlay {
          opacity: 1;
        }
        .edit-overlay-btn, .select-overlay-btn {
          background: white;
          color: #7d2ae8;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          width: 80%;
          transition: all 0.2s;
        }
        .select-overlay-btn {
          background: transparent;
          color: white;
          border: 1px solid white;
        }
        .edit-overlay-btn:hover {
          background: #f8fafc;
          transform: scale(1.05);
        }
        .design-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .design-info {
          padding: 12px;
          background: white;
        }
        .design-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .loading-spinner, .no-designs {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #94a3b8;
          cursor: pointer;
        }
        .close-button:hover {
          color: #ef4444;
        }

        /* Custom Page Selection Styles */
        .design-card.customizing {
          border-color: #7d2ae8;
          transform: none !important;
          cursor: default;
        }
        .custom-page-selection {
          padding: 12px;
          background: white;
        }
        .custom-page-selection h5 {
          margin: 0 0 10px 0;
          font-size: 0.8rem;
          color: #1e293b;
        }
        .selection-fields {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .selection-fields .field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .selection-fields label {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 600;
        }
        .selection-fields input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.85rem;
          color: #1e293b;
        }
        .selection-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .import-confirm-btn {
          width: 100%;
          background: #7d2ae8;
          color: white;
          border: none;
          padding: 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .import-confirm-btn:hover {
          background: #6b21c9;
        }
        .import-cancel-btn {
          width: 100%;
          background: transparent;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 6px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.7rem;
          cursor: pointer;
        }
        .import-cancel-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        
        /* New Vertical Selection Styles */
        .selection-fields-vertical {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .page-count-info {
          font-size: 0.75rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 600;
          text-align: center;
        }
        .field-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-row label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
        }
        .field-row input {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
        }
        .field-row-toggle {
          padding-top: 4px;
        }
        .clean-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          user-select: none;
        }
        .clean-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #7d2ae8;
        }

        .custom-overlay-btn {
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          width: 80%;
          transition: all 0.2s;
        }
        .custom-overlay-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        /* Sync Animation */
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .refresh-icon.rotating {
          display: inline-block;
          animation: rotate 1s linear infinite;
        }
        .refresh-btn.loading {
          opacity: 0.8;
          cursor: wait;
        }
      `}</style>
    </div>
  );
};

export default CanvaDesignModal;
