# Juice Robo Backend

FastAPI backend for the Juice Robo mobile-first website.

## 1. Create environment

Windows / VS Code PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Generate a strong JWT secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Put that value into `JWT_SECRET` in `.env`.

## 2. Run locally

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API:
`http://127.0.0.1:8000`

Swagger:
`http://127.0.0.1:8000/docs`

## 3. Production database

Use PostgreSQL and set:

```env
DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@HOST:5432/juice_robo
```

Do not commit `.env`.

## API endpoints

- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/profile`
- PUT `/api/profile`
- GET `/api/products`
- POST `/api/orders`
- GET `/api/orders`
- GET `/api/orders/{order_id}`
- POST `/api/orders/verify-code`
- GET `/api/health`

## Secrets / API keys

The backend currently requires:

- `JWT_SECRET`
- `DATABASE_URL`

No payment, WhatsApp, Google, or other third-party API key is hard-coded because those integrations have not yet been selected.

If payment is added later, keep the secret key in `.env` and expose only the public key where the provider explicitly requires it.
