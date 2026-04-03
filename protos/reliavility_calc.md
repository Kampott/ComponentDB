# Reliability Calculation API

## Мгновенный расчет надежности

``` mermaid
sequenceDiagram
    title Мгновенный расчет надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP POST /reliability/calculate/instant { type_id }
    API->>Reliability: gRPC CalculateReliabilityInstant(CalculateReliabilityInstantRequest{ type_id })
    Reliability-->>API: CalculateReliabilityInstantResponse
    API-->>Client: HTTP 200 OK + результат расчета
```

------------------------------------------------------------------------

## Планирование расчета надежности

``` mermaid
sequenceDiagram
    title Планирование расчета надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP POST /reliability/calculate/scheduled { type_id, start_time }
    API->>Reliability: gRPC ScheduleReliabilityCalculation(ScheduleReliabilityCalculationRequest{ type_id, start_time })
    Reliability-->>API: ScheduleReliabilityCalculationResponse
    API-->>Client: HTTP 200 OK / 202 Accepted + подтверждение планирования
```

------------------------------------------------------------------------

## Периодический расчет надежности

``` mermaid
sequenceDiagram
    title Периодический расчет надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP POST /reliability/calculate/periodic { type_id, start_time, period }
    API->>Reliability: gRPC SchedulePeriodicReliabilityCalculation(SchedulePeriodicReliabilityCalculationRequest{ type_id, start_time, period })
    Reliability-->>API: SchedulePeriodicReliabilityCalculationResponse
    API-->>Client: HTTP 200 OK / 202 Accepted + подтверждение планирования
```

------------------------------------------------------------------------

## Получение активных расчетов надежности

``` mermaid
sequenceDiagram
    title Получение активных расчетов надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP GET /reliability/calculations/active
    API->>Reliability: gRPC GetActiveReliabilityCalculations(GetActiveReliabilityCalculationsRequest)
    Reliability-->>API: GetActiveReliabilityCalculationsResponse
    API-->>Client: HTTP 200 OK + список активных расчетов
```

------------------------------------------------------------------------

## Остановка активного расчета надежности

``` mermaid
sequenceDiagram
    title Остановка активного расчета надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP POST /reliability/calculations/stop { calculation_id? }
    API->>Reliability: gRPC StopReliabilityCalculation(StopReliabilityCalculationRequest{ calculation_id? })

    alt calculation_id указан
        Reliability-->>API: StopReliabilityCalculationResponse (остановлен один расчет)
    else calculation_id не указан
        Reliability-->>API: StopReliabilityCalculationResponse (остановлены все расчеты)
    end

    API-->>Client: HTTP 200 OK + результат остановки
```

------------------------------------------------------------------------

## Получение всех запланированных расчетов надежности

``` mermaid
sequenceDiagram
    title Получение всех запланированных расчетов надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP GET /reliability/calculations/scheduled
    API->>Reliability: gRPC GetScheduledReliabilityCalculations(GetScheduledReliabilityCalculationsRequest)
    Reliability-->>API: GetScheduledReliabilityCalculationsResponse
    API-->>Client: HTTP 200 OK + список запланированных расчетов
```

------------------------------------------------------------------------

## Удаление запланированного расчета надежности

``` mermaid
sequenceDiagram
    title Удаление запланированного расчета надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP DELETE /reliability/calculations/scheduled/{calculation_id}
    API->>Reliability: gRPC DeleteScheduledReliabilityCalculation(DeleteScheduledReliabilityCalculationRequest{ calculation_id })
    Reliability-->>API: DeleteScheduledReliabilityCalculationResponse
    API-->>Client: HTTP 200 OK + результат удаления
```

## Получение последних результатов расчета надежности

```mermaid
sequenceDiagram
    title Получение последних результатов расчета надежности

    actor Client as Клиент
    participant API as FastAPI сервер
    participant Reliability as Сервис расчета надежности

    Client->>API: HTTP GET /reliability/results/latest?type_id=...
    API->>Reliability: gRPC GetLatestReliabilityResult(GetLatestReliabilityResultRequest{ type_id })
    Reliability-->>API: GetLatestReliabilityResultResponse { reliability, calculated_at }
    API-->>Client: HTTP 200 OK + результат последнего расчета
```
