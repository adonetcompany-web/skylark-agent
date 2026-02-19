# SkyOps AI Agent — Professional Decision Log

**Author:** Salem Bin Mubarak Bamukrah
**Project:** Drone Operations Coordination Agent (Skylark Drones)  
**Date:** February 19, 2026

---

## 1. Key Assumptions

In building this agent, I operated under several critical assumptions to bridge the gap between static CSV data and a dynamic operational environment:

*   **Availability vs. Timeline:** I assumed that "Available From" dates are absolute constraints. If a pilot's available date is *after* a mission's start date, they are filtered out immediately, even if they appear "Available" in the status column.
*   **The "IP43" Weather Threshold:** In the drone fleet CSV, some drones listed "IP43" and others listed "None". I assumed IP43 is the mandatory minimum for any mission where the forecast is "Rainy". This formed the basis of the Weather Risk conflict detection logic.
*   **Operational Locality:** I assumed that pilots and drones must be in the same city as the mission to be eligible without a separate "travel dispatch" logic. My engine flags a "Location Mismatch" if an asset is in Mumbai for a Bangalore mission.
*   **Cost Linearity:** Pilot costs are calculated linearly: `Daily Rate * (End Date - Start Date + 1)`. I assumed no overtime or weekend premiums exist in the current scope.
*   **Data Hierarchy:** I assumed the `current_assignment` field is the "source of truth" for double-booking. Even if a status says "Available", if a `current_assignment` is listed, the agent treats that asset as occupied.

---

## 2. Trade-offs Chosen and Why

Building a prototype in a high-pressure timeframe required deliberate trade-offs between "academic perfection" and "operational utility":

*   **In-Memory "Live" Store vs. Persistent Database:**
    *   *Choice:* I implemented a Singleton `DataStore` that loads from JSON.
    *   *Reason:* For a roster of 4 pilots and 4 drones, a full PostgreSQL/MongoDB setup would add latent overhead and complexity for the user. The in-memory store allows for sub-millisecond conflict detection which makes the AI agent feel instantaneous.
*   **Polling vs. WebSockets:**
    *   *Choice:* The dashboard uses a 30-second interval poll for updates.
    *   *Reason:* Real-time WebSockets (Socket.io) require server-side state persistence that often breaks in serverless environments like Vercel. Polling ensures 100% reliability and "good enough" real-time feel for a coordinator.
*   **Heuristic-Based Matching vs. Linear Programming (Optimization):**
    *   *Choice:* I used a weighted scoring system for "Match Pilot" tools.
    *   *Reason:* A full optimization solver (like OR-Tools) is overkill for this scale. A heuristic model (Score = Skills + Certs + Cost + Proximity) is easier to debug and explain to the end-user via the AI's "thought process."
*   **Strict vs. Soft Constraints in Conflicts:**
    *   *Choice:* Conflicts are categorized as "Critical" or "Warning" rather than just blocking the action.
    *   *Reason:* In real-world logistics, a coordinator might *decide* to pay for a pilot's travel (Location Warning) to solve an urgent mission. The app flags the risk but allows the coordinator to remain the final decision-maker.

---

## 3. How I Interpreted "Urgent Reassignments"

This was interpreted as the "Emergency Recovery" mode of the fleet. While a standard assignment only looks for "Available" assets, an **Urgent Reassignment** triggers a specialized two-stage logic:

1.  **Stage 1: The Best-Available Search:** The engine first scans for the highest-rated Available assets that meet all technical criteria (Skills + IP Rating).
2.  **Stage 2: Impact-Aware Substitution:** If no available assets exist, the agent identifies assets currently assigned to "Standard" priority projects. It then presents a "Reassignment Impact" report: *"I can move Pilot Rohit to this Urgent mission, but it will stall Project-C (Standard Priority)."*
3.  **Result:** It provides the coordinator with a "Swap Plan" rather than just a "No one is available" error.

---

## 4. What I’d Do Differently with More Time

If this were moving to a production environment, I would evolve the architecture in these directions:

*   **Native Google Sheets Persistence:** Instead of an in-memory store that *syncs* to Sheets, I would build a direct "Sheets-as-a-DB" layer using the `googleapis` library for every read/write to ensure that manual edits by staff in the spreadsheet are reflected in the AI's brain within seconds.
*   **GIS Integration:** I would replace the string-based location check ("Mumbai") with Lat/Long coordinates and a distance-matrix API to calculate actual travel times for pilots.
*   **Role-Based Access Control (RBAC):** Implement "Viewer" mode for pilots to see their schedules and "Admin" mode for the AI Agent to perform reassignments.
*   **Multi-Model Fallback:** Implement a fallback to a secondary LLM (like Gemini 1.5 Pro) if the primary agent hits a rate limit, ensuring the fleet never goes "blind" during high-activity periods.
*   **Automated Scheduling (Auto-Pilot):** A feature where the agent can automatically build a 7-day schedule for the entire fleet that minimizes budget and maximizes utilization.
