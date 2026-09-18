# 🌍 PlanetPulse — Carbon Footprint Tracker

[![Live Demo](https://img.shields.io/badge/Live_Demo-PlanetPulse-72d106?style=for-the-badge&logo=vercel)](https://planetpulse-theta.vercel.app/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Code2Career-eb7610?style=for-the-badge)](https://hackathon.azisly.ai/login)

**PlanetPulse** is a climate-tech web application built to convert daily choices into real-time visible carbon metrics. Built for the **Code2Career** hackathon, PlanetPulse helps users log activities, monitor weekly targets, analyze trends, and model future lifestyle choices through interactive simulations.

---

🌐 **Live Application**: [planetpulse-theta.vercel.app](https://planetpulse-theta.vercel.app/)  
⚡ **Hackathon Event**: Code2Career Hackathon (3rd Project)[cite: 8]  
👤 **Developer**: Aryan Das (B.Tech CSE, Year 1, Lovely Professional University)[cite: 1, 8]  
👥 **Team Name**: ARYAN's Team[cite: 1]  

---

## 📸 Interface & Feature Highlights

### 1. Main Dashboard & Eco Score
Monitors overall emissions, weekly target progress, logging streaks, and dynamic Eco Score metrics[cite: 2, 8].

![PlanetPulse Dashboard](./WhatsApp%20Image%202026-09-19%20at%2012.05.20%20AM.jpeg)[cite: 2]

* **Live Target Tracking:** Highlights current weekly footprint against the budget (e.g., $22.00\text{ kg CO}_2\text{e}$ used of $25.00\text{ kg}$ target)[cite: 2].
* **Eco Score Engine:** Grades consistency, target adherence, and carbon activity distribution[cite: 2, 8].
* **Streaks & Projections:** Calculates daily streaks and predicts total weekly footprint based on current usage pace[cite: 2].

---

### 2. Log Activity & Quick Add
Provides two ways to record emissions: manual entry with real-time estimation or one-tap preset logging[cite: 3, 8].

![Log Activity Screen](./WhatsApp%20Image%202026-09-19%20at%2012.05.45%20AM.jpeg)[cite: 3]

* **Manual Logging:** Input activity type, quantity, date, and notes with dynamic $\text{CO}_2\text{e}$ rate previews[cite: 3, 8].
* **One-Tap Quick Add:** Instantly log frequent daily actions (e.g., Car Commute, Bus Commute, Veg Meal, Electricity)[cite: 3].
* **Today's Entries:** Review items recorded on the current date[cite: 3].

---

### 3. Activity History & Exporting
A comprehensive ledger with multi-variable filters and data export functionality[cite: 4, 8].

![Activity History Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.03%20AM.jpeg)[cite: 4]

* **Multi-Filter System:** Filter entries by keyword search, activity type, category, or custom date ranges[cite: 4, 8].
* **Summary Metrics:** Calculates total log count, cumulative $\text{CO}_2\text{e}$, average entry impact, and largest single entry[cite: 4].
* **Data Portability:** Export full logs into `CSV` or `PDF` formats[cite: 4, 8].

---

### 4. Weekly Target Management
Configure custom carbon ceilings with automated daily allowance calculations and historical week-by-week performance tracking[cite: 5, 8].

![Weekly Target Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.22%20AM.jpeg)[cite: 5]

* **Preset Budgets:** Quick-select preset targets ranging from **Ambitious ($15\text{ kg}$)** to **Starter ($60\text{ kg}$)**[cite: 5].
* **Real-time Allowance:** Automatically derives daily allowances (e.g., $3.57\text{ kg/day}$ for a $25\text{ kg}$ target) and alerts when approaching limits[cite: 5].

---

### 5. What-If Simulator
An interactive lifestyle modeling tool that predicts emissions reductions based on actual user data[cite: 6, 8].

![What-If Simulator Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.35%20AM.jpeg)[cite: 6]

* **Interactive Sliders:** Shift car travel to bus, replace non-veg meals with vegetarian options, or cut electricity/flight usage[cite: 6].
* **Instant Recalculation:** Compare real 30-day emissions against simulated habit changes without changing underlying logs[cite: 6].

---

### 6. Fixed Emission Factors & Comparison
Displays standardized conversion metrics and cross-activity budget equivalencies[cite: 7, 8].

![Emission Factors Screen](./WhatsApp%20Image%202026-09-19%20at%2012.06.52%20AM.jpeg)[cite: 7]

* **Conversion Standards:** Reference table outlining fixed factors across Travel, Home, and Food categories[cite: 7].
* **Activity Comparison:** Adjustable budget slider showing how far emissions stretch across different modes of transport and lifestyle choices[cite: 7].

---

### 7. About & Project Vision
Overview of developer credentials, tech stack choices, and underlying design philosophy[cite: 8].

![About Screen](./WhatsApp%20Image%202026-09-19%20at%2012.07.05%20AM.jpeg)[cite: 8]

---

## 🧮 Standard Conversion Factors

Emissions are computed strictly using standardized carbon equivalencies:
$$\text{Total Emission (kg CO}_2\text{e)} = \text{Quantity} \times \text{Emission Factor}$$
[cite: 7]

| Category | Activity Type | Conversion Factor | Unit | Calculation Example |
| :--- | :--- | :--- | :--- | :--- |
| **Travel** | Car travel | `0.20` | $\text{kg CO}_2\text{e / km}$[cite: 7] | $10\text{ km} \rightarrow 2.00\text{ kg}$[cite: 7] |
| **Travel** | Bus travel | `0.08` | $\text{kg CO}_2\text{e / km}$[cite: 7] | $10\text{ km} \rightarrow 0.80\text{ kg}$[cite: 7] |
| **Travel** | Flight | `0.25` | $\text{kg CO}_2\text{e / km}$[cite: 7] | $500\text{ km} \rightarrow 125.00\text{ kg}$[cite: 7] |
| **Home** | Electricity use | `0.80` | $\text{kg CO}_2\text{e / kWh}$[cite: 7] | $5\text{ kWh} \rightarrow 4.00\text{ kg}$[cite: 7] |
| **Food** | Vegetarian meal | `0.50` | $\text{kg CO}_2\text{e / meal}$[cite: 7] | $2\text{ meals} \rightarrow 1.00\text{ kg}$[cite: 7] |
| **Food** | Non-vegetarian meal | `2.00` | $\text{kg CO}_2\text{e / meal}$[cite: 7] | $2\text{ meals} \rightarrow 4.00\text{ kg}$[cite: 7] |

---

## 🛠️ Architecture & Tech Stack

PlanetPulse is crafted as a lightweight, zero-dependency client-side application[cite: 8]:

* **HTML5:** Semantic architecture[cite: 8]
* **CSS3:** Native CSS custom properties, grid layouts, themes (Light / Dark)[cite: 2, 8]
* **JavaScript (ES6+):** Plain JavaScript for calculations, state management, filtering, and DOM manipulation without external frameworks[cite: 8]
* **Deployment:** Hosted on Vercel

---

## 🎓 Participant Information

* **Developer:** Aryan Das[cite: 1, 8]
* **Program:** First-year B.Tech Computer Science and Engineering[cite: 8]
* **Institution:** Lovely Professional University (LPU)[cite: 1, 8]
* **Portal Credentials ID:** `AZIS-E3VD5H`[cite: 1]
* **Submission Portal:** [https://hackathon.azisly.ai/login](https://hackathon.azisly.ai/login)[cite: 1]
