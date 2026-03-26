# Система прав доступа и авторизации

Документация по системе Role-Based Access Control (RBAC) с иерархической проверкой прав доступа на 3 уровнях.

---

## 📋 Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектура RBAC](#архитектура-rbac)
3. [Иерархический контроль доступа](#иерархический-контроль-доступа)

---

## Обзор системы

Система авторизации состоит из двух основных компонентов:

### **1. RBAC (Role-Based Access Control)**
- Назначение ролей пользователям
- Назначение разрешений ролям
- Проверка разрешений через роли

### **2. Hierarchical Access Control**
- Контроль доступа на уровне **Types** (типы оборудования)
- Контроль доступа на уровне **Objects** (шаблоны объектов)
- Контроль доступа на уровне **Instances** (физические экземпляры)
- OR-логика между уровнями (доступ на ЛЮБОМ уровне разрешает операцию)

---

## Архитектура RBAC

### Структура данных
```
User (пользователь)
  ↓ M2M (через user_roles)
Role (роль)
  ↓ M2M (через role_permissions)
Permission (разрешение)
```

### Специальные разрешения

**SUPER_PERMISSION**
- Обходит ВСЕ проверки прав доступа
- Дает полный доступ ко всей системе
- Используется для администраторов

**Назначение:**
```sql
-- Создать роль Admin
INSERT INTO roles (name, description) VALUES ('Admin', 'System administrator');

-- Создать SUPER_PERMISSION
INSERT INTO permissions (name, description) 
VALUES ('SUPER_PERMISSION', 'Full system access');

-- Связать роль с разрешением
INSERT INTO role_permissions (role_id, permission_id) 
VALUES (1, 1);

-- Назначить роль пользователю
INSERT INTO user_roles (user_id, role_id) 
VALUES ('user-uuid', 1);
```

---

## Иерархический контроль доступа

### Концепция

Каждый пользователь может иметь права доступа на 3 уровнях иерархии данных:
```
Types (Типы оборудования)
  ↓
Objects (Шаблоны объектов)
  ↓
Instances (Физические экземпляры)
```

### Таблицы доступа

**UserTypeAccess**
```python
class UserTypeAccess(Base):
    user_id: UUID          # Пользователь
    root_id: int           # Корень дерева типов
    can_read: bool         # Право на чтение
    can_write: bool        # Право на запись
```

**UserObjectAccess**
```python
class UserObjectAccess(Base):
    user_id: UUID          # Пользователь
    root_id: int           # Корень дерева объектов
    can_read: bool         # Право на чтение
    can_write: bool        # Право на запись
```

**UserInstanceAccess**
```python
class UserInstanceAccess(Base):
    user_id: UUID          # Пользователь
    root_id: int           # Корень дерева экземпляров
    can_read: bool         # Право на чтение
    can_write: bool        # Право на запись
```

### Логика проверки доступа

**OR-логика между уровнями:**
Пользователь получает доступ к экземпляру, если у него есть доступ на **ЛЮБОМ** из 3 уровней:
```python
# Проверка доступа к Instance
allowed = (
    user_has_instance_access(instance.root_id) OR
    user_has_object_access(instance.object.root_id) OR
    user_has_type_access(instance.object.type.root_id) OR
    user_has_SUPER_PERMISSION
)
```

**Пример:**
```
User: John
├─ TypeAccess: root_id=10 (can_read=True)
└─ ObjectAccess: root_id=50 (can_write=True)

Instance #100:
├─ root_id = 100
├─ object_id = 55 → Object.root_id = 50
└─ Object.type_id = 12 → Type.root_id = 10

- John может ЧИТАТЬ Instance #100 (доступ через Type)
- John может ПИСАТЬ Instance #100 (доступ через Object)
```

### Каскадная проверка

Для каждого запроса проверка идет по цепочке:

**1. Проверка на уровне Instance:**
```python
if user_can_read_instance(user, instance.root_id):
    return True  # Доступ разрешен
```

**2. Если нет → проверка на уровне Object:**
```python
if user_can_read_object(user, instance.object.root_id):
    return True  # Доступ разрешен через Object
```

**3. Если нет → проверка на уровне Type:**
```python
if user_can_read_type(user, instance.object.type.root_id):
    return True  # Доступ разрешен через Type
```

**4. Если нет → проверка SUPER_PERMISSION:**
```python
if user_has_permission("SUPER_PERMISSION"):
    return True  # Доступ разрешен (админ)
```

**5. Если нет → доступ запрещен:**
```python
raise HTTPException(403, "Access denied")
```

---

## Сводная таблица разрешений

| Категория | Разрешение | Операция | Endpoint |
|-----------|-----------|----------|----------|
| **Core** | `create_new_type` | Создать корневой тип | POST /types |
| | `create_new_object` | Создать корневой объект | POST /objects |
| | `create_new_instance` | Создать корневой экземпляр | POST /instances |
| | `create_instance_from_root_object` | Создать экземпляр из объекта | POST /objects/{id}/instance |
| **Properties** | `read_properties` | Читать свойства | GET /properties |
| | `create_properties` | Создать свойство | POST /properties |
| | `edit_properties` | Изменить свойство | PATCH /properties/{id} |
| | `delete_properties` | Удалить свойство | DELETE /properties/{id} |
| **PropertyTypes** | `read_property_types` | Читать типы свойств | GET /property_types |
| | `create_property_types` | Создать тип свойства | POST /property_types |
| | `edit_property_types` | Изменить тип свойства | PATCH /property_types/{id} |
| | `delete_property_types` | Удалить тип свойства | DELETE /property_types/{id} |
| **InstanceProperties** | `read_instance_properties` | Читать свойства экземпляров | GET /instance_properties |
| | `create_instance_properties` | Создать свойство экземпляра | POST /instance_properties |
| | `edit_instance_properties` | Изменить свойство экземпляра | PATCH /instance_properties/{id} |
| | `delete_instance_properties` | Удалить свойство экземпляра | DELETE /instance_properties/{id} |
| **EventTypes** | `read_event_types` | Читать типы событий | GET /event_types |
| | `create_event_types` | Создать тип события | POST /event_types |
| | `edit_event_types` | Изменить тип события | PATCH /event_types/{id} |
| | `delete_event_types` | Удалить тип события | DELETE /event_types/{id} |
| **EventTypesTypes** | `read_event_types_types` | Читать связи событий | GET /event_types_types |
| | `create_event_types_types` | Создать связь события | POST /event_types_types |
| | `delete_event_types_types` | Удалить связь события | DELETE /event_types_types/{...} |
| **Events** | `read_events` | Читать события | GET /events |
| | `create_events` | Создать событие | POST /events |
| | `edit_events` | Изменить событие | PATCH /events/{id} |
| | `delete_events` | Удалить событие | DELETE /events/{id} |
| **Replacements** | `read_replacements` | Читать замены | GET /replacements |
| | `create_replacements` | Создать/отменить замену | POST /replacements, POST .../undo |
| | `delete_replacements` | Удалить запись замены | DELETE /replacements/{...} |
| **Users** | `register_user` | Регистрировать пользователей | POST /auth/register |
| **Roles** | `read_role` | Читать роли | GET /roles |
| | `create_role` | Создать роль | POST /roles/rolecreate |
| | `edit_role` | Изменить роль | PATCH /roles/{id} |
| | `delete_role` | Удалить роль | DELETE /roles/{id} |
| **Permissions** | `read_permission` | Читать разрешения | GET /permissions |
| | `create_permission` | Создать разрешение | POST /permissions/permissioncreate |
| | `edit_permission` | Изменить разрешение | PATCH /permissions/{id} |
| | `delete_permission` | Удалить разрешение | DELETE /permissions/{id} |
| **UserRoles** | `read_user_role` | Читать назначения ролей | GET /user_roles |
| | `create_user_role` | Назначить роль | POST /user_roles/users/{id}/roles |
| | `edit_user_role` | Изменить назначение роли | PATCH /user_roles/{...} |
| | `delete_user_role` | Снять роль | DELETE /user_roles/{...} |
| **RolePermissions** | `read_role_permission` | Читать права ролей | GET /role_permissions |
| | `create_role_permission` | Добавить право | POST /role_permissions/roles/{id}/permission |
| | `delete_role_permission` | Удалить право | DELETE /role_permissions/{...} |
| **UserInstanceAccess** | `read_user_instance_access` | Читать доступ к экземплярам | GET /user_instance_access |
| | `create_user_instance_access` | Выдать доступ к экземпляру | POST /user_instance_access/... |
| | `edit_user_instance_access` | Изменить доступ | PATCH /user_instance_access/{...} |
| | `delete_user_instance_access` | Отозвать доступ | DELETE /user_instance_access/{...} |
| **UserObjectAccess** | `read_user_object_access` | Читать доступ к объектам | GET /user_object_access |
| | `create_user_object_access` | Выдать доступ к объекту | POST /user_object_access/... |
| | `edit_user_object_access` | Изменить доступ | PATCH /user_object_access/{...} |
| | `delete_user_object_access` | Отозвать доступ | DELETE /user_object_access/{...} |
| **UserTypeAccess** | `read_user_type_access` | Читать доступ к типам | GET /user_type_access |
| | `create_user_type_access` | Выдать доступ к типу | POST /user_type_access/... |
| | `edit_user_type_access` | Изменить доступ | PATCH /user_type_access/{...} |
| | `delete_user_type_access` | Отозвать доступ | DELETE /user_type_access/{...} |

---

## FAQ

**Q: Что происходит при удалении пользователя?**  
A: Cascade delete удаляет все связи (UserRoles, UserInstanceAccess, UserObjectAccess, UserTypeAccess, RefreshTokens)

**Q: Можно ли дать пользователю доступ только к одному экземпляру?**  
A: Нет, доступ дается к root_id (корню дерева). Если нужен доступ к одному экземпляру, создайте для него отдельное дерево.

**Q: Что если у пользователя есть read на Type, но write на Instance?**  
A: Пользователь сможет писать в этот экземпляр (OR-логика между уровнями)

**Q: Как дать временный доступ?**  
A: Создайте роль "Temporary", назначьте права, после срока удалите роль у пользователя

**Q: Что делает SUPER_PERMISSION?**  
A: Обходит ВСЕ проверки. Пользователь с этим правом может делать что угодно.
