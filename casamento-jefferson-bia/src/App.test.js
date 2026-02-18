import { render, screen } from '@testing-library/react';
import App from './App';

test('renders wedding title', () => {
  render(<App />);
  const titleElement = screen.getByText(/casamento jefferson e bia/i);
  expect(titleElement).toBeInTheDocument();
});
