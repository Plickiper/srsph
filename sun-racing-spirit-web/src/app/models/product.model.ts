export interface ProductVariant {
  model: string;
  price: number;
  stockQuantity: number;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  partNumber: string;
  compatibility: string;
  price: number; // Base price (for backward compatibility)
  stockQuantity: number; // Total stock (for backward compatibility)
  variants?: ProductVariant[]; // Variant-specific pricing and stock
  description: string;
  inTheBox: string;
  imageUrl: string;
  images?: string[]; // Array of additional product images
  isPublished: boolean;
  isFeatured: boolean;
  color?: string; // Optional color property
  size?: string; // Optional size property
  rating?: number; // Product rating (0-5)
  reviewCount?: number; // Number of reviews
  soldCount?: number; // Number of items sold
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  search?: string;
  material?: string;
  compatibility?: string;
}

// Sun Racing Spirit Product Categories
export const MOTORCYCLE_CATEGORIES = [
  'CVT Components',
  'Exhaust Systems',
  'Transmission & Engine',
  'Lubricants & Fluids',
  'Variator Sets',
  'Clutch Systems',
  'Drive Belts',
  'Roller Weights',
  'Center Springs',
  'Torque Drives',
  'Pulley Sets',
  'Clutch Bell Lock Nuts'
] as const;

// Compatible Scooter Brands & Models
export const MOTORCYCLE_BRANDS = [
  'Yamaha',
  'Honda',
  'Sun Racing Spirit',
  'NMAX',
  'Aerox', 
  'Mio Soul I 125',
  'Mio Sporty',
  'Click',
  'PCX 160',
  'Beat FI'
] as const;

export interface CartItem {
  id: number;
  cartId?: number; // Optional for guest carts
  productId: number;
  product: Product;
  quantity: number;
  price: number;
  compatibility: string;
  size?: string; // Optional size property
  selected?: boolean; // For checkout selection
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER' | 'MANAGER';
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: number;
  userId?: number; // Optional for guest carts
  sessionId?: string; // For guest carts
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}


export interface Order {
  id: number;
  user: User;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: number;
  order: Order;
  product: Product;
  quantity: number;
  price: number;
}
