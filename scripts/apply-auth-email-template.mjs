/**
 * Installs emails/verify-email.html as the Supabase "Confirm signup" template.
 *
 * The dashboard is the other way to do this; the API route exists so the branded
 * template and the app ship together instead of drifting apart.
 *
 * Usage (the token is a personal access token from
 * https://supabase.com/dashboard/account/tokens — never commit it):
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-auth-email-template.mjs
 *
 * Pass --dry-run to print what would be sent without changing the project.
 */
import { readFile } from 'node:fs/promises'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = process.env.SUPABASE_PROJECT_REF ?? 'srabdbhyhabhtomwtjih'
const dryRun = process.argv.includes('--dry-run')

if (!token && !dryRun) {
  console.error('SUPABASE_ACCESS_TOKEN is required. See the header of this file.')
  process.exit(1)
}

const content = await readFile(new URL('../emails/verify-email.html', import.meta.url), 'utf8')
if (!content.includes('{{ .Token }}')) {
  // Without the token variable Supabase mails a link only, and the in-app code
  // screen has nothing to accept.
  console.error('emails/verify-email.html no longer contains {{ .Token }}. Refusing to install it.')
  process.exit(1)
}

const body = {
  // Confirmation must stay on: the code screen is the only way into a new account.
  mailer_autoconfirm: false,
  mailer_subjects_confirmation: 'Your Urban Anomaly verification code',
  mailer_templates_confirmation_content: content,
}

if (dryRun) {
  console.log(`project ${ref}`)
  console.log(`subject  ${body.mailer_subjects_confirmation}`)
  console.log(`template ${content.length} bytes, {{ .Token }} present`)
  process.exit(0)
}

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

if (!response.ok) {
  console.error(`${response.status} ${response.statusText}`)
  console.error(await response.text())
  process.exit(1)
}

console.log(`Confirm signup template installed on ${ref}.`)
console.log('Sender name still needs custom SMTP: Authentication -> Emails -> SMTP Settings.')
