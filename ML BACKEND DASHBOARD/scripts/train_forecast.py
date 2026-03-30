import subprocess
import sys

# Wrapper to keep scripts/ folder while reusing root trainer
subprocess.run([sys.executable, "..\train_forecast.py"], check=False, cwd=".")
