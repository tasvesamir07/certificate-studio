export const createAuthSlice = (set, get) => ({
  isAuthenticated: false,
  authUser: "",
  authUserId: "",
  loginPrefill: "",
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setAuthUser: (authUser) => set({ authUser }),
  setAuthUserId: (authUserId) => set({ authUserId }),
  setLoginPrefill: (loginPrefill) => set({ loginPrefill }),
});
