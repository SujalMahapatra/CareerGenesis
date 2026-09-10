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

<img width="1888" height="882" alt="Screenshot 2026-07-07 014133" src="https://github.com/user-attachments/assets/f23dc16a-82f2-49ec-a78b-7233bc1b7862" />
<img width="1918" height="887" alt="Screenshot 2026-07-07 014053" src="https://github.com/user-attachments/assets/94bbc808-2e5b-4eee-baa3-161267759856" />
<img width="1903" height="908" alt="Screenshot 2026-07-07 014021" src="https://github.com/user-attachments/assets/367191ca-04e0-494d-8761-50ad27cdddea" />
<img width="1902" height="895" alt="Screenshot 2026-07-07 015407" src="https://github.com/user-attachments/assets/cc25f940-dc0c-4161-a0a4-1b3066fafe2c" />
<img width="1867" height="867" alt="Screenshot 2026-07-07 015335" src="https://github.com/user-attachments/assets/8bb06305-4d34-4e6b-bcdd-a36b6eb981bf" />
<img width="1867" height="902" alt="Screenshot 2026-07-07 015307" src="https://github.com/user-attachments/assets/884f8c41-19ad-4175-9391-e836c6bc31e6" />
<img width="1830" height="892" alt="Screenshot 2026-07-07 015144" src="https://github.com/user-attachments/assets/895f6335-e951-40a8-ad58-13207cc49d02" />
<img width="1822" height="868" alt="Screenshot 2026-07-07 015128" src="https://github.com/user-attachments/assets/c6dbbb31-ef0c-47db-a9c1-94f86e6ab2f5" />
<img width="1823" height="895" alt="Screenshot 2026-07-07 015107" src="https://github.com/user-attachments/assets/0a1e8332-4661-4d3f-ab60-70ab0ca8bf05" />
<img width="1893" height="898" alt="Screenshot 2026-07-07 015042" src="https://github.com/user-attachments/assets/f9fa92be-7eaa-4ea1-8e9c-38eb29086477" />
<img width="1841" height="902" alt="Screenshot 2026-07-07 015014" src="https://github.com/user-attachments/assets/7536c4e0-ba63-4a6c-aaee-251543994a5f" />
<img width="1907" height="888" alt="Screenshot 2026-07-07 014851" src="https://github.com/user-attachments/assets/572db26a-082e-4a5e-8512-b8ac1ba87e09" />
<img width="1918" height="872" alt="Screenshot 2026-07-07 014834" src="https://github.com/user-attachments/assets/60c0873e-e6d4-4a71-8749-2fc604b2a8e0" />
<img width="1912" height="870" alt="Screenshot 2026-07-07 014819" src="https://github.com/user-attachments/assets/00657a27-c9c4-41dd-a03d-38db0f25aaf0" />
<img width="1890" height="891" alt="Screenshot 2026-07-07 014651" src="https://github.com/user-attachments/assets/f0ba2016-3494-4161-8588-8aaf87497cf6" />
<img width="985" height="851" alt="Screenshot 2026-07-07 014615" src="https://github.com/user-attachments/assets/ba00efb1-ae3d-488c-b60f-f88c621f8845" />
<img width="1102" height="850" alt="Screenshot 2026-07-07 014559" src="https://github.com/user-attachments/assets/f4ba0bfb-3259-4482-a0b9-07c7b3add5cc" />
<img width="1143" height="867" alt="Screenshot 2026-07-07 014539" src="https://github.com/user-attachments/assets/eb35ac50-e90e-4419-abb2-e6d1ec1f4186" />
<img width="1881" height="876" alt="Screenshot 2026-07-07 014434" src="https://github.com/user-attachments/assets/3fde8df3-a5f1-4aa9-9422-3f72aa99af06" />
<img width="1898" height="905" alt="Screenshot 2026-07-07 014242" src="https://github.com/user-attachments/assets/cb36ad60-c7cd-40ab-ad1e-5a36412168d5" />


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
