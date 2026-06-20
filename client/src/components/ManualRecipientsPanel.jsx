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
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-xs font-bold text-text-primary uppercase tracking-wide">5. Quick Recipients (Max {MAX_MANUAL_RECIPIENTS})</label>
      <p className="text-xs text-text-muted mb-2 leading-relaxed">
        Use this for quick testing or sending certificates to a small, fixed
        list without uploading an Excel file.
      </p>
      {manualRecipients.map((recipient, index) => (
        <div key={recipient.id} className="flex flex-col gap-1.5 p-2.5 bg-bg-elevated border border-border-light rounded-lg mb-2">
          <input
            type="text"
            placeholder={`Recipient Name ${index + 1}`}
            value={recipient.name}
            onChange={(e) =>
              handleManualRecipientChange(recipient.id, "name", e.target.value)
            }
            className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-surface text-text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
          />
          <div className="flex gap-2 items-center w-full">
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
              className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-surface text-text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
            />
            <button
              type="button"
              onClick={() => removeManualRecipient(recipient.id)}
              disabled={manualRecipients.length === 1}
              className="px-3 py-2 bg-transparent border border-border-light text-text-muted hover:border-danger hover:text-danger hover:bg-danger/10 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between mt-1 mb-3">
        <button
          type="button"
          onClick={addManualRecipient}
          disabled={manualRecipientLimitReached}
          className="text-xs font-bold text-accent bg-transparent hover:text-accent-hover transition-all duration-150 cursor-pointer disabled:opacity-50"
        >
          + Add Recipient
        </button>
        {manualRecipientLimitReached && (
          <span className="text-[10px] text-text-muted font-medium">
            Limit: {MAX_MANUAL_RECIPIENTS} recipients
          </span>
        )}
      </div>

      <button
        onClick={handleManualGenerate}
        disabled={
          !template ||
          !manualReadyRecipients.length ||
          isManualGenerating ||
          !layoutReady
        }
        className="w-full py-3 bg-accent text-black font-bold rounded-full shadow-sm hover:bg-accent-hover uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all duration-150 cursor-pointer flex items-center justify-center"
      >
        {isManualGenerating
          ? "Generating..."
          : `Download Manual (${manualReadyRecipients.length})`}
      </button>
    </div>
  );
};

export default ManualRecipientsPanel;
