// @version 0.6.0 - Beacon: HubSpot Marketing API types

/** Parameters for sending a single transactional email */
export interface HubSpotTransactionalEmailParams {
  emailId: number; // HubSpot email template ID
  to: string; // recipient email address
  contactProperties?: Record<string, string>;
}

/** Result from a transactional email send */
export interface HubSpotTransactionalEmailResult {
  success: boolean;
  statusCode?: number;
}

/** Parameters for sending a marketing email to a list */
export interface HubSpotListSendParams {
  listId: string;
  subject: string;
  body: string; // HTML
  fromName: string;
  fromEmail: string;
}

/** Result from a list-based email send */
export interface HubSpotListSendResult {
  success: boolean;
  campaignId?: string;
}
