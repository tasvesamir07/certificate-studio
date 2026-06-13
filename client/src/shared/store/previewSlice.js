export const createPreviewSlice = (set, get) => ({
  previewImages: [],
  isPreviewGridLoading: false,
  isPreviewLoading: false,
  setPreviewImages: (previewImages) => set({ previewImages }),
  setIsPreviewGridLoading: (isPreviewGridLoading) => set({ isPreviewGridLoading }),
  setIsPreviewLoading: (isPreviewLoading) => set({ isPreviewLoading }),
});
