const update = (val, current) => typeof val === "function" ? val(current) : val;

export const createDesignerSlice = (set, get) => ({
  previewScale: 0.35,
  showGrid: false,
  isSnapXActive: false,
  isSnapYActive: false,
  templateSize: { width: 800, height: 600 },
  previewName: "Your Name Here",
  previewSide: "front",
  isLayoutLocked: false,
  setPreviewScale: (previewScale) => set((s) => ({ previewScale: update(previewScale, s.previewScale) })),
  setShowGrid: (showGrid) => set((s) => ({ showGrid: update(showGrid, s.showGrid) })),
  setIsSnapXActive: (isSnapXActive) => set((s) => ({ isSnapXActive: update(isSnapXActive, s.isSnapXActive) })),
  setIsSnapYActive: (isSnapYActive) => set((s) => ({ isSnapYActive: update(isSnapYActive, s.isSnapYActive) })),
  setTemplateSize: (templateSize) => set((s) => ({ templateSize: update(templateSize, s.templateSize) })),
  setPreviewName: (previewName) => set((s) => ({ previewName: update(previewName, s.previewName) })),
  setPreviewSide: (previewSide) => set((s) => ({ previewSide: update(previewSide, s.previewSide) })),
  setIsLayoutLocked: (isLayoutLocked) => set((s) => ({ isLayoutLocked: update(isLayoutLocked, s.isLayoutLocked) })),
});
