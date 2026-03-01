from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from .models import SciencePlan, PlanStatus, RejectionCategory
from .database import store

class LoginRequest(BaseModel):
    username: str
    password: str

app = FastAPI(title="Flicker Gemini OCS API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    return store.save_plan(plan)

@app.post("/plans/{plan_id}/submit", response_model=SciencePlan)
async def submit_plan(plan_id: str, notes: str = Body(None, embed=True)):
    plan = store.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan.status not in [PlanStatus.DRAFT, PlanStatus.REVISED]:
        raise HTTPException(status_code=400, detail=f"Cannot submit plan in {plan.status} status")
    
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
    
    if plan.status != PlanStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted plans can be validated")
    
    if approve:
        return store.update_status(plan_id, PlanStatus.APPROVED)
    else:
        # Pydantic model validator will handle rejection reason length check
        # But for better API error messages, we can check here too
        if not reason or len(reason) < 50:
             raise HTTPException(status_code=422, detail="Rejection reason must be at least 50 characters.")
        
        return store.update_status(
            plan_id, 
            PlanStatus.REJECTED, 
            rejection_category=category, 
            rejection_reason=reason
        )
