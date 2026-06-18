from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Scope
from ..schemas import ScopeCreate, ScopeUpdate, ScopeRead, ScopeTree

router = APIRouter(prefix="/scopes", tags=["scopes"])


def _build_tree(scopes: list[Scope]) -> list[ScopeTree]:
    by_id = {s.id: ScopeTree.model_validate(s) for s in scopes}
    roots = []
    for node in by_id.values():
        parent_id = next((s.parent_scope_id for s in scopes if s.id == node.id), None)
        if parent_id and parent_id in by_id:
            by_id[parent_id].children.append(node)
        else:
            roots.append(node)
    return roots


@router.get("/", response_model=list[ScopeRead])
def list_scopes(db: Session = Depends(get_db)):
    return db.query(Scope).order_by(Scope.type, Scope.name).all()


@router.get("/tree", response_model=list[ScopeTree])
def scope_tree(db: Session = Depends(get_db)):
    return _build_tree(db.query(Scope).all())


@router.post("/", response_model=ScopeRead, status_code=201)
def create_scope(payload: ScopeCreate, db: Session = Depends(get_db)):
    if payload.type == "organisation" and payload.parent_scope_id is not None:
        raise HTTPException(400, "Organisation-Geltungsbereich darf keinen übergeordneten Bereich haben.")
    scope = Scope(**payload.model_dump())
    db.add(scope)
    db.commit()
    db.refresh(scope)
    return scope


@router.put("/{scope_id}", response_model=ScopeRead)
def update_scope(scope_id: int, payload: ScopeUpdate, db: Session = Depends(get_db)):
    scope = db.get(Scope, scope_id)
    if not scope:
        raise HTTPException(404, "Geltungsbereich nicht gefunden.")
    for k, v in payload.model_dump().items():
        setattr(scope, k, v)
    db.commit()
    db.refresh(scope)
    return scope


@router.delete("/{scope_id}", status_code=204)
def delete_scope(scope_id: int, db: Session = Depends(get_db)):
    scope = db.get(Scope, scope_id)
    if not scope:
        raise HTTPException(404, "Geltungsbereich nicht gefunden.")
    db.delete(scope)
    db.commit()
