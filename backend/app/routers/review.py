from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..models import CustomerRequirement, CustomerRequirementMapping, Requirement, Scope
from ..schemas import (
    ReviewRequest, CustomerRequirementRead, ReviewMatch, ResolvedAnswer,
    RequirementRead, ScopeRead, MappingUpdate
)
from ..services.embeddings import embed_query
from ..services.cascade import resolve_answer

router = APIRouter(prefix="/review", tags=["review"])

TOP_K = 5


def _build_match(req: Requirement, score: float | None, is_manual: bool, scope_id: int, db: Session) -> ReviewMatch:
    answer, answered_scope, inherited = resolve_answer(req.id, scope_id, db)
    resolved = None
    if answer:
        resolved = ResolvedAnswer(
            answer_text=answer.text,
            answered_in_scope=ScopeRead.model_validate(answered_scope),
            inherited=inherited,
        )
    return ReviewMatch(
        requirement=RequirementRead.model_validate(req),
        score=score,
        is_manual=is_manual,
        resolved_answer=resolved,
    )


@router.post("/", response_model=CustomerRequirementRead, status_code=201)
def submit_review(payload: ReviewRequest, db: Session = Depends(get_db)):
    if not db.get(Scope, payload.scope_id):
        raise HTTPException(404, "Geltungsbereich nicht gefunden.")

    # Semantic search
    query_vec = embed_query(payload.text)
    rows = db.execute(
        text(
            "SELECT id, 1 - (embedding <=> CAST(:vec AS vector)) AS score "
            "FROM requirement "
            "WHERE embedding IS NOT NULL "
            "ORDER BY embedding <=> CAST(:vec AS vector) "
            "LIMIT :k"
        ),
        {"vec": str(query_vec), "k": TOP_K},
    ).fetchall()

    cr = CustomerRequirement(text=payload.text, scope_id=payload.scope_id)
    db.add(cr)
    db.flush()

    for row in rows:
        db.add(CustomerRequirementMapping(
            customer_requirement_id=cr.id,
            requirement_id=row.id,
            score=row.score,
            is_manual=False,
        ))
    db.commit()
    db.refresh(cr)
    return _serialize(cr, db)


@router.get("/", response_model=list[CustomerRequirementRead])
def list_reviews(db: Session = Depends(get_db)):
    crs = db.query(CustomerRequirement).order_by(CustomerRequirement.created_at.desc()).all()
    return [_serialize(cr, db) for cr in crs]


@router.get("/{cr_id}", response_model=CustomerRequirementRead)
def get_review(cr_id: int, db: Session = Depends(get_db)):
    cr = db.get(CustomerRequirement, cr_id)
    if not cr:
        raise HTTPException(404, "Kundenanforderung nicht gefunden.")
    return _serialize(cr, db)


@router.patch("/{cr_id}/mapping", response_model=CustomerRequirementRead)
def update_mapping(cr_id: int, payload: MappingUpdate, db: Session = Depends(get_db)):
    cr = db.get(CustomerRequirement, cr_id)
    if not cr:
        raise HTTPException(404, "Kundenanforderung nicht gefunden.")

    for rid in payload.remove_requirement_ids:
        db.query(CustomerRequirementMapping).filter(
            CustomerRequirementMapping.customer_requirement_id == cr_id,
            CustomerRequirementMapping.requirement_id == rid,
        ).delete()

    for rid in payload.add_requirement_ids:
        exists = db.query(CustomerRequirementMapping).filter(
            CustomerRequirementMapping.customer_requirement_id == cr_id,
            CustomerRequirementMapping.requirement_id == rid,
        ).first()
        if not exists:
            db.add(CustomerRequirementMapping(
                customer_requirement_id=cr_id,
                requirement_id=rid,
                score=None,
                is_manual=True,
            ))

    db.commit()
    db.refresh(cr)
    return _serialize(cr, db)


def _serialize(cr: CustomerRequirement, db: Session) -> CustomerRequirementRead:
    matches = []
    for m in cr.mappings:
        req = db.get(Requirement, m.requirement_id)
        if req:
            matches.append(_build_match(req, m.score, m.is_manual, cr.scope_id, db))
    return CustomerRequirementRead(
        id=cr.id,
        text=cr.text,
        scope=ScopeRead.model_validate(cr.scope),
        created_at=cr.created_at,
        matches=matches,
    )
