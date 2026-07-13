from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.app.modules.rag.query_engine import RAGQueryEngine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.database import get_db_session
from backend.app.models.expert import Expert

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

    product_id: Optional[str] = None
    model: Optional[str] = None
    series: Optional[str] = None
    image_base64: Optional[str] = None

@router.post("/rag/query")
async def rag_query(req: QueryRequest, db: AsyncSession = Depends(get_db_session)):
    engine = RAGQueryEngine()
    result = await engine.query(
        query_text=req.query,
        product_id=req.product_id,
        model=req.model,
        series=req.series,
        image_base64=req.image_base64
    )
    
    response_data = {
        "response": result["response"],
        "escalate": result["escalate"]
    }
    
    # If needs escalation, provide experts
    if result["escalate"]:
        department = None
        if "metadata" in result and result["metadata"]:
            for meta in result["metadata"]:
                if meta and "product_category" in meta:
                    department = meta["product_category"]
                    break
        
        if not department:
            q = req.query.lower()
            if any(k in q for k in ["refrigerator", "fridge", "prgd", "cooling"]):
                department = "refrigerators"
            elif any(k in q for k in ["ac", "air conditioner", "air_conditioners", "heating"]):
                department = "air_conditioners"
            elif any(k in q for k in ["washing", "washer", "wm", "laundry"]):
                department = "washing_machines"

        query = select(Expert)
        if department:
            query = query.where(Expert.department == department)
            
        res = await db.execute(query)
        experts = res.scalars().all()
        
        expert_contacts = []
        for expert in experts:
            expert_contacts.append({
                "name": expert.name,
                "role_title": expert.role_title,
                "department": expert.department,
                "phone": expert.phone,
                "email": expert.email
            })
        response_data["expert_contacts"] = expert_contacts
        
    return response_data
