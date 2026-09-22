/**
 * Helper utility for capitalizing names in Title Case:
 * "all the first name and last name first letter should be in capital"
 * e.g. "keval nagaria" -> "Keval Nagaria"
 *      "KEVAL NAGARIA" -> "Keval Nagaria"
 *      "mary-jane watson" -> "Mary-Jane Watson"
 *      "a.p.j. abdul kalam" -> "A.P.J. Abdul Kalam"
 */
export const capitalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s\-\.\/'])([a-z0-9])/g, (_, boundary, char) => boundary + char.toUpperCase());
};

/**
 * Format live input without stripping trailing spaces so users can comfortably type multi-word names:
 * e.g. "keval " -> "Keval "
 *      "keval n" -> "Keval N"
 */
export const formatNameInput = (val) => {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/(^|[\s\-\.\/'])([a-z0-9])/g, (_, boundary, char) => boundary + char.toUpperCase());
};
