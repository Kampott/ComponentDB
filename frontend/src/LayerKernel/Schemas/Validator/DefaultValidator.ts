import type { ValidationResult, ValidationValue } from '@RestSchemas'

export class DefaultValidator {
    public static name(value: ValidationValue): ValidationResult {
        if (typeof value != 'string') {
            return 'Неверный формат'
        }
        if (value.length < 4) {
            return 'Слишком короткое'
        }
        return null
    }
}
