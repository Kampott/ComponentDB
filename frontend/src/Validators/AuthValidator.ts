import validator from 'validator'

import type { ValidationResult, ValidationValue } from '@/Validators/Types.ts'

export class LoginRequestValidator {
    public static email(value: ValidationValue): ValidationResult {
        if (typeof value != "string" || !validator.isEmail(value)) {
            return 'Неверный формат'
        }
        return null
    }
    public static password(value: ValidationValue): ValidationResult {
        if (typeof value != "string") {
            return "Неверный формат"
        }
        if (value.length < 6) {
            return 'Пароль слишком короткий'
        }
        return null
    }
}
