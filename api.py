"""
Root entrypoint for Vercel deployment.

Vercel expects a top-level Python entrypoint named `app` (app.py, api.py, etc.).
This file re-exports the FastAPI `app` defined in `backend/api.py` so the platform can detect it.
"""
from backend.api import app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)
