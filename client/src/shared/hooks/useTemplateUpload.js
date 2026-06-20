import { useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAppStore } from "../store/useAppStore";
import {
  DEFAULT_TEMPLATE_SIZE,
  calculateAutoScale,
  createInitialLayout,
} from "../../utils/canvasHelpers";

export function useTemplateUpload({
  templateImageRef,
  templateBackImageRef,
  templateNaturalSizeRef,
  savedLayoutsRef,
  preloadFonts,
}) {
  const {
    setTemplate,
    setLastGenerationInfo,
    setPreviewImages,
    setPreviewName,
    setPreviewSide,
    templateURL,
    setTemplateURL,
    setTemplateSignature,
    setPreviewScale,
    setTemplateSize,
    setLayout,
    setTemplateBack,
    templateBackURL,
    setTemplateBackURL,
  } = useAppStore();

  const onTemplateDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const toastId = toast.loading("Loading template...");

      setTemplate(file);
      setLastGenerationInfo(null);
      setPreviewImages([]);
      setPreviewName((prev) => (prev && prev !== "-") ? prev : "Your Name Here");
      setPreviewSide("front");
      templateImageRef.current = null;

      const objectUrl = URL.createObjectURL(file);

      if (templateURL) {
        URL.revokeObjectURL(templateURL);
      }
      setTemplateURL(objectUrl);

      const img = new Image();
      img.onload = () => {
        templateImageRef.current = img;
        const naturalWidth =
          img.naturalWidth || img.width || DEFAULT_TEMPLATE_SIZE.width;
        const naturalHeight =
          img.naturalHeight || img.height || DEFAULT_TEMPLATE_SIZE.height;
        const signature = `${naturalWidth}x${naturalHeight}`;

        templateNaturalSizeRef.current = {
          width: naturalWidth,
          height: naturalHeight,
        };
        setTemplateSignature(signature);

        const initialScale = calculateAutoScale(naturalWidth, naturalHeight);

        setPreviewScale(initialScale);
        setTemplateSize({
          width: Math.round(naturalWidth * initialScale),
          height: Math.round(naturalHeight * initialScale),
        });

        toast.success("Template loaded.", { id: toastId });

        setLayout((prev) => {
          const signature = `${naturalWidth}x${naturalHeight}`;
          const savedLayout = savedLayoutsRef.current?.[signature];
          if (savedLayout) {
            if (savedLayout.fontFamily) preloadFonts([savedLayout.fontFamily]);
            return { ...savedLayout };
          }

          const newLayout = prev ? {
            ...prev,
            width: Math.min(naturalWidth, prev.width),
            height: Math.min(naturalHeight, prev.height),
            x: Math.min(prev.x, Math.max(0, naturalWidth - prev.width)),
            y: Math.min(prev.y, Math.max(0, naturalHeight - prev.height)),
          } : createInitialLayout(naturalWidth, naturalHeight);

          if (newLayout.fontFamily) preloadFonts([newLayout.fontFamily]);
          return newLayout;
        });
      };
      img.onerror = () => {
        toast.error("Failed to read template dimensions.", { id: toastId });
        templateImageRef.current = null;
        templateNaturalSizeRef.current = DEFAULT_TEMPLATE_SIZE;
        setPreviewScale(1);
        setTemplateSize(DEFAULT_TEMPLATE_SIZE);
      };
      img.src = objectUrl;
    },
    [
      templateURL,
      setTemplate,
      setLastGenerationInfo,
      setPreviewImages,
      setPreviewName,
      setPreviewSide,
      setTemplateURL,
      setTemplateSignature,
      setPreviewScale,
      setTemplateSize,
      setLayout,
      preloadFonts,
      templateImageRef,
      templateNaturalSizeRef,
      savedLayoutsRef,
    ]
  );

  const onTemplateBackDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const toastId = toast.loading("Loading back side template...");

      setTemplateBack(file);
      const objectUrl = URL.createObjectURL(file);

      if (templateBackURL) {
        URL.revokeObjectURL(templateBackURL);
      }
      setTemplateBackURL(objectUrl);

      const img = new Image();
      img.onload = () => {
        templateBackImageRef.current = img;
        const { naturalWidth, naturalHeight } = img;
        const autoScale = calculateAutoScale(naturalWidth, naturalHeight);
        setPreviewScale(autoScale);
        setTemplateSize({
          width: Math.round(naturalWidth * autoScale),
          height: Math.round(naturalHeight * autoScale),
        });
        toast.success("Back side template loaded.", { id: toastId });
      };
      img.onerror = () => {
        toast.error("Failed to load back side image.", { id: toastId });
      };
      img.src = objectUrl;
    },
    [
      templateBackURL,
      setTemplateBack,
      setTemplateBackURL,
      setPreviewScale,
      setTemplateSize,
      templateBackImageRef,
    ]
  );

  return { onTemplateDrop, onTemplateBackDrop };
}
