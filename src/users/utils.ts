/**
 * Generates a random 6 digit number used for verification codes.
 * @returns A random 6 digit number
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000); // Generates a number between 100000 and 999999
}
