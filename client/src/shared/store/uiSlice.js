const update = (val, current) => typeof val === "function" ? val(current) : val;

export const createUiSlice = (set, get) => ({
  theme: typeof window !== "undefined" ? localStorage.getItem("certificate-studio-theme") || "light" : "light",
  isLoading: false,
  isSending: false,
  emailSummary: null,
  isManualGenerating: false,
  isCanvaModalOpen: false,
  isCanvaConnected: false,
  currentPath: typeof window !== "undefined" ? window.location.pathname || "/user/login" : "/user/login",
  serverFonts: [],
  lastGenerationInfo: null,
  viewportSize: {
    width: typeof window !== "undefined" ? window.innerWidth : 1600,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  },
  setTheme: (theme) => set((s) => ({ theme: update(theme, s.theme) })),
  setIsLoading: (isLoading) => set((s) => ({ isLoading: update(isLoading, s.isLoading) })),
  setIsSending: (isSending) => set((s) => ({ isSending: update(isSending, s.isSending) })),
  setEmailSummary: (emailSummary) => set((s) => ({ emailSummary: update(emailSummary, s.emailSummary) })),
  setIsManualGenerating: (isManualGenerating) => set((s) => ({ isManualGenerating: update(isManualGenerating, s.isManualGenerating) })),
  setIsCanvaModalOpen: (isCanvaModalOpen) => set((s) => ({ isCanvaModalOpen: update(isCanvaModalOpen, s.isCanvaModalOpen) })),
  setIsCanvaConnected: (isCanvaConnected) => set((s) => ({ isCanvaConnected: update(isCanvaConnected, s.isCanvaConnected) })),
  setCurrentPath: (currentPath) => set((s) => ({ currentPath: update(currentPath, s.currentPath) })),
  setServerFonts: (serverFonts) => set((s) => ({ serverFonts: update(serverFonts, s.serverFonts) })),
  setLastGenerationInfo: (lastGenerationInfo) => set((s) => ({ lastGenerationInfo: update(lastGenerationInfo, s.lastGenerationInfo) })),
  setViewportSize: (viewportSize) => set((s) => ({ viewportSize: update(viewportSize, s.viewportSize) })),
});
