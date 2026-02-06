import {type ReactNode} from "react";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// import type {ObjectInstance} from "../../../schemas/ObjectInstance.ts";
// import {useServicesStore} from "../../../stores/Zustand.ts";
import DefaultList from "../../Common/DefaultList.tsx";
import {useNavigate} from "react-router-dom";
import LoadEffect from "../../Common/LoadEffect.tsx";

// interface Props {
//     instance: ObjectInstance;
// }

interface EventDummy {
    id: number
    type: string
    date: Date
}

function InstanceEventsTab(/*{instance}: Props*/): ReactNode {
    const navigate = useNavigate();

    // const services = useServicesStore((state) => state.services);

    const events: EventDummy[] = [
        {
            id: 1,
            type: "Замена",
            date: new Date(),
        },
        {
            id: 2,
            type: "Восставновление",
            date: new Date(),
        },
    ];

    function renderEvent(event: EventDummy): ReactNode {
        return (
            <Row className="w-100">
                <Col>{event.id}</Col>
                <Col>{event.type}</Col>
                <Col>{event.date.toLocaleDateString()}</Col>
            </Row>
        );
    }

    function navigateToEventPage(event: EventDummy): void {
        navigate(`/events/${event.id}`);
    }

    return (
        <>
            <LoadEffect data={events} contentSize={{height: "20px", width: "100%"}}>
                <DefaultList data={events}
                             onClick={navigateToEventPage}
                             renderItem={renderEvent}
                />
            </LoadEffect>
        </>
    );
}

export default InstanceEventsTab;