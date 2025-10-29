import type { ValidationResult, ValidationValue } from '@/Validators/Types.ts'

export default class DefaultValidator {
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
