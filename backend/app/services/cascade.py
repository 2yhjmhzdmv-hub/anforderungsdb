"""
Cascade answer resolution: walks up parent_scope_id until an answer is found.
Returns the most specific (lowest in hierarchy) answer for a requirement+scope.
"""
from sqlalchemy.orm import Session
from ..models import Answer, Scope


def resolve_answer(requirement_id: int, scope_id: int, db: Session):
    """
    Returns (Answer, Scope, inherited: bool) or (None, None, False).
    `inherited` is True when the answer belongs to an ancestor scope, not scope_id itself.
    """
    current_id = scope_id
    first = True
    while current_id is not None:
        answer = db.query(Answer).filter(
            Answer.requirement_id == requirement_id,
            Answer.scope_id == current_id,
        ).first()
        if answer:
            scope = db.get(Scope, current_id)
            inherited = not first
            return answer, scope, inherited
        scope = db.get(Scope, current_id)
        if scope is None:
            break
        current_id = scope.parent_scope_id
        first = False
    return None, None, False
