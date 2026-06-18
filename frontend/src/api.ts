import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

// --- Types ---
export interface Category { id: number; name: string }
export interface Scope { id: number; name: string; type: string; parent_scope_id: number | null; created_at: string }
export interface ScopeTree extends Scope { children: ScopeTree[] }
export interface IsoControl { id: number; control_id: string; title: string; domain: string | null }
export interface Answer { id: number; requirement_id: number; scope_id: number; text: string; scope: Scope; created_at: string; updated_at: string }
export interface Requirement {
  id: number; text: string; category_id: number | null; created_at: string; updated_at: string
  category: Category | null; iso_controls: IsoControl[]; answers: Answer[]
}
export interface ResolvedAnswer { answer_text: string; answered_in_scope: Scope; inherited: boolean }
export interface ReviewMatch { requirement: Requirement; score: number | null; is_manual: boolean; resolved_answer: ResolvedAnswer | null }
export interface CustomerRequirement { id: number; text: string; scope: Scope; created_at: string; matches: ReviewMatch[] }

// --- Scopes ---
export const getScopes = () => api.get<Scope[]>('/scopes').then(r => r.data)
export const getScopeTree = () => api.get<ScopeTree[]>('/scopes/tree').then(r => r.data)
export const createScope = (d: { name: string; type: string; parent_scope_id?: number | null }) => api.post<Scope>('/scopes', d).then(r => r.data)
export const updateScope = (id: number, d: { name: string; type: string; parent_scope_id?: number | null }) => api.put<Scope>(`/scopes/${id}`, d).then(r => r.data)
export const deleteScope = (id: number) => api.delete(`/scopes/${id}`)

// --- Categories ---
export const getCategories = () => api.get<Category[]>('/categories').then(r => r.data)
export const createCategory = (name: string) => api.post<Category>('/categories', { name }).then(r => r.data)
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`)

// --- ISO Controls ---
export const getIsoControls = () => api.get<IsoControl[]>('/iso-controls').then(r => r.data)

// --- Requirements ---
export const getRequirements = () => api.get<Requirement[]>('/requirements').then(r => r.data)
export const createRequirement = (d: { text: string; category_id?: number | null }) => api.post<Requirement>('/requirements', d).then(r => r.data)
export const updateRequirement = (id: number, d: { text: string; category_id?: number | null }) => api.put<Requirement>(`/requirements/${id}`, d).then(r => r.data)
export const deleteRequirement = (id: number) => api.delete(`/requirements/${id}`)
export const setIsoControls = (id: number, controlIds: number[]) => api.put<Requirement>(`/requirements/${id}/iso-controls`, controlIds).then(r => r.data)

// --- Answers ---
export const createAnswer = (reqId: number, d: { text: string; scope_id: number }) => api.post<Answer>(`/requirements/${reqId}/answers`, d).then(r => r.data)
export const updateAnswer = (reqId: number, answerId: number, text: string) => api.put<Answer>(`/requirements/${reqId}/answers/${answerId}`, { text }).then(r => r.data)
export const deleteAnswer = (reqId: number, answerId: number) => api.delete(`/requirements/${reqId}/answers/${answerId}`)

// --- Review ---
export const submitReview = (d: { text: string; scope_id: number }) => api.post<CustomerRequirement>('/review', d).then(r => r.data)
export const getReviews = () => api.get<CustomerRequirement[]>('/review').then(r => r.data)
export const getReview = (id: number) => api.get<CustomerRequirement>(`/review/${id}`).then(r => r.data)
export const updateMapping = (id: number, d: { add_requirement_ids: number[]; remove_requirement_ids: number[] }) =>
  api.patch<CustomerRequirement>(`/review/${id}/mapping`, d).then(r => r.data)
