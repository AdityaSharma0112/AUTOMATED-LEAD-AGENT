# [AUTOMATED-LEAD-AGENT] 🚀
### Real-Time Geodata Discovery, HTTP Verification, Autonomous Voice Qualification & Sales Strategy Intelligence

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Django 5.0](https://img.shields.io/badge/Django-5.0-green.svg)](https://www.djangoproject.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![Twilio Voice](https://img.shields.io/badge/Twilio-Voice%20AI-F22F46.svg)](https://www.twilio.com/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini%20AI-8E75B2.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Overview

**[AUTOMATED-LEAD-AGENT]** is a production-grade, multi-agent AI system designed to automate the entire B2B sales pipeline for agencies, marketing consultants, and SaaS businesses.

Instead of scraping outdated databases, **[AUTOMATED-LEAD-AGENT]** discovers 100% verified local businesses directly from live Google Maps and OpenStreetMap geodata, validates their website status via real HTTP verification, places outbound cellular calls using an autonomous female voice consultant (**Priya from Digital Growth Hub**), extracts deep conversation intelligence, and generates customized sales proposals and pitch documents (downloadable as Microsoft Word `.doc` or Markdown `.md`).

---

## 🚀 Key Features

* **🔍 100% Real Geodata & Places Autocomplete**: Natural language location & category search with instant Google Maps autocomplete suggestions and locality discovery.
* **🌐 Active HTTP Verification**: Real-time website check against DNS and HTTP servers to identify businesses lacking modern mobile-friendly websites or Google presence.
* **📞 Autonomous AI Phone Calls (Priya - Digital Growth Hub)**:
  * Outbound cellular phone calls via Twilio REST API and Amazon Polly neural voices (`Polly.Aditi` Hindi/English).
  * Real-time conversational multi-turn dialogue powered by Google Gemini and Groq LLMs.
  * WebRTC in-browser calling and interactive simulations.
* **⚡ Deep Conversation Intelligence**:
  * Automatically records transcripts, sentiment, and turn timestamps.
  * Detects buying intent (`interested_hot`, `interested_warm`, `call_back`, `not_interested`, `opted_out`).
  * Extracts customer pain points, budget signals, requirements, and verbatim customer quotes.
* **📊 Tailored Sales Strategy & Proposal Generator**:
  * Automatically creates a tailored next move, pricing packages, objection handling matrix, and pitch script.
  * **1-Click Export**: Download the comprehensive strategy dossier as formatted **Microsoft Word (`.doc`)** or **Markdown (`.md`)**.
* **🔐 Multi-Tenant Workspace & Passwordless Email + OTP**:
  * Secure Email & 6-digit numeric OTP authentication.
  * Complete lead isolation per user: each user sees, searches, contacts, and manages only their own leads.
* **🌓 Sleek Dark & Light Mode UI**: Clean, glassmorphic dashboard built with React, Lucide Icons, and responsive styling.

---

## 🏗️ Multi-Agent Architecture

```
                                  [ User Request / Natural Query ]
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  IntentParser   │
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  ResearchAgent  │ (Google Maps / SerpAPI / OSM)
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   VerificationAgent   │ (HTTP Live Check & Deduplication)
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  LeadScorer     │ (Opportunity Score 0-100)
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  CallingAgent   │ (Priya - Twilio Outbound Voice)
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │  IntelligenceAgent    │ (Transcript & Intent Extraction)
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  StrategyAgent  │ (Tailored Pitch & Word Dossier)
                                        └─────────────────┘
```

---

## 📋 Prerequisites

Before running the project locally, make sure you have:
* **Python 3.10+** (Python 3.11 or 3.12 recommended)
* **Node.js 18+** & **npm**
* **Git**
* *(Optional for live phone calls)*: **Twilio Account** & **Ngrok**

---

## 🔑 Environment Configuration (`.env`)

Create a `.env` file inside the `backend/` directory based on `backend/.env.example`:

```env
# ==========================================
# Automated Lead Agent - Environment Config
# ==========================================

# 1. Google Gemini AI Key & Model (Primary LLM & Live Voice Engine)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite

# 2. Optional Alternative LLM Providers
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 3. SerpAPI Key for Real Google Maps & Local Business Geodata
# Get free key from: https://serpapi.com/
SERPAPI_API_KEY=your_serpapi_key_here

# 4. Twilio Telephony Configuration (Outbound Cellular Phone Calls)
# Get free trial from: https://www.twilio.com/console
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
PUBLIC_WEBHOOK_URL=https://your-ngrok-domain.ngrok-free.dev
PORT=5050

# 5. Real Email (SMTP) Configuration for Passwordless OTP Login & Signup
# For Gmail: Use your Gmail ID and a 16-character 'App Password' from https://myaccount.google.com/apppasswords
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_16_char_app_password
DEFAULT_FROM_EMAIL=Priya - Digital Growth Hub <your_email@gmail.com>
```

### Key Reference Table:
| Variable | Required? | Description |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for intent parsing, voice turns, intelligence extraction, and sales strategy generation. [Get Key](https://aistudio.google.com/) |
| `SERPAPI_API_KEY` | **Yes** | Fetches live Google Maps place details, ratings, reviews, and phone numbers. [Get Key](https://serpapi.com/) |
| `TWILIO_*` | *Optional* | Twilio Account SID, Auth Token & Phone Number for placing real phone calls to business owners. [Get Twilio](https://www.twilio.com/) |
| `PUBLIC_WEBHOOK_URL` | *Optional* | Public HTTPS URL (from Ngrok or Cloudflare Tunnel) to route live Twilio speech webhooks to the local server. |
| `EMAIL_HOST_*` | *Optional* | SMTP credentials to send real 6-digit OTP verification codes to users' email inboxes. *(In local DEBUG mode, codes are automatically shown on-screen if SMTP is not provided).* |

---

## 🛠️ Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/AdityaSharma0112/AUTOMATED-LEAD-AGENT.git
cd AUTOMATED-LEAD-AGENT
```

---

### Step 2: Setup Backend (Python / Django)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```
   *(Fill in your `GEMINI_API_KEY`, `SERPAPI_API_KEY`, and other credentials)*.

5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the Django REST API server:
   ```bash
   python manage.py runserver 8000
   ```
   *Backend will run at: `http://127.0.0.1:8000/`*

---

### Step 3: Setup Frontend (React / Vite)

1. Open a new terminal in the project root and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend dashboard will be accessible at: `http://localhost:3000/` or `http://localhost:5173/`*

---

### Step 4: (Optional) Setup Real Outbound Calling Server

If you want to place live telephone calls to real mobile numbers via Twilio:

1. In a separate terminal with your backend virtual environment active:
   ```bash
   cd backend
   python realtime_voice_server.py
   ```
   *Realtime voice server will run at `http://localhost:5050/`*

2. Expose port `5050` using Ngrok:
   ```bash
   ngrok http 5050
   ```

3. Copy the generated HTTPS forwarding URL (e.g. `https://xxxx.ngrok-free.dev`) and paste it into `PUBLIC_WEBHOOK_URL` inside `backend/.env`.

---

## 🖥️ Running All Services (Quick Summary)

| Service | Port | Command |
| :--- | :---: | :--- |
| **Django Backend API** | `8000` | `cd backend && python manage.py runserver` |
| **React Vite Frontend** | `3000` | `cd frontend && npm run dev` |
| **Voice Streaming Server** | `5050` | `cd backend && python realtime_voice_server.py` |
| **Ngrok Tunnel (Optional)** | `5050` | `ngrok http 5050` |

---

## 📡 REST API Reference

### Authentication
* `POST /api/auth/send-otp` - Send 6-digit verification code to email (with dev hint in debug mode).
* `POST /api/auth/verify-otp` - Verify code, create/retrieve user, and issue authentication token.
* `GET /api/auth/me` - Retrieve active user profile and lead statistics.
* `POST /api/auth/logout` - Invalidate session token.

### Search & Discovery
* `POST /api/search` - Run natural language lead discovery pipeline.
* `GET /api/search` - List recent search queries for authenticated user.
* `GET /api/places/autocomplete?q=<query>` - Real-time Google Maps place autocomplete & related localities.

### Leads & Strategies
* `GET /api/leads` - Filter, sort, and query leads owned by active user.
* `GET /api/leads/<id>` - Complete 360° lead dossier.
* `POST /api/leads/<id>/approve_call` - Toggle human call approval gate.
* `POST /api/leads/<id>/verify` - Re-verify website status via HTTP.
* `GET /api/leads/<id>/strategy` - Retrieve AI sales strategy.
* `POST /api/leads/<id>/strategy/regenerate` - Regenerate strategy pitch.
* `POST /api/leads/<id>/strategy/refine` - Refine strategy with custom AI prompt.
* `GET /api/leads/export/csv` - Export user's leads to CSV.

### Voice & Call Center
* `POST /api/calls` - Initiate phone call or simulation for lead.
* `POST /api/calls/quick-call` - Direct AI call to any custom phone number.
* `POST /api/calls/<id>/turn` - Interactive web speech turn.
* `POST /api/calls/<id>/end` - Finish call and trigger conversation intelligence pipeline.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
