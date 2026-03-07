#pragma once

namespace reliability_calculator::fake_generators {
class IdAllocator {
public:
    void reset() {
        m_nextTypeId = 1;
        m_nextObjectId = 1;
        m_nextInstanceId = 1;
        m_nextEventTypeId = 1;
        m_nextEventId = 1;
        m_nextReplacementEventId = 1;
    }

    int nextTypeId() { return m_nextTypeId++; }
    int nextObjectId() { return m_nextObjectId++; }
    int nextInstanceId() { return m_nextInstanceId++; }
    int nextEventTypeId() { return m_nextEventTypeId++; }
    int nextEventId() { return m_nextEventId++; }
    int nextReplacementEventId() { return m_nextReplacementEventId++; }

private:
    int m_nextTypeId = 1;
    int m_nextObjectId = 1;
    int m_nextInstanceId = 1;
    int m_nextEventTypeId = 1;
    int m_nextEventId = 1;
    int m_nextReplacementEventId = 1;
};
}  // namespace reliability_calculator::fake_generators
