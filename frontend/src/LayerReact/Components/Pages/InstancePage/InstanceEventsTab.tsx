import { type ReactNode } from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { useNavigate } from 'react-router-dom'

interface EventDummy {
    id: number
    type: string
    date: Date
}

function InstanceEventsTab(): ReactNode {
    const navigate = useNavigate()

    const events: EventDummy[] = [
        {
            id: 1,
            type: 'Замена',
            date: new Date(),
        },
        {
            id: 2,
            type: 'Восставновление',
            date: new Date(),
        },
    ]

    function renderEvent(event: EventDummy): ReactNode {
        return (
            <Row className='w-100'>
                <Col>{event.id}</Col>
                <Col>{event.type}</Col>
                <Col>{event.date.toLocaleDateString()}</Col>
            </Row>
        )
    }

    function navigateToEventPage(event: EventDummy): void {
        navigate(`/events/${event.id}`)
    }

    return (
        <>
            <LoadEffect
                data={events}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DefaultList
                    data={events}
                    onClick={navigateToEventPage}
                    renderItem={renderEvent}
                />
            </LoadEffect>
        </>
    )
}

export default InstanceEventsTab
