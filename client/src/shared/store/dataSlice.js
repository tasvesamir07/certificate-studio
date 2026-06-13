const update = (val, current) => typeof val === "function" ? val(current) : val;

export const createDataSlice = (set, get) => ({
  dataFile: null,
  data: [],
  sheetName: "",
  originalExcelKeys: [],
  manualRecipients: [],
  setDataFile: (dataFile) => set((s) => ({ dataFile: update(dataFile, s.dataFile) })),
  setData: (data) => set((s) => ({ data: update(data, s.data) })),
  setSheetName: (sheetName) => set((s) => ({ sheetName: update(sheetName, s.sheetName) })),
  setOriginalExcelKeys: (originalExcelKeys) => set((s) => ({ originalExcelKeys: update(originalExcelKeys, s.originalExcelKeys) })),
  setManualRecipients: (manualRecipients) => set((s) => ({ manualRecipients: update(manualRecipients, s.manualRecipients) })),
});
