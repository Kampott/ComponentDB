# app/test_app.py - A stripped-down version of main.py for testing
# This app does not start background tasks (integrity check, log worker)
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers only (no background services)
from app.api.v1.test import router as test_router
from app.api.v1.db.core import objects, types, property_types, properties, instances, instanceproperties, data_manip, debug
from app.api.v1.auth import auth, permissions, roles, role_permissions, user_roles, users, user_instance_access, user_object_access, user_type_access
from app.api.v1.backup import backups
from app.api.v1.events import event_types, event_types_types, events, replacements
from app.api.v1.integrity import integrity

# middleware for logging
from app.logging.middleware import logging_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # No background tasks - just yield for testing
    yield


test_app = FastAPI(title="Test App", lifespan=lifespan)

origins = [
    "http://localhost:3000",
]

test_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register middleware
test_app.middleware("http")(logging_middleware)

# Include routers (same as main app)
test_app.include_router(debug.router)
test_app.include_router(test_router)
test_app.include_router(backups.router)
test_app.include_router(objects.router)
test_app.include_router(types.router)
test_app.include_router(property_types.router)
test_app.include_router(properties.router)
test_app.include_router(instances.router)
test_app.include_router(instanceproperties.router)
test_app.include_router(data_manip.router)

# auth / permissions routers
test_app.include_router(auth.router)
test_app.include_router(permissions.router)
test_app.include_router(roles.router)
test_app.include_router(user_roles.router)
test_app.include_router(role_permissions.router)
test_app.include_router(users.router)
test_app.include_router(user_instance_access.router)
test_app.include_router(user_object_access.router)
test_app.include_router(user_type_access.router)

# events routers
test_app.include_router(event_types.router)
test_app.include_router(event_types_types.router)
test_app.include_router(events.router)
test_app.include_router(replacements.router)

# integrity router
test_app.include_router(integrity.router)
