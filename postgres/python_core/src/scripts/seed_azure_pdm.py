import asyncio
import csv
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    EventTypes,
    EventTypesTypes,
    Events,
    Instances,
    Objects,
    Properties,
    PropertyTypes,
    Replacements,
    Types,
)
from scripts.db import get_session_factory

DATASETS_ROOT = Path(__file__).resolve().parents[3] / "datasets"
DATASET_DIR = Path(os.getenv("PD_DATASET_PATH", str(DATASETS_ROOT / "microsoft_azure_predictive_maintenance")))

COMP_NAMES = ["comp1", "comp2", "comp3", "comp4"]
ERROR_IDS = ["error1", "error2", "error3", "error4", "error5"]

OBJECT_TYPE_SEED_MARKER = "Тип из Azure PdM"  # used for idempotency check


class Internal:
    @staticmethod
    def parse_dt(s: str) -> datetime:
        return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)


@dataclass
class SeedObjectTypesResult:
    root: Types
    list: dict[str, Types]


@dataclass
class SeedEventTypesResult:
    failure: EventTypes
    maintance: EventTypes
    error: dict[str, EventTypes]


@dataclass
class SeedPropertyTypesResult:
    model: PropertyTypes
    age: PropertyTypes


@dataclass
class CsvParseResult:
    objects: dict[int, dict]
    replacement_events: list[tuple[datetime, int, str, str]]
    error_events: list[tuple[datetime, int, str]]


async def seed_object_types(session: AsyncSession) -> SeedObjectTypesResult:
    root_object_type = Types(name=OBJECT_TYPE_SEED_MARKER, parent_id=None, root_id=None)
    session.add(root_object_type)
    await session.flush()
    root_object_type.root_id = root_object_type.id

    object_types: dict[str, Types] = {}
    for comp in COMP_NAMES:
        ct = Types(name=comp, parent_id=root_object_type.id, root_id=root_object_type.id)
        session.add(ct)
        object_types[comp] = ct
    await session.flush()

    return SeedObjectTypesResult(root=root_object_type, list=object_types)


async def seed_event_types(session: AsyncSession) -> SeedEventTypesResult:
    failure = EventTypes(name="Общая замена по ошибке (Azure PdM)")
    maintenance = EventTypes(name="Запланированная замена для профилактики (Azure PdM)")
    session.add_all([failure, maintenance])

    error: dict[str, EventTypes] = {}
    for eid in ERROR_IDS:
        et = EventTypes(name=f"Ошибка в работе {eid[-1]} (Azure PdM)")
        session.add(et)
        error[eid] = et
    await session.flush()

    return SeedEventTypesResult(
        failure=failure,
        maintance=maintenance,
        error=error,
    )


async def seed_object_types_to_event_types(
    session: AsyncSession,
    event_types: SeedEventTypesResult,
    object_types: SeedObjectTypesResult,
) -> None:
    for comp in COMP_NAMES:
        session.add(EventTypesTypes(event_type_id=event_types.failure.id, type_id=object_types.list[comp].id))
        session.add(EventTypesTypes(event_type_id=event_types.maintance.id, type_id=object_types.list[comp].id))
    for eid in ERROR_IDS:
        session.add(EventTypesTypes(event_type_id=event_types.error[eid].id, type_id=object_types.root.id))
    await session.flush()


async def seed_property_types(session: AsyncSession, root_object_type: Types) -> SeedPropertyTypesResult:
    pt_model = PropertyTypes(type_id=root_object_type.id, name="model", is_static=True)
    pt_age = PropertyTypes(type_id=root_object_type.id, name="age_years", is_static=True)
    session.add_all([pt_model, pt_age])
    await session.flush()

    return SeedPropertyTypesResult(model=pt_model, age=pt_age)


def load_data(dataset_directory: Path) -> CsvParseResult:
    objects: dict[int, dict] = {}
    with open(dataset_directory / "PdM_machines.csv") as f:
        for row in csv.DictReader(f):
            mid = int(row["machineID"])
            objects[mid] = {"model": row["model"], "age": row["age"]}

    # (dt, machine_id, comp, kind) kind: "failure" | "maintenance"
    replacement_events: list[tuple[datetime, int, str, str]] = []
    with open(dataset_directory / "PdM_failures.csv") as f:
        for row in csv.DictReader(f):
            replacement_events.append((Internal.parse_dt(row["datetime"]), int(row["machineID"]), row["failure"], "failure"))
    with open(dataset_directory / "PdM_maint.csv") as f:
        for row in csv.DictReader(f):
            replacement_events.append((Internal.parse_dt(row["datetime"]), int(row["machineID"]), row["comp"], "maintenance"))

    # failures before maintenance on same timestamp
    replacement_events.sort(key=lambda x: (x[0], x[1], x[2], 0 if x[3] == "failure" else 1))

    error_events: list[tuple[datetime, int, str]] = []
    with open(dataset_directory / "PdM_errors.csv") as f:
        for row in csv.DictReader(f):
            error_events.append((Internal.parse_dt(row["datetime"]), int(row["machineID"]), row["errorID"]))

    return CsvParseResult(
        objects=objects,
        replacement_events=replacement_events,
        error_events=error_events,
    )


async def seed_azure_pdm() -> None:
    session_factory = get_session_factory()

    async with session_factory() as session:
        # Защита от повторного запуска
        if await session.scalar(select(Types).where(Types.name == OBJECT_TYPE_SEED_MARKER)):
            print("PdM dataset already seeded, skipping.")
            return

        object_types: SeedObjectTypesResult = await seed_object_types(session=session)
        event_types: SeedEventTypesResult = await seed_event_types(session=session)
        await seed_object_types_to_event_types(session=session, event_types=event_types, object_types=object_types)
        property_types: SeedPropertyTypesResult = await seed_property_types(session=session, root_object_type=object_types.root)

        csv_data: CsvParseResult = load_data(DATASET_DIR)

        # Заполнение Objects по csv
        machine_objects: dict[int, Objects] = {}
        comp_objects: dict[int, dict[str, Objects]] = {}

        for object_csv_id in sorted(csv_data.objects):
            new_object = Objects(name=f"Machine {object_csv_id}", type_id=object_types.root.id, parent_id=None, root_id=None)
            session.add(new_object)
            machine_objects[object_csv_id] = new_object
            comp_objects[object_csv_id] = {}
            for comp in COMP_NAMES:
                cobj = Objects(
                    name=f"Machine {object_csv_id} / {comp}",
                    type_id=object_types.list[comp].id,
                    parent_id=None,
                    root_id=None,
                )
                session.add(cobj)
                comp_objects[object_csv_id][comp] = cobj
        await session.flush()

        for object_csv_id in sorted(csv_data.objects):
            new_object = machine_objects[object_csv_id]
            new_object.root_id = new_object.id
            for comp in COMP_NAMES:
                cobj = comp_objects[object_csv_id][comp]
                cobj.parent_id = new_object.id
                cobj.root_id = new_object.id

        # Object-level properties (model, age)
        for object_csv_id, mdata in csv_data.objects.items():
            oid = machine_objects[object_csv_id].id
            session.add(Properties(property_id=property_types.model.id, value=mdata["model"], object_id=oid))
            session.add(Properties(property_id=property_types.age.id, value=mdata["age"], object_id=oid))
        await session.flush()

        # Initial Instances
        machine_instances: dict[int, Instances] = {}
        for object_csv_id in sorted(csv_data.objects):
            minst = Instances(object_id=machine_objects[object_csv_id].id, parent_id=None, root_id=None, is_active=True)
            session.add(minst)
            machine_instances[object_csv_id] = minst
        await session.flush()

        for object_csv_id in sorted(csv_data.objects):
            minst = machine_instances[object_csv_id]
            minst.root_id = minst.id
        await session.flush()

        # One initial component instance per (machine, comp)
        current_comp_instances: dict[tuple[int, str], Instances] = {}
        for object_csv_id in sorted(csv_data.objects):
            minst = machine_instances[object_csv_id]
            for comp in COMP_NAMES:
                cinst = Instances(
                    object_id=comp_objects[object_csv_id][comp].id,
                    parent_id=minst.id,
                    root_id=minst.id,
                    is_active=True,
                )
                session.add(cinst)
                current_comp_instances[(object_csv_id, comp)] = cinst
        await session.flush()

        # Replacement events (failures + maintenance)
        print(f"Processing {len(csv_data.replacement_events)} replacement events...")
        for i, (dt, object_csv_id, comp, kind) in enumerate(csv_data.replacement_events, 1):
            key = (object_csv_id, comp)
            old_inst = current_comp_instances[key]
            old_inst.is_active = False

            new_inst = Instances(
                object_id=comp_objects[object_csv_id][comp].id,
                parent_id=machine_instances[object_csv_id].id,
                root_id=machine_instances[object_csv_id].id,
                is_active=True,
            )
            session.add(new_inst)
            await session.flush()

            event = Events(
                event_type_id=event_types.failure.id if kind == "failure" else event_types.maintance.id,
                instance_id=old_inst.id,
                timestamp=dt,
                info={"kind": kind, "machineID": object_csv_id, "comp": comp},
            )
            session.add(event)
            await session.flush()

            session.add(Replacements(event_id=event.id, replaced_id=old_inst.id, replacement_id=new_inst.id))
            current_comp_instances[key] = new_inst

            if i % 500 == 0:
                print(f"  {i}/{len(csv_data.replacement_events)} replacement events processed")

        # Error events on machine instances
        print(f"Processing {len(csv_data.error_events)} error events...")
        for dt, object_csv_id, error_id in sorted(csv_data.error_events, key=lambda x: (x[0], x[1])):
            session.add(Events(
                event_type_id=event_types.error[error_id].id,
                instance_id=machine_instances[object_csv_id].id,
                timestamp=dt,
                info={"errorID": error_id, "machineID": object_csv_id},
            ))

        await session.commit()
        print(
            f"PdM dataset seeded successfully: "
            f"{len(csv_data.objects)} machines, "
            f"{sum(1 for e in csv_data.replacement_events if e[3] == 'failure')} failures, "
            f"{sum(1 for e in csv_data.replacement_events if e[3] == 'maintenance')} maintenance events, "
            f"{len(csv_data.error_events)} errors."
        )


if __name__ == "__main__":
    asyncio.run(seed_azure_pdm())
