"""
Attendly Backend Supervisor
Keeps the Python ArcFace backend running continuously with auto-restart and Ctrl+C immunity.
"""
import os
import sys
import time
import subprocess

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BACKEND_DIR)

print(f"[Attendly Supervisor] Monitoring Python AI Backend in {BACKEND_DIR}")
sys.stdout.flush()

CREATE_NEW_PROCESS_GROUP = 0x00000200 if sys.platform == "win32" else 0

while True:
    try:
        print("[Attendly Supervisor] Launching Uvicorn on 127.0.0.1:8000...")
        sys.stdout.flush()
        
        proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=BACKEND_DIR,
            creationflags=CREATE_NEW_PROCESS_GROUP
        )
        
        # Wait for the process to terminate (if it ever does)
        ret = proc.wait()
        print(f"[Attendly Supervisor] Uvicorn exited with code {ret}. Auto-restarting in 1s...")
        sys.stdout.flush()
        time.sleep(1)
    except Exception as exc:
        print(f"[Attendly Supervisor] Unexpected error: {exc}. Retrying in 2s...")
        sys.stdout.flush()
        time.sleep(2)
