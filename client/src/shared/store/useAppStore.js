import { create } from "zustand";
import { createAuthSlice } from "./authSlice";
import { createTemplateSlice } from "./templateSlice";
import { createDataSlice } from "./dataSlice";
import { createDesignerSlice } from "./designerSlice";
import { createPreviewSlice } from "./previewSlice";
import { createEmailSlice } from "./emailSlice";
import { createUiSlice } from "./uiSlice";

export const useAppStore = create((...a) => ({
  ...createAuthSlice(...a),
  ...createTemplateSlice(...a),
  ...createDataSlice(...a),
  ...createDesignerSlice(...a),
  ...createPreviewSlice(...a),
  ...createEmailSlice(...a),
  ...createUiSlice(...a),
}));
export default useAppStore;
