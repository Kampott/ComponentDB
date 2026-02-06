import type { ValidationResult, ValidationValue } from '@RestSchemas'
import { DefaultValidator } from '@RestSchemas'

export class ObjectValidator {
    public static name(value: ValidationValue): ValidationResult {
        return DefaultValidator.name(value)
    }
}
