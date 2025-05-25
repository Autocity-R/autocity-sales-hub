
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  linkedButton: string;
  hasAttachment: boolean;
  attachmentType?: string;
}
