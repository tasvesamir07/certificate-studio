import React from "react";
import * as XLSX from "xlsx";

const EmailSettingsPanel = ({
  emailDeliveryEnabled,
  setEmailDeliveryEnabled,
  emailAttachmentType,
  setEmailAttachmentType,
  isSending,
  getSharedFileProps,
  getSharedFileInputProps,
  sharedAttachmentFiles,
  clearSharedAttachment,
  emailSettings,
  handleEmailSettingsChange,
  selectedMessagePresetId,
  handleLoadPreset,
  isSavingMessagePreset,
  presets,
  handleDeletePreset,
  newMessagePresetName,
  setNewMessagePresetName,
  handleSavePreset,
  insertFormat,
  insertLink,
  promptForImage,
  handleImageUpload,
  insertPlaceholder,
  selectedSignaturePresetId,
  isSavingSignaturePreset,
  newSignaturePresetName,
  setNewSignaturePresetName,
  emailReadyRows,
  data,
  manualReadyRecipients,
  skipDuplicates,
  setSkipDuplicates,
  rowsMissingEmails,
  handleDownloadMissingEmails,
  rowsWithDuplicateEmails,
  handleDownloadDuplicateEmails,
  handleGenerate,
  template,
  dataFile,
  isLoading,
  isPreviewLoading,
  layoutIsRequired,
  layoutReady,
  handleGenerateAndSend,
  canAttemptEmailSend,
  sendButtonLabel,
  handleStopSending,
  lastGenerationInfo,
  emailSummary,
}) => {
  return (
    <div className="control-group">
      <label>6. Email Delivery (Optional)</label>
      <p className="layout-hint">
        Personalize your email with <code>{"{name}"}</code> to insert each
        recipient's name automatically.
      </p>
      <label className="email-toggle">
        <input
          type="checkbox"
          checked={emailDeliveryEnabled}
          onChange={(event) => {
            setEmailDeliveryEnabled(event.target.checked);
          }}
        />
        Enable Generate & Send
      </label>

      <div
        className={`email-settings ${
          emailDeliveryEnabled ? "active" : "disabled"
        }`}
      >
        <label>Email Attachment</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="emailAttachmentType"
              value="certificate"
              checked={emailAttachmentType === "certificate"}
              onChange={(e) => setEmailAttachmentType(e.target.value)}
              disabled={!emailDeliveryEnabled || isSending}
            />
            Attach Personalized Certificate
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="emailAttachmentType"
              value="shared"
              checked={emailAttachmentType === "shared"}
              onChange={(e) => setEmailAttachmentType(e.target.value)}
              disabled={!emailDeliveryEnabled || isSending}
            />
            Attach Shared File(s)
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="emailAttachmentType"
              value="none"
              checked={emailAttachmentType === "none"}
              onChange={(e) => setEmailAttachmentType(e.target.value)}
              disabled={!emailDeliveryEnabled || isSending}
            />
            Send Email Only (No Attachment)
          </label>
        </div>

        {emailAttachmentType === "shared" && (
          <div
            {...getSharedFileProps({
              className: "dropzone shared-file-dropzone",
            })}
          >
            <input {...getSharedFileInputProps()} />
            <p>Drop one or more shared files here (PDF, DOCX, etc.)</p>
            {sharedAttachmentFiles.map((file, index) => (
              <div className="file-chip" key={`${file.name}-${index}`}>
                <span className="file-name">{file.name}</span>
                <button
                  type="button"
                  className="file-remove-button"
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
          <p className="layout-hint">
            This will generate and attach a unique PNG for each recipient.
          </p>
        )}
        {emailAttachmentType === "shared" && (
          <p className="layout-hint">
            Everyone will receive the same shared file(s) you upload here.
          </p>
        )}
        {emailAttachmentType === "none" && (
          <p className="email-warning">No attachments will be sent.</p>
        )}

        <label htmlFor="emailService">Email Service</label>
        <input
          id="emailService"
          name="service"
          type="text"
          placeholder="gmail, outlook, yahoo..."
          value={emailSettings.service}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
        />
        <label htmlFor="senderName">Sender Name (optional)</label>
        <input
          id="senderName"
          name="senderName"
          type="text"
          placeholder="Your Organization"
          value={emailSettings.senderName}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
        />
        <label htmlFor="senderEmail">Sender Email Address</label>
        <input
          id="senderEmail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={emailSettings.email}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
        />
        <label htmlFor="emailPassword">Email App Password</label>
        <input
          id="emailPassword"
          name="password"
          type="password"
          autoComplete="off"
          placeholder="Enter the app password from your provider"
          value={emailSettings.password}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
        />
        <label htmlFor="emailSubject">Email Subject</label>
        <input
          id="emailSubject"
          name="subject"
          type="text"
          placeholder="Your Certificate is Ready!"
          value={emailSettings.subject}
          onChange={handleEmailSettingsChange}
          disabled={!emailDeliveryEnabled || isSending}
        />

        <div
          className="presets-section"
          style={{
            marginTop: "16px",
            padding: "16px",
            background: "rgba(99, 102, 241, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(99, 102, 241, 0.2)",
          }}
        >
          <label
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-color)",
              display: "block",
            }}
          >
            Message Template Presets
          </label>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <select
              value={selectedMessagePresetId}
              onChange={(e) => handleLoadPreset(e, "message")}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
              }}
              disabled={isSavingMessagePreset || isSending}
            >
              <option value="">-- Load a saved message --</option>
              {presets
                .filter((p) => p.presetType === "message")
                .map((p) => (
                  <option key={p.id} value={p.id}>
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
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                opacity:
                  !selectedMessagePresetId || isSavingMessagePreset || isSending
                    ? 0.5
                    : 1,
              }}
              title="Delete selected preset"
            >
              Delete
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="text"
              placeholder="New message preset name..."
              value={newMessagePresetName}
              onChange={(e) => setNewMessagePresetName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
              }}
              disabled={isSavingMessagePreset || isSending}
            />
            <button
              type="button"
              onClick={() => handleSavePreset("message")}
              disabled={
                !newMessagePresetName.trim() ||
                isSavingMessagePreset ||
                isSending
              }
              style={{
                alignSelf: "flex-start",
                padding: "10px 16px",
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                opacity:
                  !newMessagePresetName.trim() ||
                  isSavingMessagePreset ||
                  isSending
                    ? 0.5
                    : 1,
              }}
            >
              {isSavingMessagePreset ? "Saving..." : "Save As Preset"}
            </button>
          </div>
        </div>

        <label htmlFor="emailTemplate" style={{ marginTop: "16px" }}>
          Message Template
        </label>
        <div className="formatting-toolbar">
          <button
            type="button"
            onClick={() => insertFormat("b")}
            title="Bold copy"
            className="format-btn"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("i")}
            title="Italic copy"
            className="format-btn"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("u")}
            title="Underline copy"
            className="format-btn"
          >
            <u>U</u>
          </button>
          <div
            className="divider"
            style={{ width: "1px", background: "#ccc", margin: "0 5px" }}
          />
          <button
            type="button"
            onClick={() => insertLink("emailTemplate")}
            title="Insert Link"
            className="format-btn"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => promptForImage("emailTemplate")}
            title="Insert Image via URL"
            className="format-btn"
          >
            🌐
          </button>
          <label
            className="format-btn"
            title="Upload Image"
            style={{ display: "inline-flex", alignItems: "center", marginBottom: 0 }}
          >
            📤
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImageUpload(e, "emailTemplate")}
            />
          </label>
          <div
            className="divider"
            style={{ width: "1px", background: "#ccc", margin: "0 5px" }}
          />
          <div
            className="placeholder-buttons"
            style={{ display: "inline-flex", gap: "5px" }}
          >
            <button
              type="button"
              onClick={() => insertPlaceholder("name", "emailTemplate")}
              className="format-btn placeholder-btn"
              title="Insert Name Placeholder"
              style={{ fontSize: "12px", fontWeight: "bold", color: "#6366f1" }}
            >
              {`{name}`}
            </button>
            <button
              type="button"
              onClick={() => insertPlaceholder("email", "emailTemplate")}
              className="format-btn placeholder-btn"
              title="Insert Email Placeholder"
              style={{ fontSize: "12px", fontWeight: "bold", color: "#6366f1" }}
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
        />

        <div
          className="presets-section"
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "rgba(99, 102, 241, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(99, 102, 241, 0.2)",
          }}
        >
          <label
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-color)",
              display: "block",
            }}
          >
            Email Signature Presets
          </label>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <select
              value={selectedSignaturePresetId}
              onChange={(e) => handleLoadPreset(e, "signature")}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
              }}
              disabled={isSavingSignaturePreset || isSending}
            >
              <option value="">-- Load a saved signature --</option>
              {presets
                .filter((p) => p.presetType === "signature")
                .map((p) => (
                  <option key={p.id} value={p.id}>
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
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                opacity:
                  !selectedSignaturePresetId ||
                  isSavingSignaturePreset ||
                  isSending
                    ? 0.5
                    : 1,
              }}
              title="Delete selected preset"
            >
              Delete
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="text"
              placeholder="New signature preset name..."
              value={newSignaturePresetName}
              onChange={(e) => setNewSignaturePresetName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
              }}
              disabled={isSavingSignaturePreset || isSending}
            />
            <button
              type="button"
              onClick={() => handleSavePreset("signature")}
              disabled={
                !newSignaturePresetName.trim() ||
                isSavingSignaturePreset ||
                isSending
              }
              style={{
                alignSelf: "flex-start",
                padding: "10px 16px",
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                opacity:
                  !newSignaturePresetName.trim() ||
                  isSavingSignaturePreset ||
                  isSending
                    ? 0.5
                    : 1,
              }}
            >
              {isSavingSignaturePreset ? "Saving..." : "Save As Preset"}
            </button>
          </div>
        </div>

        <label htmlFor="emailSignature" style={{ marginTop: "16px" }}>
          Email Signature
        </label>
        <div className="formatting-toolbar">
          <button
            type="button"
            onClick={() => insertFormat("b", "emailSignature")}
            title="Bold"
            className="format-btn"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("i", "emailSignature")}
            title="Italic"
            className="format-btn"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insertFormat("u", "emailSignature")}
            title="Underline"
            className="format-btn"
          >
            <u>U</u>
          </button>
          <div
            className="divider"
            style={{ width: "1px", background: "#ccc", margin: "0 5px" }}
          />
          <button
            type="button"
            onClick={() => insertLink("emailSignature")}
            title="Insert Link"
            className="format-btn"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => promptForImage("emailSignature")}
            title="Insert Image via URL"
            className="format-btn"
          >
            🌐
          </button>
          <label
            className="format-btn"
            title="Upload Image"
            style={{ display: "inline-flex", alignItems: "center", marginBottom: 0 }}
          >
            📤
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImageUpload(e, "emailSignature")}
            />
          </label>
          <div
            className="divider"
            style={{ width: "1px", background: "#ccc", margin: "0 5px" }}
          />
          <div
            className="placeholder-buttons"
            style={{ display: "inline-flex", gap: "5px" }}
          >
            <button
              type="button"
              onClick={() => insertPlaceholder("name", "emailSignature")}
              className="format-btn placeholder-btn"
              title="Insert Name Placeholder"
              style={{ fontSize: "12px", fontWeight: "bold", color: "#6366f1" }}
            >
              {`{name}`}
            </button>
            <button
              type="button"
              onClick={() => insertPlaceholder("email", "emailSignature")}
              className="format-btn placeholder-btn"
              title="Insert Email Placeholder"
              style={{ fontSize: "12px", fontWeight: "bold", color: "#6366f1" }}
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
          style={{ minHeight: "80px" }}
        />

        {/* Combined Email Preview */}
        {(emailSettings.template || emailSettings.signature) && (
          <div
            className="email-preview-container"
            style={{
              marginTop: "15px",
              padding: "16px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#ffffff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.85rem",
                color: "#64748b",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Email Preview
            </p>
            <div
              className="email-content-preview"
              style={{
                fontFamily: "sans-serif",
                fontSize: "14px",
                lineHeight: "1.5",
                color: "#334155",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                width: "100%",
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: (emailSettings.template || "").replace(/\n/g, "<br/>"),
                }}
              />

              {emailSettings.template && emailSettings.signature && <br />}

              <div
                dangerouslySetInnerHTML={{
                  __html: (emailSettings.signature || "").replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          </div>
        )}

        <p className="template-hint">
          Tip: We'll automatically replace <code>{"{name}"}</code> with each
          recipient's name and attach their certificate as a PNG.
        </p>
      </div>

      <div className="control-group">
        <label>7. Generate & Deliver</label>

        <div className="email-delivery-stats" style={{ marginBottom: "15px" }}>
          <p
            style={{ margin: "0 0 10px 0", color: "#000000", fontWeight: "bold" }}
          >
            Emails detected: {emailReadyRows.length}/{data.length || 0}
            <span style={{ margin: "0 10px", color: "#ccc" }}>|</span>
            Manual: {manualReadyRecipients.length}
          </p>

          <label
            className="toggle-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: emailDeliveryEnabled ? "pointer" : "default",
              color: emailDeliveryEnabled ? "#000000" : "#94a3b8",
              fontWeight: "bold",
              opacity: emailDeliveryEnabled ? 1 : 0.6,
            }}
          >
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              disabled={!emailDeliveryEnabled}
              style={{
                width: "16px",
                height: "16px",
                cursor: emailDeliveryEnabled ? "pointer" : "default",
              }}
            />
            Skip Duplicate Emails
          </label>
        </div>

        <div className="generation-actions">
          {emailDeliveryEnabled && rowsMissingEmails.length > 0 && (
            <div
              className="missing-emails-warning"
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeeba",
                borderRadius: "6px",
                fontSize: "0.9rem",
                color: "#856404",
                position: "relative",
                zIndex: 10,
                isolation: "isolate",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontWeight: "bold",
                  position: "relative",
                  zIndex: 10,
                  color: "#856404",
                }}
              >
                <span style={{ color: "#856404", position: "relative", zIndex: 10 }}>
                  ⚠️ Warning: {rowsMissingEmails.length} recipients have a Name
                  but missing/invalid Email.
                </span>
              </p>
              <button
                type="button"
                onClick={handleDownloadMissingEmails}
                style={{
                  fontSize: "0.85rem",
                  padding: "6px 14px",
                  backgroundColor: "#ef5350",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "inline-block",
                  fontWeight: "bold",
                  position: "relative",
                  zIndex: 10,
                }}
              >
                <span style={{ color: "#ffffff" }}>
                  Download These Entries (.xlsx)
                </span>
              </button>
            </div>
          )}

          {emailDeliveryEnabled && rowsWithDuplicateEmails.length > 0 && (
            <div
              className="duplicate-emails-warning"
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#e3f2fd",
                border: "1px solid #bbdefb",
                borderRadius: "6px",
                fontSize: "0.9rem",
                color: "#0d47a1",
                position: "relative",
                zIndex: 10,
                isolation: "isolate",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontWeight: "bold",
                  position: "relative",
                  zIndex: 10,
                  color: "#0d47a1",
                }}
              >
                <span style={{ color: "#0d47a1", position: "relative", zIndex: 10 }}>
                  {skipDuplicates
                    ? `⚠️ Detect: ${rowsWithDuplicateEmails.length} duplicates found (Skipping enabled).`
                    : `⚠️ Detect: ${rowsWithDuplicateEmails.length} Duplicate Email Entries found.`}
                </span>
              </p>
              <button
                type="button"
                onClick={handleDownloadDuplicateEmails}
                style={{
                  fontSize: "0.85rem",
                  padding: "6px 14px",
                  backgroundColor: "#42a5f5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "inline-block",
                  fontWeight: "bold",
                  position: "relative",
                  zIndex: 10,
                }}
              >
                <span style={{ color: "#ffffff" }}>
                  Download Duplicates (.xlsx)
                </span>
              </button>
            </div>
          )}
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={
              !template ||
              !dataFile ||
              isLoading ||
              isPreviewLoading ||
              (layoutIsRequired && !layoutReady)
            }
          >
            {isLoading
              ? "Generating..."
              : `Generate ${data.length} Certificates`}
          </button>
          <button
            className="send-button"
            onClick={handleGenerateAndSend}
            disabled={!canAttemptEmailSend}
          >
            {sendButtonLabel}
          </button>

          {isSending && (
            <button
              className="stop-button"
              onClick={handleStopSending}
              type="button"
            >
              <span>Stop Sending</span>
            </button>
          )}
        </div>
        {lastGenerationInfo && (
          <div className="generation-summary">
            <p>
              <strong>Last download:</strong> {lastGenerationInfo.timestamp}
            </p>
            <p>
              <strong>Certificates:</strong> {lastGenerationInfo.count}
            </p>
            <p>
              <strong>ZIP Name:</strong>{" "}
              <code>{lastGenerationInfo.fileName || "-"}</code>
            </p>
          </div>
        )}
        {emailSummary && (
          <div className="generation-summary email-summary">
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
              <details>
                <summary>Failed deliveries ({emailSummary.failureCount})</summary>
                <ul className="failure-list">
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSettingsPanel;
