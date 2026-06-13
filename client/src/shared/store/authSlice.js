const update = (val, current) => typeof val === "function" ? val(current) : val;

export const createAuthSlice = (set, get) => ({
  isAuthenticated: false,
  authUser: "",
  authUserId: "",
  loginPrefill: "",
  setIsAuthenticated: (isAuthenticated) => set((s) => ({ isAuthenticated: update(isAuthenticated, s.isAuthenticated) })),
  setAuthUser: (authUser) => set((s) => ({ authUser: update(authUser, s.authUser) })),
  setAuthUserId: (authUserId) => set((s) => ({ authUserId: update(authUserId, s.authUserId) })),
  setLoginPrefill: (loginPrefill) => set((s) => ({ loginPrefill: update(loginPrefill, s.loginPrefill) })),
});
