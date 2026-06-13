const update = (val, current) => typeof val === "function" ? val(current) : val;

export const createTemplateSlice = (set, get) => ({
  template: null,
  templateURL: "",
  templateBack: null,
  templateBackURL: "",
  layout: null,
  templateSignature: "",
  setTemplate: (template) => set((s) => ({ template: update(template, s.template) })),
  setTemplateURL: (templateURL) => set((s) => ({ templateURL: update(templateURL, s.templateURL) })),
  setTemplateBack: (templateBack) => set((s) => ({ templateBack: update(templateBack, s.templateBack) })),
  setTemplateBackURL: (templateBackURL) => set((s) => ({ templateBackURL: update(templateBackURL, s.templateBackURL) })),
  setLayout: (layout) => set((s) => ({ layout: update(layout, s.layout) })),
  setTemplateSignature: (templateSignature) => set((s) => ({ templateSignature: update(templateSignature, s.templateSignature) })),
});
