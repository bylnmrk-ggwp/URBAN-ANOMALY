/**
 * Sender identity shared by every outbound email, whoever delivers it.
 *
 * EmailJS reads these through the `from_name` / `logo_url` / `site_url`
 * template variables that {@link EmailJsEmailClient} adds to every send. The
 * Supabase Auth templates in `emails/` (which deliver the verification code,
 * because only a server may generate it) hard-code the same values, so the two
 * senders look like one brand.
 */

/** Display name on every email. Mirrored in the Supabase Auth SMTP settings. */
export const EMAIL_SENDER_NAME = 'Urban Anomaly Official'

/** Absolute origin: email clients cannot resolve a relative asset path. */
export const EMAIL_SITE_URL = 'https://urban-anomaly.vercel.app'

/** Wordmark from `public/logo-long.png`, served by the deployed site. */
export const EMAIL_LOGO_URL = `${EMAIL_SITE_URL}/logo-long.png`
