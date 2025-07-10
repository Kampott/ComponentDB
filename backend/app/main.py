from fastapi import FastAPI
from app.api.v1.endpoints import router as v1_router
from app.api.v1.test import router as test_router
from app.api.v1 import core
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")
app.include_router(test_router)
app.include_router(core.router)



