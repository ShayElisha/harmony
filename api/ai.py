"""Vercel Python entry — exposes the FastAPI app from ai-service."""
import os
import sys

_svc = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai-service', 'app'))
if _svc not in sys.path:
    sys.path.insert(0, _svc)

from main import app  # noqa: E402 — Vercel expects `app`
