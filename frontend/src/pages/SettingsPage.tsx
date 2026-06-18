import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getScopes, createScope, updateScope, deleteScope,
  getCategories, createCategory, deleteCategory,
  Scope,
} from '../api'
import Modal from '../components/Modal'

const SCOPE_TYPES = ['organisation', 'produkt', 'infrastruktur'] as const

function ScopeForm({ scopes, initial, onSave, onCancel }: {
  scopes: Scope[]
  initial?: Scope
  onSave: (d: { name: string; type: string; parent_scope_id: number | null }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<string>(initial?.type ?? 'produkt')
  const [parentId, setParentId] = useState<number | null>(initial?.parent_scope_id ?? null)

  const eligible = scopes.filter(s => s.id !== initial?.id)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Art</label>
        <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={type} onChange={e => { setType(e.target.value); if (e.target.value === 'organisation') setParentId(null) }}>
          {SCOPE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
      {type !== 'organisation' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Übergeordneter Bereich</label>
          <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={parentId ?? ''} onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— keiner —</option>
            {eligible.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
          </select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50" onClick={onCancel}>Abbrechen</button>
        <button className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), type, parent_scope_id: parentId })}>Speichern</button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: scopes = [] } = useQuery({ queryKey: ['scopes'], queryFn: getScopes })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const [scopeModal, setScopeModal] = useState<'new' | Scope | null>(null)
  const [newCat, setNewCat] = useState('')

  const createScopeMut = useMutation({ mutationFn: createScope, onSuccess: () => { qc.invalidateQueries({ queryKey: ['scopes'] }); setScopeModal(null) } })
  const updateScopeMut = useMutation({ mutationFn: ({ id, d }: { id: number; d: any }) => updateScope(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['scopes'] }); setScopeModal(null) } })
  const deleteScopeMut = useMutation({ mutationFn: deleteScope, onSuccess: () => qc.invalidateQueries({ queryKey: ['scopes'] }) })
  const createCatMut = useMutation({ mutationFn: createCategory, onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewCat('') } })
  const deleteCatMut = useMutation({ mutationFn: deleteCategory, onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) })

  const typeLabel: Record<string, string> = { organisation: 'Org', produkt: 'Prod', infrastruktur: 'Infra' }
  const typeColor: Record<string, string> = { organisation: 'bg-purple-100 text-purple-700', produkt: 'bg-blue-100 text-blue-700', infrastruktur: 'bg-green-100 text-green-700' }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Scopes */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Geltungsbereiche</h2>
          <button className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700" onClick={() => setScopeModal('new')}>
            <Plus size={14} /> Neu
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {scopes.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColor[s.type]}`}>{typeLabel[s.type]}</span>
                <span className="text-sm text-gray-800">{s.name}</span>
                {s.parent_scope_id && <span className="text-xs text-gray-400">↑ {scopes.find(p => p.id === s.parent_scope_id)?.name}</span>}
              </div>
              <div className="flex gap-1">
                <button className="p-1 text-gray-400 hover:text-blue-600" onClick={() => setScopeModal(s)}><Pencil size={14} /></button>
                <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => { if (confirm('Löschen?')) deleteScopeMut.mutate(s.id) }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {scopes.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Noch keine Geltungsbereiche</p>}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Themenbereiche</h2>
        <div className="flex gap-2 mb-4">
          <input className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Neuer Themenbereich…" value={newCat} onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newCat.trim() && createCatMut.mutate(newCat.trim())} />
          <button className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50" disabled={!newCat.trim()} onClick={() => createCatMut.mutate(newCat.trim())}>
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <span key={c.id} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-2.5 py-1 rounded">
              {c.name}
              <button className="text-gray-400 hover:text-red-500" onClick={() => deleteCatMut.mutate(c.id)}><Trash2 size={12} /></button>
            </span>
          ))}
          {categories.length === 0 && <p className="text-sm text-gray-400">Noch keine Themenbereiche</p>}
        </div>
      </section>

      {scopeModal && (
        <Modal title={scopeModal === 'new' ? 'Geltungsbereich anlegen' : 'Geltungsbereich bearbeiten'} onClose={() => setScopeModal(null)}>
          <ScopeForm
            scopes={scopes}
            initial={scopeModal !== 'new' ? scopeModal : undefined}
            onSave={d => scopeModal === 'new' ? createScopeMut.mutate(d) : updateScopeMut.mutate({ id: (scopeModal as Scope).id, d })}
            onCancel={() => setScopeModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}
