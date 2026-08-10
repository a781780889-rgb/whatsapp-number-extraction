# Meta WhatsApp Business Coexistence findings

Source checked on 2026-08-10:
https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users

Meta documents an official Embedded Signup flow for onboarding existing WhatsApp Business app accounts and phone numbers to Cloud API. The feature is called Coexistence in partner documentation. The documented flow allows the business to choose connecting an existing WhatsApp Business app account, enter its phone number, receive a verification code, connect to the Business Platform, optionally share chats, and complete onboarding. The flow returns asset IDs and an exchangeable token code to the spawning window. Meta's documented UI includes an option to scan a QR code instead of entering the access code during the official onboarding flow, but this QR is part of Meta's Embedded Signup/Coexistence onboarding and is not WhatsApp Web session automation.

The implementation must therefore use Meta Embedded Signup/Coexistence, not Baileys or WhatsApp Web session emulation. The app should open the official Meta onboarding flow, receive the callback/session data, exchange the code server-side, store only encrypted credentials and account identifiers, and manage account state via webhooks and official Graph API calls.

The page also warns that Embedded Signup v2 will be deprecated on October 15, 2026 and integrations should migrate to v4 before that date. Use the current official v4 documentation and avoid hard-coding a v2 flow.
