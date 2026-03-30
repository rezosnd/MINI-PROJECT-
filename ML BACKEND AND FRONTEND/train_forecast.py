import os
import json
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

FEATURE_COLS = [
    'Temperature', 'Humidity', 'Precipitation (%)',
    'UV Index', 'Pressure',
    'hour_of_day', 'day_of_week', 'month'
]

# ── All 4 candidate classifiers ──────────────────────────────────────────────
def _make_candidates():
    return {
        'decision_tree': DecisionTreeClassifier(
            max_depth=12, min_samples_split=4, min_samples_leaf=2,
            class_weight='balanced', random_state=42
        ),
        'gradient_boosting': GradientBoostingClassifier(
            n_estimators=300, learning_rate=0.08, max_depth=5,
            min_samples_split=4, min_samples_leaf=2,
            subsample=0.85, max_features='sqrt',
            random_state=42
        ),
        'knn': KNeighborsClassifier(n_neighbors=7, weights='distance', metric='minkowski'),
        'random_forest': RandomForestClassifier(
            n_estimators=300, max_depth=15,
            min_samples_split=5, min_samples_leaf=2,
            class_weight='balanced', random_state=42, n_jobs=-1
        ),
    }

MODEL_LABELS = {
    'decision_tree':     'Decision Tree',
    'gradient_boosting': 'Gradient Boosting',
    'knn':               'KNN',
    'random_forest':     'Random Forest',
}


def train_models():
    try:
        # ── Load dataset ─────────────────────────────────────────────────────
        ds_paths = [
            os.path.join(os.path.dirname(__file__), 'data', 'datasets', 'forecast_dataset.csv'),
            'forecast_dataset.csv'
        ]
        df = None
        for p in ds_paths:
            if os.path.exists(p):
                df = pd.read_csv(p)
                print(f"Loaded forecast dataset from: {p}")
                break
        if df is None:
            raise FileNotFoundError('forecast_dataset.csv not found')
        if df.empty:
            raise ValueError("Dataset is empty")

        missing = [c for c in FEATURE_COLS + ['Condition', 'Target_Condition'] if c not in df.columns]
        if missing:
            raise ValueError(f"Missing columns: {missing}")

        df = df.dropna(subset=FEATURE_COLS + ['Condition', 'Target_Condition'])
        print(f"\nDataset: {len(df)} rows\n")

        models_dir = os.path.join(os.path.dirname(__file__), 'models')
        os.makedirs(models_dir, exist_ok=True)

        # Shared scaler and encoders (features are identical for all models)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df[FEATURE_COLS])

        le_current  = LabelEncoder()
        y_current   = le_current.fit_transform(df['Condition'])
        le_forecast = LabelEncoder()
        y_forecast  = le_forecast.fit_transform(df['Target_Condition'])

        X_c_train, X_c_test, y_c_train, y_c_test = train_test_split(
            X_scaled, y_current,  test_size=0.2, random_state=42, stratify=y_current
        )
        X_f_train, X_f_test, y_f_train, y_f_test = train_test_split(
            X_scaled, y_forecast, test_size=0.2, random_state=42, stratify=y_forecast
        )

        # Save shared artifacts
        joblib.dump(scaler,      os.path.join(models_dir, 'weather_scaler.pkl'))
        joblib.dump(scaler,      os.path.join(models_dir, 'forecast_scaler.pkl'))
        joblib.dump(le_current,  os.path.join(models_dir, 'label_encoder.pkl'))
        joblib.dump(le_forecast, os.path.join(models_dir, 'forecast_encoder.pkl'))

        accuracies = {}

        # ── Train all 4 models — Current Weather ──────────────────────────────
        print("=" * 70)
        print("CURRENT WEATHER MODELS")
        print("=" * 70)
        print(f"{'Model':<22} {'Train':>8} {'Test':>8}")
        print("-" * 42)

        best_current_acc  = -1
        best_current_name = None

        for key, clf in _make_candidates().items():
            clf.fit(X_c_train, y_c_train)
            tr_acc = accuracy_score(y_c_train, clf.predict(X_c_train))
            te_acc = accuracy_score(y_c_test,  clf.predict(X_c_test))
            print(f"  {MODEL_LABELS[key]:<20} {tr_acc:>8.4f} {te_acc:>8.4f}")
            joblib.dump(clf, os.path.join(models_dir, f'{key}_current.pkl'))
            if key not in accuracies:
                accuracies[key] = {}
            accuracies[key]['current_accuracy']  = round(te_acc, 4)
            accuracies[key]['current_accuracy_pct'] = f"{te_acc*100:.1f}%"
            if te_acc > best_current_acc:
                best_current_acc  = te_acc
                best_current_name = key
                best_current_clf  = clf

        # Save best as backward-compatible weather_model.pkl
        joblib.dump(best_current_clf, os.path.join(models_dir, 'weather_model.pkl'))
        print(f"\n  Best current model: {MODEL_LABELS[best_current_name]} ({best_current_acc:.4f})")

        # Print detailed report for best current model
        print(f"\n  Classification Report ({MODEL_LABELS[best_current_name]}):")
        print(classification_report(y_c_test, best_current_clf.predict(X_c_test),
                                    target_names=le_current.classes_))

        # ── Train all 4 models — 2-Hour Forecast ──────────────────────────────
        print("=" * 70)
        print("2-HOUR FORECAST MODELS")
        print("=" * 70)
        print(f"{'Model':<22} {'Train':>8} {'Test':>8}")
        print("-" * 42)

        best_forecast_acc  = -1
        best_forecast_name = None

        for key, clf in _make_candidates().items():
            clf.fit(X_f_train, y_f_train)
            tr_acc = accuracy_score(y_f_train, clf.predict(X_f_train))
            te_acc = accuracy_score(y_f_test,  clf.predict(X_f_test))
            print(f"  {MODEL_LABELS[key]:<20} {tr_acc:>8.4f} {te_acc:>8.4f}")
            joblib.dump(clf, os.path.join(models_dir, f'{key}_forecast.pkl'))
            if key not in accuracies:
                accuracies[key] = {}
            accuracies[key]['forecast_accuracy']     = round(te_acc, 4)
            accuracies[key]['forecast_accuracy_pct'] = f"{te_acc*100:.1f}%"
            if te_acc > best_forecast_acc:
                best_forecast_acc  = te_acc
                best_forecast_name = key
                best_forecast_clf  = clf

        # Save best as backward-compatible forecast_model.pkl
        joblib.dump(best_forecast_clf, os.path.join(models_dir, 'forecast_model.pkl'))
        print(f"\n  Best forecast model: {MODEL_LABELS[best_forecast_name]} ({best_forecast_acc:.4f})")

        # ── Save accuracies JSON ───────────────────────────────────────────────
        accs_path = os.path.join(models_dir, 'model_accuracies.json')
        with open(accs_path, 'w') as f:
            json.dump(accuracies, f, indent=2)
        print(f"\n  Accuracies saved: {accs_path}")

        # ── Feature importances for Random Forest ─────────────────────────────
        rf_cur = joblib.load(os.path.join(models_dir, 'random_forest_current.pkl'))
        if hasattr(rf_cur, 'feature_importances_'):
            fi = pd.Series(rf_cur.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False)
            print("\nFeature Importances (Random Forest — Current Weather):")
            for feat, imp in fi.items():
                print(f"   {feat:25s}: {imp*100:.1f}%")

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n" + "=" * 70)
        print("TRAINING SUMMARY")
        print("=" * 70)
        print(f"  {'Model':<22} {'Current Acc':>12} {'Forecast Acc':>14}")
        print(f"  {'-'*50}")
        for key in _make_candidates():
            c_acc = accuracies[key]['current_accuracy_pct']
            f_acc = accuracies[key]['forecast_accuracy_pct']
            tag   = ' <-- BEST' if key == best_current_name else ''
            print(f"  {MODEL_LABELS[key]:<22} {c_acc:>12} {f_acc:>14}{tag}")
        print("=" * 70)

    except FileNotFoundError as e:
        print(f"Error: Dataset file not found - {e}")
    except Exception as e:
        print(f"Training error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    train_models()
