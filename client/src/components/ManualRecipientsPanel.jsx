import React from "react";
import { useAppStore } from "../shared/store/useAppStore";
import { isValidEmail } from "../utils/textHelpers";

const MAX_MANUAL_RECIPIENTS = 5;

const ManualRecipientsPanel = ({
  handleManualRecipientChange,
  removeManualRecipient,
  addManualRecipient,
  handleManualGenerate,
}) => {
  const {
    manualRecipients,
    template,
    isManualGenerating,
    layout,
    isLayoutLocked,
  } = useAppStore();

  const manualReadyRecipients = React.useMemo(() => {
    return manualRecipients.filter((recipient) => {
      const name = recipient?.name?.toString().trim();
      const email = recipient?.email?.toString().trim();
      return !!name && !!email && isValidEmail(email);
    });
  }, [manualRecipients]);

  const manualRecipientLimitReached = manualRecipients.length >= MAX_MANUAL_RECIPIENTS;
  const layoutReady = !!layout && isLayoutLocked;

  return (
    <div className="control-group">
      <label>5. Quick Recipients (Max {MAX_MANUAL_RECIPIENTS})</label>
      <p className="layout-hint">
        Use this for quick testing or sending certificates to a small, fixed
        list without uploading an Excel file.
      </p>
      {manualRecipients.map((recipient, index) => (
        <div key={recipient.id} className="manual-recipient-row">
          <input
            type="text"
            placeholder={`Recipient Name ${index + 1}`}
            value={recipient.name}
            onChange={(e) =>
              handleManualRecipientChange(recipient.id, "name", e.target.value)
            }
          />
          <div className="manual-recipient-email-row">
            <input
              type="email"
              placeholder={`Email Address ${index + 1}`}
              value={recipient.email}
              onChange={(e) =>
                handleManualRecipientChange(
                  recipient.id,
                  "email",
                  e.target.value
                )
              }
            />
            <button
              type="button"
              className="ghost-button"
              onClick={() => removeManualRecipient(recipient.id)}
              disabled={manualRecipients.length === 1}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="manual-recipient-actions">
        <button
          type="button"
          className="add-manual-button"
          onClick={addManualRecipient}
          disabled={manualRecipientLimitReached}
        >
          + Add Recipient
        </button>
        {manualRecipientLimitReached && (
          <span className="manual-limit-hint">
            Limit: {MAX_MANUAL_RECIPIENTS} recipients
          </span>
        )}
      </div>

      <button
        className="manual-generate-button"
        onClick={handleManualGenerate}
        disabled={
          !template ||
          !manualReadyRecipients.length ||
          isManualGenerating ||
          !layoutReady
        }
      >
        {isManualGenerating
          ? "Generating..."
          : `Download Manual (${manualReadyRecipients.length})`}
      </button>
    </div>
  );
};

export default ManualRecipientsPanel;
