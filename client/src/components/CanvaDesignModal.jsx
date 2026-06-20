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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-light rounded-2xl w-full max-w-[800px] max-h-[90vh] flex flex-col shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border-light">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-bold text-text-primary m-0">Canva Workspace</h3>
            <button 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-light rounded-full bg-bg-elevated text-text-secondary text-xs font-semibold hover:bg-bg-hover hover:text-text-primary transition-all duration-150 disabled:opacity-40" 
              onClick={fetchDesigns} 
              title="Refresh designs list" 
              disabled={isSyncing}
            >
              <svg 
                viewBox="0 0 24 24" 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`refresh-icon ${isSyncing ? "animate-spin" : ""}`} 
                style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{isSyncing ? "Syncing..." : "Sync Designs"}</span>
            </button>
            {canvaProfile && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full text-[11px] text-accent font-semibold" title="This is the Canva account currently connected to the app.">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span> Connected as: <strong>{canvaProfile.display_name}</strong>
              </div>
            )}
            <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#8b3dff] text-white text-xs font-bold rounded-full hover:bg-[#7b2cff] transition-all duration-150 cursor-pointer border-none" onClick={handleCreateNew}>
              <span className="text-sm font-bold">+</span> Design from Scratch
            </button>
          </div>
          <button className="bg-transparent border-none text-text-muted hover:text-text-primary text-xl cursor-pointer p-1 rounded-md transition-colors duration-150" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="flex items-center p-3 bg-accent/5 border border-accent/20 rounded-xl text-xs text-text-secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p style={{ display: "inline", margin: 0 }}>Design in the new tab, then return here. Your latest work will <strong>sync</strong> when you click the button or return to this window.</p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-text-muted text-sm">Loading designs...</div>
          ) : (
            <>
              {designs.length > 0 && <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide m-0 mt-2">Your Recent Designs</h4>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {designs.map((design) => {
                  const isCustomizing = customizingDesignId === design.id;
                  
                  return (
                    <div key={design.id} className={`group flex flex-col bg-bg-elevated border border-border-light rounded-xl overflow-hidden shadow-sm hover:border-accent transition-all duration-150 ${isCustomizing ? "border-accent ring-1 ring-accent" : ""}`}>
                      <div className="relative aspect-[4/3] bg-black/25 flex items-center justify-center overflow-hidden cursor-pointer w-full" onClick={() => !isCustomizing && onSelect(design.id)}>
                        {design.thumbnail?.url ? (
                          <img src={design.thumbnail.url} alt={design.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs text-text-muted">No Preview</div>
                        )}
                        {!isCustomizing && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-2 p-3">
                            <button className="w-full py-1.5 bg-bg-surface text-text-primary text-[11px] font-bold rounded hover:bg-bg-elevated transition-colors cursor-pointer border-none" onClick={(e) => handleEditDesign(e, design.id)}>
                              Edit in Canva
                            </button>
                            <button className="w-full py-1.5 bg-[#8b3dff] text-white text-[11px] font-bold rounded hover:bg-[#7b2cff] transition-colors cursor-pointer border-none" onClick={(e) => { e.stopPropagation(); onSelect(design.id, [1]); }}>
                              Quick Import (Page 1)
                            </button>
                            {(!design.page_count || design.page_count > 1) && (
                              <button className="w-full py-1.5 bg-bg-elevated text-text-secondary text-[11px] font-bold rounded hover:bg-bg-surface transition-colors cursor-pointer border border-border-light" onClick={(e) => { e.stopPropagation(); setCustomizingDesignId(design.id); }}>
                                Select Pages
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isCustomizing ? (
                          <div className="p-4 flex flex-col gap-3 flex-1 bg-bg-surface border-t border-border-light">
                            <h5 className="text-xs font-bold text-text-primary m-0">Import Configuration</h5>
                            <div className="flex flex-col gap-2.5">
                              {design.page_count && (
                                <div className="text-[11px] text-text-muted font-semibold">
                                  <span>Design has {design.page_count} pages</span>
                                </div>
                              )}
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Front Page Number</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max={design.page_count}
                                  value={pageSelection.front} 
                                  onChange={(e) => setPageSelection(prev => ({ ...prev, front: parseInt(e.target.value) || 1 }))}
                                  className="px-2.5 py-1.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-xs font-sans outline-none focus:border-accent focus:bg-bg-surface transition-all"
                                />
                              </div>
                              {(!design.page_count || design.page_count > 1) && (
                                <>
                                  <div className="flex items-center my-1">
                                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary">
                                      <input 
                                        type="checkbox" 
                                        checked={useBackSide} 
                                        onChange={(e) => setUseBackSide(e.target.checked)} 
                                        className="w-4 h-4 rounded border-border-light text-accent bg-bg-elevated focus:ring-2 focus:ring-accent-bg-glow cursor-pointer"
                                      /> 
                                      <span>Add a Back Side Page</span>
                                    </label>
                                  </div>
                                  {useBackSide && (
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Back Page Number</label>
                                      <input 
                                        type="number" 
                                        min="1" 
                                        max={design.page_count}
                                        value={pageSelection.back} 
                                        onChange={(e) => setPageSelection(prev => ({ ...prev, back: parseInt(e.target.value) || 2 }))}
                                        className="px-2.5 py-1.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-xs font-sans outline-none focus:border-accent focus:bg-bg-surface transition-all"
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 mt-2">
                              <button className="w-full py-2 bg-ink text-canvas font-[480] rounded-[var(--radius-pill)] shadow-sm hover:shadow-md uppercase tracking-wider text-[11px] transition-all cursor-pointer border-none" onClick={() => onSelect(design.id, useBackSide ? [pageSelection.front, pageSelection.back] : [pageSelection.front])}>
                                Confirm Import
                              </button>
                              <button className="w-full py-2 bg-transparent text-text-muted hover:text-text-primary font-semibold text-[11px] transition-colors cursor-pointer border-none" onClick={() => setCustomizingDesignId(null)}>
                                Back to designs
                              </button>
                            </div>
                          </div>
                      ) : (
                        <div className="p-3 flex items-center justify-between border-t border-border-light">
                          <span className="text-xs font-semibold text-text-primary truncate w-full" title={design.title}>{design.title || "Untitled Design"}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {designs.length === 0 && (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <p className="text-sm text-text-muted">No designs found in your Canva account.</p>
                  <button className="w-full py-3 bg-ink text-canvas font-[480] rounded-[var(--radius-pill)] shadow-sm hover:shadow-md uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer max-w-[240px] border-none" onClick={handleCreateNew}>
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
