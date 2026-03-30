import subprocess
import sys

# Wrapper to keep scripts/ folder while reusing root trainer
subprocess.run([sys.executable, "..\train_model.py"], check=False, cwd=".")
