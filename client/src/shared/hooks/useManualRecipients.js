import { useCallback, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { formatNameInput } from "../../utils/textHelpers";

const MAX_MANUAL_RECIPIENTS = 5;

export const createManualRecipient = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  email: "",
});

export function useManualRecipients() {
  const { manualRecipients, setManualRecipients } = useAppStore();

  const handleManualRecipientChange = useCallback((id, field, value) => {
    const nextValue = field === "name" ? formatNameInput(value || "") : value;
    setManualRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === id ? { ...recipient, [field]: nextValue } : recipient
      )
    );
  }, [setManualRecipients]);

  const addManualRecipient = useCallback(() => {
    setManualRecipients((prev) => {
      if (prev.length >= MAX_MANUAL_RECIPIENTS) return prev;
      return [...prev, createManualRecipient()];
    });
  }, [setManualRecipients]);

  const removeManualRecipient = useCallback((id) => {
    setManualRecipients((prev) => {
      if (prev.length <= 1) {
        return [createManualRecipient()];
      }
      const next = prev.filter((recipient) => recipient.id !== id);
      return next.length ? next : [createManualRecipient()];
    });
  }, [setManualRecipients]);

  const manualRecipientLimitReached = useMemo(() => {
    return manualRecipients.length >= MAX_MANUAL_RECIPIENTS;
  }, [manualRecipients]);

  return {
    manualRecipients,
    handleManualRecipientChange,
    addManualRecipient,
    removeManualRecipient,
    manualRecipientLimitReached,
  };
}
