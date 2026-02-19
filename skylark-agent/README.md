# SkyOps AI | Drone Operations Coordinator

SkyOps AI is a next-generation drone operations coordination platform that helps managers match pilots to missions, track fleet availability, and proactively resolve scheduling or weather-related conflicts.

![SkyOps AI Dashboard Mockup](https://raw.githubusercontent.com/lucide-react/lucide-react/main/icons/terminal.svg)

## 🚀 Architecture Overview

```mermaid
graph TD
    A[User Interface - Next.js/React] --> B[API Routes]
    B --> C[SkyOps Agent - Gemini 2.0 Flash]
    C --> D[Tool Handlers]
    D --> E[Conflict Engine]
    D --> F[Data Store]
    F --> G[JSON Data - from CSV]
    D --> H[Google Sheets Service]
```

## ✨ Core Features
- 🤖 **Conversational Agent**: Gemini-powered AI that handles tool execution for roster and fleet management.
- 📊 **Operations Dashboard**: Real-time visibility into pilot status, drone capabilities, and mission priority.
- ⚡ **Conflict Detection**: Automated flags for double-booking, skill mismatches, weather risks, and budget overruns.
- 📅 **Assignment Tracking**: Efficiently match and track pilot-drone combinations for client projects.
- 🔄 **2-Way Sync**: Status updates in the app sync back to your Google Sheets.

## 🛠️ Tech Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **AI**: [Google Gemini 2.0 Flash](https://ai.google.dev/) (via @google/generative-ai)
- **Integration**: [Google Sheets API v4](https://developers.google.com/sheets/api)
- **Data Parsing**: [LangChain](https://www.langchain.com/) + Python (Initial parsing only)

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 24+
- Gemini API Key
- Google Sheets Service Account Credentials

### 2. Environment Setup
Create a `.env` file in the `skylark-agent` directory:
```env
GEMINI_API_KEY=your_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_id
GOOGLE_SHEETS_CLIENT_EMAIL=your_email
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Installation
```bash
cd skylark-agent
npm install
npm run dev
```

## 📝 Problem Statement Resolution
SkyOps AI solves the coordination overhead by automating the "busy work" of manual scheduling and risk checking. It provides a single point of truth where coordinators can ask questions like "Who can fly in rain tomorrow in Mumbai?" and get instant, verified answers based on real-time fleet data.
