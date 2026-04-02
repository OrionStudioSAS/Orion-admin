import { createGmailDraft } from './gmail'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.orion-studio.io'
const SENDER_NAME = process.env.PROSPECTION_SENDER_NAME || 'Orion Studio'

function emailTemplate(title: string, body: string, ctaText?: string, ctaUrl?: string): string {
  const ctaHtml = ctaText && ctaUrl
    ? `<p style="margin-top:24px"><a href="${ctaUrl}" style="background:#fff;color:#000;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;display:inline-block">${ctaText}</a></p>`
    : ''

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:16px;padding:32px">
  <div style="margin-bottom:24px">
    <span style="color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:2px">Orion Studio</span>
  </div>
  <h2 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 16px">${title}</h2>
  <div style="color:#a1a1aa;font-size:13px;line-height:1.6">${body}</div>
  ${ctaHtml}
  <hr style="border:none;border-top:1px solid #1e1e1e;margin:32px 0 16px" />
  <p style="color:#52525b;font-size:10px;margin:0">${SENDER_NAME} — Notification automatique</p>
</div>`
}

/**
 * Send a notification email via Gmail (non-blocking, fire and forget)
 */
export function sendNotification(params: {
  to: string
  subject: string
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
}): void {
  const html = emailTemplate(params.title, params.body, params.ctaText, params.ctaUrl)
  createGmailDraft({
    to: params.to,
    subject: params.subject,
    body: html,
  })
    // Auto-send: we use drafts.send instead — but since we only have compose scope,
    // we create the draft. For auto-send we'd need gmail.send scope.
    // For now, we just create the draft and log.
    .then(() => console.log(`[Notification] Draft created for ${params.to}: ${params.subject}`))
    .catch(err => console.error(`[Notification] Failed for ${params.to}:`, err))
}

// --- Notification presets ---

export function notifyProjectStatusChange(email: string, firstName: string, status: string) {
  const statusLabels: Record<string, string> = {
    en_cours: 'en cours',
    termine: 'termine',
    en_pause: 'en pause',
  }
  const label = statusLabels[status] || status
  sendNotification({
    to: email,
    subject: `Votre projet est maintenant ${label}`,
    title: `Mise a jour de votre projet`,
    body: `<p>Bonjour ${firstName},</p><p>Le statut de votre projet a ete mis a jour : <strong>${label}</strong>.</p><p>Connectez-vous pour voir les details.</p>`,
    ctaText: 'Voir mon projet',
    ctaUrl: `${APP_URL}/project`,
  })
}

export function notifyNewFile(email: string, firstName: string, fileName: string) {
  sendNotification({
    to: email,
    subject: `Nouveau fichier disponible`,
    title: `Un nouveau fichier a ete ajoute`,
    body: `<p>Bonjour ${firstName},</p><p>Un nouveau fichier <strong>${fileName}</strong> a ete ajoute a votre projet.</p>`,
    ctaText: 'Voir mon projet',
    ctaUrl: `${APP_URL}/project`,
  })
}

export function notifyStepUpdate(email: string, firstName: string, stepTitle: string, status: string) {
  const statusLabels: Record<string, string> = { todo: 'a faire', in_progress: 'en cours', done: 'terminee' }
  sendNotification({
    to: email,
    subject: `Etape "${stepTitle}" mise a jour`,
    title: `Une etape de votre projet a ete modifiee`,
    body: `<p>Bonjour ${firstName},</p><p>L'etape <strong>${stepTitle}</strong> est maintenant : <strong>${statusLabels[status] || status}</strong>.</p>`,
    ctaText: 'Voir mon projet',
    ctaUrl: `${APP_URL}/project`,
  })
}

export function notifyNewStepMessage(email: string, firstName: string, stepTitle: string, senderName: string) {
  sendNotification({
    to: email,
    subject: `Nouveau message sur "${stepTitle}"`,
    title: `Nouveau message sur votre projet`,
    body: `<p>Bonjour ${firstName},</p><p><strong>${senderName}</strong> a envoye un message sur l'etape <strong>${stepTitle}</strong>.</p>`,
    ctaText: 'Voir la conversation',
    ctaUrl: `${APP_URL}/project`,
  })
}

export function notifyPasswordReset(email: string, firstName: string) {
  sendNotification({
    to: email,
    subject: `Votre mot de passe a ete reinitialise`,
    title: `Mot de passe modifie`,
    body: `<p>Bonjour ${firstName},</p><p>Votre mot de passe a ete reinitialise par un administrateur.</p><p>Si vous n'etes pas a l'origine de cette action, contactez-nous immediatement.</p>`,
    ctaText: 'Se connecter',
    ctaUrl: `${APP_URL}/login`,
  })
}

export function notifyProfileUpdated(email: string, firstName: string) {
  sendNotification({
    to: email,
    subject: `Votre profil a ete mis a jour`,
    title: `Profil modifie`,
    body: `<p>Bonjour ${firstName},</p><p>Votre profil a ete mis a jour par un administrateur. Connectez-vous pour verifier les informations.</p>`,
    ctaText: 'Voir mon profil',
    ctaUrl: `${APP_URL}/profile`,
  })
}
