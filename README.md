# HarmonyAI

Full-stack MVP scaffold for the **Relationship Intelligence System**.

## Stack
- Frontend: TypeScript + Vite MVP client
- Backend API: NestJS
- AI Service: FastAPI
- Database: MongoDB
- AI Runtime: Ollama (DeepSeek model)

## Project Structure
- `frontend/` - client app scaffold
- `backend/` - NestJS API gateway
- `ai-service/` - FastAPI orchestration service
- `docker-compose.yml` - local infrastructure

## What Works Now
- Real auth with `bcrypt` + JWT access token + refresh token
- Mongo persistence for users, couple invites/connections, and mood entries
- JWT-protected routes for couples and tracking modules
- AI proxy flow: frontend -> backend -> FastAPI -> Ollama
- End-to-end local stack with service Dockerfiles

## Quick Start
1. Copy env file:
   - `cp .env.example .env`
2. Start infra:
   - `docker compose up -d`
3. Backend:
   - `cd backend && npm install && npm run start:dev`
4. AI service:
   - `cd ai-service && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8001`
5. Frontend:
   - `cd frontend && npm install && npm run dev`

## Core API Endpoints
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /couples/invite`
- `POST /couples/connect`
- `POST /tracking/mood`
- `GET /tracking/mood/me`
- `POST /ai/translate`
- `POST /ai/emergency`

## Notes
- Auth now uses Mongo + bcrypt + JWT/refresh tokens.
- Tracking and couple connect now persist in Mongo.
- AI module calls FastAPI service, which calls Ollama and falls back safely if model is unavailable.
- The frontend stores the access token in memory for demo flow testing.
- If Docker CLI is not installed locally, run services manually from each folder.
