---
name: Orion Admin — contexte projet
description: Site de gestion des automations N8N pour l'agence Orion Studio
type: project
---

Plateforme interne Next.js 15 + Supabase pour déclencher des workflows N8N.

**Supabase project ID:** `oebvxnjrgkibocsxlqif` (région eu-central-2, actif)
**URL:** https://oebvxnjrgkibocsxlqif.supabase.co

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase Auth + SSR

**DB tables:** `profiles`, `flows`, `flow_access`, `flow_executions`

**Flows N8N seedés:** "Création d'article" et "Création de page CMS Secteur"

**À faire pour démarrer:** ajouter `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` (depuis le dashboard Supabase > Settings > API), puis créer le premier compte admin via `npm run dev` et la page /admin/users.

**Why:** L'agence a des clients avec accès restreint à certains flows, et des admins (équipe Orion) avec accès total + gestion users.

**How to apply:** Pour toute feature, respecter la séparation client/admin via RLS Supabase et la vérification de rôle dans les server components.
