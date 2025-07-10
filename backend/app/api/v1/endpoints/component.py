@router.get("/components", response_model=list[ComponentRead])
async def read_components(session: AsyncSession = Depends(get_session)):
    return await crud_component.get_components(session)

@router.post("/components", response_model=ComponentRead)
async def create_component(component: ComponentCreate, session: AsyncSession = Depends(get_session)):
    return await crud_component.create_component(
        session,
        name=component.name,
        manufacturer=component.manufacturer,
        quantity=component.quantity,
    )