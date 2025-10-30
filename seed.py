from app.db.database import get_async_session, async_session_maker
from app.crud.auth.users import create_user
from app.schemas.users import UserCreate



async def main():
    async with async_session_maker() as session:
        user_in = UserCreate(
            email="super@user",
            password="superuserpassword"
        )
        user = await create_user(session, user_in)
        print("Superuser seeded successfully", user.email)




if __name__ == "__main__":
    asyncio.run(main())