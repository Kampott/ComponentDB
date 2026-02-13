# app/main.py
import asyncio
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# роутеры — регистрируем на уровне модуля (не в startup)
from app.api.v1.test import router as test_router
from app.api.v1.db.core import objects, types, property_types, properties, instances, instanceproperties, data_manip
from app.api.v1.auth import auth, permissions, roles, role_permissions, user_roles, users, user_instance_access, user_object_access, user_type_access

# рабочий логер (функция/корутина)
from app.logging.logger import worker as log_worker_func
# ассинхронная фабрика сессий (sessionmaker)
from app.db.database import async_session, async_log_session, engine

# middleware для сбора логов: должен быть функция (request, call_next)
from app.logging.middleware import logging_middleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.log_queue = asyncio.Queue(maxsize=10000)
        app.state.log_stop_event = asyncio.Event()  # Optional, but can use for additional signaling if needed

        # Launch worker task
        app.state.log_worker_task = asyncio.create_task(
            log_worker_func(app.state.log_queue,  async_log_session, app.state.log_stop_event)
        )
        # Add done callback to log if task fails
        def worker_done(fut):
            exc = fut.exception()
            if exc:
                print("[lifespan] Worker task failed with exception:", traceback.format_exc())
            else:
                print("[lifespan] Worker task completed normally")
        app.state.log_worker_task.add_done_callback(worker_done)

        # Temporary heartbeat task for debug: prints queue size every 5s if >0
        async def heartbeat():
            while not app.state.log_stop_event.is_set():
                if hasattr(app.state, "log_queue") and app.state.log_queue.qsize() > 0:
                    print(f"[heartbeat] Queue size: {app.state.log_queue.qsize()} (worker alive check)")
                await asyncio.sleep(5)
        app.state.heartbeat_task = asyncio.create_task(heartbeat())

        # Yield briefly to ensure tasks start
        await asyncio.sleep(0)
        print("log queue and worker started")
    except Exception:
        print("Failed to start log worker:", traceback.format_exc())
        raise  # Raise to prevent app start if critical

    try:
        yield  # App runs here
    finally:
        # Shutdown: signal and wait for worker
        print("Initiating shutdown")
        app.state.log_stop_event.set()  # Signal heartbeat to stop
        if hasattr(app.state, "log_queue"):
            try:
                app.state.log_queue.put_nowait(None)  # Sentinel to break worker loop
            except Exception:
                pass

        if hasattr(app.state, "log_worker_task"):
            task = app.state.log_worker_task
            try:
                await asyncio.wait_for(task, timeout=5.0)
            except asyncio.TimeoutError:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    print("Worker task cancelled due to timeout")
            except Exception:
                print("Error while stopping log worker:", traceback.format_exc())

        # Stop heartbeat
        if hasattr(app.state, "heartbeat_task"):
            app.state.heartbeat_task.cancel()
            try:
                await app.state.heartbeat_task
            except asyncio.CancelledError:
                pass

        # Cleanup state
        for attr in ("log_worker_task", "log_queue", "log_stop_event", "heartbeat_task"):
            if hasattr(app.state, attr):
                try:
                    delattr(app.state, attr)
                except Exception:
                    pass
        print("Shutdown complete")

app = FastAPI(title="My App", lifespan=lifespan)

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

# Регистрируем middleware
app.middleware("http")(logging_middleware)

# include routers
app.include_router(test_router)
app.include_router(objects.router)
app.include_router(types.router)
app.include_router(property_types.router)
app.include_router(properties.router)
app.include_router(instances.router)
app.include_router(instanceproperties.router)
app.include_router(data_manip.router)

# auth / permissions routers
app.include_router(auth.router)
app.include_router(permissions.router)
app.include_router(roles.router)
app.include_router(user_roles.router)
app.include_router(role_permissions.router)
app.include_router(users.router)
app.include_router(user_instance_access.router)
app.include_router(user_object_access.router)
app.include_router(user_type_access.router)
