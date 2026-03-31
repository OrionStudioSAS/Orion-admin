import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StarIcon, ExternalLinkIcon, FolderIcon } from '@/components/ui/Icons'
import DownloadButton from './DownloadButton'

const PLAN_LABELS: Record<string, string> = {
  webflow_creation: 'Création Webflow',
  shopify_creation: 'Création Shopify',
  webflow_refonte: 'Refonte Webflow',
  shopify_refonte: 'Refonte Shopify',
  autre: 'Autre',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  termine: { label: 'Terminé', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  en_pause: { label: 'En pause', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

const CATEGORY_LABELS: Record<string, string> = {
  resource: 'Ressources',
  quote: 'Devis',
  invoice: 'Factures',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function ProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'admin') redirect('/admin/users')

  const { data: project } = await admin
    .from('projects')
    .select('*, project_files(*)')
    .eq('profile_id', user.id)
    .single()

  const files = (project?.project_files || []) as Array<{
    id: string; name: string; category: string; storage_path: string; original_name: string | null; size_bytes: number | null; created_at: string
  }>

  const resources = files.filter(f => f.category === 'resource')
  const quotes = files.filter(f => f.category === 'quote')
  const invoices = files.filter(f => f.category === 'invoice')

  const status = project?.status ? STATUS_LABELS[project.status] : null

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-2.5 h-2.5 text-[#a1a1aa]" />
          <span className="text-[#a1a1aa] text-xs tracking-widest uppercase font-medium">Espace client</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Mon projet</h1>
          {status && (
            <span className={`text-[10px] font-semibold border px-2.5 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
          )}
          {project?.plan_type && (
            <span className="text-[10px] text-[#a1a1aa] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
              {PLAN_LABELS[project.plan_type]}
            </span>
          )}
        </div>
      </div>

      {!project ? (
        <div className="border border-dashed border-[#1e1e1e] rounded-2xl p-8 md:p-16 text-center">
          <FolderIcon className="w-8 h-8 text-[#52525b] mx-auto mb-3" />
          <p className="text-[#a1a1aa] text-sm">Votre projet est en cours de configuration.</p>
          <p className="text-[#52525b] text-xs mt-1">Votre espace sera disponible très prochainement.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Liens rapides */}
          {(project.figma_url || project.site_url || project.monday_url) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.figma_url && (
                <a
                  href={project.figma_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm-8-4a4 4 0 1 0 8 0V4H4a4 4 0 0 0 0 8zm0 4a4 4 0 0 0 4 4h4v-4a4 4 0 0 0-4-4 4 4 0 0 0-4 4zm4 8a4 4 0 1 0 0-8v8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Maquette</div>
                    <div className="text-sm font-medium text-white">Voir sur Figma</div>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
                </a>
              )}
              {project.site_url && (
                <a
                  href={project.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3c-2.5 3-4 5.7-4 9s1.5 6 4 9m0-18c2.5 3 4 5.7 4 9s-1.5 6-4 9M3 12h18" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Site web</div>
                    <div className="text-sm font-medium text-white truncate">{project.site_url.replace(/^https?:\/\//, '')}</div>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
                </a>
              )}
              {project.monday_url && (
                <a
                  href={project.monday_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="6" cy="17" r="3.5" fill="#FF3D57" />
                      <circle cx="12" cy="17" r="3.5" fill="#FFCB00" />
                      <circle cx="18" cy="17" r="3.5" fill="#00CA72" />
                      <path d="M3 17c0-3.5 2-8 3-10l3 7" stroke="none" />
                      <path d="M5.5 7C6.5 9 9 14 9 17" stroke="#FF3D57" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M11.5 7C12.5 9 15 14 15 17" stroke="#FFCB00" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-1">Suivi de projet</div>
                    <div className="text-sm font-medium text-white">Voir sur Monday</div>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-colors shrink-0" />
                </a>
              )}
            </div>
          )}

          {/* Notes de l'équipe */}
          {project.notes && (
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5">
              <div className="text-[10px] text-[#a1a1aa] uppercase tracking-widest font-medium mb-3">Note de l'équipe</div>
              <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}

          {/* Sections fichiers */}
          {[
            { key: 'resource', label: 'Ressources', files: resources, desc: 'Plans d\'action, audits, rapports' },
            { key: 'quote', label: 'Devis', files: quotes, desc: 'Devis de prestation' },
            { key: 'invoice', label: 'Factures', files: invoices, desc: 'Factures et reçus' },
          ].map(({ label, files: sectionFiles, desc }) => (
            <div key={label} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="text-xs text-[#a1a1aa] mt-0.5">{desc}</div>
                </div>
                <span className="text-[10px] text-[#a1a1aa]">{sectionFiles.length} fichier{sectionFiles.length > 1 ? 's' : ''}</span>
              </div>
              {sectionFiles.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-[#52525b] text-xs">Aucun fichier disponible pour le moment.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#0f0f0f]">
                  {sectionFiles.map(file => (
                    <div key={file.id} className="flex items-center gap-3 md:gap-4 px-5 py-3.5 bg-[#080808]/50">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
                          <polyline points="14 2 14 8 20 8" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{file.name}</div>
                        <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                          {file.original_name && <span>{file.original_name}</span>}
                          {file.size_bytes && <span className="ml-2">{formatBytes(file.size_bytes)}</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#a1a1aa] shrink-0 hidden sm:block">
                        {new Date(file.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      <DownloadButton storagePath={file.storage_path} fileName={file.original_name || file.name} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
