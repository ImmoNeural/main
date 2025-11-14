export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: PasswordRequirements;
  message: string;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

/**
 * Valida a senha de acordo com os requisitos de segurança
 * Requisitos:
 * - Mínimo 12 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const isValid = Object.values(requirements).every(req => req === true);

  // Calcular força da senha
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';

  if (metRequirements <= 2) {
    strength = 'weak';
  } else if (metRequirements === 3) {
    strength = 'medium';
  } else if (metRequirements === 4) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  // Gerar mensagem de erro
  let message = '';
  if (!isValid) {
    const missing: string[] = [];
    if (!requirements.minLength) missing.push('mínimo de 12 caracteres');
    if (!requirements.hasUppercase) missing.push('letra maiúscula (A-Z)');
    if (!requirements.hasLowercase) missing.push('letra minúscula (a-z)');
    if (!requirements.hasNumber) missing.push('número (0-9)');
    if (!requirements.hasSpecialChar) missing.push('caractere especial (!@#$%...)');

    message = `A senha deve conter: ${missing.join(', ')}`;
  }

  return { isValid, requirements, message, strength };
}

/**
 * Retorna a cor do indicador de força da senha
 */
export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak':
      return '#EF4444'; // red-500
    case 'medium':
      return '#F59E0B'; // amber-500
    case 'strong':
      return '#10B981'; // green-500
    case 'very-strong':
      return '#059669'; // emerald-600
  }
}

/**
 * Retorna o texto descritivo da força da senha
 */
export function getStrengthText(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak':
      return 'Fraca';
    case 'medium':
      return 'Média';
    case 'strong':
      return 'Forte';
    case 'very-strong':
      return 'Muito Forte';
  }
}
