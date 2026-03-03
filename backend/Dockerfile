FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip bcrypt passlib[bcrypt] && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "\
alembic revision --autogenerate -m 'auto' || true && \
alembic upgrade head && \
alembic -c alembic_logs.ini revision --autogenerate -m 'auto_logs' || true && \
alembic -c alembic_logs.ini upgrade head && \
python -m app.db.seed_superuser && \
python -m app.db.seed_roles && \
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 \
"]