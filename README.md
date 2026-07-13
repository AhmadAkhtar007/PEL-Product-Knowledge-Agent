# PEL Smart Customer Ecosystem

## Overview
The PEL Smart Customer ecosystem is a comprehensive, multi-platform solution designed to provide intelligent, AI-driven support for home appliances. It integrates a powerful backend Retrieval-Augmented Generation (RAG) pipeline with multiple frontend clients, allowing users to troubleshoot issues, access manuals, and manage service requests seamlessly.

## System Architecture
The repository operates as a monorepo containing the following core components:

- **Backend** (`backend/`): A FastAPI-based server featuring a robust RAG pipeline, LLM integration, and a PostgreSQL/Alembic database for data persistence. It utilizes ChromaDB for vector storage of appliance manuals and technical knowledge bases.
- **Web Applications**: Built with Next.js, TypeScript, and Tailwind CSS.
  - `agent-app/`: A dedicated interface for customer service agents to manage ongoing conversations and support tickets.
  - `web-app/`: The primary customer-facing web portal.
- **Mobile Application** (`android-app/`): A React Native application built with Expo for Android and iOS users.

## Prerequisites
Ensure the following dependencies are installed on your machine before running the project:
- Docker and Docker Compose
- Node.js (v18 or higher) and npm
- PowerShell (for Windows users utilizing the automated start scripts)

## Getting Started

### Automated Setup (Windows)
For Windows users, an automated start script is provided in the root directory. This script will build the necessary Docker containers for the backend, install Android app dependencies, and launch the Expo bundler automatically.

1. Open PowerShell and navigate to the project root directory.
2. Run the initialization script:
   ```powershell
   .\start-all.ps1
   ```

### Manual Setup

#### 1. Backend Service
The backend and its associated database services (PostgreSQL, ChromaDB) are containerized using Docker. To start the entire backend stack:

```bash
# Start the backend stack in detached mode
docker compose up -d --build
```
The FastAPI application will launch, and database migrations will be handled automatically by Alembic.

#### 2. Mobile Application
The mobile application is built using Expo.

```bash
cd android-app
npm install

# Start the Metro bundler
npm start
```
You can then scan the provided QR code using the Expo Go app on your physical device, or run it on an Android/iOS emulator.

#### 3. Web Applications
To run either the customer web portal or the agent dashboard:

```bash
# For the Agent Dashboard
cd agent-app
npm install
npm run dev

# For the Customer Web Portal
cd web-app
npm install
npm run dev
```

## Documentation
Additional technical documentation, architectural decision records, and specifications can be found in the `docs/` directory. Knowledge base source files for the RAG pipeline are located in `backend/documents/`. The core design system tokens and UI guidelines are strictly documented in `Design.md`.

## Testing
The backend features a comprehensive Pytest suite. To execute the test suite, ensure your backend environment is configured and run:

```bash
cd backend
pytest
```
