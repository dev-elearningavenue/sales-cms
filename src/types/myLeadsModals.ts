type ContactType = "email" | "call" | "chat";

interface LeadStatusModalsProps {
  showConversionModal: boolean;
  showFollowUpModal: boolean;
  showNoteModal: boolean;
  showLvmModal: boolean;
  pendingStatusChange: string | null;
  conversionValue?: number;
  setConversionValue: (value: number | undefined) => void;
  newNote: string;
  setNewNote: (note: string) => void;
  followUpDate: string;
  setFollowUpDate: (date: string) => void;
  contactTypes: ContactType[];
  toggleContactType: (type: ContactType) => void;
  followUpNote: string;
  setFollowUpNote: (note: string) => void;
  lvmEmailData: {
    from: string;
    to: string;
    cc: string;
    subject: string;
    body: string;
  };
  setLvmEmailData: (data: {
    from: string;
    to: string;
    cc: string;
    subject: string;
    body: string;
  }) => void;
  closeAllModals: () => void;
  applyStatusChange: () => void;
  sendLvmEmail: () => void;
  applyFollowUpWithEmail: () => void;
}

export default LeadStatusModalsProps;