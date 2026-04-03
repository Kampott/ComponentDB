from app.models.core import Objects, Types, Instances, Properties, PropertyTypes, InstanceProperties
from app.models.events import Events, EventTypes, EventTypesTypes, Replacements
from app.models.auth import User, Role, Permission, UserRole, RolePermission, RefreshToken, UserInstanceAccess, UserObjectAccess, UserTypeAccess


SEARCH_CONFIG = {
    # ==================== CORE MODELS ====================
    Types: {
        "name": ["exact", "like", "sort"],
        "parent_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "root_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    Objects: {
        "name": ["exact", "like", "in", "sort"],
        "type_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "parent_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "root_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    Instances: {
        "name": ["exact", "like", "in", "sort"],
        "object_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "parent_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "root_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "is_active": ["exact"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    PropertyTypes: {
        "name": ["exact", "like", "sort"],
        "type_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "is_static": ["exact"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    Properties: {
        "object_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "property_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "value": ["exact", "like"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    InstanceProperties: {
        "instance_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "property_type_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "value": ["exact", "like"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    # ==================== EVENTS MODELS ====================
    EventTypes: {
        "name": ["exact", "like", "sort"],
        "counts_as_failure": ["exact"],  # НОВОЕ ПОЛЕ
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    EventTypesTypes: {
        "event_type_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "type_id": ["exact", "in", "gt", "lt", "gte", "lte"]
    },
    
    Events: {
        "event_type_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "instance_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "timestamp": ["exact", "gte", "lte", "gt", "lt", "sort"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    Replacements: {
        "event_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "new_instance_id": ["exact", "in", "gt", "lt", "gte", "lte"]
    },
    
    # ==================== AUTH MODELS ====================
    User: {
        "email": ["exact", "like", "sort"],
        "is_active": ["exact"],
        "created_at": ["gte", "lte", "gt", "lt", "sort"],
        "updated_at": ["gte", "lte", "gt", "lt", "sort"],
        "id": ["exact", "in", "sort"]
    },
    
    Role: {
        "name": ["exact", "like", "sort"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    Permission: {
        "name": ["exact", "like", "sort"],
        "id": ["exact", "in", "gt", "lt", "gte", "lte", "sort"]
    },
    
    UserRole: {
        "user_id": ["exact", "in"],
        "role_id": ["exact", "in", "gt", "lt", "gte", "lte"]
    },
    
    RolePermission: {
        "role_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "permission_id": ["exact", "in", "gt", "lt", "gte", "lte"]
    },
    
    UserInstanceAccess: {
        "user_id": ["exact", "in"],
        "root_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "can_read": ["exact"],
        "can_write": ["exact"]
    },
    
    UserObjectAccess: {
        "user_id": ["exact", "in"],
        "root_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "can_read": ["exact"],
        "can_write": ["exact"]
    },
    
    UserTypeAccess: {
        "user_id": ["exact", "in"],
        "root_id": ["exact", "in", "gt", "lt", "gte", "lte"],
        "can_read": ["exact"],
        "can_write": ["exact"]
    }
}