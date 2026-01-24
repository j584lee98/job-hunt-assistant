import '@testing-library/jest-dom'

// Mock react-markdown because it is ESM-only and causes issues with Jest
jest.mock('react-markdown', () => {
  return ({ children }: { children: React.ReactNode }) => {
    return children
  }
})
