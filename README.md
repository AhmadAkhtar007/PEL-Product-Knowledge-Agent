# PEL Smart Customer App — Codebase Overview

This document serves as a comprehensive guide to the codebase architecture, directories, and specific files within this repository. It is designed to be handed over to autonomous agents or new developers to quickly onboard and understand every component of the system.

## 🏗️ System Architecture
The repository is a monorepo containing multiple platforms for the PEL Smart Customer ecosystem:
1. **Backend (`backend/`)**: FastAPI-based backend with a RAG pipeline, LLM integration, and PostgreSQL/Alembic database.
2. **Web Applications (`agent-app/`, `web-app/`)**: Next.js (React) frontends for agents and general web users.
3. **Mobile Application (`android-app/`)**: React Native (Expo) app for Android/iOS users.
4. **Documentation & Knowledge Base**: A collection of product manuals (`backend/documents/`), system designs (`docs/`), and visual themes (`Design.md`).

---

## 📂 Root Directory Files
- `Design.md`: The core design system and theme documentation (colors, tokens, typography, and UX guidelines). **CRITICAL for UI work**.
- `docker-compose.yml`: Defines the multi-container environment (e.g., PostgreSQL, ChromaDB, backend).
- `pyproject.toml`: Python dependency management and tool configuration.
- `recover.py` / `generate_structure.py`: Utility scripts used for internal maintenance and structure mapping.
- `.gitignore`: Top-level exclusions for git.

---

## 🔧 Backend (`backend/`)
This is the core FastAPI server powering conversational logic, embeddings (RAG), and data persistence.

### Core Configuration
- `requirements.txt`: Python package dependencies.
- `.env`: Environment variable template.
- `Dockerfile`: Container build instructions for the backend service.
- `alembic.ini`: Configuration for Alembic (database migration tool).

### Application Code (`backend/app/`)
- `main.py`: Entry point for the FastAPI server, wiring up all routers and middleware.
- `config.py`: Environment variable loading and configuration management.
- `database.py`: PostgreSQL connection setup and session management.

#### Database Models (`backend/app/models/`)
- `appliance.py`: Schema for registered user appliances.
- `conversation.py`: Schema for storing conversation threads with users.
- `expert.py`: Schema for routing queries to specialized LLM experts.
- `part.py`: Schema for the parts catalog (replacements).
- `service_history.py`: Schema for tracking past maintenance and repairs.
- `ticket.py`: Schema for customer support tickets.

#### API Modules & Routers (`backend/app/modules/`)
- `conversations/`: Endpoints (`router.py`) and specific logic (`tools.py`) for the conversational chatbot.
- `health/`: System health check endpoints.
- `knowledge/`: APIs to manage knowledge base ingestion and `contracts.py`.
- `rag/`: The primary Retrieval-Augmented Generation module containing `ingestion.py`, `prompts.py`, `query_engine.py`, `router.py`, and `service.py`.

#### RAG & LLM Services
- `backend/app/RAG/`: Contains core ingestion and query engine logic (`ingestion.py`, `prompts.py`, `query_engine.py`) using ChromaDB and LLM.
- `backend/app/services/llm_service.py`: Wrapper for the language model integration.

### Database Migrations (`backend/alembic/`)
- `env.py` / `script.py.mako`: Alembic setup scripts.
- `versions/`: Individual migration files (e.g., `initial_migration`, `seed_experts`, `ticket_status_enum`, `seed_parts_catalog`).

### Knowledge Base Documents (`backend/documents/`)
Contains `.json` files mapping to different PEL product categories used by the RAG system:
- `air_conditioners/`, `air_purifiers/`, `deep_freezers/`, `general_support/`, `led_tvs/`, `microwave_ovens/`, `refrigerators/`, `technician/`, `washing_machines/`, `water_dispensers/`.

### Tests (`backend/tests/`)
Comprehensive Pytest suite:
- `conftest.py`: Shared pytest fixtures for database and client mocks.
- `test_01_foundation.py` to `test_05_appliances_service_parts.py`: Progressive testing corresponding to specific issue milestones.
- `test_rag_mock_embeddings.py` & `test_chroma.py`: Tests for vector database interactions.

---

## 🌐 Web Applications (`web-app/` & `agent-app/`)
Both applications are built with Next.js (App Router), TypeScript, and Tailwind CSS.
*(Note: Excludes build folders and auto-generated TypeScript files)*

### Shared Structure
- `package.json` / `package-lock.json`: Node dependencies.
- `tsconfig.json` / `next.config.ts` / `postcss.config.js`: Framework configurations.
- `tailwind.config.ts`: Tailwind utility setup.
- `src/app/globals.css`: Global styles referencing tokens from `Design.md`.
- `src/app/layout.tsx` & `src/app/page.tsx`: Root layout and main landing pages.

### `agent-app/` Specifics
- Used by PEL customer service agents.
- Contains additional layout components (`src/components/layout/Sidebar.tsx`).
- Contains chat interface components (`src/components/chat/ChatArea.tsx`).
- `src/app/api/chat/route.ts`: API route for managing agent chat interactions.

### `web-app/` Specifics
- Customer-facing interface.
- `src/app/api/rag/query/route.ts`: API route dedicated to querying the RAG pipeline directly from the web client.

---

## 📱 Mobile Application (`android-app/`)
React Native application utilizing Expo.
- `App.js`: The root component for the mobile application.
- `app.json`: Expo configuration, defining app name, icons, and bundle identifiers.
- `package.json`: Dependencies for the React Native environment.

---

## 📚 Documentation (`docs/`)
A historical record of project planning and specifications:
- `decisions/`: Architecture decision records (e.g., Phase 1 Scope).
- `issues/`: Markdown descriptions of specific technical goals (e.g., `001-backend-foundation-docker.md`).
- `superpowers/plans/` & `specs/`: Initial feature plans, PRDs (Product Requirements Documents), and high-level design strategies for the whole suite.

---

## 🛠️ Scripts (`scripts/`)
- `dev-backend.ps1`: PowerShell script for quickly starting up the backend development environment.

---

## 💡 How to Interact with this Codebase (For Agents)
1. **Design Updates**: Any visual change must align with `Design.md`. Avoid hardcoded hex colors; use design tokens.
2. **Backend Logic**: RAG features touch `backend/app/RAG` and `backend/app/modules/rag`. Database schema updates require `alembic` migrations in `backend/alembic`.
3. **Frontend Changes**: Focus entirely on the `src/` directory within `agent-app` and `web-app`. Tests are co-located or mapped similarly.
