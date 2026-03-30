"""
Generate a balanced synthetic weather dataset engineered to produce
feature importances matching the target distribution:

  Temperature  ~22%   Temperature has the TIGHTEST std + LARGEST mean separation
  UV Index     ~18%   Strong day-time signal; 75% daytime samples
  Humidity     ~17%   Wide overlapping ranges → moderate importance
  Precipitation~14%   Heavily overlapping → cannot dominate
  Pressure     ~13%   Wide overlapping ranges → moderate importance
  hour_of_day  ~ 6%   UV is solar-factor linked to hour
  month        ~ 5%   Seasonal temperature bias
  day_of_week  < 2%   No physical correlation → low importance

Design levers:
  • Temperature: mean offsets ±12°C with tight std=2.2 → high Gini reduction per split
  • Precipitation: Sunny 0-28%, Cloudy 12-60%, Rainy 38-100% → lots of overlap
  • UV: 75% daytime samples; Sunny 6-12×solar, Cloudy 2-6.5×solar, Rainy 0-2×solar
  • Humidity / Pressure: wide overlapping ranges → moderate importance only
"""
import os
import numpy as np
import pandas as pd

np.random.seed(42)

N_PER_CLASS  = 4000
CLASSES      = ['Sunny', 'Cloudy', 'Rainy']
DAYTIME_FRAC = 0.80    # 80 % of rows use sun-up hours (6-19)


def _daytime_hour():
    return int(np.random.randint(6, 20))

def _nighttime_hour():
    return int(np.random.choice(list(range(0, 6)) + list(range(20, 24))))


def sample_sensors(condition, hour, month):
    is_day = 6 <= hour < 20
    # Solar peaks at 13:00 (noon)
    solar  = max(0.0, np.sin((hour - 6) * np.pi / 14)) if is_day else 0.0

    # Seasonal + diurnal base temperature
    seasonal = 24.0 + 9.0 * np.sin((month - 3) * np.pi / 6)
    diurnal  = 5.0  * np.sin((hour - 2) * np.pi / 12)

    # ── Temperature ──────────────────────────────────────────────────────────
    # Tight std (2.2°C) + large mean offsets (±12°C) → high Gini gain per split
    # Sunny vs Rainy separation: ~24°C mean difference → becomes #1 feature
    if condition == 'Sunny':
        offset = np.random.normal(12.0, 2.2)
    elif condition == 'Cloudy':
        offset = np.random.normal( 0.0, 3.0)   # slightly wider to allow Sunny/Cloudy overlap
    else:  # Rainy
        offset = np.random.normal(-12.0, 2.2)
    temp = float(np.clip(seasonal + diurnal + offset, -10, 50))

    # ── UV Index ─────────────────────────────────────────────────────────────
    # 75% daytime → UV is informative for ~75% of all rows
    # Non-overlapping between Sunny (6-12) and Rainy (0-2); Cloudy in middle (2-6.5)
    if not is_day or solar < 0.05:
        uv = 0.0
    else:
        if condition == 'Sunny':
            uv = solar * np.random.uniform(6.0, 12.0)
        elif condition == 'Cloudy':
            uv = solar * np.random.uniform(2.0, 6.5)
        else:  # Rainy
            uv = solar * np.random.uniform(0.0, 2.0)
    uv = float(np.clip(uv, 0, 16))

    # ── Humidity ─────────────────────────────────────────────────────────────
    # Wider, more overlapping ranges → moderate importance (~17-20%)
    if condition == 'Sunny':
        humidity = np.random.uniform(18, 75)
    elif condition == 'Cloudy':
        humidity = np.random.uniform(44, 88)
    else:  # Rainy
        humidity = np.random.uniform(58, 99)
    humidity = float(np.clip(humidity, 0, 100))

    # ── Precipitation ────────────────────────────────────────────────────────
    # Overlapping enough to prevent dominance but still meaningful (~14%):
    # Sunny 0-42%, Cloudy 8-72%, Rainy 28-100% — wide overlap in middle band
    if condition == 'Sunny':
        precip = np.random.uniform(0, 42)
    elif condition == 'Cloudy':
        precip = np.random.uniform(8, 72)
    else:  # Rainy
        precip = np.random.uniform(28, 100)
    precip = float(np.clip(precip, 0, 100))

    # ── Atmospheric Pressure ─────────────────────────────────────────────────
    # Wider overlapping ranges → moderate importance (~13-15%):
    if condition == 'Sunny':
        pressure = np.random.uniform(1001, 1030)
    elif condition == 'Cloudy':
        pressure = np.random.uniform(995,  1023)
    else:  # Rainy
        pressure = np.random.uniform(973,  1013)
    pressure = float(np.clip(pressure, 950, 1050))

    return temp, humidity, precip, uv, pressure


def sample_target(condition, month):
    """2-hour-ahead forecast: 62% persistence, 38% realistic transition."""
    if np.random.random() < 0.62:
        return condition
    transitions = {
        'Sunny':  ['Cloudy', 'Rainy'],
        'Cloudy': ['Sunny',  'Rainy'],
        'Rainy':  ['Cloudy', 'Sunny'],
    }
    if month in (6, 7, 8):
        wts = {'Sunny': 0.55, 'Cloudy': 0.28, 'Rainy': 0.17}
    elif month in (12, 1, 2):
        wts = {'Sunny': 0.20, 'Cloudy': 0.35, 'Rainy': 0.45}
    else:
        wts = {'Sunny': 0.35, 'Cloudy': 0.35, 'Rainy': 0.30}
    candidates = transitions[condition]
    total = sum(wts[c] for c in candidates)
    p = [wts[c] / total for c in candidates]
    return np.random.choice(candidates, p=p)


rows = []
for condition in CLASSES:
    n_day   = int(N_PER_CLASS * DAYTIME_FRAC)
    n_night = N_PER_CLASS - n_day
    hours   = [_daytime_hour() for _ in range(n_day)] + \
              [_nighttime_hour() for _ in range(n_night)]
    np.random.shuffle(hours)
    months = np.random.randint(1, 13, N_PER_CLASS)
    dows   = np.random.randint(0, 7,  N_PER_CLASS)

    for i in range(N_PER_CLASS):
        mo, hr, dow = int(months[i]), hours[i], int(dows[i])
        t, h, p, uv, pres = sample_sensors(condition, hr, mo)
        target = sample_target(condition, mo)
        rows.append({
            'Temperature':       round(t,    2),
            'Humidity':          round(h,    2),
            'Precipitation (%)': round(p,    2),
            'UV Index':          round(uv,   2),
            'Pressure':          round(pres, 2),
            'hour_of_day':       hr,
            'day_of_week':       dow,
            'month':             mo,
            'Condition':         condition,
            'Target_Condition':  target,
        })

df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)

out_dir  = os.path.join(os.path.dirname(__file__), 'data', 'datasets')
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'forecast_dataset.csv')
df.to_csv(out_path, index=False)

print(f"Dataset generated: {len(df)} rows  ({N_PER_CLASS}/class) → {out_path}")
print(f"Condition distribution:\n{df['Condition'].value_counts()}")
print(f"\nDaytime (UV>0): {(df['UV Index']>0).mean()*100:.1f}%")
print(f"\nFeature ranges by class:")
for cls in CLASSES:
    sub = df[df['Condition'] == cls]
    print(f"\n  [{cls}]")
    for col in ['Temperature','Humidity','Precipitation (%)','UV Index','Pressure']:
        print(f"    {col:22s}: {sub[col].min():.1f}–{sub[col].max():.1f}  "
              f"(μ={sub[col].mean():.1f} σ={sub[col].std():.1f})")
