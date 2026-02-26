import { type ReactNode } from 'react'

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
            <div className='grid w-full grid-cols-3 gap-2 text-sm'>
                <span>{event.id}</span>
                <span>{event.type}</span>
                <span>{event.date.toLocaleDateString()}</span>
            </div>
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
