from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from .models import SciencePlan, PlanStatus, RejectionCategory, SchedulingConstraints
from .database import store

class LoginRequest(BaseModel):
    username: str
    password: str

app = FastAPI(title="Flicker Gemini OCS API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Flicker Gemini OCS API"}

@app.post("/login")
async def login(credentials: LoginRequest):
    if credentials.username == 'astronomer' and credentials.password == 'password':
        return {'username': 'astronomer', 'role': 'Astronomer', 'full_name': 'Dr. Alice Astronomer'}
    elif credentials.username == 'observer' and credentials.password == 'password':
        return {'username': 'observer', 'role': 'Science Observer', 'full_name': 'Bob Observer'}
    raise HTTPException(status_code=401, detail="Invalid credentials. Use 'astronomer' or 'observer' with 'password'.")

@app.get("/plans", response_model=List[SciencePlan])
async def get_plans():
    return store.list_plans()

@app.get("/plans/{plan_id}", response_model=SciencePlan)
async def get_plan(plan_id: str):
    plan = store.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@app.post("/plans", response_model=SciencePlan)
async def create_plan(plan: SciencePlan):
    # Diagram UC-1 step 10: Validate observing conditions against instrument limits
    if plan.conditions.seeing < 0.3 or plan.conditions.seeing > 3.0:
        raise HTTPException(status_code=422, detail="Seeing must be between 0.3 and 3.0 arcsec (instrument limit).")
    if not (0 <= plan.conditions.cloud_cover <= 100):
        raise HTTPException(status_code=422, detail="Cloud cover must be between 0 and 100%.")
    if not (0 <= plan.conditions.water_vapor <= 100):
        raise HTTPException(status_code=422, detail="Water vapor must be between 0 and 100%.")

    # Diagram UC-1 step 12: Calculate estimated observation duration
    plan.exposure.total_time = plan.exposure.exp_time * plan.exposure.num_exposures

    # Diagram UC-1 step 14: Validate data specifications against Gemini OCS standards
    allowed_file_types = ['FITS', 'TIFF', 'JPEG']
    if plan.data_proc.file_type not in allowed_file_types:
        raise HTTPException(status_code=422, detail=f"File type must be one of: {', '.join(allowed_file_types)}.")

    # Diagram UC-1 step 16: Validate scheduling constraints if provided
    if plan.scheduling and plan.scheduling.date_start and plan.scheduling.date_end:
        if plan.scheduling.date_end < plan.scheduling.date_start:
            raise HTTPException(status_code=422, detail="Scheduling end date must be on or after start date.")

    return store.save_plan(plan)

@app.post("/plans/{plan_id}/submit", response_model=SciencePlan)
async def submit_plan(plan_id: str, notes: str = Body(None, embed=True)):
    plan = store.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Diagram UC-2 step 8: Pre-submission validation
    if plan.status not in [PlanStatus.DRAFT, PlanStatus.REVISED]:
        raise HTTPException(status_code=400, detail=f"Cannot submit plan in {plan.status} status")

    # Diagram UC-2 step 15-16: Add plan to validation queue (via status change) and notify
    return store.update_status(plan_id, PlanStatus.SUBMITTED, submission_notes=notes)

@app.post("/plans/{plan_id}/validate", response_model=SciencePlan)
async def validate_plan(
    plan_id: str,
    approve: bool = Body(..., embed=True),
    category: RejectionCategory = Body(None, embed=True),
    reason: str = Body(None, embed=True)
):
    plan = store.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Diagram UC-3 precondition: plan must be Submitted
    if plan.status != PlanStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted plans can be validated")

    if approve:
        # Diagram UC-3 steps 19-24: Approve path — change status, notify, remove from queue (implicit)
        return store.update_status(plan_id, PlanStatus.APPROVED)
    else:
        # Diagram UC-3 15a5: Validate comment ≥50 characters
        if not reason or len(reason) < 50:
            raise HTTPException(status_code=422, detail="Rejection reason must be at least 50 characters.")

        # Diagram UC-3 15a8-15a12: Set rejected status, store reason, notify, remove from queue
        return store.update_status(
            plan_id,
            PlanStatus.REJECTED,
            rejection_category=category,
            rejection_reason=reason
        )

# Diagram UC-3 15b: Request Clarification — new endpoint
@app.post("/plans/{plan_id}/request_clarification", response_model=SciencePlan)
async def request_clarification(
    plan_id: str,
    questions: str = Body(..., embed=True)
):
    plan = store.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Diagram UC-3 15b precondition: plan must be Submitted
    if plan.status != PlanStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted plans can have clarification requested.")

    if not questions or not questions.strip():
        raise HTTPException(status_code=422, detail="Please provide clarification questions.")

    # Diagram UC-3 15b4-15b5: Store clarification questions, change status, notify Astronomer
    return store.update_status(
        plan_id,
        PlanStatus.CLARIFICATION_REQUESTED,
        clarification_questions=questions.strip()
    )

# Diagram UC-3 15b continuation: Astronomer responds to clarification — revises plan
@app.post("/plans/{plan_id}/revise", response_model=SciencePlan)
async def revise_plan(plan_id: str, updated: SciencePlan):
    plan = store.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.status != PlanStatus.CLARIFICATION_REQUESTED:
        raise HTTPException(status_code=400, detail="Only plans with 'Clarification Requested' status can be revised this way.")

    # Apply server-side validation same as create
    if updated.conditions.seeing < 0.3 or updated.conditions.seeing > 3.0:
        raise HTTPException(status_code=422, detail="Seeing must be between 0.3 and 3.0 arcsec.")
    if updated.data_proc.file_type not in ['FITS', 'TIFF', 'JPEG']:
        raise HTTPException(status_code=422, detail="File type must be FITS, TIFF, or JPEG.")

    # Overwrite fields, force REVISED status, preserve original metadata
    updated.id = plan_id
    updated.astronomer_id = plan.astronomer_id
    updated.status = PlanStatus.REVISED
    updated.clarification_questions = plan.clarification_questions  # keep for reference
    updated.exposure.total_time = updated.exposure.exp_time * updated.exposure.num_exposures
    return store.save_plan(updated)
