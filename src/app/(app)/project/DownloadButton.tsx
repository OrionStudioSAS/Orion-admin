'use client'

import { useState } from 'react'
import { getDownloadUrl } from '@/app/actions/projects'
import { DownloadIcon } from '@/components/ui/Icons'

export default function DownloadButton({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const url = await getDownloadUrl(storagePath)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.target = '_blank'
      a.click()
    } catch {
      alert('Impossible de télécharger le fichier.')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white border border-[#1e1e1e] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
    >
      <DownloadIcon className="w-3.5 h-3.5" />
      {loading ? 'Chargement...' : 'Télécharger'}
    </button>
  )
}
