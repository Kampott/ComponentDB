import { Tabs, TabsContent, TabsList, TabsTrigger } from '@Components/ui/tabs'
import EventTypesSection from './EventTypesSection.tsx'
import EventsSection from './EventsSection.tsx'

function EventsPage() {
    return (
        <div className='mx-auto mt-4 w-full max-w-[92rem] px-4'>
            <h1 className='mb-6 text-center text-3xl font-semibold'>События</h1>
            <Tabs defaultValue='events' className='mb-4'>
                <TabsList className='grid h-auto w-full grid-cols-2'>
                    <TabsTrigger value='events'>События</TabsTrigger>
                    <TabsTrigger value='event-types'>Типы событий</TabsTrigger>
                </TabsList>

                <TabsContent value='events'>
                    <EventsSection />
                </TabsContent>
                <TabsContent value='event-types'>
                    <EventTypesSection />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default EventsPage
