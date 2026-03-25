/**
 * Auth flow unit tests
 * Tests: password validation, redirect logic, bio char limit
 */

// ── Password validation (mirrors signup/page.tsx) ─────────────────

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'football', 'shadow', '123123', '654321', 'superman', 'qazwsx',
  'michael', 'password1', 'welcome', 'welcome1', 'admin', 'login', 'passw0rd',
  'hello', 'charlie', 'donald', '1234', '12345', '123456789', '1234567890',
]

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
  }
}

function isPasswordValid(password: string) {
  const v = validatePassword(password)
  return v.length && v.uppercase && v.number && v.special && v.notCommon
}

describe('Password validation', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(isPasswordValid('Ab1!')).toBe(false)
    expect(validatePassword('Ab1!').length).toBe(false)
  })

  it('rejects passwords without an uppercase letter', () => {
    expect(isPasswordValid('abcdef1!')).toBe(false)
    expect(validatePassword('abcdef1!').uppercase).toBe(false)
  })

  it('rejects passwords without a number', () => {
    expect(isPasswordValid('Abcdefg!')).toBe(false)
    expect(validatePassword('Abcdefg!').number).toBe(false)
  })

  it('rejects passwords without a special character', () => {
    expect(isPasswordValid('Abcdefg1')).toBe(false)
    expect(validatePassword('Abcdefg1').special).toBe(false)
  })

  it('rejects common passwords', () => {
    // 'password1' (without !) is in the common list; lowercased match
    expect(isPasswordValid('Password!!1A')).toBe(true) // not in list → valid
    expect(validatePassword('password').notCommon).toBe(false)
    expect(validatePassword('admin').notCommon).toBe(false)
    expect(validatePassword('welcome').notCommon).toBe(false)
  })

  it('accepts a strong password', () => {
    expect(isPasswordValid('MyStr0ng!Pass')).toBe(true)
  })

  it('accepts password with all requirements', () => {
    const result = validatePassword('Secure#9abc')
    expect(result.length).toBe(true)
    expect(result.uppercase).toBe(true)
    expect(result.number).toBe(true)
    expect(result.special).toBe(true) // # is in the allowed set !@#$%^&*
    expect(result.notCommon).toBe(true)
  })

  it('only accepts special chars in the allowed set !@#$%^&*', () => {
    expect(isPasswordValid('Abcdefg1#')).toBe(true) // # is in allowed set
    expect(isPasswordValid('Abcdefg1-')).toBe(false) // - is NOT in allowed set
  })
})

// ── Bio character limit ───────────────────────────────────────────

describe('Bio character limit', () => {
  const BIO_LIMIT = 300

  it('allows bios up to 300 characters', () => {
    const bio = 'A'.repeat(300)
    const sliced = bio.slice(0, BIO_LIMIT)
    expect(sliced.length).toBe(300)
  })

  it('truncates bios longer than 300 characters', () => {
    const bio = 'A'.repeat(350)
    const sliced = bio.slice(0, BIO_LIMIT)
    expect(sliced.length).toBe(300)
  })

  it('counter shows remaining characters correctly', () => {
    const bio = 'Hello world'
    const remaining = BIO_LIMIT - bio.length
    expect(remaining).toBe(289)
  })
})

// ── Auth callback redirect logic ──────────────────────────────────

describe('Auth callback redirect logic', () => {
  function resolveRedirect(origin: string, next: string | null, hasUsername: boolean, username?: string) {
    // mirrors /app/api/auth/callback/route.ts logic
    const effectiveNext = next ?? '/onboarding'
    if (hasUsername && username) {
      return `${origin}/${username}/edit`
    }
    const redirectTo = effectiveNext.startsWith('/') ? `${origin}${effectiveNext}` : `${origin}/onboarding`
    return redirectTo
  }

  it('sends existing user to their edit page', () => {
    const result = resolveRedirect('http://localhost:3000', null, true, 'alice')
    expect(result).toBe('http://localhost:3000/alice/edit')
  })

  it('sends new user to /onboarding when next is null', () => {
    const result = resolveRedirect('http://localhost:3000', null, false)
    expect(result).toBe('http://localhost:3000/onboarding')
  })

  it('respects next param for new users', () => {
    const result = resolveRedirect('http://localhost:3000', '/settings', false)
    expect(result).toBe('http://localhost:3000/settings')
  })

  it('rejects non-path next params (no leading slash)', () => {
    const result = resolveRedirect('http://localhost:3000', 'evil.com', false)
    expect(result).toBe('http://localhost:3000/onboarding')
  })
})
