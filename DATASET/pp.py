import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv("weather_classification_data.csv")

# Selected Important Features Only
features = [
    "Temperature",
    "Atmospheric Pressure",
    "Precipitation (%)",
    "Humidity",
    "UV Index"
]

# Correlation Matrix
corr = df[features].corr()

# Plot
plt.figure(figsize=(10,8))

sns.heatmap(
    corr,
    annot=True,
    cmap="coolwarm",
    fmt=".2f",
    linewidths=0.5,
    square=True
)

plt.title(
    "Correlation Matrix of Selected Weather Features",
    fontsize=14,
    fontweight="bold"
)

plt.xticks(rotation=45, ha="right")
plt.yticks(rotation=0)

plt.tight_layout()

# Save High Resolution Figure
plt.savefig(
    "Weather_Feature_Correlation.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()