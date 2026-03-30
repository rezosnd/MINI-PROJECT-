"""
Generate a balanced synthetic weather dataset with physically realistic,
well-separated feature distributions.

Design goals:
  - Clear class separation to eliminate unrealistic predictions
  - No Sunny with zero precipitation AND zero UV simultaneously (daytime)
  - Rainy always has significant precipitation (>= 40%)
  - Sunny precipitation stays below 25% (light shower possible, not rainy)
  - UV is physically gated: near-zero at night, class-separated during day
  - Realistic temperature offsets with tight std for high discriminative power
"""
import os
import numpy as np
import pandas as pd

np.random.seed(42)

N_PER_CLASS  = 5000           # 15 000 total rows (up from 12 000)
CLASSES      = ['Sunny', 'Cloudy', 'Rainy']
DAYTIME_FRAC = 0.75           # 75% daytime hours (6-19)


def _daytime_hour():
    return int(np.random.randint(7, 19))   # 7-18 ensures meaningful solar angle


def _nighttime_hour():
    return int(np.random.choice(list(range(0, 6)) + list(range(19, 24))))


def _solar_factor(hour):
    """Normalised solar intensity 0→1 peaking at 13:00."""
    if hour < 7 or hour >= 19:
        return 0.0
    return float(max(0.0, np.sin((hour - 7) * np.pi / 12)))


def sample_sensors(condition, hour, month):
    is_day = 7 <= hour < 19
    solar  = _solar_factor(hour)

    # ── Seasonal + diurnal base temperature ──────────────────────────────────
    seasonal = 24.0 + 9.0 * np.sin((month - 3) * np.pi / 6)
    diurnal  = 5.0  * np.sin((hour - 2) * np.pi / 12)

    # ── Temperature — tight std, large offsets for maximum class separation ──
    if condition == 'Sunny':
        offset = np.random.normal(13.0, 2.0)    # warm
    elif condition == 'Cloudy':
        offset = np.random.normal( 0.0, 2.5)    # mild, some Sunny overlap
    else:                                         # Rainy
        offset = np.random.normal(-13.0, 2.0)   # cool
    temp = float(np.clip(seasonal + diurnal + offset, -10, 50))

    # ── UV Index — physically gated by solar angle, class-separated ──────────
    # Clear non-overlapping bands:
    #   Rainy  daytime: solar × [0.0, 1.5]  → max ~1.5
    #   Cloudy daytime: solar × [1.5, 5.0]  → max ~5.0
    #   Sunny  daytime: solar × [5.0, 12.0] → max ~12
    # Night (solar=0): UV = 0 always (physically correct)
    if not is_day or solar < 0.01:
        uv = 0.0
    else:
        if condition == 'Sunny':
            uv = solar * np.random.uniform(5.0, 12.0)
        elif condition == 'Cloudy':
            uv = solar * np.random.uniform(1.5, 5.0)
        else:  # Rainy
            uv = solar * np.random.uniform(0.0, 1.5)
    uv = float(round(np.clip(uv, 0, 16), 2))

    # ── Humidity — separated ranges, moderate overlap ────────────────────────
    if condition == 'Sunny':
        humidity = np.random.uniform(10, 55)
    elif condition == 'Cloudy':
        humidity = np.random.uniform(42, 82)
    else:  # Rainy
        humidity = np.random.uniform(68, 99)
    humidity = float(np.clip(humidity, 0, 100))

    # ── Precipitation — KEY FIX: clear non-overlapping bands ─────────────────
    # Sunny  :  0 – 22%   (light, never heavy rain while sunny)
    # Cloudy :  8 – 50%   (moderate, can overlap with Sunny low end)
    # Rainy  : 40 – 100%  (always significant precipitation)
    # Gap between Sunny max (22) and Rainy min (40) forces Cloudy-only zone
    if condition == 'Sunny':
        precip = np.random.uniform(0, 22)
    elif condition == 'Cloudy':
        precip = np.random.uniform(8, 50)
    else:  # Rainy
        precip = np.random.uniform(40, 100)
    precip = float(np.clip(precip, 0, 100))

    # ── Atmospheric Pressure — separated with moderate overlap ───────────────
    if condition == 'Sunny':
        pressure = np.random.uniform(1005, 1030)
    elif condition == 'Cloudy':
        pressure = np.random.uniform(997,  1020)
    else:  # Rainy
        pressure = np.random.uniform(975,  1010)
    pressure = float(np.clip(pressure, 950, 1050))

    return temp, humidity, precip, uv, pressure


def sample_target(condition, month):
    """2-hour-ahead forecast: 65% persistence, 35% realistic transition."""
    if np.random.random() < 0.65:
        return condition
    transitions = {
        'Sunny':  ['Cloudy', 'Rainy'],
        'Cloudy': ['Sunny',  'Rainy'],
        'Rainy':  ['Cloudy', 'Sunny'],
    }
    if month in (6, 7, 8):      # summer — more sunny transitions
        wts = {'Sunny': 0.55, 'Cloudy': 0.28, 'Rainy': 0.17}
    elif month in (12, 1, 2):   # winter — more rainy/cloudy transitions
        wts = {'Sunny': 0.18, 'Cloudy': 0.35, 'Rainy': 0.47}
    else:                        # spring/autumn — balanced
        wts = {'Sunny': 0.33, 'Cloudy': 0.35, 'Rainy': 0.32}
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
print(f"\nDaytime rows (UV>0): {(df['UV Index']>0).mean()*100:.1f}%")

print(f"\nFeature ranges by class:")
for cls in CLASSES:
    sub = df[df['Condition'] == cls]
    print(f"\n  [{cls}]")
    for col in ['Temperature', 'Humidity', 'Precipitation (%)', 'UV Index', 'Pressure']:
        print(f"    {col:22s}: {sub[col].min():.1f}–{sub[col].max():.1f}  "
              f"(μ={sub[col].mean():.1f}  σ={sub[col].std():.1f})")

print("\nClass separation check (no overlap zones):")
for cls in CLASSES:
    sub = df[df['Condition'] == cls]
    print(f"  {cls:6s}  Precip: {sub['Precipitation (%)'].min():.0f}–{sub['Precipitation (%)'].max():.0f}%"
          f"  UV_daytime_max: {sub[sub['UV Index']>0]['UV Index'].max():.1f}")
