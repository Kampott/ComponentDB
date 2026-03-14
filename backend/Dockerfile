FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip bcrypt passlib[bcrypt] && \
    pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY postgres /app/postgres

RUN pip install --no-cache-dir -e /app/postgres/python_core

WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
