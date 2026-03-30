from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, PageBreak


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawRightString(19.5 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def section(title, body, styles, story):
    story.append(Paragraph(title, styles["h2_custom"]))
    story.append(Spacer(1, 0.15 * cm))
    for line in body:
        story.append(Paragraph(line, styles["body"]))
        story.append(Spacer(1, 0.08 * cm))
    story.append(Spacer(1, 0.3 * cm))


def build_pdf(output_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.8 * cm,
        title="AphaEarth Complete Project Report",
        author="GitHub Copilot",
        subject="Technical and Functional Report",
    )

    styles_base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "title",
            parent=styles_base["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0A2740"),
            spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=styles_base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#3D4F63"),
            spaceAfter=8,
        ),
        "h2_custom": ParagraphStyle(
            "h2_custom",
            parent=styles_base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#123A5A"),
            spaceBefore=4,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=styles_base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1F2D3A"),
        ),
        "mono": ParagraphStyle(
            "mono",
            parent=styles_base["Code"],
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#1B2838"),
            backColor=colors.HexColor("#F4F7FA"),
            borderColor=colors.HexColor("#DDE5EE"),
            borderWidth=0.5,
            borderPadding=5,
        ),
    }

    story = []

    story.append(Paragraph("AphaEarth Complete Project Report", styles["title"]))
    story.append(
        Paragraph(
            f"Generated on {datetime.now().strftime('%d %B %Y, %H:%M')} | Scope: Mobile app + ML/IoT platform + integration architecture + actuarial premium and risk logic",
            styles["subtitle"],
        )
    )

    summary_table = Table(
        [
            ["Project", "AphaEarth"],
            ["Mobile Stack", "Expo + React Native + Expo Router + TypeScript"],
            ["ML/Backend Stack", "Python Flask + scikit-learn + pandas + pyserial + joblib"],
            ["Core Theme", "Environmental intelligence, emergency response, and risk-informed decisioning"],
            ["Primary Outputs", "Live incident feed, risk scores, alerts, premium estimation, 2-hour weather forecast"],
        ],
        colWidths=[4.8 * cm, 12.2 * cm],
        hAlign="LEFT",
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF3FB")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1F2D3A")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D6E4")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 0.4 * cm))

    section(
        "1) What AphaEarth Does",
        [
            "• AphaEarth is a multi-module environmental safety platform that combines geolocation, live weather/environment feeds, hazard analytics, emergency alerting, and an IoT/ML weather intelligence pipeline.",
            "• On mobile, it provides four major experiences: Home intelligence dashboard, Signal Sweep risk scanner, Insights analytics dashboard, and Emergency response dispatch.",
            "• In ML mode, a Flask engine ingests live Arduino sensor streams (temperature, humidity, precipitation, UV index, pressure), smooths data, runs two RandomForest models (current condition and 2-hour forecast), and serves results over HTTP.",
            "• The system supports both operational awareness (what is happening now) and decision support (what can happen next, with quantified risk and premium impact).",
        ],
        styles,
        story,
    )

    section(
        "2) Mobile App Architecture",
        [
            "• Navigation layout uses Expo Router tabs with: Home, Signal Sweep, Insights, Emergency.",
            "• Home screen presents dynamic location context, Open-Meteo weather fetch, environmental risk index summary, 3D rotating Earth visualization (WebView/Three.js), and module launch cards.",
            "• Signal Sweep focuses on tactical scanning: telemetry grid, nearby incident intelligence, geospatial map radar, and actuarial premium simulation.",
            "• Insights provides multi-source analytics: weather, air quality, terrain elevation, seismic activity, flood/fire risk scoring, live alerts, and hazard polygons on map.",
            "• Emergency provides one-tap alert workflow with type selection, location capture, and POST dispatch to backend relay endpoint.",
        ],
        styles,
        story,
    )

    section(
        "3) External APIs and Services",
        [
            "• Open-Meteo Forecast API: weather telemetry and forecast layers for Home, Signal Sweep, and Insights.",
            "• Open-Meteo Air Quality API: AQI and pollutant parameters in Insights.",
            "• NASA EONET API: open natural events feed for Signal Sweep community/nearby risk panel.",
            "• OpenStreetMap services: reverse geocoding and static map imagery for event context; OpenTopoData for elevation.",
            "• USGS Earthquake API: seismic events used in Insights risk and alert logic.",
            "• OpenAQ API: additional pollution observations for Insights.",
            "• Emergency backend relay: https://cyberxkiit-backend-bot.onrender.com/send receives emergency payloads.",
        ],
        styles,
        story,
    )

    section(
        "4) Signal Sweep: Actuarial Premium and Resilience Engine",
        [
            "• Base premium is fixed at INR 5000.",
            "• Hazard Index (Hi) starts at 1.0 and increases with geography and weather stressors:",
            "  - +0.4 for cyclone-prone states (Odisha, Andhra Pradesh, West Bengal, Tamil Nadu, Gujarat)",
            "  - +0.3 for flood-prone states (Kerala, Assam, Bihar, Maharashtra)",
            "  - +0.25 if wind speed > 15",
            "  - +0.35 if precipitation > 1",
            "• Mitigation actions are weighted: fire=25, drainage=30, solar=20, training=15.",
            "• Protection/Resilience score Ps is computed as min(100, round(action_weight_sum / Hi)).",
            "• Dynamic premium is computed as round(BASE_PREMIUM * Hi * (1 - (Ps / 200))).",
            "• Practical meaning: higher hazard raises premium; stronger mitigation actions reduce premium.",
            "• Scanner also auto-refreshes every 3 minutes and shows last sync timestamp for operational reliability.",
        ],
        styles,
        story,
    )

    story.append(Paragraph("Formula Snapshot", styles["h2_custom"]))
    story.append(
        Paragraph(
            "Hi = 1.0 + state_risk + weather_risk<br/>"
            "Ps = min(100, round(ActionWeighted / Hi))<br/>"
            "Premium = round(5000 × Hi × (1 - Ps/200))",
            styles["mono"],
        )
    )
    story.append(Spacer(1, 0.35 * cm))

    section(
        "5) Insights Dashboard Risk Logic",
        [
            "• Insights builds a weighted multi-factor risk model from weather, AQI, seismic activity, flood hazard, and wildfire hazard.",
            "• Weather score example: (abs(temp-25)*2) + (wind*3) + (precip*10), capped to 100.",
            "• AQI score: AQI_level × 20.",
            "• Seismic score: number_of_recent_quakes × 15, capped to 100.",
            "• Flood score and fire score are computed from elevation + weather heuristics.",
            "• Factor weights: weather 25, AQI 15, seismic 20, flood 20, fire 20.",
            "• Dashboard then derives an overall risk metric and status labels (low/medium/high/critical).",
            "• Alert system flags heat, high wind, heavy rain, seismic events, and poor air quality conditions.",
        ],
        styles,
        story,
    )

    story.append(PageBreak())

    section(
        "6) IoT + ML Platform (ML Folder)",
        [
            "• Flask app runs on port 5000 and exposes monitoring/control/data endpoints.",
            "• Serial data format expected from Arduino: temp,humidity,precipitation,uv_index,pressure.",
            "• Sensor quality controls include strict range validation and moving-average smoothing (window=5).",
            "• Prediction stabilization uses majority voting over recent predictions (window=3).",
            "• Monthly logs are written into ML/data/logs/weather_log_YYYY_MM.csv.",
            "• Two ML models are loaded: weather_model.pkl (current condition) and forecast_model.pkl (2-hour ahead condition), each with its scaler and encoder.",
            "• Both models use 8 features: Temperature, Humidity, Precipitation (%), UV Index, Pressure, hour_of_day, day_of_week, month.",
        ],
        styles,
        story,
    )

    section(
        "7) ML Training Pipeline",
        [
            "• train_model.py trains the current-weather classifier and exports weather_model.pkl, label_encoder.pkl, weather_scaler.pkl.",
            "• train_forecast.py trains both current and 2-hour forecast classifiers from forecast_dataset.csv and exports all six model artifacts.",
            "• Algorithms: RandomForestClassifier with strong configuration (n_estimators=200, max_depth=20, min_samples_split=4, min_samples_leaf=2).",
            "• Data handling includes missing-value dropping, duplicate removal, and synthetic time features if source dataset lacks them.",
            "• Evaluation includes train/test accuracy, confusion matrix, and classification report.",
            "• Inference in app.py enforces exact feature order parity with scalers to prevent mismatch errors.",
        ],
        styles,
        story,
    )

    section(
        "8) API Endpoints in ML Flask Service",
        [
            "• GET /            -> main dashboard page",
            "• GET /data        -> current sensor data + history deque",
            "• GET /model_info  -> model metadata + feature importances",
            "• POST /start_monitoring -> starts session with user-supplied Arduino port and duration",
            "• POST /stop_monitoring  -> stops active session",
            "• POST /clear_data       -> clears in-memory history and resets status",
            "• Additional pages: /pressure, /temp_humidity, /precipitation, /uv_index, /prediction",
        ],
        styles,
        story,
    )

    section(
        "9) How Mobile App Connects to ML",
        [
            "• IoT Network module in mobile app accepts ML host manually (example: 192.168.0.12:5000).",
            "• It fetches data from endpoints like /data and polls every 2.5 seconds while connected.",
            "• It can remotely call /start_monitoring and /stop_monitoring on Flask to control Arduino capture sessions.",
            "• This means ML integration is optional and network-based: mobile app works standalone for API-driven features, and extends to local IoT intelligence when host is connected.",
        ],
        styles,
        story,
    )

    section(
        "10) Emergency Module Workflow",
        [
            "• User selects emergency type (medical, fire, disaster, accident, crime, hazard).",
            "• App requests location permission and reverse-geocodes city/region.",
            "• Payload includes userId, emergencyType, coordinates, location string, and text summary.",
            "• Payload is POSTed to backend relay endpoint for response workflows (for example Telegram bridge or dispatcher pipeline).",
        ],
        styles,
        story,
    )

    section(
        "11) What Happened / Current State of Implementation",
        [
            "• Signal Sweep interface was modernized to match Home design language and now uses cleaner text and improved loading behavior.",
            "• Live incident intelligence now uses NASA EONET events with distance filtering and map snapshots.",
            "• Auto-refresh logic is active for near-real-time updates in scanner workflows.",
            "• Tab navigation labels and colors have been normalized into a cleaner style (Home, Signal Sweep, Insights, Emergency).",
            "• App icon assets were generated and aligned with project branding across icon, adaptive icon, and splash/favicon assets.",
        ],
        styles,
        story,
    )

    section(
        "12) Key Data and Model Artifacts",
        [
            "• Datasets: ML/data/datasets/forecast_dataset.csv, ML/data/datasets/weather_classification_data.csv",
            "• Logs: ML/data/logs/weather_log_YYYY_MM.csv",
            "• Models: ML/models/weather_model.pkl, label_encoder.pkl, weather_scaler.pkl, forecast_model.pkl, forecast_encoder.pkl, forecast_scaler.pkl",
            "• Core Python service: ML/app.py",
            "• Core mobile risk modules: app/(tabs)/ScannerScreen.tsx and app/(tabs)/DashboardScreen.tsx",
        ],
        styles,
        story,
    )

    section(
        "13) Known Risks and Improvement Opportunities",
        [
            "• Security: API keys should be moved fully to environment variables; avoid hardcoded secrets in app source.",
            "• Production robustness: replace random components in flood/fire heuristics with deterministic data sources.",
            "• Model operations: add automated retraining and drift detection from monthly logs.",
            "• Deployment: containerize Flask ML service for easier LAN/cloud deployment and consistent startup.",
            "• Testing: add integration tests for endpoint contracts (/data, /model_info, /start_monitoring).",
        ],
        styles,
        story,
    )

    section(
        "14) Conclusion",
        [
            "• AphaEarth already forms a complete hybrid safety platform: geospatial intelligence + environmental analytics + emergency dispatch + IoT/ML weather prediction.",
            "• The actuarial premium mechanism converts environmental hazard and mitigation actions into a transparent monetary estimate.",
            "• The architecture is modular and ready for scaling into city-level resilience analytics or insurance-tech operational pilots.",
        ],
        styles,
        story,
    )

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)


def main():
    output_dir = Path(__file__).resolve().parents[1] / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "AphaEarth_Complete_Project_Report.pdf"
    build_pdf(output_file)
    print(f"PDF generated: {output_file}")


if __name__ == "__main__":
    main()
