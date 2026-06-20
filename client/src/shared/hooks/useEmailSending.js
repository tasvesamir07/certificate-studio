import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";
import { useAppStore } from "../store/useAppStore";
import { useApi } from "./useApi";
import { buildApiUrl } from "../../utils/api";
import {
  resolveApiBase,
  toTitleCase,
  isValidEmail,
  sanitizeFileBaseName,
  getCellValue,
} from "../../utils/textHelpers";
import { generateCertificatePDF } from "../../utils/canvasHelpers";

const API_BASE_URL = resolveApiBase();
const MAX_BATCH_SIZE = 100;

export function useEmailSending({ templateImageRef, templateBackImageRef }) {
  const {
    data,
    manualRecipients,
    skipDuplicates,
    template,
    layout,
    isLayoutLocked,
    emailDeliveryEnabled,
    emailAttachmentType,
    sharedAttachmentFiles,
    dataFile,
    emailSettings,
    emailSummary,
    setEmailSummary,
    setSendProgress,
    setIsSending,
    isSending,
    authUserId,
    originalExcelKeys,
  } = useAppStore();

  const { uploadAttachment, cleanupAttachments } = useApi(API_BASE_URL);

  const [isSendingPaused, setIsSendingPaused] = useState(false);
  const isSendingPausedRef = useRef(false);
  const stopSendingRef = useRef(false);

  const handleStopSending = useCallback(() => {
    stopSendingRef.current = true;
    toast("Stopping... finishing current email then halting.", {
      icon: "🛑",
    });
  }, []);

  const prepareRowsForExport = useCallback(
    (rows) => {
      if (!originalExcelKeys || originalExcelKeys.length === 0) return rows;
      return rows.map((r) => {
        const cleanRow = {};
        originalExcelKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(r, key)) {
            cleanRow[key] = r[key];
          }
        });
        return cleanRow;
      });
    },
    [originalExcelKeys]
  );

  const emailReadyRows = useMemo(() => {
    if (!data.length) return [];

    const seen = new Set();
    return data.filter((row) => {
      const value = row?.Email?.toString().trim();
      if (!value || !isValidEmail(value)) return false;

      const emailLower = value.toLowerCase();
      if (skipDuplicates) {
        if (seen.has(emailLower)) return false;
        seen.add(emailLower);
      }
      return true;
    });
  }, [data, skipDuplicates]);

  const manualReadyRecipients = useMemo(() => {
    return manualRecipients.filter((recipient) => {
      const name = recipient?.name?.toString().trim();
      const email = recipient?.email?.toString().trim();
      return !!name && !!email && isValidEmail(email);
    });
  }, [manualRecipients]);

  const totalReadyRecipients =
    manualReadyRecipients.length + emailReadyRows.length;

  const executeEmailSendProcess = useCallback(
    async (toSend, remaining = [], originalAttemptCount = null) => {
      const totalRecipients = toSend.length;
      const emailNoun = `personalized email${totalRecipients === 1 ? "" : "s"}`;
      const toastId = toast.loading(`Preparing to send ${emailNoun}...`);

      const service = emailSettings.service.trim();
      const senderEmail = emailSettings.email.trim();
      const password = emailSettings.password.trim();
      const subject = emailSettings.subject.trim();
      const templateMessage = emailSettings.template.trim();

      try {
        if (emailAttachmentType === "shared" && sharedAttachmentFiles.length > 0) {
          const totalSize = sharedAttachmentFiles.reduce((acc, file) => acc + (file?.size || 0), 0);
          if (totalSize > 25 * 1024 * 1024) {
            toast(
              "Caution: Your attachments exceed 25MB. Many email providers (like Gmail) may reject these emails.",
              { icon: "⚠️", duration: 6000 }
            );
          }
        }

        const fullMessage = emailSettings.signature
          ? `${templateMessage}\n\n${emailSettings.signature}`
          : templateMessage;

        let successCount = 0;
        let failures = [];
        let sharedRemoteAttachments = [];

        setIsSending(true);
        isSendingPausedRef.current = false;
        setIsSendingPaused(false);
        stopSendingRef.current = false;

        if (emailAttachmentType === "shared" && sharedAttachmentFiles.length > 0) {
          toast.loading("Uploading shared attachments once...", { id: toastId });
          try {
            for (const file of sharedAttachmentFiles) {
              if (!file) continue;
              const uploadedAttachment = await uploadAttachment(file, "shared");
              sharedRemoteAttachments.push(uploadedAttachment);
            }
          } catch (uploadErr) {
            if (sharedRemoteAttachments.length) {
              try {
                await cleanupAttachments(sharedRemoteAttachments);
              } catch (cleanupErr) {
                console.error("Shared attachment cleanup failed:", cleanupErr);
              }
            }
            throw new Error(
              "Failed to pre-upload shared attachments. " +
                (uploadErr.response?.data?.message || uploadErr.message)
            );
          }
        }

        const CONCURRENCY_LIMIT = 10;
        let nextIndex = 0;
        let processedCount = 0;

        const emailService = service;
        const emailUser = senderEmail;
        const emailPass = password;
        const senderName = emailSettings.senderName || "";
        const emailSubject = subject;
        const emailTemplate = fullMessage;
        const attachmentMode = emailAttachmentType;
        const personalizeWithNames = true;
        const API_SEND_SINGLE_URL = buildApiUrl(API_BASE_URL, "api/send-single");

        const sendNext = async (workerId) => {
          while (true) {
            let i;
            if (nextIndex < toSend.length) {
              i = nextIndex++;
            } else {
              break;
            }

            if (i >= toSend.length || stopSendingRef.current) break;

            // PAUSE CHECK
            while (isSendingPausedRef.current && !stopSendingRef.current) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            if (stopSendingRef.current) break;

            const recipientSnapshot = { ...toSend[i] };
            const { name: rName, email: rEmail } = recipientSnapshot;
            let recipientRemoteAttachments = [];

            try {
              const formData = new FormData();
              formData.append("emailService", emailService);
              formData.append("emailUser", emailUser);
              formData.append("emailPass", emailPass);
              formData.append("senderName", senderName);
              formData.append("emailSubject", emailSubject);
              formData.append("emailTemplate", emailTemplate);
              formData.append("recipientName", rName);
              formData.append("recipientEmail", rEmail);

              let verificationCode = "";
              let filePublicUrl = "";

              if (attachmentMode === "certificate") {
                const pdfBlob = await generateCertificatePDF(
                  templateImageRef.current,
                  layout,
                  rName,
                  { drawName: personalizeWithNames },
                  templateBackImageRef.current
                );
                const pdfFile = new File(
                  [pdfBlob],
                  `${sanitizeFileBaseName(rName, "certificate")}.pdf`,
                  { type: "application/pdf" }
                );
                const uploadedAttachment = await uploadAttachment(pdfFile, "certificate");
                recipientRemoteAttachments = [uploadedAttachment];
                filePublicUrl = uploadedAttachment.publicUrl || uploadedAttachment.url || "";

                formData.append(
                  "remoteAttachments",
                  JSON.stringify(recipientRemoteAttachments)
                );
                formData.append("autoCleanupRemoteAttachments", "true");

                // Save issued certificate in DB for verification
                try {
                  const issueRes = await axios.post(`${API_BASE_URL}/api/verify/issue`, {
                    userId: authUserId || window.localStorage.getItem("certificate-studio-userId"),
                    recipientName: rName,
                    recipientEmail: rEmail,
                    certificateUrl: filePublicUrl,
                  });
                  verificationCode = issueRes.data.id;
                } catch (dbErr) {
                  console.error("Failed to register certificate in verification DB:", dbErr);
                }
              } else if (attachmentMode === "shared" && sharedRemoteAttachments.length) {
                formData.append(
                  "remoteAttachments",
                  JSON.stringify(sharedRemoteAttachments)
                );
                formData.append("autoCleanupRemoteAttachments", "false");
              }

              await axios.post(API_SEND_SINGLE_URL, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });

              successCount++;
            } catch (error) {
              const reason = error.response?.data?.message || error.message || "Unknown error";
              failures.push({
                name: rName,
                email: rEmail,
                reason: reason,
              });
              if (recipientRemoteAttachments.length) {
                cleanupAttachments(recipientRemoteAttachments).catch((cleanupErr) => {
                  console.error("Recipient attachment cleanup failed:", cleanupErr);
                });
              }
            } finally {
              processedCount++;
              const pct = Math.round((processedCount / toSend.length) * 100);
              toast.loading(
                `Sending... ${processedCount}/${toSend.length} (${pct}%) ${isSendingPausedRef.current ? "[PAUSED]" : ""}`,
                {
                  id: toastId,
                }
              );
              setSendProgress({
                processed: processedCount,
                total: toSend.length,
              });
            }
          }
        };

        try {
          const workers = Array.from(
            { length: Math.min(CONCURRENCY_LIMIT, toSend.length) },
            (_, idx) => sendNext(idx + 1)
          );
          await Promise.all(workers);

          if (stopSendingRef.current) {
            toast("Sending stopped by user.", { id: toastId, icon: "⚠️" });
            const stoppedRemaining = [...toSend.slice(nextIndex), ...remaining];
            if (stoppedRemaining.length > 0) {
              const ws = XLSX.utils.json_to_sheet(
                prepareRowsForExport(stoppedRemaining)
              );
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Stopped Remaining");
              const excelBuffer = XLSX.write(wb, {
                bookType: "xlsx",
                type: "array",
              });
              const dataBlob = new Blob([excelBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
              saveAs(dataBlob, `stopped-remaining-${Date.now()}.xlsx`);
              toast.success(
                `Downloaded ${stoppedRemaining.length} remaining recipients.`,
                { icon: "📥" }
              );
            }
          }
        } finally {
          if (sharedRemoteAttachments.length) {
            try {
              await cleanupAttachments(sharedRemoteAttachments);
            } catch (cleanupErr) {
              console.error("Cleanup failed:", cleanupErr);
            }
          }
        }

        setSendProgress(null);
        setIsSending(false);
        setIsSendingPaused(false);
        isSendingPausedRef.current = false;

        const finalStatus = failures.length
          ? successCount
            ? "partial_failure"
            : "failed"
          : "success";

        const attemptedCount = originalAttemptCount || totalRecipients;

        setEmailSummary({
          timestamp: new Date().toLocaleString(),
          status: finalStatus,
          successCount,
          failureCount: failures.length,
          attempted: attemptedCount,
          failures,
        });

        if (finalStatus === "success") {
          toast.success(`Successfully sent ${successCount} emails.`, {
            id: toastId,
          });
        } else {
          toast.error(
            `Sent ${successCount} emails, but ${failures.length} failed.`,
            { id: toastId }
          );
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to send certificates.";
        toast.error(message, { id: toastId });
        setIsSending(false);
        setIsSendingPaused(false);
        isSendingPausedRef.current = false;
      }
    },
    [
      emailSettings,
      emailAttachmentType,
      sharedAttachmentFiles,
      authUserId,
      layout,
      templateImageRef,
      templateBackImageRef,
      uploadAttachment,
      cleanupAttachments,
      setSendProgress,
      setIsSending,
      setEmailSummary,
      prepareRowsForExport,
    ]
  );

  const handleGenerateAndSend = useCallback(async () => {
    if (isSending) return;

    if (!emailDeliveryEnabled) {
      toast.error("Enable email delivery before sending.");
      return;
    }

    const manualTargets = manualReadyRecipients.map((recipient) => ({
      name: toTitleCase(recipient.name?.toString().trim() || ""),
      email: recipient.email?.toString().trim(),
    }));

    const totalRecipients = manualTargets.length + emailReadyRows.length;

    if (!totalRecipients) {
      toast.error(
        "Add at least one recipient via your Excel sheet or the manual section."
      );
      return;
    }

    if (emailAttachmentType === "certificate") {
      if (!template) {
        toast.error("Upload a template image before attaching certificates.");
        return;
      }
      if (layout && !layout) { // wait, layoutIsRequired was always true
        toast.error("Position the layout before sending attachments.");
        return;
      }
      if (!isLayoutLocked) {
        toast.error("Please lock the layout before sending attachments.");
        return;
      }
    } else if (emailAttachmentType === "shared") {
      if (!sharedAttachmentFiles.length) {
        toast.error(
          "Upload at least one shared file (PDF, DOCX, etc.) to attach."
        );
        return;
      }
    }

    if (emailReadyRows.length && !dataFile) {
      toast.error("Re-upload the Excel file to reach spreadsheet recipients.");
      return;
    }

    const service = emailSettings.service.trim();
    const senderEmail = emailSettings.email.trim();
    const password = emailSettings.password.trim();
    const subject = emailSettings.subject.trim();
    const templateMessage = emailSettings.template.trim();

    if (!service) {
      toast.error("Enter the email service (e.g., gmail, outlook).");
      return;
    }
    if (!senderEmail) {
      toast.error("Enter the sender email address.");
      return;
    }
    if (!isValidEmail(senderEmail)) {
      toast.error(
        "Sender email looks invalid. Please use a valid email address."
      );
      return;
    }
    if (!password) {
      toast.error("Enter the email app password.");
      return;
    }
    if (!subject) {
      toast.error("Add an email subject line.");
      return;
    }
    if (!templateMessage) {
      toast.error("Add the message template that includes {name}.");
      return;
    }

    const invalidManual = manualRecipients.find((recipient) => {
      const email = recipient?.email?.toString().trim();
      const name = recipient?.name?.toString().trim();
      return name && email && !isValidEmail(email);
    });

    if (invalidManual) {
      toast.error(
        `Invalid email for ${invalidManual.name || "a manual recipient"}. Please fix before sending.`
      );
      return;
    }

    let excelTargets = [];
    if (emailReadyRows.length && dataFile) {
      excelTargets = emailReadyRows
        .map((row) => {
          const name = toTitleCase(getCellValue(row, "Name") || "");
          const email = (getCellValue(row, "Email") || "").toString().trim();
          return { ...row, name, email };
        })
        .filter((r) => r.name && isValidEmail(r.email));
    }

    let recipients = [...excelTargets, ...manualTargets];
    if (skipDuplicates) {
      const seenEmails = new Set();
      recipients = recipients.filter((r) => {
        const lowerEmail = r.email.toLowerCase();
        if (seenEmails.has(lowerEmail)) return false;
        seenEmails.add(lowerEmail);
        return true;
      });
    }

    if (!recipients.length) {
      toast.error("No valid recipients found with both Name and Email.");
      return;
    }

    let toSend = recipients;
    let remaining = [];
    if (recipients.length > MAX_BATCH_SIZE) {
      toSend = recipients.slice(0, MAX_BATCH_SIZE);
      remaining = recipients.slice(MAX_BATCH_SIZE);
      toast(`Batch limit reached: Only the first ${MAX_BATCH_SIZE} will be sent. The rest will be provided for download.`, {
        icon: "⚡",
        duration: 6000,
      });

      const ws = XLSX.utils.json_to_sheet(remaining);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Remaining Recipients");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const dataBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(dataBlob, `remaining-recipients-${Date.now()}.xlsx`);
      toast.success(`Remaining ${remaining.length} recipients downloaded.`, { icon: "📥" });
    }

    await executeEmailSendProcess(toSend, remaining);
  }, [
    isSending,
    emailDeliveryEnabled,
    manualReadyRecipients,
    emailReadyRows,
    emailAttachmentType,
    template,
    layout,
    isLayoutLocked,
    sharedAttachmentFiles,
    dataFile,
    emailSettings,
    manualRecipients,
    skipDuplicates,
    executeEmailSendProcess,
  ]);

  const handleRetryFailed = useCallback(async () => {
    if (!emailSummary || !emailSummary.failures || !emailSummary.failures.length) return;
    const toRetry = [...emailSummary.failures];
    await executeEmailSendProcess(toRetry, [], emailSummary.attempted);
  }, [emailSummary, executeEmailSendProcess]);

  return {
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
  };
}
