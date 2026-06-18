from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Answer, Requirement, Scope
from ..schemas import AnswerCreate, AnswerUpdate, AnswerRead

router = APIRouter(prefix="/requirements/{req_id}/answers", tags=["answers"])


@router.get("/", response_model=list[AnswerRead])
def list_answers(req_id: int, db: Session = Depends(get_db)):
    return db.query(Answer).filter(Answer.requirement_id == req_id).all()


@router.post("/", response_model=AnswerRead, status_code=201)
def create_answer(req_id: int, payload: AnswerCreate, db: Session = Depends(get_db)):
    if not db.get(Requirement, req_id):
        raise HTTPException(404, "Stammanforderung nicht gefunden.")
    if not db.get(Scope, payload.scope_id):
        raise HTTPException(404, "Geltungsbereich nicht gefunden.")
    existing = db.query(Answer).filter(
        Answer.requirement_id == req_id,
        Answer.scope_id == payload.scope_id,
    ).first()
    if existing:
        raise HTTPException(409, "Antwort für diese Kombination existiert bereits.")
    answer = Answer(requirement_id=req_id, **payload.model_dump())
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


@router.put("/{answer_id}", response_model=AnswerRead)
def update_answer(req_id: int, answer_id: int, payload: AnswerUpdate, db: Session = Depends(get_db)):
    answer = db.query(Answer).filter(Answer.id == answer_id, Answer.requirement_id == req_id).first()
    if not answer:
        raise HTTPException(404, "Antwort nicht gefunden.")
    answer.text = payload.text
    db.commit()
    db.refresh(answer)
    return answer


@router.delete("/{answer_id}", status_code=204)
def delete_answer(req_id: int, answer_id: int, db: Session = Depends(get_db)):
    answer = db.query(Answer).filter(Answer.id == answer_id, Answer.requirement_id == req_id).first()
    if not answer:
        raise HTTPException(404, "Antwort nicht gefunden.")
    db.delete(answer)
    db.commit()
