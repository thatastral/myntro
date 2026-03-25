/**
 * Username validation unit tests
 * Mirrors validation logic from the onboarding page
 */

function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters.'
  if (username.length > 30) return 'Username must be 30 characters or fewer.'
  if (!/^[a-z0-9_]+$/.test(username)) return 'Only lowercase letters, numbers, and underscores.'
  return null
}

describe('Username validation', () => {
  it('rejects usernames shorter than 3 characters', () => {
    expect(validateUsername('ab')).toBeTruthy()
    expect(validateUsername('a')).toBeTruthy()
  })

  it('rejects usernames longer than 30 characters', () => {
    expect(validateUsername('a'.repeat(31))).toBeTruthy()
  })

  it('accepts usernames of exactly 3 characters', () => {
    expect(validateUsername('abc')).toBeNull()
  })

  it('accepts usernames of exactly 30 characters', () => {
    expect(validateUsername('a'.repeat(30))).toBeNull()
  })

  it('rejects uppercase letters', () => {
    expect(validateUsername('Alice')).toBeTruthy()
    expect(validateUsername('ALICE')).toBeTruthy()
  })

  it('rejects special characters except underscore', () => {
    expect(validateUsername('ali-ce')).toBeTruthy()
    expect(validateUsername('ali.ce')).toBeTruthy()
    expect(validateUsername('ali ce')).toBeTruthy()
    expect(validateUsername('ali@ce')).toBeTruthy()
  })

  it('accepts underscores', () => {
    expect(validateUsername('alice_bob')).toBeNull()
    expect(validateUsername('_alice')).toBeNull()
    expect(validateUsername('alice_')).toBeNull()
  })

  it('accepts lowercase letters and numbers', () => {
    expect(validateUsername('alice123')).toBeNull()
    expect(validateUsername('user42')).toBeNull()
  })

  it('accepts valid usernames', () => {
    expect(validateUsername('alice')).toBeNull()
    expect(validateUsername('bob_jones')).toBeNull()
    expect(validateUsername('dev2025')).toBeNull()
  })
})
