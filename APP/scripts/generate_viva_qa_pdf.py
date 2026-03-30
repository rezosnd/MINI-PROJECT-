from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, PageBreak


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawRightString(19.5 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def q_block(q_no, question, answer, styles, story):
    story.append(Paragraph(f"Q{q_no}. {question}", styles["q"]))
    story.append(Spacer(1, 0.08 * cm))
    story.append(Paragraph(f"Answer: {answer}", styles["a"]))
    story.append(Spacer(1, 0.22 * cm))


def build_viva_pdf(output_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=1.7 * cm,
        rightMargin=1.7 * cm,
        topMargin=1.7 * cm,
        bottomMargin=1.8 * cm,
        title="AphaEarth Viva Question Bank",
        author="GitHub Copilot",
    )

    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0F3554"),
            spaceAfter=10,
        ),
        "sub": ParagraphStyle(
            "sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#3E556B"),
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#123A5A"),
            spaceBefore=6,
            spaceAfter=8,
        ),
        "q": ParagraphStyle(
            "q",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10.2,
            leading=14,
            textColor=colors.HexColor("#1A2E40"),
        ),
        "a": ParagraphStyle(
            "a",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1F2D3A"),
        ),
        "tip": ParagraphStyle(
            "tip",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#3A4E63"),
        ),
    }

    story = []

    story.append(Paragraph("AphaEarth Viva Complete Question Bank", styles["title"]))
    story.append(
        Paragraph(
            f"Detailed technical questions and speaking-ready answers for project viva | Generated on {datetime.now().strftime('%d %B %Y, %H:%M')}",
            styles["sub"],
        )
    )
    story.append(Spacer(1, 0.15 * cm))

    story.append(Paragraph("How To Use In Viva", styles["h2"]))
    story.append(Paragraph("1) Start with the 60-second project intro. 2) For each examiner question, answer in 2-4 lines first, then expand with architecture or implementation details. 3) Always mention one real implementation detail from your code to sound confident.", styles["a"]))
    story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph("60-Second Opening Script", styles["h2"]))
    opening = (
        "AphaEarth is a hybrid environmental safety platform that combines a React Native Expo mobile app with a Python Flask IoT and machine learning backend. "
        "The mobile app handles live location intelligence, hazard visualization, emergency alert dispatch, and decision support dashboards. "
        "The ML backend ingests Arduino sensor streams, filters noisy values, predicts current weather and 2-hour forecast using RandomForest models, and serves the results to the app. "
        "A key innovation is our actuarial premium logic where hazard level and mitigation actions directly influence projected premium, making risk understandable and actionable."
    )
    story.append(Paragraph(opening, styles["a"]))
    story.append(Spacer(1, 0.3 * cm))

    sections = [
        (
            "A) Fundamentals: React Native, Expo, and Stack",
            [
                ("What is React Native?", "React Native is a framework for building Android and iOS apps using React principles with JavaScript or TypeScript. It uses native components under the hood, so UI behaves like a native app."),
                ("What is Expo and why did you use it?", "Expo accelerates mobile development by giving ready tooling for routing, native APIs, build workflows, and testing. We used Expo to reduce setup complexity and focus on product logic."),
                ("Why TypeScript instead of plain JavaScript?", "TypeScript adds static typing, safer refactoring, and better editor intelligence. In multi-module projects like ours, it helps prevent integration bugs."),
                ("Why not make separate native Android and iOS apps?", "A shared React Native codebase reduced development time and maintenance effort while still delivering near-native UX for our use case."),
                ("What are the two major technical layers in your project?", "Layer 1 is the mobile application for user interaction and API orchestration. Layer 2 is Flask + ML + serial pipeline for hardware ingestion and predictions."),
            ],
        ),
        (
            "B) Problem Statement and Motivation",
            [
                ("Why did you build AphaEarth?", "We built AphaEarth to reduce delay in environmental risk awareness and emergency response. Existing tools are fragmented; we wanted a single decision-support platform."),
                ("What practical problem does this solve?", "It helps users monitor environmental threats, understand risk scores, and trigger emergency alerts quickly with contextual location and weather intelligence."),
                ("Who are your intended users?", "Citizens, local communities, disaster response teams, and organizations interested in resilience and climate-risk monitoring."),
                ("What is unique compared to a normal weather app?", "AphaEarth combines live incidents, actuarial premium logic, emergency alerting, and optional IoT + ML integration. It is operational, not just informational."),
            ],
        ),
        (
            "C) App Modules and Functional Design",
            [
                ("What are the main mobile modules?", "Home, Signal Sweep, Insights, Emergency, plus IoT Network and Forecasting utility screens."),
                ("What does Home screen do?", "It shows current location context, weather-based risk index, and module navigation. It gives a high-level situational snapshot."),
                ("What does Signal Sweep do?", "It performs tactical risk scanning using geolocation, Open-Meteo telemetry, nearby events from NASA EONET, map radar, resilience score, and projected premium."),
                ("What does Insights screen do?", "It combines weather, AQI, seismic, flood, and wildfire factors into weighted risk analysis with alerts and map overlays."),
                ("What does Emergency screen do?", "It captures emergency type and location, builds a payload, and sends it to backend relay so response channels can be notified."),
                ("What does IoT Network screen do?", "It connects to the Flask ML host by IP:port, polls /data, and can remotely start or stop sensor monitoring sessions."),
            ],
        ),
        (
            "D) API Integrations",
            [
                ("Which external APIs are integrated?", "Open-Meteo, NASA EONET, OpenStreetMap, OpenTopoData, USGS, OpenAQ, and an emergency relay backend endpoint."),
                ("Why multiple APIs?", "Environmental intelligence is multi-dimensional. No single provider gives weather, seismic, incidents, pollution, and geospatial context together."),
                ("How do you handle API failures?", "We use try-catch blocks, fallback values, and user-safe status messages so failures degrade gracefully instead of crashing the app."),
                ("How is location used in your architecture?", "Location is the anchor input. We reverse-geocode for human-readable area names, and all weather and risk APIs are queried using those coordinates."),
            ],
        ),
        (
            "E) Risk Engine and Actuarial Premium",
            [
                ("What is Hazard Index in your project?", "Hazard Index is a dynamic multiplier starting at 1.0 and increasing with geography and environmental stress factors like high wind and precipitation."),
                ("What are mitigation actions?", "We track weighted actions such as fire preparedness, drainage readiness, solar adoption, and training level to estimate resilience."),
                ("How is resilience score calculated?", "Resilience score Ps is calculated from weighted action total divided by Hazard Index, then capped at 100."),
                ("What is your premium formula?", "Premium = round(5000 × Hi × (1 - Ps/200)). Higher hazard raises premium, while stronger mitigation lowers premium."),
                ("Why include premium logic in a risk app?", "It translates abstract hazard into financial impact, making prevention and preparedness decisions more understandable."),
                ("Is this actual insurance pricing?", "No. It is an actuarial-inspired prototype model for decision support and educational demonstration."),
            ],
        ),
        (
            "F) Insights Multi-Factor Risk Scoring",
            [
                ("How is overall risk in Insights computed?", "We create factor scores for weather, AQI, seismic activity, flood hazard, and wildfire hazard, then aggregate using predefined weights."),
                ("Give one concrete factor formula.", "Weather score is based on temperature deviation, wind speed, and precipitation intensity; then it is capped to avoid outlier distortion."),
                ("How are alerts generated?", "Rule-based thresholds trigger alerts for heat, heavy rain, high wind, earthquake events, and poor AQI levels."),
                ("Why combine model-based and rule-based logic?", "Rule-based logic is transparent and immediate, while model-based components improve predictive depth. Together they balance explainability and intelligence."),
            ],
        ),
        (
            "G) IoT and ML Backend",
            [
                ("Describe your IoT data pipeline.", "Arduino sends 5 sensor values over serial. Flask reads packets, validates ranges, smooths values, runs ML inference, and exposes current plus history data via HTTP."),
                ("What sensors are used?", "Temperature, humidity, precipitation, UV index, and pressure sensors."),
                ("Why apply moving average smoothing?", "Physical sensors are noisy. Smoothing stabilizes values and improves model input quality."),
                ("Why majority voting for prediction?", "It reduces output flicker caused by small input variations and gives stable user-facing predictions."),
                ("Which ML models are used?", "Two RandomForest classifiers: one for current weather class and one for 2-hour forecast class."),
                ("What are model input features?", "8 features: temperature, humidity, precipitation, UV index, pressure, hour_of_day, day_of_week, month."),
                ("Why RandomForest instead of deep learning?", "For tabular datasets and moderate data size, RandomForest gives strong accuracy, easier tuning, and better interpretability."),
                ("How do you avoid feature mismatch at inference?", "We enforce fixed feature order consistent with scaler.feature_names and the training pipeline before transform and predict."),
            ],
        ),
        (
            "H) Training and Evaluation",
            [
                ("How do you train the models?", "Using pandas and scikit-learn pipeline: clean data, encode labels, scale features, split train-test, train RandomForest, then evaluate."),
                ("What evaluation metrics do you use?", "Training/test accuracy, confusion matrix, and per-class precision/recall/F1 from classification report."),
                ("What files are generated after training?", "Model pkl, encoder pkl, and scaler pkl for both current and forecast models."),
                ("How does retraining happen with real data?", "Monthly logged sensor data can be converted into training datasets and used to retrain and replace artifacts."),
            ],
        ),
        (
            "I) Backend Endpoints and Integration",
            [
                ("What are critical Flask endpoints?", "GET /data, GET /model_info, POST /start_monitoring, POST /stop_monitoring, POST /clear_data, and dashboard template routes."),
                ("How does mobile start sensor monitoring remotely?", "It sends POST /start_monitoring with Arduino port and duration. Backend starts session and updates status in shared sensor state."),
                ("How does mobile receive updates?", "It polls /data at short intervals to get current sensor state, prediction, forecast, and history."),
                ("How are logs stored?", "CSV logs are rotated monthly under data/logs with timestamp and key sensor/prediction fields."),
            ],
        ),
        (
            "J) Engineering Decisions, Reliability, Security",
            [
                ("How did you handle reliability concerns?", "Connection state management, retries, fallback UI states, status indicators, and non-crashing error paths."),
                ("What are current limitations?", "Some heuristic risk components still use simplified assumptions; production-grade auth and key management need hardening."),
                ("What security improvements are needed?", "Move all secrets to environment variables, enforce authentication for control endpoints, validate payloads, and add rate limits."),
                ("What testing approach did you follow?", "Functional testing for permission flows, endpoint behavior, API failover, and end-to-end IoT prediction updates."),
                ("What is future scope?", "Cloud deployment, model drift monitoring, deterministic hazard models, stronger observability, and city-scale operational dashboards."),
            ],
        ),
        (
            "K) High-Impact Viva Questions (Often Asked)",
            [
                ("Explain your full architecture in one answer.", "AphaEarth uses a client-server-hardware architecture: Expo mobile client for UX and orchestration, Flask backend for serial ingestion and ML inference, and Arduino sensor layer for real-world environmental signals. APIs enrich context with weather, incidents, and geospatial risk."),
                ("What is the strongest technical contribution of your team?", "The strongest contribution is integrated system design: we connected mobile UX, hazard analytics, emergency operations, and IoT ML into one coherent decision-support workflow."),
                ("If this had to go production, what 3 things first?", "1) Security hardening for endpoints and secrets, 2) robust deployment and monitoring pipeline, 3) model governance with scheduled retraining and drift checks."),
                ("What did you personally implement?", "I implemented and integrated major risk workflows: scanner premium logic, API-connected risk intelligence, dashboard scoring patterns, and documentation automation for technical reporting."),
                ("How do you justify project relevance?", "Climate and disaster risk are increasing; actionable local intelligence and faster emergency signaling directly improve readiness and response quality."),
            ],
        ),
    ]

    q_no = 1
    for title, qa_list in sections:
        story.append(Paragraph(title, styles["h2"]))
        for q, a in qa_list:
            q_block(q_no, q, a, styles, story)
            q_no += 1
        if q_no in (18, 33, 48, 63):
            story.append(PageBreak())

    story.append(PageBreak())
    story.append(Paragraph("Rapid-Fire Revision Sheet", styles["h2"]))
    quick = [
        "• Stack: React Native Expo + TypeScript + Flask + scikit-learn + Arduino serial",
        "• Core value: live risk awareness + predictive insight + emergency action",
        "• APIs: Open-Meteo, NASA EONET, OSM, USGS, OpenAQ, OpenTopoData",
        "• ML: RandomForest current weather + 2-hour forecast",
        "• Features: 5 sensors + 3 time features = 8",
        "• Stabilization: moving average + majority voting",
        "• Premium equation: 5000 × Hi × (1 - Ps/200)",
        "• Emergency flow: type + location + payload to relay endpoint",
        "• Integration: mobile polls Flask /data and controls monitoring sessions",
    ]
    for line in quick:
        story.append(Paragraph(line, styles["a"]))
        story.append(Spacer(1, 0.08 * cm))

    story.append(Spacer(1, 0.22 * cm))
    story.append(Paragraph("Viva Delivery Tip: Always answer in this sequence -> objective, implementation, result, limitation, future scope.", styles["tip"]))

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)


def main():
    output_dir = Path(__file__).resolve().parents[1] / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "AphaEarth_Viva_Complete_QA.pdf"
    build_viva_pdf(output_file)
    print(f"PDF generated: {output_file}")


if __name__ == "__main__":
    main()
