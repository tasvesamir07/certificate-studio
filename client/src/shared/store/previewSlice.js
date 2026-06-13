const update = (val, current) => typeof val === "function" ? val(current) : val;

export const createPreviewSlice = (set, get) => ({
  previewImages: [],
  isPreviewGridLoading: false,
  isPreviewLoading: false,
  setPreviewImages: (previewImages) => set((s) => ({ previewImages: update(previewImages, s.previewImages) })),
  setIsPreviewGridLoading: (isPreviewGridLoading) => set((s) => ({ isPreviewGridLoading: update(isPreviewGridLoading, s.isPreviewGridLoading) })),
  setIsPreviewLoading: (isPreviewLoading) => set((s) => ({ isPreviewLoading: update(isPreviewLoading, s.isPreviewLoading) })),
});
