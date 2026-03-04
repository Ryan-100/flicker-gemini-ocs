from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
import json
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class PlanStatus(str, Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    CLARIFICATION_REQUESTED = "Clarification Requested"
    REVISED = "Revised"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    CONVERTED_TO_PROGRAM = "Converted to Program"  # Diagram UC-3 step 22

class RejectionCategory(str, Enum):
    TECHNICAL = "Technical Infeasibility"
    SCIENTIFIC = "Scientific Merit Issues"
    SCHEDULING = "Scheduling Conflict"
    INCOMPLETE = "Incomplete Information"
    CONDITIONS = "Observing Conditions Unrealistic"
    DATA_SPEC = "Data Specification Issues"
    INSTRUMENT = "Instrument Configuration Problem"
    OTHER = "Other"

class Target(BaseModel):
    name: str = Field(..., example="Messier 31")
    ra: str = Field(..., example="00:42:44.3")
    dec: str = Field(..., example="+41:16:09")
    magnitude: float = Field(..., example=3.44)
    object_type: str = Field(..., example="Galaxy")

class ObservingConditions(BaseModel):
    seeing: float = Field(..., example=0.5)
    cloud_cover: int = Field(..., example=20)
    water_vapor: int = Field(..., example=10)

class ExposureSettings(BaseModel):
    exp_time: float = Field(..., example=300.0)
    num_exposures: int = Field(..., example=10)
    filters: List[str] = Field(default_factory=list, example=["V", "R"])
    total_time: Optional[float] = None

class ImageProcessingSpec(BaseModel):
    color_mode: str = Field(default="B&W")
    contrast: int = Field(default=50)
    brightness: int = Field(default=50)
    saturation: int = Field(default=50)

class DataProcessingReqs(BaseModel):
    file_type: str = Field(default="FITS")
    file_quality: str = Field(default="High")
    image_proc: ImageProcessingSpec

# Diagram UC-1 step 15: Optional scheduling constraints section
class SchedulingConstraints(BaseModel):
    date_start: Optional[str] = None   # Earliest observation date (YYYY-MM-DD)
    date_end: Optional[str] = None     # Latest observation date (YYYY-MM-DD)
    priority: int = Field(default=1)   # 1=High, 2=Medium, 3=Low
    time_window_notes: Optional[str] = None  # Free-text time window description

class SciencePlan(BaseModel):
    id: Optional[str] = None
    astronomer_id: str
    target: Target
    instrument: Optional[str] = None
    conditions: ObservingConditions
    exposure: ExposureSettings
    data_proc: DataProcessingReqs
    status: PlanStatus = PlanStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.now)
    submission_notes: Optional[str] = None
    rejection_category: Optional[RejectionCategory] = None
    rejection_reason: Optional[str] = None
    # Diagram UC-1 step 15: optional scheduling constraints
    scheduling: Optional[SchedulingConstraints] = None
    # Diagram UC-3 15b: clarification questions from Science Observer
    clarification_questions: Optional[str] = None

    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        if values.get('status') == PlanStatus.REJECTED:
            if not v or len(v) < 50:
                raise ValueError("Rejection reason must be at least 50 characters.")
        return v

class SciencePlanDB(Base):
    __tablename__ = "science_plans"

    id = Column(String, primary_key=True)
    astronomer_id = Column(String, nullable=False)
    target = Column(JSON, nullable=False)
    instrument = Column(String, nullable=True)
    conditions = Column(JSON, nullable=False)
    exposure = Column(JSON, nullable=False)
    data_proc = Column(JSON, nullable=False)
    status = Column(SQLEnum(PlanStatus), default=PlanStatus.DRAFT)
    created_at = Column(DateTime, default=datetime.now)
    submission_notes = Column(String, nullable=True)
    rejection_category = Column(SQLEnum(RejectionCategory), nullable=True)
    rejection_reason = Column(String, nullable=True)
    # Diagram UC-1 step 15: scheduling constraints stored as JSON
    scheduling = Column(JSON, nullable=True)
    # Diagram UC-3 15b: clarification questions
    clarification_questions = Column(String, nullable=True)
