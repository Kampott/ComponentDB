from fastapi import FastAPI
from app.api.v1.endpoints import router as v1_router
from app.api.v1.test import router as test_router
from app.api.v1 import objects, types, property_types, properties, instances, instanceproperties
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
app.include_router(objects.router)
app.include_router(types.router)
app.include_router(property_types.router)
app.include_router(properties.router)
app.include_router(instances.router)
app.include_router(instanceproperties.router)