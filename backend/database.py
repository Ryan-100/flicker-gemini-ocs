import uuid
from typing import Dict, List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from .models import SciencePlan, SciencePlanDB, Base, PlanStatus

# Database setup
DATABASE_URL = "sqlite:///./flicker.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

def run_migrations():
    """Add any missing columns to existing tables (safe to run repeatedly)."""
    with engine.connect() as conn:
        # Check if 'instrument' column exists
        result = conn.execute(
            text("PRAGMA table_info(science_plans)")
        )
        columns = {row[1] for row in result}
        if 'instrument' not in columns:
            conn.execute(text("ALTER TABLE science_plans ADD COLUMN instrument VARCHAR"))
            conn.commit()

run_migrations()

class PlanStore:
    def __init__(self):
        pass

    def get_db(self) -> Session:
        return SessionLocal()

    def save_plan(self, plan: SciencePlan) -> SciencePlan:
        db = self.get_db()
        try:
            if not plan.id:
                plan.id = str(uuid.uuid4())
            
            db_plan = SciencePlanDB(
                id=plan.id,
                astronomer_id=plan.astronomer_id,
                target=plan.target.dict(),
                instrument=plan.instrument,
                conditions=plan.conditions.dict(),
                exposure=plan.exposure.dict(),
                data_proc=plan.data_proc.dict(),
                status=plan.status,
                created_at=plan.created_at,
                submission_notes=plan.submission_notes,
                rejection_category=plan.rejection_category,
                rejection_reason=plan.rejection_reason
            )
            db.merge(db_plan)
            db.commit()
            return plan
        finally:
            db.close()

    def get_plan(self, plan_id: str) -> Optional[SciencePlan]:
        db = self.get_db()
        try:
            db_plan = db.query(SciencePlanDB).filter(SciencePlanDB.id == plan_id).first()
            if db_plan:
                return SciencePlan(**{
                    "id": db_plan.id,
                    "astronomer_id": db_plan.astronomer_id,
                    "target": db_plan.target,
                    "instrument": db_plan.instrument,
                    "conditions": db_plan.conditions,
                    "exposure": db_plan.exposure,
                    "data_proc": db_plan.data_proc,
                    "status": db_plan.status,
                    "created_at": db_plan.created_at,
                    "submission_notes": db_plan.submission_notes,
                    "rejection_category": db_plan.rejection_category,
                    "rejection_reason": db_plan.rejection_reason
                })
            return None
        finally:
            db.close()

    def list_plans(self) -> List[SciencePlan]:
        db = self.get_db()
        try:
            db_plans = db.query(SciencePlanDB).all()
            return [
                SciencePlan(**{
                    "id": p.id,
                    "astronomer_id": p.astronomer_id,
                    "target": p.target,
                    "instrument": p.instrument,
                    "conditions": p.conditions,
                    "exposure": p.exposure,
                    "data_proc": p.data_proc,
                    "status": p.status,
                    "created_at": p.created_at,
                    "submission_notes": p.submission_notes,
                    "rejection_category": p.rejection_category,
                    "rejection_reason": p.rejection_reason
                }) for p in db_plans
            ]
        finally:
            db.close()

    def update_status(self, plan_id: str, status, **kwargs) -> Optional[SciencePlan]:
        db = self.get_db()
        try:
            db_plan = db.query(SciencePlanDB).filter(SciencePlanDB.id == plan_id).first()
            if db_plan:
                db_plan.status = status
                for key, value in kwargs.items():
                    setattr(db_plan, key, value)
                db.commit()
                # Use get_plan to return a Pydantic model
                return self.get_plan(plan_id)
            return None
        finally:
            db.close()

# Singleton instance
store = PlanStore()
