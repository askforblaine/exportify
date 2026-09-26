const MAJOR_CAMELOT_KEYS = [
  "8B", "3B", "10B", "5B", "12B", "7B",
  "2B", "9B", "4B", "11B", "6B", "1B"
]

const MINOR_CAMELOT_KEYS = [
  "5A", "12A", "7A", "2A", "9A", "4A",
  "11A", "6A", "1A", "8A", "3A", "10A"
]

// Spotify audio features use key 0-11 (C through B) and mode 1=major, 0=minor.
export function camelotKey(key: number, mode: number): string {
  if (!Number.isInteger(key) || key < 0 || key > 11) {
    return ""
  }

  if (mode === 1) {
    return MAJOR_CAMELOT_KEYS[key]
  }

  if (mode === 0) {
    return MINOR_CAMELOT_KEYS[key]
  }

  return ""
}
