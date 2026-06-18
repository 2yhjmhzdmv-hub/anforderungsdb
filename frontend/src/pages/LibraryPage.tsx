import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import {
  getRequirements, getCategories, getScopes, getIsoControls,
  createRequirement, updateRequirement, deleteRequirement,
  setIsoControls, createAnswer, updateAnswer, deleteAnswer,
  Requirement, IsoControl, Answer,
} from '../api'
import Modal from '../components/Modal'

function IsoControlPicker({ all, selected, onChange }: { all: IsoControl[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const domains = [...new Set(all.map(c => c.domain ?? 'Sonstige'))]
  return (
    <div className="max-h-64 overflow-y-auto space-y-3 border border-gray-200 rounded p-3">
      {domains.map(domain => (
        <div key={domain}>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{domain}</div>
          <div className="space-y-1">
            {all.filter(c => (c.domain ?? 'Sonstige') === domain).map(c => (
              <label key={c.id} className="flex items-start gap-2 cursor-pointer group">
                <input type="checkbox" className="mt-0.5" checked={selected.includes(c.id)} onChange={e => {
                  onChange(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))
                }} />
                <span className="text-xs text-gray-700 group-hover:text-gray-900">
                  <span className="font-mono text-blue-600 mr-1">{c.control_id}</span>{c.title}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnswerSection({ req }: { req: Requirement }) {
  const qc = useQueryClient()
  const { data: scopes = [] } = useQuery({ queryKey: ['scopes'], queryFn: getScopes })
  const [editing, setEditing] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newScopeId, setNewScopeId] = useState<number | null>(null)

  const used = req.answers.map(a => a.scope_id)
  const available = scopes.filter(s => !used.includes(s.id))

  const createMut = useMutation({
    mutationFn: () => createAnswer(req.id, { text: newText, scope_id: newScopeId! }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }); setAdding(false); setNewText(''); setNewScopeId(null) },
  })
  const updateMut = useMutation({
    mutationFn: (a: Answer) => updateAnswer(req.id, a.id, editText),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }); setEditing(null) },
  })
  const deleteMut = useMutation({
    mutationFn: (a: Answer) => deleteAnswer(req.id, a.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements'] }),
  })

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase">Antworten</div>
      {req.answers.map(a => (
        <div key={a.id} className="bg-gray-50 rounded p-2.5 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-600">{a.scope.name} ({a.scope.type})</span>
            <div className="flex gap-1">
              <button className="text-gray-400 hover:text-blue-500" onClick={() => { setEditing(a.id); setEditText(a.text) }}><Pencil size={12} /></button>
              <button className="text-gray-400 hover:text-red-500" onClick={() => deleteMut.mutate(a)}><Trash2 size={12} /></button>
            </div>
          </div>
          {editing === a.id ? (
            <div className="space-y-2">
              <textarea className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={3} value={editText} onChange={e => setEditText(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50" onClick={() => setEditing(null)}>Abbrechen</button>
                <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => updateMut.mutate(a)}>Speichern</button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{a.text}</p>
          )}
        </div>
      ))}
      {adding ? (
        <div className="bg-gray-50 rounded p-2.5 space-y-2">
          <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={newScopeId ?? ''} onChange={e => setNewScopeId(Number(e.target.value))}>
            <option value="">Geltungsbereich wählen…</option>
            {available.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
          </select>
          <textarea className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={3} placeholder="Antworttext…" value={newText} onChange={e => setNewText(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50" onClick={() => setAdding(false)}>Abbrechen</button>
            <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={!newScopeId || !newText.trim()} onClick={() => createMut.mutate()}>Speichern</button>
          </div>
        </div>
      ) : available.length > 0 && (
        <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700" onClick={() => setAdding(true)}><Plus size={12} /> Antwort hinzufügen</button>
      )}
    </div>
  )
}

function RequirementRow({ req, all: allControls }: { req: Requirement; all: IsoControl[] }) {
  const qc = useQueryClient()
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(req.text)
  const [catId, setCatId] = useState<number | null>(req.category_id)
  const [isoModal, setIsoModal] = useState(false)
  const [selectedControls, setSelectedControls] = useState(req.iso_controls.map(c => c.id))

  const updateMut = useMutation({
    mutationFn: () => updateRequirement(req.id, { text, category_id: catId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }); setEditing(false) },
  })
  const deleteMut = useMutation({ mutationFn: () => deleteRequirement(req.id), onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements'] }) })
  const isoMut = useMutation({
    mutationFn: () => setIsoControls(req.id, selectedControls),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }); setIsoModal(false) },
  })

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-start gap-3 p-4">
        <button className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={3} value={text} onChange={e => setText(e.target.value)} />
              <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={catId ?? ''} onChange={e => setCatId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">— kein Themenbereich —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50" onClick={() => setEditing(false)}>Abbrechen</button>
                <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => updateMut.mutate()}>Speichern</button>
              </div>
            </div>
          ) : (
            <>
              {req.category && <div className="text-xs text-gray-400 mb-0.5">{req.category.name}</div>}
              <p className="text-sm text-gray-800">{req.text}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {req.iso_controls.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                    {c.control_id}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button title="ISO-Controls" className="p-1 text-gray-400 hover:text-indigo-600" onClick={() => { setSelectedControls(req.iso_controls.map(c => c.id)); setIsoModal(true) }}><Shield size={14} /></button>
          <button className="p-1 text-gray-400 hover:text-blue-600" onClick={() => setEditing(true)}><Pencil size={14} /></button>
          <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => { if (confirm('Löschen?')) deleteMut.mutate() }}><Trash2 size={14} /></button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <AnswerSection req={req} />
        </div>
      )}
      {isoModal && (
        <Modal title="ISO 27001 Controls verknüpfen" onClose={() => setIsoModal(false)}>
          <IsoControlPicker all={allControls} selected={selectedControls} onChange={setSelectedControls} />
          <div className="flex justify-end gap-2 mt-4">
            <button className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50" onClick={() => setIsoModal(false)}>Abbrechen</button>
            <button className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700" onClick={() => isoMut.mutate()}>Speichern</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function LibraryPage() {
  const qc = useQueryClient()
  const { data: requirements = [], isLoading } = useQuery({ queryKey: ['requirements'], queryFn: getRequirements })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const { data: isoControls = [] } = useQuery({ queryKey: ['iso-controls'], queryFn: getIsoControls })

  const [showNew, setShowNew] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCatId, setNewCatId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')

  const createMut = useMutation({
    mutationFn: () => createRequirement({ text: newText, category_id: newCatId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }); setShowNew(false); setNewText(''); setNewCatId(null) },
  })

  const filtered = requirements.filter(r => r.text.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <input className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Stammanforderungen filtern…" value={filter} onChange={e => setFilter(e.target.value)} />
        <button className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700" onClick={() => setShowNew(true)}>
          <Plus size={14} /> Neue Stammanforderung
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400 text-center py-8">Lade…</p>}
      {!isLoading && filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Keine Stammanforderungen gefunden.</p>}

      <div className="space-y-2">
        {filtered.map(r => <RequirementRow key={r.id} req={r} all={isoControls} />)}
      </div>

      {showNew && (
        <Modal title="Neue Stammanforderung" onClose={() => setShowNew(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
              <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={4} value={newText} onChange={e => setNewText(e.target.value)} placeholder="Prüfbare Einzelaussage…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Themenbereich</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={newCatId ?? ''} onChange={e => setNewCatId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">— kein Themenbereich —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50" onClick={() => setShowNew(false)}>Abbrechen</button>
              <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={!newText.trim()} onClick={() => createMut.mutate()}>
                {createMut.isPending ? 'Speichere…' : 'Speichern & Embedding berechnen'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
