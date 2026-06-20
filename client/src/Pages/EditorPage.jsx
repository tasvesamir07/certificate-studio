import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import axios from "axios";
import { saveAs } from "file-saver";
import { Toaster, toast } from "react-hot-toast";
import JSZip from "jszip";
import { buildApiUrl } from "../utils/api";

import { useAppStore } from "../shared/store/useAppStore";
import { useFonts } from "../shared/hooks/useFonts";
import { useApi } from "../shared/hooks/useApi";
import { useEmailSending } from "../shared/hooks/useEmailSending";
import { useSheetImport } from "../shared/hooks/useSheetImport";
import { useTemplateUpload } from "../shared/hooks/useTemplateUpload";
import { useManualRecipients, createManualRecipient } from "../shared/hooks/useManualRecipients";

// Helper utilities
import {
  DEFAULT_TEMPLATE_SIZE,
  MIN_LAYOUT_WIDTH,
  MIN_LAYOUT_HEIGHT,
  MAX_FONT_SIZE,
  MIN_DYNAMIC_FONT_SIZE,
  PREVIEW_THUMBNAIL_WIDTH,
  DEFAULT_ZOOM_SCALE,
  CANVAS_TEXT_ALIGN,
  calculateAutoScale,
  createInitialLayout,
  drawCertificateToCanvas,
  generateCertificatePDF,
  drawCertificateToCanvasThumbnail,
  fitFontSizeToBox,
  COLOR_SWATCHES,
} from "../utils/canvasHelpers";

import {
  resolveApiBase,
  toTitleCase,
  formatNameInput,
  sanitizeFileBaseName,
  stripExtension,
  isValidEmail,
  getCellKeyAndValue,
  getCellValue,
} from "../utils/textHelpers";

// Lazy Loaded Components
const CanvaDesignModal = React.lazy(() => import("../components/CanvaDesignModal"));
const TemplateLibraryModal = React.lazy(() => import("../components/TemplateLibraryModal"));
const ManualRecipientsPanel = React.lazy(() => import("../components/ManualRecipientsPanel"));
const EmailSettingsPanel = React.lazy(() => import("../components/EmailSettingsPanel"));
import { trackEvent } from "../observability";

// modular components
import EditorHeader from "../components/EditorHeader";
import LayerPanel from "../components/LayerPanel";
import PropertiesPanel from "../components/PropertiesPanel";
import CanvasStage from "../components/CanvasStage";
import PreviewGrid from "../components/PreviewGrid";



const MAX_BATCH_SIZE = 100;
const LAYOUT_STORAGE_KEY = "certificate-designer-layouts";

const API_BASE_URL = resolveApiBase();

export default function EditorPage({ authUser, onLogout, navigate }) {
  const {
    currentPath,
    template,
    setTemplate,
    templateURL,
    setTemplateURL,
    templateBack,
    setTemplateBack,
    templateBackURL,
    setTemplateBackURL,
    layout,
    setLayout,
    templateSignature,
    setTemplateSignature,

    dataFile,
    setDataFile,
    data,
    setData,
    sheetName,
    setSheetName,
    originalExcelKeys,
    setOriginalExcelKeys,
    manualRecipients,
    setManualRecipients,

    previewScale,
    setPreviewScale,
    showGrid,
    setShowGrid,
    isSnapXActive,
    setIsSnapXActive,
    isSnapYActive,
    setIsSnapYActive,
    templateSize,
    setTemplateSize,
    previewName,
    setPreviewName,
    previewSide,
    setPreviewSide,
    isLayoutLocked,
    setIsLayoutLocked,

    previewImages,
    setPreviewImages,
    isPreviewGridLoading,
    setIsPreviewGridLoading,
    isPreviewLoading,
    setIsPreviewLoading,

    emailDeliveryEnabled,
    setEmailDeliveryEnabled,
    emailAttachmentType,
    setEmailAttachmentType,
    sharedAttachmentFiles,
    setSharedAttachmentFiles,
    emailSettings,
    setEmailSettings,
    presets,
    setPresets,
    selectedMessagePresetId,
    setSelectedMessagePresetId,
    newMessagePresetName,
    setNewMessagePresetName,
    isSavingMessagePreset,
    setIsSavingMessagePreset,
    selectedSignaturePresetId,
    setSelectedSignaturePresetId,
    newSignaturePresetName,
    setNewSignaturePresetName,
    isSavingSignaturePreset,
    setIsSavingSignaturePreset,
    sendProgress,
    setSendProgress,
    skipDuplicates,
    setSkipDuplicates,

    isLoading,
    setIsLoading,
    isSending,
    setIsSending,
    emailSummary,
    setEmailSummary,
    isManualGenerating,
    setIsManualGenerating,
    isCanvaModalOpen,
    setIsCanvaModalOpen,
    isCanvaConnected,
    setIsCanvaConnected,
    serverFonts,
    setServerFonts,
    lastGenerationInfo,
    setLastGenerationInfo,
    authUserId,
  } = useAppStore();

  const [isBottomSheetOpen, setIsBottomSheetOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);

  const { fonts: serverFontsFromHook, preloadFonts } = useFonts(API_BASE_URL);
  const { uploadAttachment, cleanupAttachments, get: apiGet, post: apiPost, del: apiDel } = useApi(API_BASE_URL);

  useEffect(() => {
    if (serverFontsFromHook && serverFontsFromHook.length) {
      setServerFonts(serverFontsFromHook);
    }
  }, [serverFontsFromHook, setServerFonts]);

  const templateImageRef = useRef(null);
  const templateBackImageRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const templateNaturalSizeRef = useRef(DEFAULT_TEMPLATE_SIZE);
  const resizeStartLayoutRef = useRef(null);
  const savedLayoutsRef = useRef({});
  const { onDataDrop } = useSheetImport();
  const {
    emailReadyRows,
    manualReadyRecipients,
    totalReadyRecipients,
    isSendingPaused,
    setIsSendingPaused,
    isSendingPausedRef,
    stopSendingRef,
    handleStopSending,
    handleGenerateAndSend,
    handleRetryFailed,
    prepareRowsForExport,
  } = useEmailSending({ templateImageRef, templateBackImageRef });

  const { onTemplateDrop, onTemplateBackDrop } = useTemplateUpload({
    templateImageRef,
    templateBackImageRef,
    templateNaturalSizeRef,
    savedLayoutsRef,
    preloadFonts,
  });

  const {
    handleManualRecipientChange,
    addManualRecipient,
    removeManualRecipient,
    manualRecipientLimitReached,
  } = useManualRecipients();

  const templateNaturalWidth =
    templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
  const templateNaturalHeight =
    templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;
  const layoutWidth = layout?.width || MIN_LAYOUT_WIDTH;
  const layoutHeight = layout?.height || MIN_LAYOUT_HEIGHT;

  // prepareRowsForExport is now retrieved from useEmailSending

  // Initialize manualRecipients if empty
  useEffect(() => {
    if (manualRecipients.length === 0) {
      setManualRecipients([createManualRecipient()]);
    }
  }, [manualRecipients, setManualRecipients]);

  // Handle Resize for Responsive Zoom
  useEffect(() => {
    const handleResize = () => {
      if (templateImageRef.current) {
        const { naturalWidth, naturalHeight } = templateImageRef.current;
        const autoScale = calculateAutoScale(naturalWidth, naturalHeight);
        const isMobile = window.innerWidth <= 768;
        const currentIsAutoFit = Math.abs(previewScale - autoScale) < 0.05;
        
        if (isMobile || currentIsAutoFit) {
          setPreviewScale(autoScale);
          setTemplateSize({
            width: Math.round(naturalWidth * autoScale),
            height: Math.round(naturalHeight * autoScale),
          });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [previewScale, setPreviewScale, setTemplateSize]);

  // onTemplateDrop and onTemplateBackDrop are now retrieved from useTemplateUpload

  // onDataDrop is now retrieved from useSheetImport

  const onSharedFileDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setSharedAttachmentFiles((prev) => {
      const next = [...prev];
      acceptedFiles.forEach((file) => {
        if (file) next.push(file);
      });
      return next;
    });
    const names = acceptedFiles.map((file) => file?.name).filter(Boolean);
    if (names.length) {
      toast.success(`Attached ${names.join(", ")}`);
    }
  }, [setSharedAttachmentFiles]);

  const handleConnectCanva = async () => {
    const currentUserId = authUserId || window.localStorage.getItem("certificate-studio-userId");
    if (!currentUserId) {
      toast.error("Please log in again to connect Canva.");
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/canva/auth-url?userId=${currentUserId}`);
      window.location.href = response.data.url;
    } catch (err) {
      console.error("Failed to get Canva auth URL:", err);
      toast.error("Failed to connect to Canva.");
    }
  };

  const handleDisconnectCanva = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Canva account? This will revoke access for searching and exporting your designs.")) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/canva/disconnect`, { userId: authUserId });
      setIsCanvaConnected(false);
      toast.success("Canva disconnected successfully.");
    } catch (err) {
      console.error("Disconnect Canva Error:", err);
      toast.error("Failed to disconnect Canva. Please try again.");
    }
  };

  const handleLoadTemplate = useCallback((temp) => {
    setTemplate({ name: temp.name, isLibraryTemplate: true });
    setTemplateURL(temp.templateUrl);
    setTemplateBack(temp.templateBackUrl ? { name: temp.name + " (Back)", isLibraryTemplate: true } : null);
    setTemplateBackURL(temp.templateBackUrl || "");
    setLayout(temp.layout);
    setIsTemplateModalOpen(false);
    toast.success(`Loaded template: ${temp.name}`);
  }, [setTemplate, setTemplateURL, setTemplateBack, setTemplateBackURL, setLayout]);

  const handleSelectCanvaDesign = async (designId, pages = []) => {
    const currentUserId = authUserId || window.localStorage.getItem("certificate-studio-userId");
    setIsCanvaModalOpen(false);
    const selectedPages = pages.length > 0 ? pages : [1];
    const toastId = toast.loading(`Exporting page(s) ${selectedPages.join(", ")} from Canva...`);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/canva/designs/export`, {
        userId: currentUserId,
        designId,
        pages: selectedPages
      });
      
      const { urls } = response.data;
      if (!urls || urls.length === 0) throw new Error("No export URLs found.");

      const frontResponse = await fetch(urls[0]);
      const frontBlob = await frontResponse.blob();
      const frontFile = new File([frontBlob], `canva-${designId}-page-${selectedPages[0] || 1}.png`, { type: "image/png" });
      onTemplateDrop([frontFile]);

      if (urls.length > 1) {
        toast.loading("Importing second page as back side...", { id: toastId });
        const backResponse = await fetch(urls[1]);
        const backBlob = await backResponse.blob();
        const backFile = new File([backBlob], `canva-${designId}-page-${selectedPages[1] || 2}.png`, { type: "image/png" });
        onTemplateBackDrop([backFile]);
        
        if (urls.length > 2 && pages.length === 0) {
          toast.success("Imported First 2 Pages! (Default)", { id: toastId });
        } else {
          toast.success(`Imported ${urls.length} selected pages!`, { id: toastId });
        }
      } else {
        toast.success("Design imported successfully!", { id: toastId });
      }
    } catch (err) {
      console.error("Canva Import Error:", err.response?.data || err);
      const errorMsg = err.response?.data?.details?.message || err.response?.data?.message || err.message || "Unknown error";
      toast.error(`Failed to import design: ${errorMsg}`, { id: toastId });
    }
  };

  const insertFormat = (tag, targetId = "emailTemplate") => {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const valueKey = targetId === "emailTemplate" ? "template" : "signature";
    const text = emailSettings[valueKey] || "";

    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}<${tag}>${selection}</${tag}>${after}`;

    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
    }, 0);
  };

  const insertPlaceholder = (placeholder, targetId = "emailTemplate") => {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const valueKey = targetId === "emailTemplate" ? "template" : "signature";
    const text = emailSettings[valueKey] || "";

    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = `${before}{${placeholder}}${after}`;
    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));

    setTimeout(() => {
      textarea.focus();
      const newPos = start + placeholder.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertLink = (targetId = "emailSignature") => {
    const url = prompt("Enter the link URL (e.g., https://example.com):");
    if (!url) return;

    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const valueKey = targetId === "emailTemplate" ? "template" : "signature";
    const text = emailSettings[valueKey] || "";

    const before = text.substring(0, start);
    const selection = text.substring(start, end) || "Click Here";
    const after = text.substring(end);

    const newText = `${before}<a href="${url}">${selection}</a>${after}`;
    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));
  };

  const insertImage = (url, targetId = "emailSignature") => {
    if (!url) return;
    const textarea = document.getElementById(targetId);
    const valueKey = textarea?.id === "emailTemplate" ? "template" : "signature";
    const currentText = emailSettings[valueKey] || "";

    const start = textarea ? textarea.selectionStart : currentText.length;
    const end = textarea ? textarea.selectionEnd : currentText.length;

    const before = currentText.substring(0, start);
    const after = currentText.substring(end);

    const imgTag = `<img src="${url}" alt="Logo" style="max-height: 50px;" />`;

    const newText = `${before}${imgTag}${after}`;
    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));
  };

  const handleImageUpload = async (event, targetId) => {
    const file = event.target.files[0];
    if (!file) return;

    const toastId = toast.loading("Uploading image...");
    try {
      const formData = new FormData();
      formData.append("image", file);

      const uploadUrl = buildApiUrl(API_BASE_URL, "api/upload-image");
      const response = await axios.post(uploadUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { url } = response.data;
      insertImage(url, targetId);
      toast.success("Image uploaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Upload failed: " + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      event.target.value = "";
    }
  };

  const promptForImage = (targetId) => {
    const url = prompt("Enter the Image URL (e.g., https://example.com/logo.png):");
    if (url) insertImage(url, targetId);
  };

  const {
    getRootProps: getTemplateProps,
    getInputProps: getTemplateInputProps,
  } = useDropzone({
    onDrop: onTemplateDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  const {
    getRootProps: getTemplateBackProps,
    getInputProps: getTemplateBackInputProps,
  } = useDropzone({
    onDrop: onTemplateBackDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  const { getRootProps: getDataProps, getInputProps: getDataInputProps } =
    useDropzone({
      onDrop: onDataDrop,
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
      },
      maxFiles: 1,
    });

  const {
    getRootProps: getSharedFileProps,
    getInputProps: getSharedFileInputProps,
  } = useDropzone({
    onDrop: onSharedFileDrop,
    maxFiles: 10,
  });

  const clearTemplate = useCallback(() => {
    if (templateURL) {
      URL.revokeObjectURL(templateURL);
    }

    setTemplate(null);
    setTemplateURL("");
    setTemplateSignature("");
    setTemplateSize(DEFAULT_TEMPLATE_SIZE);
    setPreviewScale(DEFAULT_ZOOM_SCALE);
    setPreviewSide("front");
    setPreviewName("Your Name Here");
    setLayout(null);
    setIsLayoutLocked(false);
    setPreviewImages([]);
    setLastGenerationInfo(null);
    setEmailSummary(null);
    templateImageRef.current = null;
    templateNaturalSizeRef.current = DEFAULT_TEMPLATE_SIZE;
    toast.success("Template removed.");
  }, [templateURL, setTemplate, setTemplateURL, setTemplateSignature, setTemplateSize, setPreviewScale, setPreviewSide, setPreviewName, setLayout, setIsLayoutLocked, setPreviewImages, setLastGenerationInfo, setEmailSummary]);

  const clearTemplateBack = useCallback(() => {
    if (templateBackURL) {
      URL.revokeObjectURL(templateBackURL);
    }
    setTemplateBack(null);
    setTemplateBackURL("");
    setPreviewSide("front");
    templateBackImageRef.current = null;
    toast.success("Back template removed.");
  }, [templateBackURL, setTemplateBack, setTemplateBackURL, setPreviewSide]);

  const clearDataFile = useCallback(() => {
    setDataFile(null);
    setData([]);
    setSheetName("");
    setPreviewName("Your Name Here");
    setPreviewImages([]);
    setLastGenerationInfo(null);
    setEmailSummary(null);
    toast.success("Data file removed.");
  }, [setDataFile, setData, setSheetName, setPreviewName, setPreviewImages, setLastGenerationInfo, setEmailSummary]);

  const clearSharedAttachment = useCallback(
    (index) => {
      setSharedAttachmentFiles((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next;
      });
      toast.success("Shared attachment removed.");
    },
    [setSharedAttachmentFiles]
  );

  const handleEmailSettingsChange = useCallback((event) => {
    const { name, value } = event.target;
    setEmailSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, [setEmailSettings]);

  // PRESETS LOGIC
  const fetchPresets = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await apiGet(`api/auth/presets/${encodeURIComponent(authUser)}`);
      setPresets(data);
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    }
  }, [authUser, apiGet, setPresets]);

  useEffect(() => {
    if (emailDeliveryEnabled) {
      fetchPresets();
    }
  }, [emailDeliveryEnabled, fetchPresets]);

  const handleSavePreset = async (type) => {
    const isMessage = type === 'message';
    const presetName = isMessage ? newMessagePresetName : newSignaturePresetName;
    const templateText = isMessage ? emailSettings.template : "";
    const signatureText = isMessage ? "" : emailSettings.signature;
    const setIsSaving = isMessage ? setIsSavingMessagePreset : setIsSavingSignaturePreset;

    if (!presetName.trim()) {
      toast.error(`Please enter a ${isMessage ? 'message' : 'signature'} preset name.`);
      return;
    }

    const toastId = toast.loading(`Saving ${isMessage ? 'message' : 'signature'} preset...`);
    setIsSaving(true);

    try {
      await apiPost("api/auth/presets", {
        email: authUser,
        presetType: type,
        presetName: presetName,
        templateText: templateText,
        signatureText: signatureText,
      });
      toast.success("Preset saved successfully!", { id: toastId });
      
      if (isMessage) setNewMessagePresetName("");
      else setNewSignaturePresetName("");
      
      fetchPresets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save preset.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (e, type) => {
    const presetId = e.target.value;
    const isMessage = type === 'message';
    
    if (isMessage) {
      setSelectedMessagePresetId(presetId);
      if (!presetId) {
        setNewMessagePresetName("");
        setEmailSettings((prev) => ({ ...prev, template: "" }));
      }
    } else {
      setSelectedSignaturePresetId(presetId);
      if (!presetId) {
        setNewSignaturePresetName("");
        setEmailSettings((prev) => ({ ...prev, signature: "" }));
      }
    }
    
    if (!presetId) return;

    const preset = presets.find((p) => p.id.toString() === presetId.toString());
    if (preset) {
      if (isMessage) setNewMessagePresetName(preset.presetName);
      else setNewSignaturePresetName(preset.presetName);

      setEmailSettings((prev) => ({
        ...prev,
        ...(isMessage ? { template: preset.templateText || "" } : { signature: preset.signatureText || "" })
      }));
      toast.success(`Loaded preset: ${preset.presetName}`);
    }
  };

  const handleDeletePreset = async (presetId, type) => {
    if (!presetId) return;
    if (!window.confirm("Are you sure you want to delete this preset?")) return;
    
    const toastId = toast.loading("Deleting preset...");
    try {
      await apiDel(`api/auth/presets/${presetId}`);
      toast.success("Preset deleted.", { id: toastId });
      
      if (type === 'message' && selectedMessagePresetId === presetId.toString()) {
        setSelectedMessagePresetId("");
      } else if (type === 'signature' && selectedSignaturePresetId === presetId.toString()) {
        setSelectedSignaturePresetId("");
      }
      
      fetchPresets();
    } catch (error) {
      toast.error("Failed to delete preset.", { id: toastId });
    }
  };

  // Manual recipient handlers are now retrieved from useManualRecipients

  const handleLayoutChange = useCallback((e) => {
    const { name, value } = e.target;
    setLayout((prev) => {
      if (!prev) return prev;

      const templateWidth =
        templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
      const templateHeight =
        templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

      if (name === "fontSize") {
        return { ...prev, fontSize: Number(value) || 0 };
      }

      if (name === "x") {
        const numeric = Math.round(Number(value) || 0);
        const maxX = Math.max(0, templateWidth - prev.width);
        return {
          ...prev,
          x: Math.min(Math.max(0, numeric), maxX),
        };
      }

      if (name === "y") {
        const numeric = Math.round(Number(value) || 0);
        const maxY = Math.max(0, templateHeight - prev.height);
        return {
          ...prev,
          y: Math.min(Math.max(0, numeric), maxY),
        };
      }

      return { ...prev, [name]: value };
    });
  }, [setLayout]);

  const handleAlign = useCallback((align) => {
    setLayout((prev) => {
      if (!prev) return prev;
      return { ...prev, align };
    });
  }, [setLayout]);

  const handleVAlign = useCallback((v_align) => {
    setLayout((prev) => {
      if (!prev) return prev;
      return { ...prev, v_align };
    });
  }, [setLayout]);

  const handleDrag = useCallback(
    (_, data) => {
      setLayout((prev) => {
        if (!prev) return prev;

        const scale = previewScale || 1;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        const nextX = Math.round(data.x / scale);
        const nextY = Math.round(data.y / scale);
        const maxX = Math.max(0, templateWidth - prev.width);
        const maxY = Math.max(0, templateHeight - prev.height);

        const snapThreshold = 10;

        const centerX = nextX + prev.width / 2;
        const templateCenterX = templateWidth / 2;
        setIsSnapXActive(Math.abs(centerX - templateCenterX) < snapThreshold);

        const centerY = nextY + prev.height / 2;
        const templateCenterY = templateHeight / 2;
        setIsSnapYActive(Math.abs(centerY - templateCenterY) < snapThreshold);

        return {
          ...prev,
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        };
      });
    },
    [previewScale, setLayout, setIsSnapXActive, setIsSnapYActive]
  );

  const handleDragStop = useCallback(
    (_, data) => {
      setLayout((prev) => {
        if (!prev) return prev;

        const scale = previewScale || 1;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        let nextX = Math.round(data.x / scale);
        let nextY = Math.round(data.y / scale);
        const maxX = Math.max(0, templateWidth - prev.width);
        const maxY = Math.max(0, templateHeight - prev.height);

        const snapThreshold = 10;

        const centerX = nextX + prev.width / 2;
        const templateCenterX = templateWidth / 2;
        if (Math.abs(centerX - templateCenterX) < snapThreshold) {
          nextX = templateCenterX - prev.width / 2;
        }

        const centerY = nextY + prev.height / 2;
        const templateCenterY = templateHeight / 2;
        if (Math.abs(centerY - templateCenterY) < snapThreshold) {
          nextY = templateCenterY - prev.height / 2;
        }

        setIsSnapXActive(false);
        setIsSnapYActive(false);

        return {
          ...prev,
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        };
      });
    },
    [previewScale, setLayout, setIsSnapXActive, setIsSnapYActive]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (isLayoutLocked || !layout || !templateURL) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      const { key, shiftKey } = e;
      const step = shiftKey ? 10 : 1;

      let dx = 0;
      let dy = 0;

      if (key === "ArrowLeft") dx = -step;
      else if (key === "ArrowRight") dx = step;
      else if (key === "ArrowUp") dy = -step;
      else if (key === "ArrowDown") dy = step;
      else return;

      e.preventDefault();

      setLayout((prev) => {
        if (!prev) return prev;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        const maxX = Math.max(0, templateWidth - prev.width);
        const maxY = Math.max(0, templateHeight - prev.height);

        return {
          ...prev,
          x: Math.min(Math.max(0, prev.x + dx), maxX),
          y: Math.min(Math.max(0, prev.y + dy), maxY),
        };
      });
    },
    [isLayoutLocked, layout, templateURL, setLayout]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleResizeStart = useCallback(() => {
    resizeStartLayoutRef.current = layout ? { ...layout } : null;
  }, [layout]);

  const handleResize = useCallback(
    (_, direction, ref, delta, position) => {
      const startLayout = resizeStartLayoutRef.current;
      if (!startLayout) return;

      setLayout((prev) => {
        if (!prev) return prev;

        const safeScale = previewScale || 1;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        const nextWidth = Math.min(
          templateWidth,
          Math.max(MIN_LAYOUT_WIDTH, startLayout.width + Math.round(delta.width / safeScale))
        );
        const nextHeight = Math.min(
          templateHeight,
          Math.max(MIN_LAYOUT_HEIGHT, startLayout.height + Math.round(delta.height / safeScale))
        );

        const nextX = Math.round((position.x || 0) / safeScale);
        const nextY = Math.round((position.y || 0) / safeScale);

        const maxX = Math.max(0, templateWidth - nextWidth);
        const maxY = Math.max(0, templateHeight - nextHeight);

        const widthScale = nextWidth / (Math.max(1, startLayout.width));
        const heightScale = nextHeight / (Math.max(1, startLayout.height));
        const scaleFactor = Math.max(widthScale, heightScale);

        const nextFontSize = Math.min(
          MAX_FONT_SIZE,
          Math.max(
            MIN_DYNAMIC_FONT_SIZE,
            Math.round(startLayout.fontSize * scaleFactor)
          )
        );

        return {
          ...prev,
          width: nextWidth,
          height: nextHeight,
          fontSize: nextFontSize,
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        };
      });
    },
    [previewScale, setLayout]
  );

  const handleResetZoom = useCallback(() => {
    if (templateImageRef.current) {
      const { naturalWidth, naturalHeight } = templateImageRef.current;
      const autoScale = calculateAutoScale(naturalWidth, naturalHeight);
      setPreviewScale(autoScale);
      setTemplateSize({
        width: Math.round(naturalWidth * autoScale),
        height: Math.round(naturalHeight * autoScale),
      });
      toast.success(`Reset zoom to best fit (${Math.round(autoScale * 100)}%)`);
    } else {
      setPreviewScale(DEFAULT_ZOOM_SCALE);
    }
  }, [setPreviewScale, setTemplateSize]);

  const handlePreviewSelect = useCallback((value) => {
    setPreviewName(value ? toTitleCase(value) : "");
  }, [setPreviewName]);

  const handlePreviewInput = useCallback((value) => {
    setPreviewName(formatNameInput(value || ""));
  }, [setPreviewName]);

  const handleColorSelect = useCallback((hex) => {
    setLayout((prev) => {
      if (!prev) return prev;
      return { ...prev, color: hex };
    });
  }, [setLayout]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        savedLayoutsRef.current = parsed;
      }
    } catch (err) {
      console.warn("Failed to restore saved layouts:", err);
    }
  }, []);

  useEffect(() => {
    if (
      !layout ||
      !templateSignature ||
      !templateURL
    ) {
      return;
    }

    try {
      const snapshot = { ...layout };
      savedLayoutsRef.current = {
        ...savedLayoutsRef.current,
        [templateSignature]: snapshot,
      };
      window.localStorage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify(savedLayoutsRef.current)
      );
    } catch (err) {
      console.warn("Failed to persist layout:", err);
    }
  }, [layout, templateSignature, templateURL]);

  useEffect(() => {
    if (!templateURL) return;

    const { width: naturalWidth, height: naturalHeight } =
      templateNaturalSizeRef.current;
    if (!naturalWidth || !naturalHeight) return;

    setTemplateSize({
      width: Math.round(naturalWidth * previewScale),
      height: Math.round(naturalHeight * previewScale),
    });
  }, [previewScale, templateURL, setTemplateSize]);

  // Derived recipient values are now retrieved from useEmailSending

  const isPreviewFromData = useMemo(() => {
    if (!data.length) return false;
    return data.some((row) => row.Name === previewName);
  }, [data, previewName]);

  const hasExcelRecipients = emailReadyRows.length > 0;
  const layoutIsRequired = true;
  const layoutReady = !!layout && isLayoutLocked;
  const templateAssetsReady = !!template && layoutReady;
  const excelDataReady = hasExcelRecipients ? !!dataFile : true;
  const previewNameIsValid = !!previewName?.trim();

  const canAttemptEmailSend =
    emailDeliveryEnabled &&
    totalReadyRecipients > 0 &&
    (emailAttachmentType !== "certificate" || templateAssetsReady) &&
    (emailAttachmentType !== "shared" || sharedAttachmentFiles.length > 0) &&
    excelDataReady &&
    emailSettings.service.trim().length > 0 &&
    emailSettings.email.trim().length > 0 &&
    emailSettings.password.trim().length > 0 &&
    emailSettings.subject.trim().length > 0 &&
    emailSettings.template.trim().length > 0 &&
    !isSending &&
    !isLoading &&
    !isPreviewLoading;

  const rowsMissingEmails = useMemo(() => {
    if (!data.length) return [];
    return data.filter((row) => {
      const hasName = !!row?.Name?.toString().trim();
      const email = row?.Email?.toString().trim();
      const hasValidEmail = email && isValidEmail(email);
      return hasName && !hasValidEmail;
    });
  }, [data]);

  const handleDownloadMissingEmails = () => {
    if (!rowsMissingEmails.length) {
      toast("No missing emails to download.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(prepareRowsForExport(rowsMissingEmails));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Missing Emails");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(dataBlob, `missing-emails-${Date.now()}.xlsx`);
    toast.success(`Downloaded ${rowsMissingEmails.length} entries.`);
  };

  const rowsWithDuplicateEmails = useMemo(() => {
    if (!data.length) return [];

    const emailCounts = {};
    data.forEach(row => {
      const email = row?.Email?.toString().trim().toLowerCase();
      if (email && isValidEmail(email)) {
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      }
    });

    const seenDuplicates = new Set();
    return data.filter(row => {
      const email = row?.Email?.toString().trim().toLowerCase();
      if (email && emailCounts[email] > 1 && !seenDuplicates.has(email)) {
        seenDuplicates.add(email);
        return true;
      }
      return false;
    });
  }, [data]);

  const handleDownloadDuplicateEmails = () => {
    if (!rowsWithDuplicateEmails.length) {
      toast("No duplicate emails to download.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      prepareRowsForExport(rowsWithDuplicateEmails)
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Duplicate Emails");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(dataBlob, `duplicate-emails-unique-${Date.now()}.xlsx`);
    toast.success(`Downloaded ${rowsWithDuplicateEmails.length} unique duplicate emails.`);
  };

  const sendButtonLabel = isSending
    ? sendProgress
      ? `Sending (${sendProgress.processed}/${sendProgress.total})...`
      : "Sending..."
    : totalReadyRecipients
      ? `Send ${totalReadyRecipients} Email${totalReadyRecipients === 1 ? "" : "s"}`
      : "Generate & Send Emails";

  // Real-time canvas text preview drawing
  useEffect(() => {
    const canvas = previewCanvasRef.current;

    if (!layout || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = Math.max(1, Math.round(layout.width || MIN_LAYOUT_WIDTH));
    const height = Math.max(1, Math.round(layout.height || MIN_LAYOUT_HEIGHT));
    const desiredFontSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.round(layout.fontSize) || 0
    );
    const fontFamily = layout.fontFamily || "sans-serif";
    const fontWeight = layout.fontWeight || "normal";
    const fontStyle = layout.fontStyle || "normal";
    
    const fontSpec = `${fontStyle} ${fontWeight} ${desiredFontSize}px "${fontFamily}"`;
    
    const pixelRatio = window.devicePixelRatio || 1;
    let cancelled = false;

    const drawPreview = async () => {
      if (document.fonts?.load) {
        try {
          if (!document.fonts.check(fontSpec)) {
            await document.fonts.load(fontSpec);
          }
        } catch (err) {
          console.warn("Font preview load warning:", err);
        }
      }

      if (cancelled) return;

      const vBuffer = Math.round(height * 0.4); 
      const hBuffer = Math.round(width * 0.1);  
      
      canvas.width = Math.max(1, Math.round((width + hBuffer * 2) * pixelRatio));
      canvas.height = Math.max(1, Math.round((height + vBuffer * 2) * pixelRatio));
      
      canvas.style.position = 'absolute';
      canvas.style.top = `-${vBuffer * previewScale}px`;
      canvas.style.left = `-${hBuffer * previewScale}px`;
      canvas.style.width = `${(width + hBuffer * 2) * previewScale}px`;
      canvas.style.height = `${(height + vBuffer * 2) * previewScale}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width + hBuffer * 2, height + vBuffer * 2);

      ctx.translate(hBuffer, vBuffer);

      const appliedFontSize = fitFontSizeToBox(
        ctx,
        previewName || "Your Name Here",
        fontFamily,
        desiredFontSize,
        width,
        height,
        fontWeight,
        fontStyle
      );

      const appliedFontSpec = `${fontStyle} ${fontWeight} ${appliedFontSize}px "${fontFamily}"`;
      ctx.font = appliedFontSpec;
      ctx.fillStyle = layout.color || "#000000";
      ctx.textAlign = CANVAS_TEXT_ALIGN[layout.align] || "center";

      let anchorX = width / 2;
      if (layout.align === "left") {
        anchorX = 0;
      } else if (layout.align === "right") {
        anchorX = width;
      }

      const metrics = ctx.measureText(previewName || "Your Name Here");
      const ascent = metrics.actualBoundingBoxAscent || 0;
      const descent = metrics.actualBoundingBoxDescent || 0;
      const actualTextHeight = ascent + descent;
      
      let anchorY;
      ctx.textBaseline = "alphabetic";

      if (layout.v_align === "top") {
        anchorY = ascent;
      } else if (layout.v_align === "bottom") {
        anchorY = height - descent;
      } else {
        anchorY = (height - actualTextHeight) / 2 + ascent;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
      
      ctx.fillText(previewName || "Your Name Here", anchorX, anchorY);
      ctx.restore();
    };

    let animationFrameId;
    let renderTimeout;

    renderTimeout = setTimeout(() => {
      animationFrameId = requestAnimationFrame(drawPreview);
    }, 16);

    return () => {
      cancelled = true;
      clearTimeout(renderTimeout);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [layout, previewName, previewSide, templateURL, previewScale]);

  const getJustifyContent = () => {
    if (!layout) return "center";
    if (layout.align === "left") return "flex-start";
    if (layout.align === "right") return "flex-end";
    return "center";
  };

  const getAlignItems = () => {
    if (!layout) return "center";
    if (layout.v_align === "top") return "flex-start";
    if (layout.v_align === "bottom") return "flex-end";
    return "center";
  };

  const handleManualGenerate = useCallback(async () => {
    if (!manualReadyRecipients.length) {
      toast.error("Add at least one manual recipient with a name and email.");
      return;
    }
    if (!template) {
      toast.error("Upload a template image first.");
      return;
    }
    if (layoutIsRequired && !layout) {
      toast.error("Position the name on the template before generating.");
      return;
    }
    if (layoutIsRequired && !isLayoutLocked) {
      toast.error("Please lock the layout before generating.");
      return;
    }

    setIsManualGenerating(true);
    const toastId = toast.loading(
      `Generating ${manualReadyRecipients.length} manual certificate${manualReadyRecipients.length === 1 ? "" : "s"}...`
    );

    try {
      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) =>
          reject(new Error("Failed to load template image: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      if (manualReadyRecipients.length === 1) {
        const fullName = toTitleCase(
          manualReadyRecipients[0].name?.toString().trim() || ""
        );
        const pdfBlob = await generateCertificatePDF(
          templateImage,
          layout,
          fullName,
          { drawName: true },
          templateBackImageRef.current
        );

        const safeName =
          fullName
            .toString()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, " ")
            .trim() || "certificate";

        const downloadName = `${safeName}.pdf`;
        saveAs(pdfBlob, downloadName);

        setLastGenerationInfo({
          count: 1,
          fileName: downloadName,
          timestamp: new Date().toLocaleString(),
        });

        toast.success(`Downloaded ${downloadName}`, { id: toastId });
      } else {
        const zip = new JSZip();
        const nameCounter = {};

        for (const recipient of manualReadyRecipients) {
          const fullName = toTitleCase(recipient.name?.toString().trim() || "");
          const pdfBlob = await generateCertificatePDF(
            templateImage,
            layout,
            fullName,
            { drawName: true },
            templateBackImageRef.current
          );

          const safeName =
            fullName
              .toString()
              .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
              .replace(/\s+/g, " ")
              .trim() || "certificate";

          nameCounter[safeName] = (nameCounter[safeName] || 0) + 1;
          const uniqueName =
            nameCounter[safeName] > 1
              ? `${safeName}-${nameCounter[safeName]}`
              : safeName;

          zip.file(`${uniqueName}.pdf`, pdfBlob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadName = `manual-certificates-${Date.now()}.zip`;
        saveAs(zipBlob, downloadName);

        setLastGenerationInfo({
          count: manualReadyRecipients.length,
          fileName: downloadName,
          timestamp: new Date().toLocaleString(),
        });

        toast.success(`Downloaded ${downloadName}`, { id: toastId });
      }
    } catch (err) {
      console.error("Manual generation failed:", err);
      toast.error("Generation failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setIsManualGenerating(false);
    }
  }, [manualReadyRecipients, template, layout, layoutIsRequired, isLayoutLocked, setLastGenerationInfo, setIsManualGenerating]);

  const handleGenerate = async () => {
    if (isLoading) return;

    if (!data.length) {
      toast.error("Please load your spreadsheet data first.");
      return;
    }
    if (!template) {
      toast.error("Please upload a template image first.");
      return;
    }
    if (layoutIsRequired && !layout) {
      toast.error("Please position the layout box before generating.");
      return;
    }
    if (layoutIsRequired && !isLayoutLocked) {
      toast.error("Please lock the layout box before generating.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(`Generating ${data.length} certificates...`);

    try {
      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) =>
          reject(new Error("Failed to load template image: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      const zip = new JSZip();
      const nameCounter = {};

      for (const row of data) {
        const fullName = toTitleCase(row.Name || "");
        if (!fullName) continue;

        const pdfBlob = await generateCertificatePDF(
          templateImage,
          layout,
          fullName,
          { drawName: true },
          templateBackImageRef.current
        );

        const safeName =
          fullName
            .toString()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, " ")
            .trim() || "certificate";

        nameCounter[safeName] = (nameCounter[safeName] || 0) + 1;
        const uniqueName =
          nameCounter[safeName] > 1
            ? `${safeName}-${nameCounter[safeName]}`
            : safeName;

        zip.file(`${uniqueName}.pdf`, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const fileBaseName = dataFile?.name ? stripExtension(dataFile.name) : "";
      const fallbackBaseName = fileBaseName || `certificates-${Date.now()}`;
      const zipBaseName = sanitizeFileBaseName(
        sheetName || fileBaseName,
        fallbackBaseName
      );
      const downloadName = `${zipBaseName}.zip`;

      saveAs(zipBlob, downloadName);

      setLastGenerationInfo({
        count: data.length || 0,
        fileName: downloadName,
        timestamp: new Date().toLocaleString(),
      });

      toast.success(`Downloading ${downloadName}`, { id: toastId });
    } catch (err) {
      console.error("Client-side generation failed:", err);
      toast.error("Generation failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Email generation and send processes are now retrieved from useEmailSending

  const handleDownloadPreview = async () => {
    if (!template) {
      toast.error("Please upload a template first.");
      return;
    }
    if (layoutIsRequired && !layout) {
      toast.error("Please position the name on the template.");
      return;
    }
    if (layoutIsRequired && !isLayoutLocked) {
      toast.error("Please lock the layout before generating.");
      return;
    }
    if (layoutIsRequired && !previewNameIsValid) {
      toast.error("Please enter a valid name to preview and download.");
      return;
    }

    setIsPreviewLoading(true);
    const baseTemplateName = template?.name || "certificate.png";
    const previewLabel =
      layoutIsRequired && previewNameIsValid
        ? previewName
        : stripExtension(baseTemplateName) || "Shared Certificate";
    const toastId = toast.loading(
      `Generating preview for ${previewLabel || baseTemplateName}...`
    );

    try {
      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) =>
          reject(new Error("Failed to load template image: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      const pdfBlob = await generateCertificatePDF(
        templateImage,
        layout,
        previewLabel,
        { drawName: true },
        templateBackImageRef.current
      );

      const safeName =
        previewLabel
          .toString()
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
          .replace(/\s+/g, " ")
          .trim() || "certificate";

      const downloadName = `${safeName}.pdf`;

      saveAs(pdfBlob, downloadName);

      toast.success(`Downloading ${downloadName}`, { id: toastId });
    } catch (err) {
      console.error("Client-side preview download failed:", err);
      toast.error("Preview failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadAllZIP = async () => {
    if (!template || !previewImages.length) {
      toast.error("Generate previews first before downloading.");
      return;
    }

    const toastId = toast.loading(`Packaging ${previewImages.length} certificates...`);
    try {
      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error("Failed to load template: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      const zip = new JSZip();
      for (const { name } of previewImages) {
        const pdfBlob = await generateCertificatePDF(templateImage, layout, name, { drawName: true }, templateBackImageRef.current);
        const safeName = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, " ").trim() || "certificate";
        zip.file(`${safeName}.pdf`, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `all-certificates-${Date.now()}.zip`);
      toast.success(`Downloading ${previewImages.length} certificates`, { id: toastId });
    } catch (err) {
      toast.error("ZIP failed: " + (err.message || "Unknown error"), { id: toastId });
    }
  };

  const handleGeneratePreviews = async () => {
    if (!data.length || !templateImageRef.current || !layout) {
      toast.error("Missing template, data, or layout.");
      return;
    }

    setIsPreviewGridLoading(true);
    setPreviewImages([]);

    const toastId = toast.loading(`Generating ${data.length} previews...`, {
      duration: 10000,
    });

    try {
      const templateImage = templateImageRef.current;
      const generatedImages = [];
      const drawName = true;

      const chunkSize = 25;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);

        toast.loading(
          `Generating previews... (${i + chunk.length}/${data.length})`,
          { id: toastId }
        );

        const promises = chunk.map(async (row) => {
          const fullName = row.Name;
          if (!fullName) return null;

          const localCanvas = document.createElement("canvas");
          const imageDataUrl = await drawCertificateToCanvasThumbnail(
            localCanvas,
            templateImage,
            layout,
            fullName,
            { drawName }
          );

          return {
            name: fullName,
            imageSrc: imageDataUrl,
          };
        });

        const results = (await Promise.all(promises)).filter(Boolean);
        generatedImages.push(...results);

        setPreviewImages([...generatedImages]);

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      toast.success(`Generated ${generatedImages.length} previews.`, {
        id: toastId,
      });
    } catch (err) {
      console.error("Preview grid generation failed:", err);
      toast.error(
        "Preview generation failed: " + (err.message || "Unknown error"),
        { id: toastId }
      );
    } finally {
      setIsPreviewGridLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-bg-primary">
      <Toaster position="bottom-right" />
      <EditorHeader
        currentPath={currentPath}
        navigate={navigate}
        authUser={authUser}
        onLogout={onLogout}
      />

      <div className="flex flex-col xl:flex-row w-full flex-1 min-h-0 relative">
        <div className={`fixed xl:static inset-x-0 bottom-0 z-40 bg-bg-surface border-t xl:border-t-0 border-border-custom rounded-t-2xl xl:rounded-none p-5 xl:p-7 xl:w-[360px] xl:shrink-0 xl:h-[calc(100vh-56px)] xl:sticky xl:top-[56px] xl:border-r flex flex-col gap-3 overflow-y-auto max-h-[85vh] xl:max-h-none transition-transform duration-300 ease-in-out ${
          isBottomSheetOpen ? "translate-y-0" : "translate-y-full xl:translate-y-0"
        }`}>
          <div className="w-12 h-1 bg-border-light rounded-full mx-auto mb-2 cursor-pointer xl:hidden hover:bg-text-muted transition-colors" onClick={() => setIsBottomSheetOpen(false)} />
          <LayerPanel
            template={template}
            onOpenTemplateLibrary={() => setIsTemplateModalOpen(true)}
            getTemplateProps={getTemplateProps}
            getTemplateInputProps={getTemplateInputProps}
            clearTemplate={clearTemplate}
            templateBack={templateBack}
            getTemplateBackProps={getTemplateBackProps}
            getTemplateBackInputProps={getTemplateBackInputProps}
            clearTemplateBack={clearTemplateBack}
            dataFile={dataFile}
            getDataProps={getDataProps}
            getDataInputProps={getDataInputProps}
            clearDataFile={clearDataFile}
            isCanvaConnected={isCanvaConnected}
            setIsCanvaModalOpen={setIsCanvaModalOpen}
            handleConnectCanva={handleConnectCanva}
            handleDisconnectCanva={handleDisconnectCanva}
          />

          <PropertiesPanel
            layout={layout}
            setLayout={setLayout}
            serverFonts={serverFonts}
            MAX_FONT_SIZE={MAX_FONT_SIZE}
            handleLayoutChange={handleLayoutChange}
            isLayoutLocked={isLayoutLocked}
            COLOR_SWATCHES={COLOR_SWATCHES}
            handleColorSelect={handleColorSelect}
            handleAlign={handleAlign}
            handleVAlign={handleVAlign}
            setIsLayoutLocked={setIsLayoutLocked}
            setPreviewImages={setPreviewImages}
            template={template}
            previewName={previewName}
            handlePreviewInput={handlePreviewInput}
            data={data}
            isPreviewFromData={isPreviewFromData}
            handleDownloadPreview={handleDownloadPreview}
            isPreviewLoading={isPreviewLoading}
            previewNameIsValid={previewNameIsValid}
            layoutReady={layoutReady}
          />

          <React.Suspense fallback={<div className="flex items-center justify-center p-6 text-sm text-text-secondary animate-pulse">Loading recipients...</div>}>
            <ManualRecipientsPanel
              MAX_MANUAL_RECIPIENTS={MAX_MANUAL_RECIPIENTS}
              manualRecipients={manualRecipients}
              handleManualRecipientChange={handleManualRecipientChange}
              removeManualRecipient={removeManualRecipient}
              addManualRecipient={addManualRecipient}
              manualRecipientLimitReached={manualRecipientLimitReached}
              handleManualGenerate={handleManualGenerate}
              template={template}
              manualReadyRecipients={manualReadyRecipients}
              isManualGenerating={isManualGenerating}
              layoutReady={layoutReady}
            />
          </React.Suspense>

          <React.Suspense fallback={<div className="flex items-center justify-center p-6 text-sm text-text-secondary animate-pulse">Loading email settings...</div>}>
            <EmailSettingsPanel
              emailDeliveryEnabled={emailDeliveryEnabled}
              setEmailDeliveryEnabled={setEmailDeliveryEnabled}
              emailAttachmentType={emailAttachmentType}
              setEmailAttachmentType={setEmailAttachmentType}
              isSending={isSending}
              getSharedFileProps={getSharedFileProps}
              getSharedFileInputProps={getSharedFileInputProps}
              sharedAttachmentFiles={sharedAttachmentFiles}
              clearSharedAttachment={clearSharedAttachment}
              emailSettings={emailSettings}
              handleEmailSettingsChange={handleEmailSettingsChange}
              selectedMessagePresetId={selectedMessagePresetId}
              handleLoadPreset={handleLoadPreset}
              isSavingMessagePreset={isSavingMessagePreset}
              presets={presets}
              handleDeletePreset={handleDeletePreset}
              newMessagePresetName={newMessagePresetName}
              setNewMessagePresetName={setNewMessagePresetName}
              handleSavePreset={handleSavePreset}
              insertFormat={insertFormat}
              insertLink={insertLink}
              promptForImage={promptForImage}
              handleImageUpload={handleImageUpload}
              insertPlaceholder={insertPlaceholder}
              selectedSignaturePresetId={selectedSignaturePresetId}
              isSavingSignaturePreset={isSavingSignaturePreset}
              newSignaturePresetName={newSignaturePresetName}
              setNewSignaturePresetName={setNewSignaturePresetName}
              emailReadyRows={emailReadyRows}
              data={data}
              manualReadyRecipients={manualReadyRecipients}
              skipDuplicates={skipDuplicates}
              setSkipDuplicates={setSkipDuplicates}
              rowsMissingEmails={rowsMissingEmails}
              handleDownloadMissingEmails={handleDownloadMissingEmails}
              rowsWithDuplicateEmails={rowsWithDuplicateEmails}
              handleDownloadDuplicateEmails={handleDownloadDuplicateEmails}
              handleGenerate={handleGenerate}
              template={template}
              dataFile={dataFile}
              isLoading={isLoading}
              isPreviewLoading={isPreviewLoading}
              layoutIsRequired={layoutIsRequired}
              layoutReady={layoutReady}
              handleGenerateAndSend={handleGenerateAndSend}
              canAttemptEmailSend={canAttemptEmailSend}
              sendButtonLabel={sendButtonLabel}
              handleStopSending={handleStopSending}
              lastGenerationInfo={lastGenerationInfo}
              emailSummary={emailSummary}
              isPaused={isSendingPaused}
              onTogglePause={() => {
                isSendingPausedRef.current = !isSendingPausedRef.current;
                setIsSendingPaused(isSendingPausedRef.current);
              }}
              handleRetryFailed={handleRetryFailed}
            />
          </React.Suspense>
        </div>

        <CanvasStage
          templateURL={templateURL}
          previewScale={previewScale}
          setPreviewScale={setPreviewScale}
          previewName={previewName}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          template={template}
          templateBackURL={templateBackURL}
          previewSide={previewSide}
          setPreviewSide={setPreviewSide}
          templateSize={templateSize}
          layout={layout}
          isSnapXActive={isSnapXActive}
          isSnapYActive={isSnapYActive}
          handleDragStop={handleDragStop}
          handleDrag={handleDrag}
          handleResizeStart={handleResizeStart}
          handleResize={handleResize}
          isLayoutLocked={isLayoutLocked}
          MIN_LAYOUT_WIDTH={MIN_LAYOUT_WIDTH}
          MIN_LAYOUT_HEIGHT={MIN_LAYOUT_HEIGHT}
          getJustifyContent={getJustifyContent}
          getAlignItems={getAlignItems}
          previewCanvasRef={previewCanvasRef}
          handleResetZoom={handleResetZoom}
        />

        <PreviewGrid
          data={data}
          template={template}
          isLayoutLocked={isLayoutLocked}
          isPreviewGridLoading={isPreviewGridLoading}
          previewImages={previewImages}
          handleGeneratePreviews={handleGeneratePreviews}
          layoutReady={layoutReady}
          templateImageRef={templateImageRef}
          setPreviewImages={setPreviewImages}
          handlePreviewSelect={handlePreviewSelect}
          PREVIEW_THUMBNAIL_WIDTH={PREVIEW_THUMBNAIL_WIDTH}
          handleDownloadAllZIP={handleDownloadAllZIP}
          className={`fixed xl:static inset-x-0 bottom-0 z-40 rounded-t-2xl xl:rounded-none border-t xl:border-t-0 p-5 xl:p-7 max-h-[85vh] xl:max-h-none transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? "translate-y-0" : "translate-y-full xl:translate-y-0"
          }`}
          onCloseDrawer={() => setIsDrawerOpen(false)}
        />
      </div>

      <React.Suspense fallback={null}>
        <CanvaDesignModal
          isOpen={isCanvaModalOpen}
          onClose={() => setIsCanvaModalOpen(false)}
          onSelect={handleSelectCanvaDesign}
          userId={authUserId}
          apiBaseUrl={API_BASE_URL}
        />
        <TemplateLibraryModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          userId={authUserId}
          apiBaseUrl={API_BASE_URL}
          onLoadTemplate={handleLoadTemplate}
          currentLayout={layout}
          currentTemplateUrl={templateURL}
          currentTemplateBackUrl={templateBackURL}
        />
      </React.Suspense>

      {/* Backdrop overlay for mobile bottom sheet / drawer */}
      {(isBottomSheetOpen || isDrawerOpen) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 transition-opacity duration-300 xl:hidden"
          onClick={() => {
            setIsBottomSheetOpen(false);
            setIsDrawerOpen(false);
          }}
        />
      )}

      {/* Mobile Sticky Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 h-16 bg-bg-surface border-t border-border-custom flex items-center justify-around z-50 xl:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
        <button
          type="button"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all duration-150 ${
            isBottomSheetOpen ? "text-accent" : "text-text-secondary hover:text-text-primary"
          }`}
          onClick={() => {
            setIsBottomSheetOpen(!isBottomSheetOpen);
            setIsDrawerOpen(false);
          }}
        >
          <span style={{ fontSize: "20px" }}>📐</span>
          <span>Configure</span>
        </button>
        <button
          type="button"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all duration-150 ${
            isDrawerOpen ? "text-accent" : "text-text-secondary hover:text-text-primary"
          }`}
          onClick={() => {
            setIsDrawerOpen(!isDrawerOpen);
            setIsBottomSheetOpen(false);
          }}
        >
          <span style={{ fontSize: "20px" }}>👁️</span>
          <span>Previews ({data.length})</span>
        </button>
      </div>
    </div>
  );
}
