/**
 * FormPilot AI - Authentication & Validation Utility
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

/**
 * Strict Email Validator
 * Requirement: Only valid emails, strictly NO '+' aliases allowed.
 */
export function validateEmail(rawEmail: string): { isValid: boolean; error?: string } {
  const email = rawEmail.trim();

  if (!email) {
    return { isValid: false, error: 'Email address is required.' };
  }

  // 1. Strict rejection of '+' alias emails
  if (email.includes('+')) {
    return { 
      isValid: false, 
      error: 'Email aliases containing "+" are not permitted. Please use your standard primary email address.' 
    };
  }

  // 2. Standard RFC-compliant email regex
  const standardEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  // Custom sanitized regex without '+'
  const noPlusEmailRegex = /^[a-zA-Z0-9._%~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!noPlusEmailRegex.test(email)) {
    return { 
      isValid: false, 
      error: 'Please enter a valid email address format (e.g. name@domain.com).' 
    };
  }

  // 3. Domain validation check
  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email address structure.' };
  }

  const [localPart, domain] = parts;
  if (localPart.length < 1 || localPart.length > 64) {
    return { isValid: false, error: 'Email username must be between 1 and 64 characters.' };
  }

  if (domain.length < 4 || !domain.includes('.')) {
    return { isValid: false, error: 'Please provide a valid domain name with extension.' };
  }

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { isValid: false, error: 'Please provide a valid top-level domain (e.g. .com, .io).' };
  }

  return { isValid: true };
}

/**
 * Password validation
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 4) {
    return { isValid: false, error: 'Password must be at least 4 characters long.' };
  }
  return { isValid: true };
}
