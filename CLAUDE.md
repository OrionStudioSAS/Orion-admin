@AGENTS.md

# Règles d'optimisation des tokens

## Lecture de fichiers
- Ne JAMAIS relire un fichier entier quand on a besoin de modifier 1 seule section. Utiliser `offset` + `limit` pour ne lire que la partie nécessaire.
- Utiliser `Grep` pour localiser les lignes précises AVANT de lire, puis lire uniquement la zone ciblée (±10 lignes autour).
- Ne pas relire un fichier déjà lu dans la même conversation sauf si modifié entre-temps.

## Exploration
- Utiliser `Grep` avec `output_mode: "content"` et des contextes courts (`-C 3`) au lieu de lire des fichiers entiers.
- Préférer `Glob` pour trouver des fichiers plutôt que `Agent` d'exploration.

## Éditions
- Faire toutes les éditions d'un même fichier en un minimum de calls (regrouper les changements proches).
- Utiliser `replace_all: true` quand un même pattern doit changer partout.

## Structure du projet (cache mental)

### Framework & Stack
- Framework: Next.js App Router (RSC + Client Components)
- DB: Supabase (`createAdminClient()` pour les opérations, `createClient()` pour auth)
- Styling: Tailwind CSS inline, design dark (#0f0f0f, #1e1e1e, white)
- Déploiement: Vercel (variables d'env dans Vercel Settings)
- Domain: admin.orion-studio.io

### Arborescence clé
- Types centraux: `src/types/database.ts`
- Actions serveur: `src/app/actions/` (projects.ts, prospects.ts, clients.ts, profile.ts)
- Composants UI: `src/components/ui/Icons.tsx`
- Layout: `src/components/layout/Sidebar.tsx`

### Pages admin (`src/app/(app)/admin/`)
- Overview (charts Recharts): `admin/overview/page.tsx` + `OverviewCharts.tsx`
- Projets: `admin/projects/[projectId]/` (TeamSection, AppsSection)
- Prospection: `admin/prospection/ProspectionPanel.tsx` (email/cold_call tabs)
- Clients: `admin/clients/[clientId]/ClientView.tsx`
- Users: `admin/users/[profileId]/ProjectManager.tsx`

### Pages client
- Dashboard: `src/app/(app)/dashboard/page.tsx` (flows autorisés + non autorisés)
- Projet: `src/app/(app)/project/page.tsx` (suivi étapes, équipe, apps)
- Profil: `src/app/(app)/profile/ProfileForm.tsx`

### Intégrations
- WhatsApp/Twilio: `src/lib/whatsapp.ts`
- Gmail API (brouillons): `src/lib/gmail.ts` (OAuth2, createGmailDraft)
- Claude/Anthropic (génération mails): `src/lib/anthropic.ts` (generateProspectionEmail)
- API routes Gmail OAuth: `src/app/api/gmail/auth/` et `callback/`
- Storage: bucket `project-files` (Supabase Storage, URLs signées 10 ans)

### Modèle de données (tables principales)
- `profiles`: id, email, role (admin|client), full_name, company, phone, website, webflow_site, job_title, linkedin_url, company_address, siret, avatar_url
- `projects`: id, profile_id, plan_type, status (en_cours|termine|en_pause), figma_url, site_url, monday_url, staging_url, google_business_url
- `project_steps`: id, project_id, position, title, status, client_approved, start_date, end_date
- `project_files`: id, project_id, category (invoice), amount_ht (=TTC), is_paid
- `project_team_members`: project_id, profile_id, role_override (junction, lie admins/users aux projets)
- `prospects`: id, company_name, contact_name, email, phone, channel (email|cold_call), status (nouveau|contacte|relance|en_discussion|rdv_pris|converti|perdu), notes, sector
- `flows`, `flow_access`, `access_requests`: système d'automatisations
- `apps`, `project_apps`: catalogue d'apps liées aux projets
- `client_documents`: fichiers/liens admin pour les clients

### Patterns récurrents
- Server actions retournent `{ success, error }` au lieu de throw en prod (Next.js masque les erreurs)
- Avatar: `createSignedUrl(path, 315360000)` (10 ans) sur bucket privé
- Auto-expire: prospects `relancé` >1 semaine → `perdu` (calculé au chargement Overview)
- Anthropic response: toujours strip les ` ```json ``` ` avant JSON.parse
- Encodage Gmail: RFC 2047 pour Subject, base64 Content-Transfer-Encoding pour body UTF-8

### Variables d'environnement (Vercel)
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_REDIRECT_URI, GMAIL_FROM_EMAIL
- ANTHROPIC_API_KEY
- PROSPECTION_SENDER_NAME, PROSPECTION_SENDER_COMPANY, PROSPECTION_SENDER_TITLE
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
