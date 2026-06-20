import React from "react";
import { useAppStore } from "../shared/store/useAppStore";
import { isValidEmail } from "../utils/textHelpers";

const escapeHtml = (text = "") => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const EmailSettingsPanel = ({
  getSharedFileProps,
  getSharedFileInputProps,
  clearSharedAttachment,
  handleEmailSettingsChange,
  handleLoadPreset,
  handleDeletePreset,
  handleSavePreset,
  insertFormat,
  insertLink,
  promptForImage,
  handleImageUpload,
  insertPlaceholder,
  handleDownloadMissingEmails,
  handleDownloadDuplicateEmails,
  handleGenerate,
  handleGenerateAndSend,
  handleStopSending,
  isPaused,
  onTogglePause,
  handleRetryFailed,
}) => {
  const {
    emailDeliveryEnabled,
    setEmailDeliveryEnabled,
    emailAttachmentType,
    setEmailAttachmentType,
    isSending,
    sharedAttachmentFiles,
    emailSettings,
    setEmailSettings,
    presets,
    selectedMessagePresetId,
    isSavingMessagePreset,
    newMessagePresetName,
    setNewMessagePresetName,
    selectedSignaturePresetId,
    isSavingSignaturePreset,
    newSignaturePresetName,
    setNewSignaturePresetName,
    data,
    manualRecipients,
    skipDuplicates,
    setSkipDuplicates,
    template,
    dataFile,
    isLoading,
    isPreviewLoading,
    layout,
    isLayoutLocked,
    sendProgress,
    lastGenerationInfo,
    emailSummary,
  } = useAppStore();

  const emailReadyRows = React.useMemo(() => {
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

  const manualReadyRecipients = React.useMemo(() => {
    return manualRecipients.filter((recipient) => {
      const name = recipient?.name?.toString().trim();
      const email = recipient?.email?.toString().trim();
      return !!name && !!email && isValidEmail(email);
    });
  }, [manualRecipients]);

  const totalReadyRecipients = manualReadyRecipients.length + emailReadyRows.length;
  const layoutIsRequired = true;
  const layoutReady = !!layout && isLayoutLocked;
  const templateAssetsReady = !!template && layoutReady;
  const hasExcelRecipients = emailReadyRows.length > 0;
  const excelDataReady = hasExcelRecipients ? !!dataFile : true;

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

  const rowsMissingEmails = React.useMemo(() => {
    if (!data.length) return [];
    return data.filter((row) => {
      const hasName = !!row?.Name?.toString().trim();
      const email = row?.Email?.toString().trim();
      const hasValidEmail = email && isValidEmail(email);
      return hasName && !hasValidEmail;
    });
  }, [data]);

  const rowsWithDuplicateEmails = React.useMemo(() => {
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

  const sendButtonLabel = isSending
    ? sendProgress
      ? `Sending (${sendProgress.processed}/${sendProgress.total})...`
      : "Sending..."
    : totalReadyRecipients
      ? `Send ${totalReadyRecipients} Email${totalReadyRecipients === 1 ? "" : "s"}`
      : "Generate & Send Emails";

  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-xs font-bold text-text-primary uppercase tracking-wide">6. Email Delivery (Optional)</label>
      <p className="text-xs text-text-muted mb-2 leading-relaxed">
        Personalize your email with <code>{"{name}"}</code> to insert each
        recipient's name automatically.
      </p>
      <label className="flex items-center gap-2 text-xs font-bold text-text-primary mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={emailDeliveryEnabled}
          onChange={(event) => {
            setEmailDeliveryEnabled(event.target.checked);
          }}
          className="w-4 h-4 rounded border-border-light text-accent bg-bg-elevated focus:ring-2 focus:ring-accent-bg-glow cursor-pointer"
        />
        Enable Generate & Send
      </label>

      <div
        className={`flex flex-col gap-3 transition-all duration-200 ${
          emailDeliveryEnabled ? "opacity-100 pointer-events-auto" : "opacity-40 pointer-events-none"
        }`}
      >
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email Attachment</label>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors duration-150">
            <input
              type="radio"
              name="emailAttachmentType"
              value="certificate"
              checked={emailAttachmentType === "certificate"}
              onChange={(e) => setEmailAttachmentType(e.target.value)}
              disabled={!emailDeliveryEnabled || isSending}
              className="w-4 h-4 text-accent bg-bg-elevated border-border-light focus:ring-2 focus:ring-accent-bg-glow cursor-pointer"
            />
            Attach Personalized Certificate
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors duration-150">
            <input
              type="radio"
              name="emailAttachmentType"
              value="shared"
              checked={emailAttachmentType === "shared"}
              onChange={(e) => setEmailAttachmentType(e.target.value)}
              disabled={!emailDeliveryEnabled || isSending}
              className="w-4 h-4 text-accent bg-bg-elevated border-border-light focus:ring-2 focus:ring-accent-bg-glow cursor-pointer"
            />
            Attach Shared File(s)
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors duration-150">
            <input
              type="radio"
              name="emailAttachmentType"
              value="none"
              checked={emailAttachmentType === "none"}
              onChange={(e) => setEmailAttachmentType(e.target.value)}
              disabled={!emailDeliveryEnabled || isSending}
              className="w-4 h-4 text-accent bg-bg-elevated border-border-light focus:ring-2 focus:ring-accent-bg-glow cursor-pointer"
            />
            Send Email Only (No Attachment)
          </label>
        </div>

        {emailAttachmentType === "shared" && (
          <div
            {...getSharedFileProps({
              className: "border-[1.5px] border-dashed border-border-custom rounded-xl py-5 px-4 text-center bg-bg-elevated text-text-muted cursor-pointer transition-all duration-200 text-xs hover:border-accent hover:bg-accent-bg-glow hover:text-accent flex flex-col items-center justify-center",
            })}
          >
            <input {...getSharedFileInputProps()} />
            <p>Drop one or more shared files here (PDF, DOCX, etc.)</p>
            {sharedAttachmentFiles.map((file, index) => (
              <div className="flex items-center justify-between p-2 bg-accent/10 border border-accent/20 rounded-lg mt-2 w-full max-w-full overflow-hidden" key={`${file.name}-${index}`}>
                <span className="text-xs font-semibold text-accent truncate max-w-[80%]">{file.name}</span>
                <button
                  type="button"
                  className="border-none bg-transparent text-text-muted cursor-pointer px-1.5 py-0.5 text-sm transition-all duration-150 rounded-md hover:text-danger hover:bg-danger/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    clearSharedAttachment(index);
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {emailAttachmentType === "certificate" && (
          <p className="text-xs text-text-muted mb-2 leading-relaxed">
            This will generate and attach a unique PNG for each recipient.
          </p>
        )}
        {emailAttachmentType === "shared" && (
          <p className="text-xs text-text-muted mb-2 leading-relaxed">
            Everyone will receive the same shared file(s) you upload here.
          </p>
        )}
        {emailAttachmentType === "none" && (
          <p className="text-xs text-amber-500 font-semibold mb-2">No attachments will be sent.</p>
        )}

        <label htmlFor="emailService" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email Service</label>
        <input
          id="emailService"
          name="service"
          type="text"
          placeholder="gmail, outlook, yahoo..."
          value={emailSettings.service}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50"
        />
        <label htmlFor="senderName" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Sender Name (optional)</label>
        <input
          id="senderName"
          name="senderName"
          type="text"
          placeholder="Your Organization"
          value={emailSettings.senderName}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50"
        />
        <label htmlFor="senderEmail" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Sender Email Address</label>
        <input
          id="senderEmail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={emailSettings.email}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50"
        />
        <label htmlFor="emailPassword" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email App Password</label>
        <input
          id="emailPassword"
          name="password"
          type="password"
          autoComplete="off"
          placeholder="Enter the app password from your provider"
          value={emailSettings.password}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50"
        />
        <label htmlFor="emailSubject" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email Subject</label>
        <input
          id="emailSubject"
          name="subject"
          type="text"
          placeholder="Your Certificate is Ready!"
          value={emailSettings.subject}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50"
        />

        <div className="mt-4 p-4 bg-accent/5 rounded-xl border border-accent/20">
          <label className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3 block">
            Message Template Presets
          </label>

          <div className="flex flex-col gap-2 mb-3">
            <select
              value={selectedMessagePresetId}
              onChange={(e) => handleLoadPreset(e, "message")}
              disabled={isSavingMessagePreset || isSending}
              className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
            >
              <option value="">-- Load a saved message --</option>
              {presets
                .filter((p) => p.presetType === "message")
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-bg-surface text-text-primary">
                    {p.presetName}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() =>
                handleDeletePreset(selectedMessagePresetId, "message")
              }
              disabled={
                !selectedMessagePresetId || isSavingMessagePreset || isSending
              }
              className="self-start px-4 py-2 bg-danger text-white rounded-lg text-xs font-bold shadow-sm hover:bg-danger-hover transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete selected preset"
            >
              Delete
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="New message preset name..."
              value={newMessagePresetName}
              onChange={(e) => setNewMessagePresetName(e.target.value)}
              disabled={isSavingMessagePreset || isSending}
              className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-surface text-text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
            />
            <button
              type="button"
              onClick={() => handleSavePreset("message")}
              disabled={
                !newMessagePresetName.trim() ||
                isSavingMessagePreset ||
                isSending
              }
              className="self-start px-4 py-2 bg-accent text-bg-primary rounded-lg text-xs font-bold shadow-sm hover:bg-accent-hover transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSavingMessagePreset ? "Saving..." : "Save As Preset"}
            </button>
          </div>
        </div>

        <label htmlFor="emailTemplate" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5 mt-2">
          Message Template
        </label>
        <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border-light rounded-t-lg border-b-0">
          <button
            type="button"
            onClick={() => insertFormat("b")}
            title="Bold copy"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("i")}
            title="Italic copy"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("u")}
            title="Underline copy"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            <u>U</u>
          </button>
          <div className="w-[1px] h-4 bg-border-light mx-1" />
          <button
            type="button"
            onClick={() => insertLink("emailTemplate")}
            title="Insert Link"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => promptForImage("emailTemplate")}
            title="Insert Image via URL"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            🌐
          </button>
          <label
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
            title="Upload Image"
          >
            📤
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImageUpload(e, "emailTemplate")}
            />
          </label>
          <div className="w-[1px] h-4 bg-border-light mx-1" />
          <div className="inline-flex gap-1.5">
            <button
              type="button"
              onClick={() => insertPlaceholder("name", "emailTemplate")}
              className="px-2 h-8 flex items-center justify-center bg-transparent border-none text-accent rounded hover:bg-bg-hover hover:text-accent-hover transition-all duration-150 cursor-pointer text-xs font-bold"
              title="Insert Name Placeholder"
            >
              {`{name}`}
            </button>
            <button
              type="button"
              onClick={() => insertPlaceholder("email", "emailTemplate")}
              className="px-2 h-8 flex items-center justify-center bg-transparent border-none text-accent rounded hover:bg-bg-hover hover:text-accent-hover transition-all duration-150 cursor-pointer text-xs font-bold"
              title="Insert Email Placeholder"
            >
              {`{email}`}
            </button>
          </div>
        </div>
        <textarea
          id="emailTemplate"
          name="template"
          placeholder="Hi {name}, ..."
          value={emailSettings.template}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full min-h-[120px] px-3 py-2 border border-border-light rounded-b-lg rounded-t-none bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 resize-y"
        />

        <div className="mt-4 p-4 bg-accent/5 rounded-xl border border-accent/20">
          <label className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3 block">
            Email Signature Presets
          </label>

          <div className="flex flex-col gap-2 mb-3">
            <select
              value={selectedSignaturePresetId}
              onChange={(e) => handleLoadPreset(e, "signature")}
              disabled={isSavingSignaturePreset || isSending}
              className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
            >
              <option value="">-- Load a saved signature --</option>
              {presets
                .filter((p) => p.presetType === "signature")
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-bg-surface text-text-primary">
                    {p.presetName}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() =>
                handleDeletePreset(selectedSignaturePresetId, "signature")
              }
              disabled={
                !selectedSignaturePresetId ||
                isSavingSignaturePreset ||
                isSending
              }
              className="self-start px-4 py-2 bg-danger text-white rounded-lg text-xs font-bold shadow-sm hover:bg-danger-hover transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete selected preset"
            >
              Delete
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="New signature preset name..."
              value={newSignaturePresetName}
              onChange={(e) => setNewSignaturePresetName(e.target.value)}
              disabled={isSavingSignaturePreset || isSending}
              className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-surface text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
            />
            <button
              type="button"
              onClick={() => handleSavePreset("signature")}
              disabled={
                !newSignaturePresetName.trim() ||
                isSavingSignaturePreset ||
                isSending
              }
              className="self-start px-4 py-2 bg-accent text-bg-primary rounded-lg text-xs font-bold shadow-sm hover:bg-accent-hover transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSavingSignaturePreset ? "Saving..." : "Save As Preset"}
            </button>
          </div>
        </div>

        <label htmlFor="emailSignature" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5 mt-2">
          Email Signature
        </label>
        <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border-light rounded-t-lg border-b-0">
          <button
            type="button"
            onClick={() => insertFormat("b", "emailSignature")}
            title="Bold"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("i", "emailSignature")}
            title="Italic"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("u", "emailSignature")}
            title="Underline"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            <u>U</u>
          </button>
          <div className="w-[1px] h-4 bg-border-light mx-1" />
          <button
            type="button"
            onClick={() => insertLink("emailSignature")}
            title="Insert Link"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => promptForImage("emailSignature")}
            title="Insert Image via URL"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
          >
            🌐
          </button>
          <label
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-text-secondary rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-xs"
            title="Upload Image"
          >
            📤
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImageUpload(e, "emailSignature")}
            />
          </label>
          <div className="w-[1px] h-4 bg-border-light mx-1" />
          <div className="inline-flex gap-1.5">
            <button
              type="button"
              onClick={() => insertPlaceholder("name", "emailSignature")}
              className="px-2 h-8 flex items-center justify-center bg-transparent border-none text-accent rounded hover:bg-bg-hover hover:text-accent-hover transition-all duration-150 cursor-pointer text-xs font-bold"
              title="Insert Name Placeholder"
            >
              {`{name}`}
            </button>
            <button
              type="button"
              onClick={() => insertPlaceholder("email", "emailSignature")}
              className="px-2 h-8 flex items-center justify-center bg-transparent border-none text-accent rounded hover:bg-bg-hover hover:text-accent-hover transition-all duration-150 cursor-pointer text-xs font-bold"
              title="Insert Email Placeholder"
            >
              {`{email}`}
            </button>
          </div>
        </div>
        <textarea
          id="emailSignature"
          name="signature"
          placeholder="Sincerely,\nYour Name"
          value={emailSettings.signature}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
          className="w-full min-h-[80px] px-3 py-2 border border-border-light rounded-b-lg rounded-t-none bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 resize-y"
        />

        {/* Combined Email Preview */}
        {(emailSettings.template || emailSettings.signature) && (
          <div className="mt-4 p-4 border border-border-light rounded-xl bg-bg-surface shadow-sm w-full box-border">
            <p className="m-0 mb-2 text-[10px] text-text-muted font-bold uppercase tracking-wider">
              Email Preview
            </p>
            <div className="font-sans text-sm leading-relaxed text-text-secondary overflow-wrap-anywhere break-words w-full">
              <div
                dangerouslySetInnerHTML={{
                  __html: escapeHtml(emailSettings.template || "").replace(/\n/g, "<br/>"),
                }}
              />

              {emailSettings.template && emailSettings.signature && <br />}

              <div
                dangerouslySetInnerHTML={{
                  __html: escapeHtml(emailSettings.signature || "").replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-text-muted leading-relaxed">
          Tip: We'll automatically replace <code>{"{name}"}</code> with each
          recipient's name and attach their certificate as a PNG.
        </p>
      </div>

      <div className="flex flex-col gap-2 mb-4 mt-4 border-t border-border-light pt-4">
        <label className="text-xs font-bold text-text-primary uppercase tracking-wide">7. Generate & Deliver</label>

        <div className="mb-4">
          <p className="m-0 mb-2.5 text-xs text-text-primary font-bold">
            Emails detected: {emailReadyRows.length}/{data.length || 0}
            <span className="mx-2 text-text-muted font-normal">|</span>
            Manual: {manualReadyRecipients.length}
          </p>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-text-primary">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              disabled={!emailDeliveryEnabled}
              className="w-4 h-4 rounded border-border-light text-accent bg-bg-elevated focus:ring-2 focus:ring-accent-bg-glow cursor-pointer disabled:opacity-50"
            />
            Skip Duplicate Emails
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {emailDeliveryEnabled && rowsMissingEmails.length > 0 && (
            <div className="mb-4 p-3.5 bg-danger-bg border border-danger/25 rounded-lg text-xs text-danger relative z-10">
              <p className="m-0 mb-2 font-bold text-danger">
                <span>
                  ⚠️ Warning: {rowsMissingEmails.length} recipients have a Name
                  but missing/invalid Email.
                </span>
              </p>
              <button
                type="button"
                onClick={handleDownloadMissingEmails}
                className="text-xs px-3.5 py-1.5 bg-danger text-white rounded font-bold hover:bg-danger-hover transition-all cursor-pointer border-none"
              >
                Download These Entries (.xlsx)
              </button>
            </div>
          )}

          {emailDeliveryEnabled && rowsWithDuplicateEmails.length > 0 && (
            <div className="mb-4 p-3.5 bg-accent-bg-glow border border-accent/25 rounded-lg text-xs text-text-primary relative z-10">
              <p className="m-0 mb-2 font-bold text-text-primary">
                <span>
                  {skipDuplicates
                    ? `⚠️ Detect: ${rowsWithDuplicateEmails.length} duplicates found (Skipping enabled).`
                    : `⚠️ Detect: ${rowsWithDuplicateEmails.length} Duplicate Email Entries found.`}
                </span>
              </p>
              <button
                type="button"
                onClick={handleDownloadDuplicateEmails}
                className="text-xs px-3.5 py-1.5 bg-accent text-bg-primary rounded font-bold hover:bg-accent-hover transition-all cursor-pointer border-none"
              >
                Download Duplicates (.xlsx)
              </button>
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={
              !template ||
              !dataFile ||
              isLoading ||
              isPreviewLoading ||
              (layoutIsRequired && !layoutReady)
            }
            className="w-full py-3 bg-bg-elevated border border-border-custom text-text-primary font-bold rounded-full shadow-sm hover:bg-bg-hover transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wider"
          >
            {isLoading
              ? "Generating..."
              : `Generate ${data.length} Certificates`}
          </button>
          <button
            onClick={handleGenerateAndSend}
            disabled={!canAttemptEmailSend}
            className="w-full py-3 bg-accent text-black font-bold rounded-full shadow-sm hover:bg-accent-hover uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all duration-150 cursor-pointer flex items-center justify-center"
          >
            {sendButtonLabel}
          </button>

          {isSending && (
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={onTogglePause}
                type="button"
                className="flex-1 py-2 px-3 border border-border-custom bg-bg-elevated text-text-secondary rounded-full text-xs font-bold hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer"
              >
                {isPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                onClick={handleStopSending}
                type="button"
                className="flex-1 py-2 px-3 bg-danger/15 border border-danger/30 text-danger rounded-full text-xs font-bold hover:bg-danger/25 hover:border-danger/50 transition-all duration-150 cursor-pointer"
              >
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
        {lastGenerationInfo && (
          <div className="mt-4 p-3 bg-bg-elevated border border-border-light rounded-lg text-xs text-text-secondary flex flex-col gap-1">
            <p>
              <strong>Last download:</strong> {lastGenerationInfo.timestamp}
            </p>
            <p>
              <strong>Certificates:</strong> {lastGenerationInfo.count}
            </p>
            <p>
              <strong>ZIP Name:</strong>{" "}
              <code className="bg-bg-surface px-1.5 py-0.5 rounded border border-border-light text-[11px]">{lastGenerationInfo.fileName || "-"}</code>
            </p>
          </div>
        )}
        {emailSummary && (
          <div className="mt-4 p-3 bg-bg-elevated border border-border-light rounded-lg text-xs text-text-secondary flex flex-col gap-1">
            <p>
              <strong>Last send:</strong> {emailSummary.timestamp}
            </p>
            <p>
              <strong>Delivered:</strong> {emailSummary.successCount || 0} /{" "}
              {emailSummary.attempted || emailReadyRows.length || 0}
            </p>
            <p>
              <strong>Missing Emails:</strong>{" "}
              {emailSummary.missingEmailCount || 0}
            </p>
            {emailSummary.failureCount > 0 && (
              <>
                <details className="mt-1 cursor-pointer">
                  <summary className="text-[11px] font-bold text-danger">Failed deliveries ({emailSummary.failureCount})</summary>
                  <ul className="list-disc pl-5 mt-1.5 flex flex-col gap-1 text-[11px] text-danger">
                    {(emailSummary.failures || [])
                      .slice(0, 5)
                      .map((failure, i) => (
                        <li key={`${failure.email}-${i}`}>
                          {failure.name} - {failure.email}: {failure.reason}
                        </li>
                      ))}
                    {emailSummary.failures?.length > 5 && (
                      <li>...and {emailSummary.failures.length - 5} more</li>
                    )}
                  </ul>
                </details>
                <button
                  onClick={handleRetryFailed}
                  type="button"
                  className="mt-3 w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs font-bold hover:bg-amber-500/20 hover:border-amber-500/40 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🔄 Retry Failed Deliveries ({emailSummary.failureCount})
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSettingsPanel;
