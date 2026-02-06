import type { ValidationResult, ValidationValue } from '@Schemas'
import { DefaultValidator } from '@Schemas'

export class ObjectInstanceValidator {
    public static name(value: ValidationValue): ValidationResult {
        return DefaultValidator.name(value)
    }
}
