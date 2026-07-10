from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from modular structure
from backend.app.modules.health.router import router as health_router
from backend.app.modules.rag.router import router as rag_router
from backend.app.modules.conversations.router import router as conversations_router

def create_app() -> FastAPI:
    app = FastAPI(title="PEL Appliances Suite API")

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health_router)
    app.include_router(rag_router)
    app.include_router(conversations_router)

    return app

app = create_app()
