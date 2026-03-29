---
title: Type-Safe Form Validation
impact: MEDIUM
impactDescription: Generic validation framework enforces per-field rule types, eliminating mismatched validators at compile time
tags: pattern, form, validation, generic-class, field-rules, errors
---

# Type-Safe Form Validation

Generic form validator where validation rules are typed per field.

```typescript
type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

type ValidationErrors<T> = {
  [K in keyof T]?: string[];
};

class FormValidator<T extends Record<string, any>> {
  constructor(private rules: FieldValidation<T>) {}

  validate(data: T): ValidationErrors<T> | null {
    const errors: ValidationErrors<T> = {};
    let hasErrors = false;

    for (const key in this.rules) {
      const fieldRules = this.rules[key];
      const value = data[key];

      if (fieldRules) {
        const fieldErrors: string[] = [];
        for (const rule of fieldRules) {
          if (!rule.validate(value)) {
            fieldErrors.push(rule.message);
          }
        }
        if (fieldErrors.length > 0) {
          errors[key] = fieldErrors;
          hasErrors = true;
        }
      }
    }

    return hasErrors ? errors : null;
  }
}

// Usage
interface LoginForm {
  email: string;
  password: string;
}

const validator = new FormValidator<LoginForm>({
  email: [
    { validate: (v) => v.includes("@"), message: "Email must contain @" },
    { validate: (v) => v.length > 0, message: "Email is required" },
  ],
  password: [
    {
      validate: (v) => v.length >= 8,
      message: "Password must be at least 8 characters",
    },
  ],
});

const errors = validator.validate({ email: "invalid", password: "short" });
// Type: { email?: string[]; password?: string[]; } | null
```
