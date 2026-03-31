'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flow, FormField } from '@/types/database'
import { CheckIcon, XIcon, BoltIcon } from '@/components/ui/Icons'
import { logExecution } from '@/app/actions/executions'

interface Props {
  flow: Flow
  userId: string
}

export default function FlowForm({ flow, userId }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const fields = (flow.form_schema as unknown as FormField[]) || []

  function handleChange(name: string, value: string) {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch(flow.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, flow_id: flow.id, user_id: userId }),
      })

      const isOk = response.ok
      let responseData: unknown = {}
      try { responseData = await response.json() } catch {}

      await logExecution({
        flow_id: flow.id,
        status: isOk ? 'success' : 'error',
        payload: values,
        response: responseData,
      })

      if (isOk) {
        setStatus('success')
        setMessage('Workflow déclenché avec succès !')
        setValues({})
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setStatus('error')
        setMessage('Une erreur est survenue lors du déclenchement.')
      }
    } catch {
      await logExecution({
        flow_id: flow.id,
        status: 'error',
        payload: values,
        response: { error: 'Network error' },
      }).catch(() => {})
      setStatus('error')
      setMessage('Impossible de joindre le webhook. Vérifiez votre connexion.')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
          <CheckIcon className="w-5 h-5 text-green-400" />
        </div>
        <h3 className="text-white font-medium mb-1">Succès !</h3>
        <p className="text-[#a1a1aa] text-sm">{message}</p>
        <p className="text-[#a1a1aa] text-xs mt-1">Redirection en cours...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-xs font-medium text-[#a1a1aa] mb-2 tracking-wide uppercase">
            {field.label}
            {field.required && <span className="text-[#a1a1aa] ml-1">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              value={values[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              rows={3}
              className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-4 py-3 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          ) : field.type === 'select' ? (
            <select
              value={values[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors appearance-none"
            >
              <option value="">Sélectionner...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={values[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full bg-[#080808] border border-[#1e1e1e] text-white text-sm rounded-lg px-4 py-3 placeholder-[#3f3f46] focus:outline-none focus:border-white/30 transition-colors"
            />
          )}
        </div>
      ))}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          <XIcon className="w-3.5 h-3.5 shrink-0" />
          {message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-white/90 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BoltIcon className="w-3.5 h-3.5" />
          {status === 'loading' ? 'Déclenchement...' : 'Déclencher'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[#a1a1aa] text-sm px-4 py-2.5 rounded-lg hover:text-white hover:bg-white/5 transition-all"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
