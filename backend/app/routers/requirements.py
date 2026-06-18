from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Requirement, IsoControl, RequirementIsoControl
from ..schemas import RequirementCreate, RequirementUpdate, RequirementRead
from ..services.embeddings import embed_document

router = APIRouter(prefix="/requirements", tags=["requirements"])


@router.get("/", response_model=list[RequirementRead])
def list_requirements(db: Session = Depends(get_db)):
    return db.query(Requirement).order_by(Requirement.id).all()


@router.get("/{req_id}", response_model=RequirementRead)
def get_requirement(req_id: int, db: Session = Depends(get_db)):
    req = db.get(Requirement, req_id)
    if not req:
        raise HTTPException(404, "Stammanforderung nicht gefunden.")
    return req


@router.post("/", response_model=RequirementRead, status_code=201)
def create_requirement(payload: RequirementCreate, db: Session = Depends(get_db)):
    req = Requirement(**payload.model_dump())
    req.embedding = embed_document(payload.text)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.put("/{req_id}", response_model=RequirementRead)
def update_requirement(req_id: int, payload: RequirementUpdate, db: Session = Depends(get_db)):
    req = db.get(Requirement, req_id)
    if not req:
        raise HTTPException(404, "Stammanforderung nicht gefunden.")
    for k, v in payload.model_dump().items():
        setattr(req, k, v)
    req.embedding = embed_document(payload.text)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/{req_id}", status_code=204)
def delete_requirement(req_id: int, db: Session = Depends(get_db)):
    req = db.get(Requirement, req_id)
    if not req:
        raise HTTPException(404, "Stammanforderung nicht gefunden.")
    db.delete(req)
    db.commit()


@router.put("/{req_id}/iso-controls", response_model=RequirementRead)
def set_iso_controls(req_id: int, control_ids: list[int], db: Session = Depends(get_db)):
    req = db.get(Requirement, req_id)
    if not req:
        raise HTTPException(404, "Stammanforderung nicht gefunden.")
    db.query(RequirementIsoControl).filter(RequirementIsoControl.requirement_id == req_id).delete()
    for cid in control_ids:
        ctrl = db.get(IsoControl, cid)
        if ctrl:
            db.add(RequirementIsoControl(requirement_id=req_id, iso_control_id=cid))
    db.commit()
    db.refresh(req)
    return req
