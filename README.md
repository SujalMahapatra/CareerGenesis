# CareerGenesis

AI-Powered Career Concierge

CareerGenesis is a Gemini-powered multi-agent career intelligence platform that helps users optimize resumes, identify skill gaps, generate personalized learning roadmaps, and prepare for interviews through an intelligent AI concierge experience.

## Features
📄 Resume Analyzer
ATS-focused resume analysis
Strengths and weaknesses detection
Resume improvement recommendations
Resume upload support

## 🎯 Skill Gap Analysis
Compare skills against target roles
Identify missing skills
Match percentage calculation
Personalized recommendations

## 🗺️ Learning Roadmap Generator
AI-generated career roadmaps
Milestones and timelines
Resource recommendations
Certification suggestions

## 🎤 Mock Interview Coach
Role-specific interview questions
AI-powered answer evaluation
Feedback and scoring
Model answers and coaching tips

## 🤖 Coordinator Agent
Routes user requests to the appropriate specialist agent
Provides intelligent orchestration across the platform
Multi-Agent Architecture
User
  ↓
Coordinator Agent
  ├── Resume Agent
  ├── Skill Gap Agent
  ├── Roadmap Agent
  └── Interview Agent
MCP Server

CareerGenesis includes an MCP (Model Context Protocol) server that exposes agent capabilities and demonstrates agent interoperability concepts learned during the course.

## Tech Stack:
Frontend
React
Vite
Tailwind CSS
Backend
FastAPI
Python
Gemini 2.5 Flash
AI & Agent Technologies
Multi-Agent Architecture
MCP Server
Google Gemini
Agent Orchestration

## Course Concepts Demonstrated:
✅ Multi-Agent System
✅ MCP Server
✅ Agent Skills
✅ Agent Orchestration
✅ Security Best Practices
✅ Gemini-Powered AI Workflows

## Screenshots

Add project screenshots here.

## Team

CoderVibes

## Repository Setup
git clone https://github.com/SujalMahapatra/CareerGenesis.git
cd CareerGenesis
Backend
pip install -r requirements.txt
uvicorn backend.api.main:app --reload
Frontend
cd frontend
npm install
npm run dev