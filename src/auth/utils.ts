/**
 * Generates a random 6-digit number to be used as an activation code
 * @returns The generated activation code.
 */
export function generateActivationCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // Generates a number between 100000 and 999999
}
