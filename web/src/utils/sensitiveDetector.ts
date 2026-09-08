/**
 * Sensitive Data Detection & Masking Utility for Hopp
 * Detects API keys, JWT tokens, credit card numbers, passwords, and secrets.
 */

export interface SensitivityResult {
  isSensitive: boolean;
  type: 'token' | 'jwt' | 'card' | 'password' | null;
  maskedContent: string;
}

const TOKEN_PATTERNS = [
  /sk_live_[0-9a-zA-Z]{24,}/,
  /sk_test_[0-9a-zA-Z]{24,}/,
  /ghp_[0-9a-zA-Z]{36}/,
  /gho_[0-9a-zA-Z]{36}/,
  /xox[baprs]-[0-9a-zA-Z]{10,48}/,
  /AKIA[0-9A-Z]{16}/,
  /AIzaSy[0-9a-zA-Z-_]{33}/,
  /Bearer\s+eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/,
];

const JWT_PATTERN = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/;

const CREDIT_CARD_PATTERN = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/;

const PASSWORD_KEYWORD_PATTERNS = [
  /(?:password|passwd|secret|api_key|token|auth_key|private_key)\s*[:=]\s*["']?([^\s"']+)["']?/i,
];

export function analyzeSensitivity(content: string): SensitivityResult {
  if (!content || typeof content !== 'string') {
    return { isSensitive: false, type: null, maskedContent: content };
  }

  // 1. API Token Check
  for (const pattern of TOKEN_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isSensitive: true,
        type: 'token',
        maskedContent: maskContent(content),
      };
    }
  }

  // 2. JWT Check
  if (JWT_PATTERN.test(content)) {
    return {
      isSensitive: true,
      type: 'jwt',
      maskedContent: maskContent(content),
    };
  }

  // 3. Credit Card Check
  if (CREDIT_CARD_PATTERN.test(content)) {
    return {
      isSensitive: true,
      type: 'card',
      maskedContent: maskContent(content),
    };
  }

  // 4. Password / Secret Assignment Pattern
  for (const pattern of PASSWORD_KEYWORD_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isSensitive: true,
        type: 'password',
        maskedContent: maskContent(content),
      };
    }
  }

  return { isSensitive: false, type: null, maskedContent: content };
}

function maskContent(text: string): string {
  if (text.length <= 8) {
    return '••••••••';
  }
  const prefix = text.substring(0, 3);
  const suffix = text.substring(text.length - 3);
  return `${prefix}••••••••••••${suffix}`;
}
