"""
Multi-model weather classification trainer.

Trains 4 models on the same dataset and features:
  1. Decision Tree
  2. Logistic Regression
  3. K-Nearest Neighbours
  4. Random Forest

Automatically selects the highest test-accuracy model and saves it as:
  models/weather_model.pkl
  models/weather_scaler.pkl
  models/label_encoder.pkl

Only train_model.py is updated — Flask API, Dashboard, and Arduino code
are unchanged. The saved pkl filenames stay the same so app.py picks up
the best model transparently.
"""
import os
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier

# ── Feature columns (must match app.py inference input) ─────────────────────
FEATURE_COLS = [
    "Temperature", "Humidity", "Precipitation (%)",
    "UV Index", "Pressure",
    "hour_of_day", "day_of_week", "month"
]

# ── Candidate models ─────────────────────────────────────────────────────────
CANDIDATES = {
    "Decision Tree":      DecisionTreeClassifier(random_state=42),
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "KNN":                KNeighborsClassifier(n_neighbors=5),
    "Random Forest":      RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
}

try:
    # ── Load dataset ─────────────────────────────────────────────────────────
    dataset_paths = [
        os.path.join(os.path.dirname(__file__), 'data', 'datasets', 'forecast_dataset.csv'),
        os.path.join(os.path.dirname(__file__), 'data', 'datasets', 'weather_classification_data.csv'),
        'weather_classification_data.csv'
    ]
    df = None
    for p in dataset_paths:
        if os.path.exists(p):
            df = pd.read_csv(p)
            print(f"Loaded dataset from: {p}")
            break
    if df is None:
        raise FileNotFoundError("No dataset found in data/datasets or project root")
    if df.empty:
        raise ValueError("Dataset is empty")

    # Legacy column name support
    if "Atmospheric Pressure" in df.columns and "Pressure" not in df.columns:
        df.rename(columns={"Atmospheric Pressure": "Pressure"}, inplace=True)

    target_col = "Condition" if "Condition" in df.columns else "Weather Type"

    # Synthesise missing time features if dataset predates them
    for col, lo, hi in [("hour_of_day", 0, 24), ("day_of_week", 0, 7), ("month", 1, 13)]:
        if col not in df.columns:
            df[col] = np.random.randint(lo, hi, len(df))
            print(f"  [INFO] Synthetic '{col}' added (dataset lacked this column)")

    missing = [c for c in FEATURE_COLS + [target_col] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    df = df[FEATURE_COLS + [target_col]].drop_duplicates().dropna()
    print(f"Dataset: {len(df)} rows  |  Features: {len(FEATURE_COLS)}\n")

    # ── Encode & scale ───────────────────────────────────────────────────────
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df[target_col])
    X = df[FEATURE_COLS]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    print("=" * 70)
    print("MODEL COMPARISON — WEATHER CLASSIFICATION")
    print("=" * 70)
    print(f"{'Model':<22} {'Train Acc':>10} {'Test Acc':>10}")
    print("-" * 46)

    results  = {}   # name → test accuracy
    trained  = {}   # name → fitted model object

    for name, clf in CANDIDATES.items():
        clf.fit(X_train, y_train)
        train_acc = accuracy_score(y_train, clf.predict(X_train))
        test_acc  = accuracy_score(y_test,  clf.predict(X_test))
        results[name]  = test_acc
        trained[name]  = clf
        print(f"{name:<22} {train_acc:>9.4f}  {test_acc:>9.4f}")

    print("-" * 46)
    print()

    # ── Individual classification reports ───────────────────────────────────
    for name, clf in trained.items():
        print(f"{'─'*70}")
        print(f"{name} — Classification Report")
        print(f"{'─'*70}")
        print(f"  Decision Tree Accuracy:      {results['Decision Tree']:.4f}"
              if name == 'Decision Tree' else
              f"  Logistic Regression Accuracy: {results['Logistic Regression']:.4f}"
              if name == 'Logistic Regression' else
              f"  KNN Accuracy:                {results['KNN']:.4f}"
              if name == 'KNN' else
              f"  Random Forest Accuracy:      {results['Random Forest']:.4f}")
        print()
        print(classification_report(y_test, clf.predict(X_test),
                                    target_names=label_encoder.classes_))
        print(f"Confusion Matrix:\n{confusion_matrix(y_test, clf.predict(X_test))}")
        print()

    # ── Ranked summary ───────────────────────────────────────────────────────
    print("=" * 70)
    print("ACCURACY SUMMARY (ranked)")
    print("=" * 70)
    ranked = sorted(results.items(), key=lambda x: x[1], reverse=True)
    for rank, (name, acc) in enumerate(ranked, 1):
        crown = " <-- BEST" if rank == 1 else ""
        print(f"  #{rank}  {name:<22}  Test Accuracy: {acc:.4f}{crown}")

    # ── Select & save best model ─────────────────────────────────────────────
    best_name  = max(results, key=results.get)
    best_model = trained[best_name]
    best_acc   = results[best_name]

    print()
    print(f"Best model selected: {best_name}  (Test Accuracy: {best_acc:.4f})")

    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)

    joblib.dump(best_model,   os.path.join(models_dir, "weather_model.pkl"))
    joblib.dump(label_encoder, os.path.join(models_dir, "label_encoder.pkl"))
    joblib.dump(scaler,        os.path.join(models_dir, "weather_scaler.pkl"))

    print()
    print(f"Saved to {models_dir}/")
    print(f"  weather_model.pkl   ({best_name})")
    print(f"  label_encoder.pkl")
    print(f"  weather_scaler.pkl")
    print("=" * 70)

except FileNotFoundError as e:
    print(f"Error: Dataset file not found — {e}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
