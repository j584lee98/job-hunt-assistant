import { render } from '@testing-library/react'
import Page from '../app/page'

describe('Home', () => {
  it('renders a heading', () => {
    // This is a placeholder test to ensure Jest is working.
    // You will need to adjust this test based on what is actually in your app/page.tsx
    // For now, we just test that the component renders without crashing.
    render(<Page />)
    // Example: expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
