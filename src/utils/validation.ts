/**
 * 验证工具函数
 */

/**
 * 必填验证
 */
export function required(value: unknown, message = '此项为必填项'): string | null {
  if (value === null || value === undefined || value === '') {
    return message;
  }
  if (Array.isArray(value) && value.length === 0) {
    return message;
  }
  return null;
}

/**
 * 邮箱验证
 */
export function isEmail(value: string, message = '请输入有效的邮箱地址'): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return message;
  }
  return null;
}

/**
 * URL 验证
 */
export function isUrl(value: string, message = '请输入有效的 URL'): string | null {
  try {
    new URL(value);
    return null;
  } catch {
    return message;
  }
}

/**
 * 手机号验证
 */
export function isPhone(value: string, message = '请输入有效的手机号'): string | null {
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(value)) {
    return message;
  }
  return null;
}

/**
 * 最小长度验证
 */
export function minLength(min: number, message?: string) {
  return (value: string, msg = message || `最少 ${min} 个字符`): string | null => {
    if (value.length < min) {
      return msg;
    }
    return null;
  };
}

/**
 * 最大长度验证
 */
export function maxLength(max: number, message?: string) {
  return (value: string, msg = message || `最多 ${max} 个字符`): string | null => {
    if (value.length > max) {
      return msg;
    }
    return null;
  };
}

/**
 * 范围验证
 */
export function range(min: number, max: number, message?: string) {
  return (value: number, msg = message || `值必须在 ${min} - ${max} 之间`): string | null => {
    if (value < min || value > max) {
      return msg;
    }
    return null;
  };
}

/**
 * 数字验证
 */
export function isNumber(value: string, message = '请输入有效的数字'): string | null {
  if (isNaN(Number(value))) {
    return message;
  }
  return null;
}

/**
 * 整数验证
 */
export function isInteger(value: string, message = '请输入整数'): string | null {
  if (!Number.isInteger(Number(value))) {
    return message;
  }
  return null;
}

/**
 * 正数验证
 */
export function isPositive(value: string, message = '请输入正数'): string | null {
  if (Number(value) <= 0) {
    return message;
  }
  return null;
}

/**
 * 文件类型验证
 */
export function fileType(allowed: string[], message?: string) {
  return (file: File, msg = message || `支持的文件类型: ${allowed.join(', ')}`): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      return msg;
    }
    return null;
  };
}

/**
 * 文件大小验证
 */
export function fileSize(maxMB: number, message?: string) {
  return (file: File, msg = message || `文件大小不能超过 ${maxMB}MB`): string | null => {
    if (file.size > maxMB * 1024 * 1024) {
      return msg;
    }
    return null;
  };
}

/**
 * 密码强度验证
 */
export function passwordStrength(
  value: string,
  message = '密码需包含大小写字母、数字和特殊字符'
): string | null {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return message;
  }
  return null;
}

/**
 * 验证组合
 */
export function validate(values: Record<string, unknown>, rules: Record<string, ((value: unknown) => string | null)[]>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const field in rules) {
    const fieldRules = rules[field];
    const value = values[field];
    
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  
  return errors;
}

/**
 * 表单验证 Hook 返回类型
 */
export interface ValidationResult {
  errors: Record<string, string>;
  validate: (field: string) => boolean;
  validateAll: () => boolean;
  clearErrors: () => void;
  setError: (field: string, message: string) => void;
}

/**
 * 创建表单验证器
 */
export function createValidator(
  initialValues: Record<string, unknown>,
  rules: Record<string, ((value: unknown) => string | null)[]>
): ValidationResult {
  const errors: Record<string, string> = {};
  
  const validate = (field: string): boolean => {
    const fieldRules = rules[field];
    if (!fieldRules) return true;
    
    const value = initialValues[field];
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        return false;
      }
    }
    delete errors[field];
    return true;
  };
  
  const validateAll = (): boolean => {
    let valid = true;
    for (const field in rules) {
      if (!validate(field)) {
        valid = false;
      }
    }
    return valid;
  };
  
  const clearErrors = () => {
    Object.keys(errors).forEach((key) => delete errors[key]);
  };
  
  const setError = (field: string, message: string) => {
    errors[field] = message;
  };
  
  return { errors, validate, validateAll, clearErrors, setError };
}
