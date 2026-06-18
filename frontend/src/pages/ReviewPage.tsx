import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import {
  getScopes, getReviews, getRequirements, submitReview, updateMapping,
  CustomerRequirement, ReviewMatch,
} from '../api'

function MatchCard({ match, inherited }: { match: ReviewMatch; inherited?: boolean }) {
  const [open, setOpen] = useState(true)
  const score = match.score != null ? Math.round(match.score * 100) : null
  const ra = match.resolved_answer

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <div className="mt-0.5 text-gray-400 shrink-0">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {match.is_manual && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Manuell</span>}
            {score != null && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{score}% Match</span>}
            {match.requirement.category && <span className="text-xs text-gray-400">{match.requirement.category.name}</span>}
          </div>
          <p className="text-sm text-gray-800 font-medium">{match.requirement.text}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {match.requirement.iso_controls.map(c => (
              <span key={c.id} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{c.control_id}</span>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          {ra ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-amber-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {ra ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500">Antwort</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${ra.inherited ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'}`}>
                  {ra.inherited ? `geerbt von: ${ra.answered_in_scope.name}` : `eigene Antwort: ${ra.answered_in_scope.name}`}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3">{ra.answer_text}</p>
            </div>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 rounded p-3">Keine Antwort für diesen Geltungsbereich hinterlegt.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ cr }: { cr: CustomerRequirement }) {
  const qc = useQueryClient()
  const { data: requirements = [] } = useQuery({ queryKey: ['requirements'], queryFn: getRequirements })
  const [open, setOpen] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [addId, setAddId] = useState<number | null>(null)

  const mappedIds = cr.matches.map(m => m.requirement.id)
  const unmapped = requirements.filter(r => !mappedIds.includes(r.id))

  const updateMut = useMutation({
    mutationFn: (d: { add_requirement_ids: number[]; remove_requirement_ids: number[] }) => updateMapping(cr.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews'] }); setAddMode(false); setAddId(null) },
  })

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <div className="mt-0.5 text-gray-400 shrink-0">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">{new Date(cr.created_at).toLocaleDateString('de')}</span>
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{cr.scope.name}</span>
            <span className="text-xs text-gray-400">{cr.matches.length} Treffer</span>
          </div>
          <p className="text-sm text-gray-700">{cr.text}</p>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {cr.matches.map(m => (
            <div key={m.requirement.id} className="relative">
              <MatchCard match={m} />
              <button
                className="absolute top-3 right-10 p-1 text-gray-300 hover:text-red-400"
                title="Zuordnung entfernen"
                onClick={() => updateMut.mutate({ add_requirement_ids: [], remove_requirement_ids: [m.requirement.id] })}
              ><X size={13} /></button>
            </div>
          ))}
          {addMode ? (
            <div className="flex gap-2">
              <select className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" value={addId ?? ''} onChange={e => setAddId(Number(e.target.value))}>
                <option value="">Stammanforderung wählen…</option>
                {unmapped.map(r => <option key={r.id} value={r.id}>{r.text.slice(0, 80)}{r.text.length > 80 ? '…' : ''}</option>)}
              </select>
              <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={!addId}
                onClick={() => updateMut.mutate({ add_requirement_ids: [addId!], remove_requirement_ids: [] })}>Hinzufügen</button>
              <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50" onClick={() => setAddMode(false)}>Abbrechen</button>
            </div>
          ) : (
            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700" onClick={() => setAddMode(true)}>
              <Plus size={12} /> Stammanforderung manuell zuordnen
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReviewPage() {
  const qc = useQueryClient()
  const { data: scopes = [] } = useQuery({ queryKey: ['scopes'], queryFn: getScopes })
  const { data: reviews = [], isLoading } = useQuery({ queryKey: ['reviews'], queryFn: getReviews })

  const [text, setText] = useState('')
  const [scopeId, setScopeId] = useState<number | null>(null)
  const [result, setResult] = useState<CustomerRequirement | null>(null)

  const submitMut = useMutation({
    mutationFn: () => submitReview({ text, scope_id: scopeId! }),
    onSuccess: data => { setResult(data); qc.invalidateQueries({ queryKey: ['reviews'] }) },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Input form */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Kundenanforderung prüfen</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anforderungstext <span className="text-red-500">*</span></label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
              rows={4}
              placeholder="Fremd formulierte Kundenanforderung einfügen…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Geltungsbereich <span className="text-red-500">*</span></label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={scopeId ?? ''}
              onChange={e => setScopeId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Bitte wählen…</option>
              {scopes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!text.trim() || !scopeId || submitMut.isPending}
              onClick={() => submitMut.mutate()}
            >
              <Search size={15} />
              {submitMut.isPending ? 'Suche läuft…' : 'Prüfen'}
            </button>
          </div>
        </div>
      </section>

      {/* Current result */}
      {result && (
        <section>
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Aktuelles Ergebnis</h3>
          <div className="space-y-2">
            {result.matches.length === 0
              ? <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded p-4 text-center">Keine Treffer gefunden.</p>
              : result.matches.map(m => <MatchCard key={m.requirement.id} match={m} />)
            }
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Verlauf</h3>
        {isLoading && <p className="text-sm text-gray-400">Lade…</p>}
        <div className="space-y-2">
          {reviews.filter(r => r.id !== result?.id).map(cr => <ReviewCard key={cr.id} cr={cr} />)}
          {!isLoading && reviews.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Noch keine Prüfungen durchgeführt.</p>}
        </div>
      </section>
    </div>
  )
}
