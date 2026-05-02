const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

export const generateOTP = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  return keys.reduce(
    (result, key) => {
      if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = obj[key];
      }
      return result;
    },
    {} as Pick<T, K>,
  );
};

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

/**
 * Mask a phone number in E.164 format.
 * e.g. +61412345678 → +61****5678
 */
export const maskPhone = (phone: string): string => {
  // Keep country code prefix (up to first 3 chars after +) and last 4 digits
  const prefix = phone.slice(0, 3); // e.g. "+61"
  const last4 = phone.slice(-4);
  return `${prefix}****${last4}`;
};

/**
 * Mask an email address.
 * e.g. user@example.com → us***@example.com
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
};
