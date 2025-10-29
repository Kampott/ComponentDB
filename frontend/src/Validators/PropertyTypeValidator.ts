import DefaultValidator from '@/Validators/DefaultValidator'
import type { ValidationResult, ValidationValue } from '@/Validators/Types.ts'

export class PropertyTypeValidator {
    public static name(value: ValidationValue): ValidationResult {
        return DefaultValidator.name(value)
    }
}
