import EventsSection from '@Components/Pages/EventsPage/EventsSection.tsx'
import type { ObjectInstance } from '@Schemas'

interface Props {
    instance: ObjectInstance
}

function InstanceEventsTab({ instance }: Props) {
    return (
        <EventsSection
            instanceId={instance.id}
            pageSize={5}
            showToolbar={false}
        />
    )
}

export default InstanceEventsTab
