import DefaultValidator from '@/Validators/DefaultValidator'
import type { ValidationResult, ValidationValue } from '@/Validators/Types.ts'

export class ObjectTypeValidator {
    public static name(value: ValidationValue): ValidationResult {
        return DefaultValidator.name(value)
    }
}
