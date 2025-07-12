from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"message": "pong"}

@router.get("/health")
def health_check():
    return {"status": "ok"}