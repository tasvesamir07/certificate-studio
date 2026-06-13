export const createTemplateSlice = (set, get) => ({
  template: null,
  templateURL: "",
  templateBack: null,
  templateBackURL: "",
  layout: null,
  templateSignature: "",
  setTemplate: (template) => set({ template }),
  setTemplateURL: (templateURL) => set({ templateURL }),
  setTemplateBack: (templateBack) => set({ templateBack }),
  setTemplateBackURL: (templateBackURL) => set({ templateBackURL }),
  setLayout: (layout) => set({ layout }),
  setTemplateSignature: (templateSignature) => set({ templateSignature }),
});
