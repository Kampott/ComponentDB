from typing import Any, Dict, List, Optional, Type
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import DeclarativeBase
from fastapi import HTTPException


class QueryBuilder:
    """
    Универсальный построитель запросов с поддержкой суффиксов фильтрации
    
    Поддерживаемые суффиксы:
    - __exact или без суффикса: точное совпадение (=)
    - __like: частичное совпадение (ILIKE)
    - __in: вхождение в список (IN)
    - __gte: больше или равно (>=)
    - __lte: меньше или равно (<=)
    - __gt: больше (>)
    - __lt: меньше (<)
    - __sort: сортировка (asc/desc)
    """
    
    @staticmethod
    def validate_params(
        model: Type[DeclarativeBase], 
        params: Dict[str, Any], 
        allowed_config: Dict[str, list]
    ):
        """Валидирует что все параметры разрешены согласно конфигурации"""
        for key in params.keys():
            if params[key] is None:
                continue
            
            # Парсим поле и операцию
            if "__" in key:
                field, operation = key.rsplit("__", 1)
            else:
                field = key
                operation = "exact"
            
            # Проверяем что поле разрешено
            if field not in allowed_config:
                raise HTTPException(
                    status_code=422, 
                    detail=f"Filtering by field '{field}' is not allowed"
                )
            
            # Проверяем что операция разрешена для этого поля
            if operation not in allowed_config[field]:
                raise HTTPException(
                    status_code=422,
                    detail=f"Operation '{operation}' is not allowed for field '{field}'. Allowed: {allowed_config[field]}"
                )
    
    @staticmethod
    def parse_query_params(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Парсит query параметры и группирует по полям
        
        Input: {"name__like": "test", "id__gte": 5, "name__sort": "asc"}
        Output: {
            "name": {"like": "test", "sort": "asc"},
            "id": {"gte": 5}
        }
        """
        parsed = {}
        
        for key, value in params.items():
            if value is None:
                continue
            
            # Разделяем поле и суффикс
            if "__" in key:
                field, suffix = key.rsplit("__", 1)
            else:
                field = key
                suffix = "exact"
            
            if field not in parsed:
                parsed[field] = {}
            
            # Для __in может быть несколько значений
            if suffix == "in":
                if "in" not in parsed[field]:
                    parsed[field]["in"] = []
                if isinstance(value, list):
                    parsed[field]["in"].extend(value)
                else:
                    parsed[field]["in"].append(value)
            else:
                parsed[field][suffix] = value
        
        return parsed
    
    @staticmethod
    def apply_filters(query, model: Type[DeclarativeBase], filters: Dict[str, Any]):
        """
        Применяет фильтры к SQLAlchemy query
        
        Args:
            query: SQLAlchemy select() объект
            model: SQLAlchemy модель
            filters: Распарсенные фильтры из parse_query_params
        """
        conditions = []
        
        for field_name, operations in filters.items():
            if not hasattr(model, field_name):
                continue
            
            field = getattr(model, field_name)
            
            for op, value in operations.items():
                if op == "exact":
                    conditions.append(field == value)
                
                elif op == "like":
                    conditions.append(field.ilike(f"%{value}%"))
                
                elif op == "in":
                    conditions.append(field.in_(value))
                
                elif op == "gte":
                    conditions.append(field >= value)
                
                elif op == "lte":
                    conditions.append(field <= value)
                
                elif op == "gt":
                    conditions.append(field > value)
                
                elif op == "lt":
                    conditions.append(field < value)
                
                elif op == "sort":
                    pass
        
        if conditions:
            query = query.where(and_(*conditions))
        
        return query
    
    @staticmethod
    def apply_sorting(query, model: Type[DeclarativeBase], filters: Dict[str, Any]):
        """Применяет сортировку к query"""
        for field_name, operations in filters.items():
            if "sort" not in operations:
                continue
            
            if not hasattr(model, field_name):
                continue
            
            field = getattr(model, field_name)
            sort_direction = operations["sort"].lower()
            
            if sort_direction == "asc":
                query = query.order_by(field.asc())
            elif sort_direction == "desc":
                query = query.order_by(field.desc())
        
        return query
    
    @staticmethod
    def apply_limit(query, limit: Optional[int]):
        """Применяет LIMIT к query для пагинации"""
        if limit is not None and limit > 0:
            query = query.limit(limit)
        return query