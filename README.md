# 🌍 PlanetPulse — Carbon Footprint Tracker

[![Live Demo](https://img.shields.io/badge/Live_Demo-PlanetPulse-72d106?style=for-the-badge&logo=vercel)](https://planetpulse-theta.vercel.app/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Code2Career-eb7610?style=for-the-badge)](https://hackathon.azisly.ai/login)

**PlanetPulse** is a climate-tech web application built to convert daily choices into real-time visible carbon metrics. Built for the **Code2Career** hackathon, PlanetPulse helps users log activities, monitor weekly targets, analyze trends, and model future lifestyle choices through interactive simulations.

---

🌐 **Live Application**: [planetpulse-theta.vercel.app](https://planetpulse-theta.vercel.app/)  
⚡ **Hackathon Event**: Code2Career Hackathon (3rd Project)
👤 **Developer**: Aryan Das (B.Tech CSE, Year 1, Lovely Professional University)  
👥 **Team Name**: ARYAN's Team[cite: 1]  

---

## 📸 Interface & Feature Highlights

### 1. Main Dashboard & Eco Score
Monitors overall emissions, weekly target progress, logging streaks, and dynamic Eco Score metrics.

![PlanetPulse Dashboard](./WhatsApp%20Image%202026-09-19%20at%2012.05.20%20AM.jpeg)

* **Live Target Tracking:** Highlights current weekly footprint against the budget (e.g., $22.00\text{ kg CO}_2\text{e}$ used of $25.00\text{ kg}$ target)[cite: 2].
* **Eco Score Engine:** Grades consistency, target adherence, and carbon activity distribution.
* **Streaks & Projections:** Calculates daily streaks and predicts total weekly footprint based on current usage pace.

---

### 2. Log Activity & Quick Add
Provides two ways to record emissions: manual entry with real-time estimation or one-tap preset logging.

![Log Activity Screen](./WhatsApp%20Image%202026-09-19%20at%2012.05.45%20AM.jpeg)

* **Manual Logging:** Input activity type, quantity, date, and notes with dynamic $\text{CO}_2\text{e}$ rate previews.
* **One-Tap Quick Add:** Instantly log frequent daily actions (e.g., Car Commute, Bus Commute, Veg Meal, Electricity).
* **Today's Entries:** Review items recorded on the current date.

---

### 3. Activity History & Exporting
A comprehensive ledger with multi-variable filters and data export functionality.

![Activity History Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.03%20AM.jpeg)

* **Multi-Filter System:** Filter entries by keyword search, activity type, category, or custom date ranges.
* **Summary Metrics:** Calculates total log count, cumulative $\text{CO}_2\text{e}$, average entry impact, and largest single entry.
* **Data Portability:** Export full logs into `CSV` or `PDF` formats.

---

### 4. Weekly Target Management
Configure custom carbon ceilings with automated daily allowance calculations and historical week-by-week performance tracking.

![Weekly Target Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.22%20AM.jpeg)

* **Preset Budgets:** Quick-select preset targets ranging from **Ambitious ($15\text{ kg}$)** to **Starter ($60\text{ kg}$)**[cite: 5].
* **Real-time Allowance:** Automatically derives daily allowances (e.g., $3.57\text{ kg/day}$ for a $25\text{ kg}$ target) and alerts when approaching limits.

---

### 5. What-If Simulator
An interactive lifestyle modeling tool that predicts emissions reductions based on actual user data.

![What-If Simulator Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.35%20AM.jpeg)

* **Interactive Sliders:** Shift car travel to bus, replace non-veg meals with vegetarian options, or cut electricity/flight usage.
* **Instant Recalculation:** Compare real 30-day emissions against simulated habit changes without changing underlying logs.

---

### 6. Fixed Emission Factors & Comparison
Displays standardized conversion metrics and cross-activity budget equivalencies.

![Emission Factors Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.52%20AM.jpeg)

* **Conversion Standards:** Reference table outlining fixed factors across Travel, Home, and Food categories.
* **Activity Comparison:** Adjustable budget slider showing how far emissions stretch across different modes of transport and lifestyle choices.

---

### 7. About & Project Vision
Overview of developer credentials, tech stack choices, and underlying design philosophy.

![About Screen](https://github.com/user-attachments/assets/ef765b37-153b-4262-a767-ace556ae9f43)

### 8. Detailed Report on Your Carbon Footprint
![About Screen](https://github.com/user-attachments/assets/dd7dc656-bce3-4ba0-a1db-ddad93b128a8)
---

## 🧮 Standard Conversion Factors

Emissions are computed strictly using standardized carbon equivalencies:
$$\text{Total Emission (kg CO}_2\text{e)} = \text{Quantity} \times \text{Emission Factor}$$


| Category | Activity Type | Conversion Factor | Unit | Calculation Example |
| :--- | :--- | :--- | :--- | :--- |
| **Travel** | Car travel | `0.20` | $\text{kg CO}_2\text{e / km}$[cite: 7] | $10\text{ km} \rightarrow 2.00\text{ kg}$ |
| **Travel** | Bus travel | `0.08` | $\text{kg CO}_2\text{e / km}$[cite: 7] | $10\text{ km} \rightarrow 0.80\text{ kg}$ |
| **Travel** | Flight | `0.25` | $\text{kg CO}_2\text{e / km}$[cite: 7] | $500\text{ km} \rightarrow 125.00\text{ kg}$ |
| **Home** | Electricity use | `0.80` | $\text{kg CO}_2\text{e / kWh}$[cite: 7] | $5\text{ kWh} \rightarrow 4.00\text{ kg}$ |
| **Food** | Vegetarian meal | `0.50` | $\text{kg CO}_2\text{e / meal}$[cite: 7] | $2\text{ meals} \rightarrow 1.00\text{ kg}$ |
| **Food** | Non-vegetarian meal | `2.00` | $\text{kg CO}_2\text{e / meal}$[cite: 7] | $2\text{ meals} \rightarrow 4.00\text{ kg}$ |

---

## 🛠️ Architecture & Tech Stack

PlanetPulse is crafted as a lightweight, zero-dependency client-side application[cite: 8]:

* **HTML5:** Semantic architecture[cite: 8]
* **CSS3:** Native CSS custom properties, grid layouts, themes (Light / Dark)[cite: 2, 8]
* **JavaScript (ES6+):** Plain JavaScript for calculations, state management, filtering, and DOM manipulation without external frameworks[cite: 8]
* **Deployment:** Hosted on Vercel

---
---

## 🤖 Grading & API Implementation Notice

* **Standard API Status:** The standard API for this track was **NOT** implemented.
* **Grading Method:** Features are designed to be evaluated and graded **by a browser agent driving the UI**.
* **Test Credentials:** No login or registration required. Evaluators can open the app URL and interact with all features immediately

---

## 🚀 Local Run Steps

PlanetPulse is a pure Vanilla web application that requires no complex compilation steps, node packages, or server installations.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/planetpulse.git](https://github.com/your-username/planetpulse.git)
   cd planetpulse


---

## 🎓 Participant Information

* **Developer:** Aryan Das[cite: 1, 8]
* **Program:** First-year B.Tech Computer Science and Engineering
* **Institution:** Lovely Professional University (LPU)
* **Portal Credentials ID:** `AZIS-E3VD5H`
* **Submission Portal:** [https://hackathon.azisly.ai/login](https://hackathon.azisly.ai/login)
