import { useCallback } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import { useAppStore } from "../store/useAppStore";
import {
  toTitleCase,
  sanitizeFileBaseName,
  stripExtension,
  getCellKeyAndValue,
} from "../../utils/textHelpers";

export function useSheetImport() {
  const {
    setDataFile,
    setData,
    setSheetName,
    setOriginalExcelKeys,
    setPreviewImages,
    setPreviewName,
    setEmailSummary,
    setLastGenerationInfo,
  } = useAppStore();

  const onDataDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setLastGenerationInfo(null);
      setEmailSummary(null);
      setDataFile(file);
      setSheetName("");
      setPreviewImages([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames?.[0] || "";
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            toast.error("Excel workbook must contain at least one sheet.");
            setDataFile(null);
            setData([]);
            setSheetName("");
            return;
          }
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            toast.error('Excel must have a "Name" column!');
            setDataFile(null);
            setData([]);
            setSheetName("");
            return;
          }

          const keys = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          setOriginalExcelKeys(keys);

          const namesData = jsonData
            .map((row) => {
              const nameMatch = getCellKeyAndValue(row, "Name");
              const emailMatch = getCellKeyAndValue(row, "Email");

              const formattedName = toTitleCase(nameMatch.value || "");
              if (!formattedName) return null;

              const emailValue = (emailMatch.value || "").toString().trim();

              const newRow = { ...row };
              if (nameMatch.key) newRow[nameMatch.key] = formattedName;
              if (emailMatch.key) newRow[emailMatch.key] = emailValue;

              newRow.Name = formattedName;
              newRow.Email = emailValue;

              return newRow;
            })
            .filter(Boolean);

          if (!namesData.length) {
            toast.error('Excel must have a "Name" column!');
            setDataFile(null);
            setData([]);
            setSheetName("");
            return;
          }

          const fileBaseName = stripExtension(file?.name || "");
          const normalizedSheetName =
            firstSheetName || fileBaseName || "certificates";
          const sanitizedSheetName = sanitizeFileBaseName(
            normalizedSheetName,
            fileBaseName || "certificates"
          );

          const hasEmails = namesData.some((row) => row.Email);

          setSheetName(sanitizedSheetName);
          setData(namesData);
          setPreviewName(namesData[0]?.Name || "");
          toast.success(`Loaded ${namesData.length} names.`);

          if (!hasEmails) {
            toast(
              "Optional: add an Email column to send certificates directly.",
              {
                icon: "📧",
              }
            );
          }
        } catch (err) {
          toast.error("Failed to parse Excel file: " + err.message);
          setDataFile(null);
          setData([]);
          setSheetName("");
        }
      };
      reader.onerror = (err) => {
        toast.error("Failed to read file: " + err.message);
        setSheetName("");
      };
      reader.readAsArrayBuffer(file);
    },
    [
      setLastGenerationInfo,
      setEmailSummary,
      setDataFile,
      setSheetName,
      setPreviewImages,
      setData,
      setOriginalExcelKeys,
      setPreviewName,
    ]
  );

  return { onDataDrop };
}
