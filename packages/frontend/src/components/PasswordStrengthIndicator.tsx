import { Check, X } from 'lucide-react';
import { validatePassword, getStrengthColor, getStrengthText } from '../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  // Não mostrar nada se a senha estiver vazia
  if (!password) {
    return null;
  }

  const validation = validatePassword(password);
  const { requirements, strength } = validation;

  const requirementsList = [
    { key: 'minLength', label: 'Mínimo 12 caracteres', met: requirements.minLength },
    { key: 'hasUppercase', label: 'Letra maiúscula (A-Z)', met: requirements.hasUppercase },
    { key: 'hasLowercase', label: 'Letra minúscula (a-z)', met: requirements.hasLowercase },
    { key: 'hasNumber', label: 'Número (0-9)', met: requirements.hasNumber },
    { key: 'hasSpecialChar', label: 'Caractere especial (!@#$%...)', met: requirements.hasSpecialChar },
  ];

  const strengthColor = getStrengthColor(strength);
  const strengthText = getStrengthText(strength);

  // Calcular porcentagem de requisitos atendidos
  const metCount = Object.values(requirements).filter(Boolean).length;
  const totalCount = Object.values(requirements).length;
  const percentage = (metCount / totalCount) * 100;

  return (
    <div className="mt-3 space-y-2">
      {/* Barra de força */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">Força da senha:</span>
          <span className="font-semibold" style={{ color: strengthColor }}>
            {strengthText}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: strengthColor,
            }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      <div className="space-y-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-1.5">Requisitos:</p>
        {requirementsList.map((req) => (
          <div key={req.key} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className={req.met ? 'text-green-700 font-medium' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
