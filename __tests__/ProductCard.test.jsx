import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';

// Mock useCart
vi.mock('@/context/CartContext', () => ({
  useCart: vi.fn(),
}));

describe('ProductCard', () => {
  const mockProduct = {
    id: 'p1',
    name: 'Burger Test',
    description: 'A delicious test burger',
    price: 25.90,
    imageUrl: null,
  };

  it('renders product information correctly', () => {
    useCart.mockReturnValue({
      addItem: vi.fn(),
      items: [],
      updateQuantity: vi.fn(),
    });

    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Burger Test')).toBeInTheDocument();
    expect(screen.getByText('A delicious test burger')).toBeInTheDocument();
    expect(screen.getByText(/25,90/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
  });

  it('calls addItem when "Adicionar" button is clicked', () => {
    const addItemMock = vi.fn();
    useCart.mockReturnValue({
      addItem: addItemMock,
      items: [],
      updateQuantity: vi.fn(),
    });

    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /adicionar/i });
    fireEvent.click(addButton);

    expect(addItemMock).toHaveBeenCalledWith(mockProduct);
  });

  it('shows quantity controls when item is already in cart', () => {
    useCart.mockReturnValue({
      addItem: vi.fn(),
      items: [{ ...mockProduct, quantity: 2 }],
      updateQuantity: vi.fn(),
    });

    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover 1/i })).toBeInTheDocument();
  });
});
