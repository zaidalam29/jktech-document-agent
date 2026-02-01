export const mockFetchSuccess = (data, status = 200) => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(data)
  })
}

export const mockFetchError = (errorData, status = 400) => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(errorData)
  })
}

export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user'],
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockAuthResponse = (overrides = {}) => ({
  success: true,
  access_token: 'mock_token_123',
  user: createMockUser(),
  message: 'Operation successful',
  ...overrides
})

export const mockLocalStorage = () => {
  const store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => store[key] = value.toString()),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    removeItem: vi.fn(key => delete store[key]),
    _store: store
  }
}