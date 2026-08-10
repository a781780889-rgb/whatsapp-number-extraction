# WhatsApp Business Platform implementation notes

Verified from Meta's official documentation on 2026-08-10:

- WhatsApp Cloud API is used to programmatically send and receive WhatsApp messages through the Graph API.
- Cloud API supports text, rich media, and interactive messages.
- Webhooks are used for event delivery and message status updates.
- Message templates are WhatsApp Business Account assets used for template messages.
- The product documentation references a customer service window; messages outside that window require template messages.
- The implementation must collect and enforce user opt-in before sending marketing/template messages.
- This project must not use unofficial WhatsApp Web automation or mechanisms intended to bypass anti-abuse controls. Account management should model official business phone numbers and API credentials, not QR sessions.

Primary source: https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
Related official docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
Related official docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
Related official docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
