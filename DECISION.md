# 🛠️ DECISIONS.md — PlanetPulse Engineering Decisions

This document outlines the three critical architectural and implementation decisions made during the development of **PlanetPulse** for the **Code2Career** hackathon.

---

### Decision Point 1: API vs. Browser-Agent Evaluation Pipeline
* **What I Chose:** Browser-Agent UI-Driven Evaluation (Standard API Not Implemented).
* **Why I Chose It:** Implementing a browser-agent driven UI allowed me to focus heavily on responsive, interactive client-side widgets, real-time DOM feedback loops, and visual simulation tools like the What-If Simulator. Since the application emphasizes real-time user feedback—such as instant target ceiling recalculations and dynamic Eco Score grading—driving the evaluation through the browser UI provides a complete, true-to-life presentation of the application's interactive features without API latency.

---

### Decision Point 2: State Persistence & Data Storage
* **What I Chose:** Client-Side Browser LocalStorage over Remote Database/Backend.
* **Why I Chose It:** Using client-side storage eliminated the need for user authentication, directly satisfying the hackathon requirement that graders access all features without login friction. It guarantees sub-millisecond read/write operations for calculating total footprints, running filter pipelines, and dynamic target alerts. Additionally, this approach keeps the application 100% functional offline and simplifies deployment to Vercel without database connection overhead.

---

### Decision Point 3: Technology Stack & Architectural Framework
* **What I Chose:** Vanilla ES6+ JavaScript, Native CSS3 (Custom Properties), and Semantic HTML5.
* **Why I Chose It:** Avoiding heavy frontend frameworks like React or Vue kept the application ultra-lightweight, zero-dependency, and instantly responsive. Native CSS custom properties enabled seamless light/dark theme toggling and modular UI styling without build tool overhead. This guarantees lightning-fast asset loading, zero compilation vulnerabilities, and effortless edge distribution on Vercel.
