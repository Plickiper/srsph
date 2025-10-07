# Sun Racing Spirit Web Frontend

A modern, responsive Angular frontend for the Sun Racing Spirit eCommerce platform specializing in premium motorcycle parts and racing accessories.

## 🎯 Features

### Core Functionality
- **Product Browsing**: Browse and search through products with advanced filtering
- **Product Details**: Detailed product pages with image galleries and specifications
- **Shopping Cart**: Add/remove items, quantity management, and cart persistence
- **User Authentication**: Login/register system with JWT support
- **Order Management**: View order history and track orders
- **Responsive Design**: Mobile-first approach with seamless desktop experience

### Pages & Components
- **Home Page**: Hero section, featured products, categories, and newsletter signup
- **Products Page**: Grid view with filters (brand, category, price, stock)
- **Product Detail**: Individual product pages with add-to-cart functionality
- **Cart Page**: Shopping cart management and checkout initiation
- **Authentication**: Login and registration pages
- **Orders**: Order history and tracking

### Design & Styling
- **Sun Racing Spirit Theme**: Dark theme with brand colors (sun yellow, racing blue, metallic silver)
- **Modern Typography**: Montserrat and Poppins fonts
- **SCSS Styling**: Organized, maintainable stylesheets
- **Responsive Grid**: Mobile-first responsive design
- **Smooth Animations**: CSS transitions and hover effects

## 🛠️ Technology Stack

- **Angular 17**: Latest Angular framework with standalone components
- **TypeScript**: Type-safe development
- **SCSS**: Advanced CSS preprocessing
- **RxJS**: Reactive programming for data streams
- **Angular Router**: Client-side routing and navigation
- **Angular Forms**: Template-driven and reactive forms

## 📁 Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── navbar/         # Navigation bar
│   │   ├── footer/         # Site footer
│   │   ├── product-card/   # Product display card
│   │   └── product-list/   # Product grid component
│   ├── pages/              # Page components
│   │   ├── home/           # Homepage
│   │   ├── products/       # Product listing
│   │   ├── product-detail/ # Product details
│   │   ├── cart/           # Shopping cart
│   │   ├── checkout/       # Checkout process
│   │   ├── auth/           # Authentication pages
│   │   └── orders/         # Order management
│   ├── services/           # Business logic services
│   │   ├── product.service.ts
│   │   ├── auth.service.ts
│   │   └── cart.service.ts
│   ├── models/             # TypeScript interfaces
│   │   └── product.model.ts
│   ├── app.component.ts    # Root component
│   └── app.routes.ts       # Routing configuration
├── styles.scss             # Global styles and CSS variables
└── index.html              # Main HTML file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Angular CLI 17+

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

  3. **Open browser**:
     Navigate to `http://localhost:4200`

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 🎨 Design System

### Color Palette
- **Primary Black**: `#0a0a0a` - Main background
- **Secondary Black**: `#1a1a1a` - Card backgrounds
- **Sun Yellow**: `#ffd700` - Primary brand color
- **Racing Blue**: `#0066cc` - Secondary brand color
- **Electric Blue**: `#00aaff` - Accent color
- **Metallic Silver**: `#c0c0c0` - Tertiary accent
- **White**: `#ffffff` - Text and highlights

### Typography
- **Primary Font**: Montserrat (headings, UI elements)
- **Secondary Font**: Poppins (body text, descriptions)
- **Font Weights**: 300, 400, 500, 600, 700, 800, 900

### Spacing System
- **XS**: 0.25rem (4px)
- **SM**: 0.5rem (8px)
- **MD**: 1rem (16px)
- **LG**: 1.5rem (24px)
- **XL**: 2rem (32px)
- **2XL**: 3rem (48px)
- **3XL**: 4rem (64px)

## 🔧 Configuration

### Backend Integration
The frontend is configured to connect to the Spring Boot backend at:
- **API Base URL**: `http://localhost:8080/api`
- **Products Endpoint**: `/products`
- **Authentication**: JWT-based (placeholder implementation)

### Environment Variables
Create environment files for different configurations:
- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🧩 Components

### ProductCard
Reusable component for displaying product information with:
- Product image with hover effects
- Brand, name, and price display
- Add to cart and wishlist functionality
- Badge system for new arrivals and sales

### ProductList
Grid component for displaying multiple products with:
- Responsive grid layout
- Loading and empty states
- Pagination support
- Filter integration

### Navbar
Fixed navigation bar with:
- Logo and brand identity
- Search functionality
- Shopping cart indicator
- User authentication menu
- Mobile-responsive hamburger menu

## 🛒 Shopping Cart

The cart service provides:
- **Add/Remove Items**: Add products with size selection
- **Quantity Management**: Update item quantities
- **Persistence**: Cart state saved to localStorage
- **Total Calculation**: Automatic price calculations
- **Size Management**: Dynamic size selection based on product type

## 🔐 Authentication

Authentication service includes:
- **Login/Register**: User account management
- **JWT Token**: Secure token-based authentication
- **Role Management**: Admin, user, and manager roles
- **Session Persistence**: Automatic login state management

## 📊 State Management

The application uses Angular services for state management:
- **ProductService**: Product data and API calls
- **CartService**: Shopping cart state management
- **AuthService**: User authentication and session management

## 🎯 Future Enhancements

- **Payment Integration**: Stripe/PayPal payment processing
- **User Profiles**: Detailed user account management
- **Wishlist**: Save favorite products
- **Product Reviews**: Customer review system
- **Advanced Search**: Elasticsearch integration
- **Push Notifications**: Real-time updates
- **PWA Support**: Progressive Web App features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for Sun Racing Spirit eCommerce platform.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.