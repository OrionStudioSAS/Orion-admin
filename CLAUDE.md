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
- Framework: Next.js App Router (RSC + Client Components)
- DB: Supabase (`createAdminClient()` pour les opérations, `createClient()` pour auth)
- Styling: Tailwind CSS inline, design dark (#0f0f0f, #1e1e1e, white)
- Actions serveur: `src/app/actions/`
- Types: `src/types/database.ts`
- Composants UI: `src/components/ui/Icons.tsx`
- Layout: `src/components/layout/Sidebar.tsx`
- Pages admin: `src/app/(app)/admin/`
- Pages client: `src/app/(app)/project/`, `src/app/(app)/dashboard/`, `src/app/(app)/profile/`
- WhatsApp: `src/lib/whatsapp.ts`
- Storage: bucket `project-files` (Supabase Storage)
