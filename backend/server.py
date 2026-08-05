import subprocess

subprocess.run(["service", "postgresql", "start"], check=False, capture_output=True)

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

from app.main import app  # noqa: E402,F401
