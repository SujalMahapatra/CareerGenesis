import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Resume
export const analyzeResume = (data) =>
  API.post("/api/resume/analyze", data);

// Skill Gap
export const analyzeSkillGap = (data) =>
  API.post("/api/skill-gap/analyze", data);

// Roadmap
export const generateRoadmap = (data) =>
  API.post("/api/roadmap/generate", data);

// Interview
export const generateQuestions = (data) =>
  API.post("/api/interview/questions", data);

export const evaluateAnswer = (data) =>
  API.post("/api/interview/evaluate", data);

// Coordinator
export const routeQuery = (data) =>
  API.post("/api/coordinator/route", data);

export default API;