from app.models.core import Objects, Types, Instances, Properties, PropertyTypes, InstanceProperties
from app.models.events import Events, EventTypes, EventTypesTypes, Replacements
from app.models.auth import User, Role, Permission, UserRole, RolePermission, RefreshToken, UserInstanceAccess, UserObjectAccess, UserTypeAccess

SEARCH_CONFIG = {
    # ==================== CORE MODELS ====================
    Types: {
        "name": ["exact", "like", "sort"],
        "parent_id": ["exact", "in"],
        "root_id": ["exact", "in"],
        "id": ["exact", "in", "gte", "lte", "sort"]
    },
    
    Objects: {
        "name": ["exact", "like", "in", "sort"],
        "type_id": ["exact", "in", "gte", "lte"],
        "parent_id": ["exact", "in"],
        "root_id": ["exact", "in"],
        "id": ["exact", "in", "gte", "lte", "sort"]
    },
    
    Instances: {
        "name": ["exact", "like", "in", "sort"],
        "object_id": ["exact", "in", "gte", "lte"],
        "parent_id": ["exact", "in"],
        "root_id": ["exact", "in"],
        "is_active": ["exact"],
        "id": ["exact", "in", "gte", "lte", "sort"]
    },
    
    PropertyTypes: {
        "name": ["exact", "like", "sort"],
        "type_id": ["exact", "in"],
        "is_static": ["exact"],
        "id": ["exact", "in", "sort"]
    },
    
    Properties: {
        "object_id": ["exact", "in"],
        "property_id": ["exact", "in"],
        "value": ["exact", "like"],
        "id": ["exact", "in", "sort"]
    },
    
    InstanceProperties: {
        "instance_id": ["exact", "in"],
        "property_type_id": ["exact", "in"],
        "value": ["exact", "like"],
        "id": ["exact", "in", "sort"]
    },
    
    # ==================== EVENTS MODELS ====================
    EventTypes: {
        "name": ["exact", "like", "sort"],
        "id": ["exact", "in", "sort"]
    },
    
    EventTypesTypes: {
        "event_type_id": ["exact", "in"],
        "type_id": ["exact", "in"]
    },
    
    Events: {
        "event_type_id": ["exact", "in"],
        "instance_id": ["exact", "in"],
        "timestamp": ["exact", "gte", "lte", "gt", "lt", "sort"],
        "id": ["exact", "in", "gte", "lte", "sort"]
    },
    
    Replacements: {
        "event_id": ["exact", "in"],
        "new_instance_id": ["exact", "in"]
    },
    
    # ==================== AUTH MODELS ====================
    User: {
        "email": ["exact", "like", "sort"],
        "is_active": ["exact"],
        "created_at": ["gte", "lte", "sort"],
        "updated_at": ["gte", "lte", "sort"],
        "id": ["exact", "in", "sort"]
    },
    
    Role: {
        "name": ["exact", "like", "sort"],
        "id": ["exact", "in", "sort"]
    },
    
    Permission: {
        "name": ["exact", "like", "sort"],
        "id": ["exact", "in", "sort"]
    },
    
    UserRole: {
        "user_id": ["exact", "in"],
        "role_id": ["exact", "in"]
    },
    
    RolePermission: {
        "role_id": ["exact", "in"],
        "permission_id": ["exact", "in"]
    },    
    
    UserInstanceAccess: {
        "user_id": ["exact", "in"],
        "root_id": ["exact", "in"],
        "can_read": ["exact"],
        "can_write": ["exact"]
    },
    
    UserObjectAccess: {
        "user_id": ["exact", "in"],
        "root_id": ["exact", "in"],
        "can_read": ["exact"],
        "can_write": ["exact"]
    },
    
    UserTypeAccess: {
        "user_id": ["exact", "in"],
        "root_id": ["exact", "in"],
        "can_read": ["exact"],
        "can_write": ["exact"]
    }
}