// Character mapping dictionary for weird characters to typable characters
export const characterMap = {
  '。': '.',
  '︰': ':',
  '，': ',',
  '；': ';',
  '：': ':',
  '？': '?',
  '！': '!',
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '《': '<',
  '》': '>',
  '…': '.',
  '—': '-',
  '——': '-',
  '～': '~',
  '·': '.',
};

/**
 * Maps a character to its typable equivalent if it exists in the character map
 * @param {string} char - The character to map
 * @returns {string} - The mapped character or the original character if no mapping exists
 */
export function mapCharacter(char) {
  return characterMap[char] || char;
}

/**
 * Checks if two characters are equivalent, considering character mapping
 * @param {string} inputChar - The character typed by the user
 * @param {string} targetChar - The character from the passage
 * @returns {boolean} - True if the characters match (either directly or through mapping)
 */
export function areCharactersEquivalent(inputChar, targetChar) {
  // Direct match
  if (inputChar === targetChar) {
    return true;
  }
  
  // Check if input character maps to target character
  if (mapCharacter(inputChar) === targetChar) {
    return true;
  }
  
  // Check if target character maps to input character
  if (mapCharacter(targetChar) === inputChar) {
    return true;
  }
  
  return false;
}