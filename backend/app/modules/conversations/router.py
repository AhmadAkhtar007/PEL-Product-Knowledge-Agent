from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import func

from backend.app.database import get_db_session
from backend.app.models.conversation import Conversation, Message
from backend.app.models.expert import Expert
from backend.app.modules.rag.query_engine import RAGQueryEngine
from backend.app.modules.rag.prompts import GENERAL_PROMPT_TEMPLATE
from backend.app.services.llm_service import LLMService
from backend.app.modules.conversations.tools import agent_tools, register_complaint, trigger_dialer, escalate_to_app, contact_whatsapp

router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class ConversationCreate(BaseModel):
    role: str = "general"
    title: Optional[str] = None

class ConversationResponse(BaseModel):
    id: int
    title: Optional[str]
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConversationListResponse(BaseModel):
    id: int
    title: Optional[str]
    role: str
    message_count: int
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    image_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class QueryRequest(BaseModel):
    query: str
    role: Optional[str] = None
    product_id: Optional[str] = None
    model: Optional[str] = None
    series: Optional[str] = None
    image_base64: Optional[str] = None
    audio_base64: Optional[str] = None

# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(req: ConversationCreate, db: AsyncSession = Depends(get_db_session)):
    
    conv = Conversation(
        role=req.role,
        title=req.title,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv

@router.get("/conversations", response_model=List[ConversationListResponse])
async def list_conversations(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
    response = []
    for conv in conversations:
        response.append({
            "id": conv.id,
            "title": conv.title,
            "role": conv.role,
            "message_count": len(conv.messages),
            "updated_at": conv.updated_at
        })
    return response

@router.get("/conversations/{id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(Conversation).where(Conversation.id == id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    result_messages = await db.execute(
        select(Message)
        .where(Message.conversation_id == id)
        .order_by(Message.created_at.asc())
    )
    messages = result_messages.scalars().all()
    return messages

@router.delete("/conversations/{id}")
async def delete_conversation(id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(Conversation).where(Conversation.id == id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db.delete(conv)
    await db.commit()
    return {"status": "success", "message": "Conversation deleted"}

@router.post("/conversations/{id}/query")
async def conversation_query_stream(
    id: int,
    req: QueryRequest,
    db: AsyncSession = Depends(get_db_session)
):
    # 1. Verify conversation exists
    result = await db.execute(select(Conversation).where(Conversation.id == id))
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. Fetch last 10 messages before adding current one
    result_messages = await db.execute(
        select(Message)
        .where(Message.conversation_id == id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    history_messages = list(reversed(result_messages.scalars().all()))

    # 3. Handle Auto-titling if this is the first message
    count_result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == id)
    )
    message_count = count_result.scalar() or 0
    
    if message_count == 0:
        conversation.title = req.query[:50]
        db.add(conversation)
        
    # 4. Save user message to database
    user_msg = Message(
        conversation_id=id,
        role="user",
        content=req.query,
        image_url=req.image_base64
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(conversation)

    # 5. Define the SSE generator
    async def sse_event_generator():
        # First event: thinking
        yield f"event: thinking\ndata: {json.dumps({'thinking': True})}\n\n"
        await asyncio.sleep(0.1)

        # Retrieve context from ChromaDB
        engine = RAGQueryEngine()
        context_chunks, metadatas = engine.retrieve_context(
            query_text=req.query,
            product_id=req.product_id,
            model=req.model,
            series=req.series
        )
        
        context_text = "\n---\n".join(context_chunks) if context_chunks else "No manual context found."
        
        # Format conversation history
        history_str = ""
        if history_messages:
            history_str = "<conversation_history>\n"
            history_str += "\n".join([f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}" for m in history_messages])
            history_str += "\n</conversation_history>\n"
            
        # Format prompt
        prompt = GENERAL_PROMPT_TEMPLATE.format(context=context_text, query=req.query, history=history_str)
            
        # Call Gemini streaming
        llm = LLMService()
        accumulated_response = ""
        
        async for chunk in llm.generate_content_stream(prompt, req.image_base64, audio_base64=req.audio_base64, tools=agent_tools):
            if isinstance(chunk, str):
                accumulated_response += chunk
                yield f"event: content\ndata: {json.dumps(chunk)}\n\n"
            elif isinstance(chunk, list):
                for fc in chunk:
                    tool_name = fc.name
                    tool_args = fc.args
                    
                    if tool_name == "register_complaint":
                        res = register_complaint(**tool_args)
                        yield f"event: client_action\ndata: {json.dumps({'action': 'tool_result', 'tool': tool_name, 'result': res})}\n\n"
                        accumulated_response += "\n[Action Taken: Registered complaint on official PEL website]"
                    elif tool_name == "trigger_dialer":
                        phone_number = tool_args.get("phone_number")
                        res = trigger_dialer(phone_number)
                        yield f"event: client_action\ndata: {json.dumps({'action': 'dial', 'number': phone_number})}\n\n"
                        accumulated_response += f"\n[Action Taken: Triggered dialer for {phone_number}]"
                    elif tool_name == "escalate_to_app":
                        res = escalate_to_app()
                        yield f"event: client_action\ndata: {json.dumps({'action': 'open_app'})}\n\n"
                        accumulated_response += "\n[Action Taken: Redirected to Khidmat Markaz App]"
                    elif tool_name == "contact_whatsapp":
                        res = contact_whatsapp()
                        yield f"event: client_action\ndata: {json.dumps({'action': 'open_whatsapp'})}\n\n"
                        accumulated_response += "\n[Action Taken: Redirected to WhatsApp Support]"
            
        # Check escalation
        import re
        escalate = False
        if re.search(r'ESCALATE_(complaint|expert)', accumulated_response):
            escalate = True
            accumulated_response = re.sub(r'ESCALATE_(complaint|expert)[^\w]*', '', accumulated_response).strip()
            if not accumulated_response:
                accumulated_response = "I recommend having a technician look at this. Let me escalate this for you."

        # Fetch expert contacts if escalate
        expert_contacts = []
        if escalate:
            department = None
            if metadatas:
                for meta in metadatas:
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

            query_experts = select(Expert)
            if department:
                query_experts = query_experts.where(Expert.department == department)
            res_experts = await db.execute(query_experts)
            experts = res_experts.scalars().all()
            for expert in experts:
                expert_contacts.append({
                    "name": expert.name,
                    "role_title": expert.role_title,
                    "department": expert.department,
                    "phone": expert.phone,
                    "email": expert.email
                })
                    
        # Save assistant message to DB
        conversation.updated_at = func.now()
        db.add(conversation)
        
        assistant_msg = Message(
            conversation_id=id,
            role="assistant",
            content=accumulated_response
        )
        db.add(assistant_msg)
        await db.commit()
            
        # Yield the done event
        done_data = {
            "response": accumulated_response,
            "escalate": escalate
        }
        if escalate:
            done_data["expert_contacts"] = expert_contacts
            
        yield f"event: done\ndata: {json.dumps(done_data)}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")
