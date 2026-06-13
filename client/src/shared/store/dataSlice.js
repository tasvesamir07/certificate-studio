export const createDataSlice = (set, get) => ({
  dataFile: null,
  data: [],
  sheetName: "",
  originalExcelKeys: [],
  manualRecipients: [],
  setDataFile: (dataFile) => set({ dataFile }),
  setData: (data) => set({ data }),
  setSheetName: (sheetName) => set({ sheetName }),
  setOriginalExcelKeys: (originalExcelKeys) => set({ originalExcelKeys }),
  setManualRecipients: (manualRecipients) => set({ manualRecipients }),
});
