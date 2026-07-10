# PEL Appliance Chatbot & RAG Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete PEL appliances chatbot and multimodal RAG suite featuring a FastAPI backend with ChromaDB vector search and two separate React Native (Expo) mobile apps for customers and technicians.

**Architecture:** A shared FastAPI server processes requests. ChromaDB stores product manual text vectors. The backend uses Google's GenAI SDK (Gemini Flash) for multimodal query answering and multilingual responses. SQLite is used to persist customer tickets. The mobile apps communicate via HTTP/JSON.

**Tech Stack:** 
* Backend: Python 3.10+, FastAPI, Uvicorn, SQLite, ChromaDB, Google GenAI SDK (`google-genai`), `pydantic`.
* Frontend: Node.js, React Native, Expo, React Navigation, Axios, Expo Image Picker.

---

## Workspace Layout
```text
PEL-Appliance-Suite/
├── backend/
├── customer-app/
└── technician-app/
```

---

## Task 1: Backend Database & Ingestion Setup (SQLite & Document Chunking)

**Files:**
* Create: `backend/requirements.txt`
* Create: `backend/app/config.py`
* Create: `backend/app/database.py`
* Create: `backend/app/RAG/ingestion.py`
* Create: `backend/documents/refrigerators/PR-1950_manual.txt`
* Create: `backend/documents/air_conditioners/apex-12k_manual.txt`
* Create: `backend/tests/test_database.py`

- [ ] **Step 1: Write requirements.txt**
  Create `backend/requirements.txt`:
  ```text
  fastapi==0.111.0
  uvicorn==0.30.1
  google-genai==0.1.1
  chromadb==0.5.0
  pydantic==2.7.4
  pytest==8.2.2
  python-multipart==0.0.9
  ```

- [ ] **Step 2: Create mock manuals**
  Create `backend/documents/refrigerators/PR-1950_manual.txt`:
  ```text
  PEL Refrigerator Model: PR-1950.
  Category: Refrigerator.
  Capacity: 350 Liters.
  Technology: Inverter.
  Fault Code E1: Temperature sensor failure. Disconnect power, check sensor resistance on control board pins 3 & 4. Normal reading is 10k ohms.
  Fault Code E2: Freezer fan motor failure. Check fan connection or replace fan motor.
  Fault Code E3: Compressor overcurrent. Compressor drawing high current; check compressor windings or replace compressor.
  Troubleshooting: If fridge is not cooling, ensure it is plugged in, thermostat is set to medium (level 3), and condenser coils at the back have at least 6 inches of clearance from the wall.
  ```
  Create `backend/documents/air_conditioners/apex-12k_manual.txt`:
  ```text
  PEL Air Conditioner Model: Apex 12K.
  Category: Air Conditioner.
  Capacity: 1 Ton.
  Technology: Inverter.
  Fault Code F1: Indoor ambient temperature sensor error. Replace sensor or check control board connection.
  Fault Code F2: Evaporator pipe temperature sensor error.
  Fault Code F3: Outdoor condenser discharge temperature sensor error.
  Troubleshooting: If AC is not cooling, check if air filter is dusty. Clean air filter every 2 weeks. Ensure outdoor unit is clear of obstructions and remote is set to Cool mode at 24C.
  ```

- [ ] **Step 3: Write configuration file**
  Create `backend/app/config.py`:
  ```python
  import os

  class Settings:
      GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
      MODEL_NAME: str = "gemini-1.5-flash"  # Easy swap variable
      DB_PATH: str = "pel_app.db"
      CHROMA_PATH: str = "chroma_db"

  settings = Settings()
  ```

- [ ] **Step 4: Write database manager**
  Create `backend/app/database.py`:
  ```python
  import sqlite3
  from backend.app.config import settings

  def get_db_connection():
      conn = sqlite3.connect(settings.DB_PATH)
      conn.row_factory = sqlite3.Row
      return conn

  def init_db():
      conn = get_db_connection()
      cursor = conn.cursor()
      
      # Tickets table
      cursor.execute("""
      CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          appliance_model TEXT NOT NULL,
          issue_description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
      """)
      
      # Experts directory
      cursor.execute("""
      CREATE TABLE IF NOT EXISTS experts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          role_title TEXT NOT NULL,
          department TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL
      )
      """)
      
      # Seed default experts
      cursor.execute("SELECT COUNT(*) FROM experts")
      if cursor.fetchone()[0] == 0:
          cursor.executemany("""
          INSERT INTO experts (name, role_title, department, phone, email)
          VALUES (?, ?, ?, ?, ?)
          """, [
              ("Engr. Muhammad Asif", "Refrigerator Division Head", "refrigerators", "+92-300-1112223", "asif.refrigerator@pel.com.pk"),
              ("Engr. Yasir Mahmood", "AC Division Head", "air_conditioners", "+92-300-4445556", "yasir.ac@pel.com.pk"),
              ("Engr. Fatima Shah", "Washing Machine Division Head", "washing_machines", "+92-300-7778889", "fatima.wm@pel.com.pk")
          ])
      
      conn.commit()
      conn.close()

  if __name__ == "__main__":
      init_db()
  ```

- [ ] **Step 5: Write the ingestion script**
  Create `backend/app/RAG/ingestion.py`:
  ```python
  import os
  import chromadb
  from backend.app.config import settings

  def ingest_documents():
      chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
      collection = chroma_client.get_or_create_collection(name="pel_knowledge_base")
      
      doc_dir = "backend/documents"
      if not os.path.exists(doc_dir):
          print(f"Error: {doc_dir} directory does not exist.")
          return

      id_counter = 1
      for root, dirs, files in os.walk(doc_dir):
          for file in files:
              if file.endswith(".txt"):
                  file_path = os.path.join(root, file)
                  category = os.path.basename(root)
                  product_id = file.replace("_manual.txt", "")
                  
                  with open(file_path, "r", encoding="utf-8") as f:
                      content = f.read()
                  
                  # Simple chunking by paragraph/lines
                  chunks = [chunk.strip() for chunk in content.split("\n") if len(chunk.strip()) > 10]
                  
                  for i, chunk in enumerate(chunks):
                      metadata = {
                          "category": category,
                          "product_id": product_id,
                          "source": file
                      }
                      doc_id = f"doc_{category}_{product_id}_{id_counter}"
                      
                      # ChromaDB will compute default embeddings internally if none provided
                      collection.add(
                          documents=[chunk],
                          metadatas=[metadata],
                          ids=[doc_id]
                      )
                      id_counter += 1
      print(f"Ingested {id_counter - 1} document chunks into ChromaDB.")

  if __name__ == "__main__":
      ingest_documents()
  ```

- [ ] **Step 6: Write database unit test**
  Create `backend/tests/test_database.py`:
  ```python
  import os
  import sqlite3
  from backend.app.config import settings

  # Use a separate test db path
  settings.DB_PATH = "test_pel_app.db"

  from backend.app.database import init_db, get_db_connection

  def test_database_initialization():
      if os.path.exists(settings.DB_PATH):
          os.remove(settings.DB_PATH)
      
      init_db()
      conn = get_db_connection()
      cursor = conn.cursor()
      
      # Verify tables exist
      cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'")
      assert cursor.fetchone() is not None
      
      cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='experts'")
      assert cursor.fetchone() is not None
      
      # Verify seeded experts
      cursor.execute("SELECT COUNT(*) FROM experts")
      assert cursor.fetchone()[0] == 3
      
      conn.close()
      os.remove(settings.DB_PATH)
  ```

- [ ] **Step 7: Run database test**
  Run: `pytest backend/tests/test_database.py -v`
  Expected: PASS

---

## Task 2: Multimodal RAG Engine & API Endpoints

**Files:**
* Create: `backend/app/services/llm_service.py`
* Create: `backend/app/RAG/query_engine.py`
* Create: `backend/app/RAG/prompts.py`
* Create: `backend/app/main.py`
* Create: `backend/tests/test_api.py`

- [ ] **Step 1: Create LLMService Wrapper**
  Create `backend/app/services/llm_service.py`:
  ```python
  from google import genai
  from google.genai import types
  from backend.app.config import settings
  import base64

  class LLMService:
      def __init__(self):
          # In practice, initialize client with settings.GEMINI_API_KEY
          # We check if key is present. If not, use mock responses for local testing/CI
          self.api_key = settings.GEMINI_API_KEY
          if self.api_key:
              self.client = genai.Client(api_key=self.api_key)
          else:
              self.client = None

      def query_gemini_multimodal(self, prompt: str, image_base64: str = None) -> str:
          if not self.client:
              # Mock fallback response for offline testing
              return f"[Mock Offline Response for Prompt: {prompt[:30]}...]"

          contents = [prompt]
          if image_base64:
              # Handle base64 image data
              if "," in image_base64:
                  image_base64 = image_base64.split(",")[1]
              image_data = base64.b64decode(image_base64)
              image_part = types.Part.from_bytes(
                  data=image_data,
                  mime_type="image/jpeg"
              )
              contents.append(image_part)

          response = self.client.models.generate_content(
              model=settings.MODEL_NAME,
              contents=contents
          )
          return response.text
  ```

- [ ] **Step 2: Define Prompts**
  Create `backend/app/RAG/prompts.py`:
  ```python
  CUSTOMER_PROMPT_TEMPLATE = """
  You are the official PEL Appliances Assistant for customers.
  
  Your goal is to answer queries about PEL appliances (refrigerators, ACs, washing machines) politely, safely, and concisely.
  Answer the user query using the retrieved manual context below.
  
  Retrieved Context:
  {context}
  
  User Query: {query}
  Role: Customer
  
  Instructions:
  1. Rely ONLY on the retrieved manual context to solve the issue. If the context does not contain enough information, set the escalation code.
  2. Maintain extreme safety. Do NOT suggest opening the chassis, handling high voltage wires, or replacing internal components. Tell them to book a PEL technician visit.
  3. Respond in the same language and script the user uses. If they ask in Roman Urdu (Hinglish), reply in Roman Urdu. If in Urdu script, reply in Urdu. If in English, reply in English.
  4. If the issue is not resolvable with basic steps (e.g. plugging in, cleaning filters, basic remote settings) or is out of context, output the exact phrase: "ESCALATE_complaint".
  """

  TECHNICIAN_PROMPT_TEMPLATE = """
  You are the official PEL Technical Diagnostic Assistant.
  
  Your goal is to help certified PEL technicians diagnose and repair appliances.
  Answer the technical query using the retrieved manual context below.
  
  Retrieved Context:
  {context}
  
  User Query: {query}
  Role: Technician
  
  Instructions:
  1. Provide step-by-step diagnostic instructions, electrical ratings, fault code details, sensor resistances, and component testing steps if present in context.
  2. Respond in the same language and script the user uses. If they ask in Roman Urdu (Hinglish), reply in Roman Urdu. If in Urdu script, reply in Urdu. If in English, reply in English.
  3. If the context does not contain the answer, or the problem is beyond normal field repair, output the exact phrase: "ESCALATE_expert".
  """
  ```

- [ ] **Step 3: Create RAG Query Engine**
  Create `backend/app/RAG/query_engine.py`:
  ```python
  import chromadb
  from backend.app.config import settings
  from backend.app.RAG.prompts import CUSTOMER_PROMPT_TEMPLATE, TECHNICIAN_PROMPT_TEMPLATE
  from backend.app.services.llm_service import LLMService

  class RAGQueryEngine:
      def __init__(self):
          self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
          self.collection = self.chroma_client.get_or_create_collection(name="pel_knowledge_base")
          self.llm = LLMService()

      def query(self, query_text: str, role: str, product_id: str = None, image_base64: str = None) -> dict:
          # ChromaDB retrieve
          filter_meta = {}
          if product_id:
              filter_meta["product_id"] = product_id
              
          results = self.collection.query(
              query_texts=[query_text],
              n_results=3,
              where=filter_meta if filter_meta else None
          )
          
          context_chunks = results["documents"][0] if results["documents"] else []
          context_text = "\n---\n".join(context_chunks) if context_chunks else "No manual context found."
          
          # Choose prompt template
          if role == "technician":
              prompt = TECHNICIAN_PROMPT_TEMPLATE.format(context=context_text, query=query_text)
          else:
              prompt = CUSTOMER_PROMPT_TEMPLATE.format(context=context_text, query=query_text)
              
          llm_response = self.llm.query_gemini_multimodal(prompt, image_base64)
          
          escalate = False
          if "ESCALATE_complaint" in llm_response or "ESCALATE_expert" in llm_response:
              escalate = True
              # Clean prompt escalation token from response
              llm_response = llm_response.replace("ESCALATE_complaint", "").replace("ESCALATE_expert", "").strip()
              if not llm_response:
                  llm_response = "I cannot resolve this issue using the manuals. Let's get this escalated."

          return {
              "response": llm_response,
              "escalate": escalate,
              "context": context_chunks
          }
  ```

- [ ] **Step 4: Write main FastAPI App**
  Create `backend/app/main.py`:
  ```python
  from fastapi import FastAPI, HTTPException
  from fastapi.middleware.cors import CORSMiddleware
  from pydantic import BaseModel
  from typing import Optional, List
  from backend.app.database import init_db, get_db_connection
  from backend.app.RAG.query_engine import RAGQueryEngine

  app = FastAPI(title="PEL Appliances RAG API")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

  # Pydantic schemas
  class QueryRequest(BaseModel):
      query: str
      role: str  # "customer" or "technician"
      product_id: Optional[str] = None
      image_base64: Optional[str] = None

  class TicketCreate(BaseModel):
      customer_name: str
      phone: str
      appliance_model: str
      issue_description: str

  @app.on_event("startup")
  def startup_event():
      init_db()

  @app.post("/rag/query")
  def rag_query(req: QueryRequest):
      if req.role not in ["customer", "technician"]:
          raise HTTPException(status_code=400, detail="Invalid role. Must be 'customer' or 'technician'.")
      
      engine = RAGQueryEngine()
      result = engine.query(
          query_text=req.query,
          role=req.role,
          product_id=req.product_id,
          image_base64=req.image_base64
      )
      
      response_data = {
          "response": result["response"],
          "escalate": result["escalate"]
      }
      
      # If technician and needs escalation, provide experts
      if req.role == "technician" and result["escalate"]:
          conn = get_db_connection()
          cursor = conn.cursor()
          # Filter experts by product division if matching metadata
          cursor.execute("SELECT name, role_title, department, phone, email FROM experts")
          experts = [dict(row) for row in cursor.fetchall()]
          conn.close()
          response_data["expert_contacts"] = experts
          
      return response_data

  @app.post("/tickets")
  def create_ticket(ticket: TicketCreate):
      conn = get_db_connection()
      cursor = conn.cursor()
      cursor.execute("""
          INSERT INTO tickets (customer_name, phone, appliance_model, issue_description)
          VALUES (?, ?, ?, ?)
      """, (ticket.customer_name, ticket.phone, ticket.appliance_model, ticket.issue_description))
      conn.commit()
      ticket_id = cursor.lastrowid
      conn.close()
      return {"status": "success", "ticket_id": ticket_id}

  @app.get("/tickets")
  def get_tickets():
      conn = get_db_connection()
      cursor = conn.cursor()
      cursor.execute("SELECT id, customer_name, phone, appliance_model, issue_description, status, created_at FROM tickets ORDER BY id DESC")
      tickets = [dict(row) for row in cursor.fetchall()]
      conn.close()
      return tickets

  @app.get("/experts")
  def get_experts():
      conn = get_db_connection()
      cursor = conn.cursor()
      cursor.execute("SELECT id, name, role_title, department, phone, email FROM experts")
      experts = [dict(row) for row in cursor.fetchall()]
      conn.close()
      return experts
  ```

- [ ] **Step 5: Write API Integration Test**
  Create `backend/tests/test_api.py`:
  ```python
  from fastapi.testclient import TestClient
  from backend.app.main import app
  from backend.app.config import settings

  settings.DB_PATH = "test_pel_app.db"
  client = TestClient(app)

  def test_ticket_endpoints():
      # Create ticket
      res = client.post("/tickets", json={
          "customer_name": "Test User",
          "phone": "0300-1234567",
          "appliance_model": "PR-1950",
          "issue_description": "Water leaking from cooling coils"
      })
      assert res.status_code == 200
      assert res.json()["status"] == "success"
      
      # List tickets
      res_list = client.get("/tickets")
      assert res_list.status_code == 200
      assert len(res_list.json()) > 0
      assert res_list.json()[0]["customer_name"] == "Test User"
  ```

- [ ] **Step 6: Run API Integration Tests**
  Run: `pytest backend/tests/test_api.py -v`
  Expected: PASS

---

## Task 3: Customer Mobile App (`customer-app`) Setup & UI

**Files:**
* Create: `customer-app/package.json`
* Create: `customer-app/app.json`
* Create: `customer-app/App.js`

- [ ] **Step 1: Create package.json**
  Create `customer-app/package.json`:
  ```json
  {
    "name": "pel-customer-app",
    "version": "1.0.0",
    "scripts": {
      "start": "expo start",
      "android": "expo start --android",
      "ios": "expo start --ios",
      "web": "expo start --web"
    },
    "dependencies": {
      "expo": "~51.0.0",
      "expo-status-bar": "~1.12.1",
      "react": "18.2.0",
      "react-native": "0.74.1",
      "expo-image-picker": "~15.0.7"
    },
    "private": true
  }
  ```

- [ ] **Step 2: Create app.json**
  Create `customer-app/app.json`:
  ```json
  {
    "expo": {
      "name": "PEL Customer Support",
      "slug": "pel-customer-support",
      "version": "1.0.0",
      "orientation": "portrait",
      "icon": "./assets/icon.png",
      "userInterfaceStyle": "dark",
      "splash": {
        "resizeMode": "contain",
        "backgroundColor": "#0A192F"
      },
      "android": {
        "adaptiveIcon": {
          "backgroundColor": "#0A192F"
        },
        "package": "com.pel.customersupport"
      }
    }
  }
  ```

- [ ] **Step 3: Implement App.js (Customer Flow)**
  Create `customer-app/App.js`:
  ```javascript
  import React, { useState, useEffect } from 'react';
  import { 
    StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
    Image, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform 
  } from 'react-native';
  import * as ImagePicker from 'expo-image-picker';

  const BACKEND_URL = 'http://localhost:8000'; // Update with local LAN IP for physical device testing

  export default function App() {
    const [screen, setScreen] = useState('home'); // 'home' | 'chat' | 'ticket'
    const [messages, setMessages] = useState([
      { id: '1', text: 'Salam! I am your PEL Customer Assistant. How can I help you with your PEL appliance today?', sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Ticket State
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [model, setModel] = useState('PR-1950');
    const [issue, setIssue] = useState('');

    const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        base64: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        setImage(result.assets[0]);
      }
    };

    const handleSend = async () => {
      if (!input.trim() && !image) return;

      const userText = input;
      const userImage = image;
      
      const newMessages = [...messages, { 
        id: Date.now().toString(), 
        text: userText, 
        image: userImage ? userImage.uri : null, 
        sender: 'user' 
      }];
      setMessages(newMessages);
      setInput('');
      setImage(null);
      setLoading(true);

      try {
        const response = await fetch(`${BACKEND_URL}/rag/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userText,
            role: 'customer',
            product_id: model,
            image_base64: userImage ? userImage.base64 : null
          })
        });

        const data = await response.json();
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'bot',
          escalate: data.escalate
        }]);
      } catch (err) {
        Alert.alert('Connection Error', 'Could not reach backend. Reverting to Offline FAQ: Please ensure fridge has wall clearance or call 0800-1-2-PEL.');
      } finally {
        setLoading(false);
      }
    };

    const submitTicket = async () => {
      if (!customerName || !phone || !issue) {
        Alert.alert('Required Fields', 'Please fill all ticket details.');
        return;
      }
      try {
        const response = await fetch(`${BACKEND_URL}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: customerName,
            phone: phone,
            appliance_model: model,
            issue_description: issue
          })
        });
        if (response.ok) {
          Alert.alert('Complaint Registered', 'A PEL Service representative will contact you shortly.');
          setCustomerName('');
          setPhone('');
          setIssue('');
          setScreen('home');
        }
      } catch (err) {
        Alert.alert('Error', 'Unable to submit ticket. Please check connection.');
      }
    };

    if (screen === 'home') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>PEL</Text>
            <Text style={styles.subtitle}>Customer Appliance Suite</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Appliances</Text>
            <View style={styles.applianceRow}>
              <Text style={styles.applianceText}>❄️ Refrigerator Inverter (PR-1950)</Text>
            </View>
            <View style={styles.applianceRow}>
              <Text style={styles.applianceText}>💨 AC Apex Split (Apex 12K)</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => setScreen('chat')}>
            <Text style={styles.buttonText}>💬 Launch Troubleshooter Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#1E293B' }]} onPress={() => setScreen('ticket')}>
            <Text style={styles.buttonText}>📝 Register Support Complaint</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    if (screen === 'ticket') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>PEL</Text>
            <Text style={styles.subtitle}>File a Service Complaint</Text>
          </View>
          <ScrollView style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Ahmad Khan" placeholderTextColor="#64748B" />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0300-1234567" placeholderTextColor="#64748B" />
            <Text style={styles.label}>Appliance Model</Text>
            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="PR-1950" placeholderTextColor="#64748B" />
            <Text style={styles.label}>Issue Description</Text>
            <TextInput style={[styles.input, { height: 100 }]} multiline value={issue} onChangeText={setIssue} placeholder="Fridge is making a loud buzzing sound and not freezing..." placeholderTextColor="#64748B" />
            
            <TouchableOpacity style={styles.button} onPress={submitTicket}>
              <Text style={styles.buttonText}>Submit Complaint</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#1E293B', marginTop: 10 }]} onPress={() => setScreen('home')}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={styles.backButton}>🏠 Home</Text>
            </TouchableOpacity>
            <Text style={styles.chatTitle}>PEL Assistant ({model})</Text>
          </View>
          
          <ScrollView contentContainerStyle={styles.messagesContainer}>
            {messages.map((msg) => (
              <View key={msg.id} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                {msg.image && <Image source={{ uri: msg.image }} style={styles.messageImage} />}
                <Text style={msg.sender === 'user' ? styles.userText : styles.botText}>{msg.text}</Text>
                {msg.escalate && (
                  <TouchableOpacity style={styles.escalateBtn} onPress={() => setScreen('ticket')}>
                    <Text style={styles.escalateText}>Register Complaint Ticket ➡️</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {loading && <ActivityIndicator size="small" color="#3B82F6" style={{ margin: 10 }} />}
          </ScrollView>

          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
              <Text style={styles.cameraIcon}>📸</Text>
            </TouchableOpacity>
            <TextInput style={styles.textInput} value={input} onChangeText={setInput} placeholder="Type troubleshooting query..." placeholderTextColor="#64748B" />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A192F' },
    header: { padding: 30, alignItems: 'center' },
    logo: { fontSize: 36, fontWeight: 'bold', color: '#3B82F6', letterSpacing: 4 },
    subtitle: { fontSize: 16, color: '#64748B', marginTop: 5 },
    card: { backgroundColor: '#112240', margin: 20, padding: 20, borderRadius: 12 },
    cardTitle: { color: '#E2E8F0', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    applianceRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
    applianceText: { color: '#94A3B8', fontSize: 15 },
    button: { backgroundColor: '#3B82F6', marginHorizontal: 20, marginVertical: 8, padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    chatHeader: { padding: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#112240' },
    backButton: { color: '#3B82F6', fontSize: 16 },
    chatTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 20 },
    messagesContainer: { padding: 15, flexGrow: 1 },
    messageBubble: { padding: 12, borderRadius: 8, marginVertical: 5, maxWidth: '80%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#3B82F6' },
    botBubble: { alignSelf: 'flex-start', backgroundColor: '#112240' },
    userText: { color: 'white' },
    botText: { color: '#E2E8F0' },
    escalateBtn: { backgroundColor: '#EF4444', padding: 8, borderRadius: 4, marginTop: 10, alignItems: 'center' },
    escalateText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    inputBar: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0A192F', alignItems: 'center' },
    cameraBtn: { padding: 10 },
    cameraIcon: { fontSize: 24 },
    textInput: { flex: 1, backgroundColor: '#112240', color: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginHorizontal: 10 },
    sendBtn: { padding: 10 },
    sendText: { color: '#3B82F6', fontWeight: 'bold' },
    messageImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 8 },
    form: { padding: 20 },
    label: { color: '#94A3B8', fontSize: 14, marginBottom: 5, marginTop: 15 },
    input: { backgroundColor: '#112240', color: 'white', padding: 12, borderRadius: 6, fontSize: 15 }
  });
  ```

---

## Task 4: Technician Mobile App (`technician-app`) Setup & UI

**Files:**
* Create: `technician-app/package.json`
* Create: `technician-app/app.json`
* Create: `technician-app/App.js`

- [ ] **Step 1: Create package.json**
  Create `technician-app/package.json`:
  ```json
  {
    "name": "pel-technician-app",
    "version": "1.0.0",
    "scripts": {
      "start": "expo start",
      "android": "expo start --android",
      "ios": "expo start --ios",
      "web": "expo start --web"
    },
    "dependencies": {
      "expo": "~51.0.0",
      "expo-status-bar": "~1.12.1",
      "react": "18.2.0",
      "react-native": "0.74.1",
      "expo-image-picker": "~15.0.7"
    },
    "private": true
  }
  ```

- [ ] **Step 2: Create app.json**
  Create `technician-app/app.json`:
  ```json
  {
    "expo": {
      "name": "PEL Tech Support",
      "slug": "pel-tech-support",
      "version": "1.0.0",
      "orientation": "portrait",
      "icon": "./assets/icon.png",
      "userInterfaceStyle": "dark",
      "splash": {
        "resizeMode": "contain",
        "backgroundColor": "#0F172A"
      },
      "android": {
        "adaptiveIcon": {
          "backgroundColor": "#0F172A"
        },
        "package": "com.pel.techsupport"
      }
    }
  }
  ```

- [ ] **Step 3: Implement App.js (Technician Flow)**
  Create `technician-app/App.js`:
  ```javascript
  import React, { useState, useEffect } from 'react';
  import { 
    StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
    ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Linking 
  } from 'react-native';
  import * as ImagePicker from 'expo-image-picker';

  const BACKEND_URL = 'http://localhost:8000';

  export default function App() {
    const [screen, setScreen] = useState('home'); // 'home' | 'chat' | 'directory' | 'tickets'
    const [messages, setMessages] = useState([
      { id: '1', text: 'Technical Assistant initialized. Search code, component specification, or diagnostic checks.', sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Directory / Customer complaints lists state
    const [experts, setExperts] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [model, setModel] = useState('PR-1950');

    useEffect(() => {
      fetchExperts();
      fetchTickets();
    }, []);

    const fetchExperts = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/experts`);
        const data = await response.json();
        setExperts(data);
      } catch (err) {}
    };

    const fetchTickets = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/tickets`);
        const data = await response.json();
        setTickets(data);
      } catch (err) {}
    };

    const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        base64: true,
        quality: 0.5,
      });
      if (!result.canceled) {
        setImage(result.assets[0]);
      }
    };

    const handleSend = async () => {
      if (!input.trim() && !image) return;

      const userText = input;
      const userImage = image;
      setMessages(prev => [...prev, { id: Date.now().toString(), text: userText, sender: 'user' }]);
      setInput('');
      setImage(null);
      setLoading(true);

      try {
        const response = await fetch(`${BACKEND_URL}/rag/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userText,
            role: 'technician',
            product_id: model,
            image_base64: userImage ? userImage.base64 : null
          })
        });

        const data = await response.json();
        
        let reply = data.response;
        if (data.expert_contacts && data.expert_contacts.length > 0) {
          reply += '\n\n🔧 Escalation Contacts:\n' + data.expert_contacts.map(e => `- ${e.name} (${e.role_title}): ${e.phone}`).join('\n');
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: reply,
          sender: 'bot'
        }]);
      } catch (err) {
        Alert.alert('Offline Mode', 'Check local manuals: E1 temperature sensor, F1 ambient temperature sensor.');
      } finally {
        setLoading(false);
      }
    };

    if (screen === 'home') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>PEL TECH</Text>
            <Text style={styles.subtitle}>Technician Field Suite</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => setScreen('chat')}>
            <Text style={styles.buttonText}>🔧 Diagnostic Chatbot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#1E293B' }]} onPress={() => { fetchTickets(); setScreen('tickets'); }}>
            <Text style={styles.buttonText}>📋 Active Support Tickets ({tickets.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#1E293B' }]} onPress={() => { fetchExperts(); setScreen('directory'); }}>
            <Text style={styles.buttonText}>📞 Experts & Division Heads</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    if (screen === 'directory') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={styles.backButton}>🏠 Home</Text>
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Division Heads Directory</Text>
          </View>
          <ScrollView style={styles.list}>
            {experts.map(exp => (
              <View key={exp.id} style={styles.expertCard}>
                <Text style={styles.expertName}>{exp.name}</Text>
                <Text style={styles.expertRole}>{exp.role_title} ({exp.department})</Text>
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${exp.phone}`)}>
                  <Text style={styles.callText}>📞 Call {exp.phone}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      );
    }

    if (screen === 'tickets') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={styles.backButton}>🏠 Home</Text>
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Pending Repairs</Text>
          </View>
          <ScrollView style={styles.list}>
            {tickets.map(ticket => (
              <View key={ticket.id} style={styles.expertCard}>
                <Text style={styles.expertName}>{ticket.customer_name}</Text>
                <Text style={styles.expertRole}>Model: {ticket.appliance_model} | Contact: {ticket.phone}</Text>
                <Text style={styles.ticketIssue}>Issue: {ticket.issue_description}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{ticket.status}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Text style={styles.backButton}>🏠 Home</Text>
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Diagnostics ({model})</Text>
          </View>

          <ScrollView contentContainerStyle={styles.messagesContainer}>
            {messages.map((msg) => (
              <View key={msg.id} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                <Text style={msg.sender === 'user' ? styles.userText : styles.botText}>{msg.text}</Text>
              </View>
            ))}
            {loading && <ActivityIndicator size="small" color="#10B981" style={{ margin: 10 }} />}
          </ScrollView>

          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
              <Text style={styles.cameraIcon}>📸</Text>
            </TouchableOpacity>
            <TextInput style={styles.textInput} value={input} onChangeText={setInput} placeholder="Enter fault code or query..." placeholderTextColor="#64748B" />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={[styles.sendText, { color: '#10B981' }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    header: { padding: 30, alignItems: 'center' },
    logo: { fontSize: 36, fontWeight: 'bold', color: '#10B981', letterSpacing: 4 },
    subtitle: { fontSize: 16, color: '#64748B', marginTop: 5 },
    button: { backgroundColor: '#10B981', marginHorizontal: 20, marginVertical: 8, padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    chatHeader: { padding: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#1E293B' },
    backButton: { color: '#10B981', fontSize: 16 },
    chatTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 20 },
    messagesContainer: { padding: 15, flexGrow: 1 },
    messageBubble: { padding: 12, borderRadius: 8, marginVertical: 5, maxWidth: '80%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#10B981' },
    botBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B' },
    userText: { color: 'white' },
    botText: { color: '#E2E8F0' },
    inputBar: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0F172A', alignItems: 'center' },
    cameraBtn: { padding: 10 },
    cameraIcon: { fontSize: 24 },
    textInput: { flex: 1, backgroundColor: '#1E293B', color: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginHorizontal: 10 },
    sendBtn: { padding: 10 },
    sendText: { fontWeight: 'bold' },
    list: { padding: 15 },
    expertCard: { backgroundColor: '#1E293B', padding: 15, borderRadius: 8, marginVertical: 6 },
    expertName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    expertRole: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
    callBtn: { backgroundColor: '#0F172A', padding: 8, borderRadius: 4, marginTop: 10, alignItems: 'center' },
    callText: { color: '#10B981', fontWeight: 'bold' },
    ticketIssue: { color: '#F1F5F9', fontSize: 14, marginTop: 8 },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 },
    statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
  });
  ```
