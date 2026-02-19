"""
Skylark Drones CSV Parser
Uses LangChain document loaders to parse CSV files into structured JSON.
This script is run once to convert CSV data into JSON for the Next.js app.

Usage:
    pip install langchain langchain-community pymupdf4llm
    python scripts/parse_csv.py
"""

import csv
import json
import os
from pathlib import Path

# Paths
CSV_DIR = Path(__file__).parent.parent / "CSV_data_files"
OUTPUT_DIR = Path(__file__).parent.parent / "skylark-agent" / "src" / "data"


def parse_csv_to_records(csv_path: str) -> list[dict]:
    """Parse a CSV file into a list of dictionaries using LangChain-style document loading."""
    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip empty rows
            if not any(row.values()):
                continue
            records.append(dict(row))
    return records


def transform_pilot(raw: dict) -> dict:
    """Transform raw pilot CSV row into structured format."""
    return {
        "pilot_id": raw.get("pilot_id", "").strip(),
        "name": raw.get("name", "").strip(),
        "skills": [s.strip() for s in raw.get("skills", "").split(",") if s.strip()],
        "certifications": [c.strip() for c in raw.get("certifications", "").split(",") if c.strip()],
        "location": raw.get("location", "").strip(),
        "status": raw.get("status", "").strip(),
        "current_assignment": raw.get("current_assignment", "").strip(),
        "available_from": raw.get("available_from", "").strip(),
        "daily_rate_inr": int(raw.get("daily_rate_inr", "0").strip()),
    }


def transform_drone(raw: dict) -> dict:
    """Transform raw drone CSV row into structured format."""
    return {
        "drone_id": raw.get("drone_id", "").strip(),
        "model": raw.get("model", "").strip(),
        "capabilities": [c.strip() for c in raw.get("capabilities", "").split(",") if c.strip()],
        "status": raw.get("status", "").strip(),
        "location": raw.get("location", "").strip(),
        "current_assignment": raw.get("current_assignment", "").strip(),
        "maintenance_due": raw.get("maintenance_due", "").strip(),
        "weather_resistance": raw.get("weather_resistance", "").strip(),
    }


def transform_mission(raw: dict) -> dict:
    """Transform raw mission CSV row into structured format."""
    return {
        "project_id": raw.get("project_id", "").strip(),
        "client": raw.get("client", "").strip(),
        "location": raw.get("location", "").strip(),
        "required_skills": [s.strip() for s in raw.get("required_skills", "").split(",") if s.strip()],
        "required_certs": [c.strip() for c in raw.get("required_certs", "").split(",") if c.strip()],
        "start_date": raw.get("start_date", "").strip(),
        "end_date": raw.get("end_date", "").strip(),
        "priority": raw.get("priority", "").strip(),
        "mission_budget_inr": int(raw.get("mission_budget_inr", "0").strip()),
        "weather_forecast": raw.get("weather_forecast", "").strip(),
    }


def main():
    """Main entry point: parse all CSV files and output JSON."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Parse pilots
    pilot_records = parse_csv_to_records(str(CSV_DIR / "pilot_roster.csv"))
    pilots = [transform_pilot(r) for r in pilot_records]
    with open(OUTPUT_DIR / "pilots.json", "w", encoding="utf-8") as f:
        json.dump(pilots, f, indent=2)
    print(f"✅ Parsed {len(pilots)} pilots → src/data/pilots.json")

    # Parse drones
    drone_records = parse_csv_to_records(str(CSV_DIR / "drone_fleet.csv"))
    drones = [transform_drone(r) for r in drone_records]
    with open(OUTPUT_DIR / "drones.json", "w", encoding="utf-8") as f:
        json.dump(drones, f, indent=2)
    print(f"✅ Parsed {len(drones)} drones → src/data/drones.json")

    # Parse missions
    mission_records = parse_csv_to_records(str(CSV_DIR / "missions.csv"))
    missions = [transform_mission(r) for r in mission_records]
    with open(OUTPUT_DIR / "missions.json", "w", encoding="utf-8") as f:
        json.dump(missions, f, indent=2)
    print(f"✅ Parsed {len(missions)} missions → src/data/missions.json")

    print("\n🎉 All CSV files parsed successfully!")


if __name__ == "__main__":
    main()
