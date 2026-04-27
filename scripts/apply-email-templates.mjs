#!/usr/bin/env node
/**
 * Applies custom email templates to the Supabase project via the Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=<token> node scripts/apply-email-templates.mjs
 *
 * Get your personal access token at:
 *   https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = "dbaslduvszwowlevuhux"

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is not set.")
  console.error("Get your token at: https://supabase.com/dashboard/account/tokens")
  console.error("\nThen run:")
  console.error("  SUPABASE_ACCESS_TOKEN=<token> node scripts/apply-email-templates.mjs")
  process.exit(1)
}

const confirmation = readFileSync(join(__dirname, "../src/emails/confirmation.html"), "utf8")
const recovery = readFileSync(join(__dirname, "../src/emails/recovery.html"), "utf8")

console.log("Applying email templates to project:", PROJECT_REF)

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_confirmation: "Confirma tu cuenta en Keeping",
    mailer_templates_confirmation_content: confirmation,
    mailer_subjects_recovery: "Restablece tu contraseña en Keeping",
    mailer_templates_recovery_content: recovery,
  }),
})

if (!res.ok) {
  const body = await res.text()
  console.error(`Error ${res.status}:`, body)
  process.exit(1)
}

console.log("Email templates applied successfully.")
console.log("  - Confirmation: 'Confirma tu cuenta en Keeping'")
console.log("  - Recovery:     'Restablece tu contraseña en Keeping'")
