# Backend (Django API)

The **frontend** (Vite on port 5173) proxies `/api/*` to **this Django server on port 8000**.

## Run the API server (required for login & plans)

From this folder (`backend`):

```bash
# Optional: use a virtual environment and install deps
# python -m venv venv
# venv\Scripts\activate   (Windows)
# pip install -r requirements.txt

python manage.py runserver 127.0.0.1:8000
```

Leave this running. Then start the frontend (`npm run dev` in `frontend`). Login and plans will work when both are running.

**Note:** Do **not** run the FastAPI app (`uvicorn backend.main:app`) on port 8000 when using the React frontend—the frontend expects Django’s `/api/login/` and `/api/plans/` routes.
