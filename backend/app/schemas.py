from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# --- Category ---
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase): pass
class CategoryRead(CategoryBase):
    id: int
    class Config: from_attributes = True


# --- Scope ---
class ScopeBase(BaseModel):
    name: str
    type: str
    parent_scope_id: Optional[int] = None

class ScopeCreate(ScopeBase): pass
class ScopeUpdate(ScopeBase): pass
class ScopeRead(ScopeBase):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class ScopeTree(ScopeRead):
    children: list[ScopeTree] = []


# --- ISO Control ---
class IsoControlRead(BaseModel):
    id: int
    control_id: str
    title: str
    domain: Optional[str]
    class Config: from_attributes = True


# --- Answer ---
class AnswerBase(BaseModel):
    text: str
    scope_id: int

class AnswerCreate(AnswerBase): pass
class AnswerUpdate(BaseModel):
    text: str

class AnswerRead(AnswerBase):
    id: int
    requirement_id: int
    created_at: datetime
    updated_at: datetime
    scope: ScopeRead
    class Config: from_attributes = True


# --- Requirement ---
class RequirementBase(BaseModel):
    text: str
    category_id: Optional[int] = None

class RequirementCreate(RequirementBase): pass
class RequirementUpdate(RequirementBase): pass

class RequirementRead(RequirementBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryRead] = None
    iso_controls: list[IsoControlRead] = []
    answers: list[AnswerRead] = []
    class Config: from_attributes = True


# --- Customer Requirement ---
class CustomerRequirementCreate(BaseModel):
    text: str
    scope_id: int

class ResolvedAnswer(BaseModel):
    answer_text: str
    answered_in_scope: ScopeRead
    inherited: bool

class ReviewMatch(BaseModel):
    requirement: RequirementRead
    score: Optional[float]
    is_manual: bool
    resolved_answer: Optional[ResolvedAnswer]

class CustomerRequirementRead(BaseModel):
    id: int
    text: str
    scope: ScopeRead
    created_at: datetime
    matches: list[ReviewMatch] = []
    class Config: from_attributes = True


# --- Review ---
class ReviewRequest(BaseModel):
    text: str
    scope_id: int

class MappingUpdate(BaseModel):
    add_requirement_ids: list[int] = []
    remove_requirement_ids: list[int] = []
