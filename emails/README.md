# Account email templates

Two account emails, written as standalone HTML so they can be pasted into the
dashboards that actually send them. Nothing here is imported by the app: the
build never touches this directory.

| File                | Delivered by  | Pasted into                                                           |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| `verify-email.html` | Supabase Auth | Authentication → Emails → **Confirm signup**                          |
| `welcome.html`      | EmailJS       | Email Templates → the template behind `VITE_EMAILJS_TEMPLATE_WELCOME` |

`preview/verify-email.html` and `preview/welcome.html` are the same two files
with sample values filled in. Double-click either one to see what lands in the
inbox. They are for looking at only — never paste a preview into a dashboard,
because its template variables have already been replaced.

The sender identity shared by both (display name, site URL, logo URL) is defined
once in `src/lib/email/branding.ts`. If any of it changes there, change it here
too.

## Why the verification code is not an EmailJS template

EmailJS is a browser SDK. A code the browser already knows proves nothing about
who owns the mailbox, so the verification code has to be generated and sent by
the backend. That is Supabase Auth, which is why this one email is a Supabase
template and every other email in the project is an EmailJS one.

## Installing `verify-email.html` (Supabase)

1. Open the Supabase dashboard for the project, then **Authentication → Emails**.
2. Select the **Confirm signup** template and make sure it is enabled. If signup
   confirmation is turned off (Authentication → Sign In / Providers → Email →
   "Confirm email"), no verification mail is sent at all and the template is
   never used.
3. Paste the whole of `verify-email.html` into the message body, and set the
   subject to something like `Your Urban Anomaly verification code`.
4. Keep `{{ .Token }}` in the body. That placeholder is what makes Supabase
   send a six-digit code; a template that only contains `{{ .ConfirmationURL }}`
   gets a magic link instead, and the code the app asks for never arrives.
5. Save, then sign up with a throwaway address and confirm the code renders as
   selectable text, not an image.

### Setting the sender name

`Urban Anomaly Official` is the **Sender name** under
**Authentication → Emails → SMTP Settings**. That field only exists once custom
SMTP is enabled, so the display name and the from-address come as a pair: enable
custom SMTP, point it at a real provider (Resend, Postmark, Amazon SES, Brevo and
similar all work), then set the sender name and sender address there.

Until custom SMTP is configured, Supabase sends through its own built-in service,
which is deliberately rate-limited to a handful of emails per hour and is
intended for development only. It is not suitable for production: once a few
people sign up in the same hour, the rest simply stop receiving their codes.

### Variables used by `verify-email.html`

Supabase Auth templates use Go template syntax, with a leading dot and spaces
inside the braces.

| Variable       | Meaning                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| `{{ .Token }}` | The six-digit verification code. Required — remove it and Supabase sends a link instead. |
| `{{ .Email }}` | The address being confirmed, shown so the reader can spot a typo.                        |

Everything else in that file — the logo URL, the site link, the sender name in
the footer — is hard-coded, because Supabase's `{{ .SiteURL }}` follows the
project's configured site URL and would point at localhost during development.

## Installing `welcome.html` (EmailJS)

1. In the EmailJS dashboard open **Email Templates** and create a new template
   (or edit the existing welcome one).
2. Switch the content editor to its code/HTML view and paste the whole of
   `welcome.html`.
3. In the template settings fill in the fields from the variables the app sends:
   **To email** `{{to_email}}`, **To name** `{{to_name}}`, **Subject**
   `{{subject}}`, **From name** `{{from_name}}`.
4. Save, copy the template id, and set it as `VITE_EMAILJS_TEMPLATE_WELCOME` in
   the local `.env` and in the Vercel project's environment variables. The send
   is skipped silently when that id, the service id or the public key is missing,
   so an unconfigured store simply does not send the courtesy email.
5. Use the dashboard's test send to check the layout, then verify a real account
   to check the live values.

### Variables used by `welcome.html`

EmailJS uses `{{variable}}` with no leading dot. Only the variables below are
sent for this template; anything else would render empty.

Built by `buildWelcomeEmail` in
`src/features/auth/infrastructure/authEmails.ts`:

| Variable                  | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| `{{customer_name}}`       | The account's full name.                                         |
| `{{customer_first_name}}` | First word of that name, used in the greeting.                   |
| `{{customer_email}}`      | The verified address.                                            |
| `{{shop_url}}`            | `https://urban-anomaly.vercel.app/shop` — the primary button.    |
| `{{account_url}}`         | `https://urban-anomaly.vercel.app/account` — the secondary link. |

Added by `EmailJsEmailClient` in `src/lib/email/EmailJsEmailClient.ts` to every
send, this template included:

| Variable        | Value                                                     |
| --------------- | --------------------------------------------------------- |
| `{{to_email}}`  | Recipient address, for the template's "To email" setting. |
| `{{to_name}}`   | Recipient name, for the "To name" setting.                |
| `{{subject}}`   | `Urban Anomaly Official: your account is verified`.       |
| `{{from_name}}` | `Urban Anomaly Official`.                                 |
| `{{logo_url}}`  | `https://urban-anomaly.vercel.app/logo-long.png`.         |
| `{{site_url}}`  | `https://urban-anomaly.vercel.app`.                       |

## House rules for editing either file

Email clients are not browsers. Both templates are built to the lowest common
denominator and should stay that way:

- Table-based layout, with `role="presentation"` on every layout table.
- Inline `style` attributes on every element. The small `<style>` block in the
  head carries responsive tweaks only; both files render correctly without it.
- No flexbox, no grid, no external stylesheet, no JavaScript, no web fonts — the
  system font stack only.
- 600px maximum width.
- Images may be blocked, so both files must read as Urban Anomaly with the logo
  missing. The logo's `alt` text is styled, and an uppercase wordmark line sits
  under it in plain text.
- Brand colours are the real tokens from `src/styles/globals.css`, written as
  literal hex: olive `#5c7454`, ink `#0f120e`, deep olive text `#2f3d2b`, muted
  text `#5a6356`, panel `#f1f3ef`, border `#dde2d8`, surface `#ffffff`.

## Regenerating the previews

The preview copies are maintained by hand alongside the templates. After editing
a template, apply the same edit to its preview and substitute the sample values:
code `429815`, name `Marky Reyes`, email `pharmacystmargareth@gmail.com`, logo
`https://urban-anomaly.vercel.app/logo-long.png`, site
`https://urban-anomaly.vercel.app`. A preview is correct when it contains no
`{{` left anywhere in the file.
