# Отчет по реализации MVP расчета надежности

## 1. Что реализовано

### 1.1 In-memory генерация тестовых данных

Реализован отдельный модуль `fake_generators`, который создает данные в оперативной памяти без записи в БД.

Состав генерации:

- обязательные типы событий (`failure_replacement`, `preventive_replacement`, `inspection`, `maintenance`) и привязка ко всем типам объектов
- дерево типов объектов по гиперпараметрам
- дерево объектов на основе дерева типов
- деревья экземпляров объектов
- события для экземпляров в заданном временном окне

Ключевые файлы:

- `source/fake_generators/FakeDataTypes.hpp`
- `source/fake_generators/FakeDatasetBuilder.hpp`
- `source/fake_generators/FakeDatasetBuilder.cpp`
- `source/fake_generators/EventTypeGenerator.cpp`
- `source/fake_generators/ObjectTypeGenerator.cpp`
- `source/fake_generators/ObjectGenerator.cpp`
- `source/fake_generators/InstanceGenerator.cpp`
- `source/fake_generators/EventGenerator.cpp`

### 1.2 Логика replacement и активности экземпляров

Реализовано правило:

- все экземпляры создаются активными
- `isActive = false` выставляется только при replacement-событии
- replacement создает новый экземпляр `B`, а замененный экземпляр `A` деактивируется
- `ReplacementEvent.newInstanceId` указывает на новый экземпляр
- активные дети замененного экземпляра перепривязываются к новому экземпляру, чтобы дерево оставалось связным

Проверка согласованности в тестовом запуске:

- `ReplacementEvent count = 798`
- `Inactive instance count = 798`

### 1.3 MVP расчет надежности

Добавлен модуль расчета надежности по корневому объекту:

- `source/main/reliability/ReliabilityCalculator.hpp`
- `source/main/reliability/ReliabilityCalculator.cpp`

Для каждого объекта дерева рассчитываются:

- число отказов `N`
- наработка `T` (в днях)
- интенсивность отказов `lambda = N / T` (1/день)
- среднее время до отказа `MTTF = 1 / lambda` (дни)

Для всего дерева (последовательная схема):

- `lambda_tree = sum(lambda_i)`
- `MTTF_tree = 1 / lambda_tree`

### 1.4 Вывод результатов

В `main` реализованы:

- выровненная таблица по компонентам в консоль
- сохранение отчета в `CSV`: `reliability_report.csv`

Ключевой файл:

- `source/main/main.cpp`

## 2. Гиперпараметры тестового запуска

Использованные значения:

- `seed = 123`
- `typeRootCount = 1`
- `typeTree.depth = 3`
- `typeTree.minChildrenPerType = 1`
- `typeTree.maxChildrenPerType = 2`
- `objectTree.minObjectsPerChildType = 1`
- `objectTree.maxObjectsPerChildType = 3`
- `instanceTree.treesPerObjectRoot = 3`
- `eventGeneration.window = 180 days`
- `eventGeneration.baseFailureRatePerDay = 0.03`
- `eventGeneration.depthFailureRateFactor = 1.15`
- `eventGeneration.preventiveRateFactor = 0.70`
- `eventGeneration.inspectionRatePerDay = 0.08`
- `eventGeneration.maintenanceRatePerDay = 0.03`

Подробнее по полям: `docs/HYPERPARAMS.md`

## 3. Результат тестового запуска

Сводные метрики генерации:

- `ObjectType count: 6`
- `Object count: 22`
- `Instance count: 864`
- `EventType count: 4`
- `EventType-ObjectType links: 24`
- `Event count: 2111`
- `ReplacementEvent count: 798`
- `Inactive instance count: 798`

Результат расчета надежности:

- `Root object id: 1`
- `Tree lambda (1/day): 0.875926`
- `Tree MTTF (days): 1.141649`

Отчет по компонентам сохранен в:

- `reliability_report.csv`

## 4. Обоснование корректности MVP

### 4.1 Соответствие принятым допущениям

Расчет соответствует исходным ограничениям:

- отказ любого узла означает отказ дерева, поэтому используется последовательная модель
- события считаются внезапными, поэтому применена экспоненциальная модель времени до отказа
- интенсивности по компонентам суммируются в интенсивность дерева

### 4.2 Корректность оценки `lambda`

Для каждого объекта:

- `N` берется только по replacement-событиям с `countsAsFailure = true`
- `T` считается как суммарная фактическая наработка экземпляров внутри окна анализа
- `lambda = N/T` является стандартной оценкой интенсивности для пуассоновского потока отказов

### 4.3 Почему числа выглядят ожидаемо

При окне `180` дней и `3` деревьях экземпляров базовая ожидаемая наработка на объект порядка `540` дней, что и наблюдается в отчете.

Отклонения `lambda` между объектами естественны из-за:

- пуассоновской случайности числа событий
- различий по глубине в дереве через множитель `depthFailureRateFactor`

## 5. Ограничения текущего MVP

- не учитываются цензурирование и неполные наблюдения вне окна анализа
- не строятся доверительные интервалы для `lambda` и `MTTF`
- не реализована отдельная модель для профилактических замен в итоговой метрике надежности
- расчет выполняется только как консольный сценарий без API

## 6. Итог

Минимальный рабочий контур готов:

- генерация данных в памяти
- корректная replacement-логика активности экземпляров
- расчет надежности по дереву объектов
- удобный вывод в консоль и `CSV`

Этого достаточно для дальнейшего обсуждения архитектуры и перехода к сервисной версии.
