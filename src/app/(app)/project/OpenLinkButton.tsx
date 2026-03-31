import { ExternalLinkIcon } from '@/components/ui/Icons'

export default function OpenLinkButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
    >
      <ExternalLinkIcon className="w-3.5 h-3.5" />
      Ouvrir
    </a>
  )
}
