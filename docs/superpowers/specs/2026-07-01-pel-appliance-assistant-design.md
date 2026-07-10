# Product Requirements & Design Document (PRD): PEL Appliance Chatbot & RAG Suite

This document defines the requirements, architecture, and design specifications for the PEL Appliance Chatbot & Multimodal RAG Suite. The suite comprises a shared Python backend and two separate React Native mobile applications tailored for customers and field technicians.

---

## 1. Goal & Context
PEL (Pak Elektron Limited) is a major manufacturer of home appliances (refrigerators, air conditioners, washing machines, deep freezers, microwave ovens, water dispensers). The company requires an intelligent system capable of answering product queries, diagnosing faults, and routing complaints for escalation.

The system will leverage a **Retrieval-Augmented Generation (RAG)** pipeline to answer user questions using official PEL manuals, specifications, and fault-code guides without requiring model retraining. 

Key user bases:
1. **PEL Customers**: Need simplified troubleshooting steps, safety instructions, and a way to register complaint tickets if an appliance issue persists.
2. **PEL Certified Technicians**: Need technical diagnostic procedures, fault code breakdowns, component testing details, and a quick contact directory of department heads for expert advice.

---

## 2. Key Features

### 2.1 Multilingual Understanding
* Supports queries in English, Urdu (Urdu script), and Roman Urdu (Hinglish/Urdu written in Latin letters, e.g., *"washing machine paani leak kar rahi hai"*).
* The LLM responds in the same language and script used by the user, translating English manual reference materials on-the-fly.

### 2.2 Multimodal Image Analysis
* Customers and technicians can snap photos of blinking control boards, frost buildup, compressor specifications, or serial numbers.
* The backend decodes images and routes them alongside technical manual text context to Gemini's multimodal API for unified analysis.

### 2.3 Product-Scoped Knowledge ("Gems" Emulation)
* Knowledge bases are partitioned by product lines and model numbers (e.g. AC Apex 12K, Fridge PR-1950).
* A query is restricted to documents containing relevant metadata to ensure precise product responses and prevent cross-appliance confusion.

### 2.4 Voice Integration Plugin Ready
* Designed to overlay voice capability onto the text backend.
* Uses Speech-to-Text (STT) on the mobile client to transcribe voice inputs, queries the RAG backend, and plays back responses using Text-to-Speech (TTS).

---

## 3. High-Level Architecture

```mermaid
graph TD
    %% Frontend Clients
    subgraph Customer Mobile App (react-native-expo)
        CA[Chat Screen]
        CT[Ticket Screen]
        CC[Camera / Audio Recorder]
    end

    subgraph Technician Mobile App (react-native-expo)
        TA[Tech Chat Screen]
        TD[Expert Directory]
        TC[Camera / Audio Recorder]
    end

    %% Backend Services
    subgraph Backend Server (FastAPI + Python)
        API[FastAPI Router]
        auth[Auth & Role Manager]
        rag[Multimodal RAG Engine]
        ticket[Ticketing API]
        db[SQLite Database]
    end

    %% AI & Data Ingestion
    subgraph AI Engine & Vector DB
        gemini[Gemini API - Google AI Studio Free Tier]
        vector[ChromaDB - Scoped Collections]
        ingest[Document Ingestion Service]
        docs[(PEL Manuals, Specs, Fault Sheets)]
    end

    %% Interactions
    CA -->|HTTP / JSON + Base64 Image| API
    TA -->|HTTP / JSON + Base64 Image| API
    CC -->|Provides Image / STT Text| CA
    TC -->|Provides Image / STT Text| TA

    API --> auth
    API --> rag
    API --> ticket
    ticket -->|SQLite| db

    ingest -->|Process per Product Category| docs
    ingest -->|Store in Scoped Collections| vector
    rag -->|Query filtered by Product Category| vector
    rag -->|Send Text + Image + Context| gemini
```

---

## 4. Component Design & Specifications

### 4.1 Backend (FastAPI + Python)
* **`/rag/query` (POST)**
  * Payload: `{ "query": string, "role": "customer" | "technician", "product_id": string, "image_base64": optional_string }`
  * Response: `{ "response": string, "escalate": boolean, "expert_contacts": optional_array }`
* **`/tickets` (GET / POST)**
  * `POST /tickets`: Registers a customer complaint.
  * `GET /tickets`: Lists filed complaints for technician review.
* **`/experts` (GET)**
  * Retrieves list of division contacts categorized by appliance type.
* **`LLMService` Wrapper**:
  * An abstraction interface that interacts with Google GenAI SDK. Changing to OpenAI or Anthropic requires only changing the driver inside this class and the corresponding `.env` configuration.

### 4.2 Customer Mobile App (`customer-app`)
* **Home**: Shows registered appliances and link to launch the Troubleshooting Assistant.
* **Chat Panel**: Multimodal interface with a message input box and a camera button. Shows a simplified troubleshooting conversation.
* **Escalation Notification**: If the backend sends an `escalate` flag, displays a prompt card asking the user if they want to register a service ticket.
* **Ticket Form**: Simple interface allowing customers to report issues, select appliance models, add descriptions, and upload proof-of-defect images.

### 4.3 Technician Mobile App (`technician-app`)
* **Home**: Quick search bar for fault codes and appliance lists.
* **Technical Chat**: Chat UI accepting technical terms (e.g. resistance measurements, wiring specs) and board photos.
* **Expert Contacts View**: Displays names, direct-dial numbers, and email details of division managers when an issue cannot be resolved by standard manuals.
* **Ticket Worklist**: Review filed customer complaints to plan repair visits.

---

## 5. Ingestion & RAG Data Flow

### 5.1 Document Splitting & Indexing
1. Manuals are processed recursively using Python's PDF parsers.
2. Content is partitioned into chunks of 1000 characters with 200-character overlap.
3. Tabular datasheets are transformed into plain-text descriptions.
4. Text chunks are passed to the Gemini Embedding model (`text-embedding-004`).
5. Vector matrices are indexed inside ChromaDB with associated metadata tags: `{"product_id": "...", "appliance_type": "..."}`.

### 5.2 Retrieval & Inference
1. Upon user query, the backend performs a cosine similarity vector search on ChromaDB, filtering by `product_id`.
2. The top 3-4 text segments are retrieved.
3. System prompts customize responses:
   * **Customer System Instructions**: Limit answers to basic settings checks and power resets. Prioritize safety. Do not disclose technical wiring diagrams.
   * **Technician System Instructions**: Provide detailed, structured diagnostic checklists, resistor ratings, component layout coordinates, and expert reference details.

---

## 6. Error Handling & Edge Cases
* **Out-of-Scope Queries**: The LLM will reject general knowledge queries (e.g., world news) and politely state its purpose is PEL support.
* **Ambiguous Photos**: If a photo does not clearly show an appliance defect, the LLM will reply indicating what it sees and request a clearer, close-up photograph (e.g., showing the specific circuit board lights or the model sticker).
* **API Offline / Rate Limiting**: Displays direct customer helpline info: `0800-1-2-PEL` if the Gemini API service is unreachable.

---

## 7. Verification & Testing Plan

### 7.1 Automated Backend Tests
* Run unit tests on vector similarity scores using mock queries.
* Validate role-routing instructions (ensure customer is never given dangerous high-voltage diagnostic details).
* Test database schema inserts/retrievals for complaints.

### 7.2 Manual UI Verification
* Deploy mock RAG responses in customer and technician apps.
* Verify language switching on English, Urdu script, and Roman Urdu query inputs.
* Mock API base64 payload transmissions with test images to ensure the server parses and responds correctly.
