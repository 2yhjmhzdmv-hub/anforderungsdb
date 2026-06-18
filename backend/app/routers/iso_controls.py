from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import IsoControl
from ..schemas import IsoControlRead

router = APIRouter(prefix="/iso-controls", tags=["iso-controls"])


@router.get("/", response_model=list[IsoControlRead])
def list_controls(db: Session = Depends(get_db)):
    return db.query(IsoControl).order_by(IsoControl.control_id).all()
