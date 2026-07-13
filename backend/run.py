#!/usr/bin/env python3
"""
Auto-kill existing port 2007 and start uvicorn.
Run: python run.py
"""
import os
import subprocess
import sys

PORT = 2007
HOST = "0.0.0.0"
APP = "main:app"

venv_python = "/www/wwwroot/iinm/.venv/bin/python"

def kill_port(port):
    """Kill any process listening on the given port."""
    try:
        # Try lsof first
        result = subprocess.run(
            ["lsof", "-t", f"-i:{port}"],
            capture_output=True, text=True, check=False
        )
        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().splitlines()
            for pid in pids:
                try:
                    os.kill(int(pid), 9)
                    print(f"Killed process {pid} on port {port}")
                except ProcessLookupError:
                    pass
            return True

        # Fallback to ss/netstat style parsing if available
        result = subprocess.run(
            ["ss", "-tlnp"],
            capture_output=True, text=True, check=False
        )
        if result.returncode != 0:
            result = subprocess.run(
                ["netstat", "-tlnp"],
                capture_output=True, text=True, check=False
            )
    except FileNotFoundError:
        pass
    return False

def main():
    print(f"Checking for existing processes on port {PORT}...")
    kill_port(PORT)

    cmd = [venv_python, "-m", "uvicorn", APP, "--reload", "--host", HOST, "--port", str(PORT)]
    print(f"Starting server: {' '.join(cmd)}\n")
    sys.stdout.flush()

    try:
        subprocess.run(cmd, cwd="/www/wwwroot/iinm/backend")
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    main()
