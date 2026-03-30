import subprocess
import sys

# Wrapper to keep scripts/ folder while reusing root builder
subprocess.run([sys.executable, "..\build_forecast_dataset.py"], check=False, cwd=".")
