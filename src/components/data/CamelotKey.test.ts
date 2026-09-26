import { camelotKey } from "./CamelotKey"

describe("camelotKey", () => {
  const expected = [
    { key: 0, major: "8B", minor: "5A" },
    { key: 1, major: "3B", minor: "12A" },
    { key: 2, major: "10B", minor: "7A" },
    { key: 3, major: "5B", minor: "2A" },
    { key: 4, major: "12B", minor: "9A" },
    { key: 5, major: "7B", minor: "4A" },
    { key: 6, major: "2B", minor: "11A" },
    { key: 7, major: "9B", minor: "6A" },
    { key: 8, major: "4B", minor: "1A" },
    { key: 9, major: "11B", minor: "8A" },
    { key: 10, major: "6B", minor: "3A" },
    { key: 11, major: "1B", minor: "10A" }
  ]

  it.each(expected)("maps Spotify key $key in major mode", ({ key, major }) => {
    expect(camelotKey(key, 1)).toBe(major)
  })

  it.each(expected)("maps Spotify key $key in minor mode", ({ key, minor }) => {
    expect(camelotKey(key, 0)).toBe(minor)
  })

  it("returns an empty value for unknown keys or modes", () => {
    expect(camelotKey(-1, 1)).toBe("")
    expect(camelotKey(12, 1)).toBe("")
    expect(camelotKey(0, -1)).toBe("")
    expect(camelotKey(0, 2)).toBe("")
  })
})
