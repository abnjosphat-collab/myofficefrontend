// app/boutique/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from "next/link";
import { 
  ShoppingBag,
  Heart,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
  Star,
  Package,
  Shield,
  Truck,
  ArrowRight,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  Phone,
  MapPin,
  Filter,
  Grid,
  List,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Check,
  Tag,
  Clock,
  Award,
  Sparkles,
  ChevronUp
} from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Animation styles
const animationStyles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.6s ease-out forwards;
    opacity: 0;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`;

// Types
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  rating: number;
  reviews: number;
  description: string;
  colors: string[];
  sizes: string[];
  isNew: boolean;
  isBestseller: boolean;
  inStock: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: any;
  productCount: number;
}

// Simple Dropdown Components (since we don't have the shadcn one)
const DropdownMenu = ({ children }: any) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {children && typeof children === 'function'
        ? children({ open, setOpen })
        : children}
    </div>
  );
};

const DropdownMenuTrigger = ({ children }: any) => {
  return <div>{children}</div>;
};

const DropdownMenuContent = ({ children, className = '' }: any) => {
  return (
    <div className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md ${className}`}>
      {children}
    </div>
  );
};

const DropdownMenuItem = ({ children, className = '' }: any) => {
  return (
    <div className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 ${className}`}>
      {children}
    </div>
  );
};

// Simple Accordion Components
const Accordion = ({ children }: any) => {
  return <div className="space-y-4">{children}</div>;
};

const AccordionItem = ({ children, value }: any) => {
  return <div className="border-b border-gray-200 last:border-b-0">{children}</div>;
};

const AccordionTrigger = ({ children, onClick }: any) => {
  const [open, setOpen] = useState(false);
  
  const handleClick = () => {
    setOpen(!open);
    if (onClick) onClick();
  };
  
  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center justify-between py-3 text-left font-medium text-gray-900 hover:text-gray-700"
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
};

const AccordionContent = ({ children }: any) => {
  return <div className="pb-3 pt-0">{children}</div>;
};

// Simple Slider Component
const Slider = ({ value, onValueChange, max = 500, step = 10, className = '' }: any) => {
  const [sliderValue, setSliderValue] = useState(value || [0, max]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = [...sliderValue];
    newValue[index] = parseInt(e.target.value);
    setSliderValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <input
          type="range"
          min="0"
          max={max}
          step={step}
          value={sliderValue[0]}
          onChange={(e) => handleChange(e, 0)}
          className="absolute w-full h-2 bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900"
        />
        <input
          type="range"
          min="0"
          max={max}
          step={step}
          value={sliderValue[1]}
          onChange={(e) => handleChange(e, 1)}
          className="absolute w-full h-2 bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900"
        />
        <div className="relative h-2 w-full rounded-full bg-gray-200">
          <div 
            className="absolute h-2 rounded-full bg-gray-900"
            style={{
              left: `${(sliderValue[0] / max) * 100}%`,
              width: `${((sliderValue[1] - sliderValue[0]) / max) * 100}%`
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">${sliderValue[0]}</span>
        <span className="text-gray-600">${sliderValue[1]}</span>
      </div>
    </div>
  );
};

// Mock product data
const products: Product[] = [
  {
    id: 1,
    name: "Elegant Silk Blouse",
    category: "Tops",
    price: 89.99,
    originalPrice: 129.99,
    discount: 30,
    image: "/api/placeholder/300/400",
    rating: 4.8,
    reviews: 124,
    description: "Luxury silk blouse with delicate lace details",
    colors: ["#F87171", "#60A5FA", "#34D399"],
    sizes: ["XS", "S", "M", "L"],
    isNew: true,
    isBestseller: true,
    inStock: true
  },
  {
    id: 2,
    name: "Designer Denim Jacket",
    category: "Outerwear",
    price: 159.99,
    image: "/api/placeholder/300/400",
    rating: 4.6,
    reviews: 89,
    description: "Vintage wash denim jacket with custom embroidery",
    colors: ["#1E40AF", "#1F2937"],
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    isBestseller: true,
    inStock: true
  },
  {
    id: 3,
    name: "Evening Gown",
    category: "Dresses",
    price: 299.99,
    image: "/api/placeholder/300/400",
    rating: 4.9,
    reviews: 56,
    description: "Floor-length evening gown with sequin details",
    colors: ["#000000", "#DB2777"],
    sizes: ["XS", "S", "M"],
    isNew: true,
    isBestseller: false,
    inStock: true
  },
  {
    id: 4,
    name: "Cashmere Sweater",
    category: "Knitwear",
    price: 149.99,
    originalPrice: 199.99,
    discount: 25,
    image: "/api/placeholder/300/400",
    rating: 4.7,
    reviews: 203,
    description: "100% cashmere crewneck sweater",
    colors: ["#FBBF24", "#1F2937", "#A78BFA"],
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: false,
    isBestseller: true,
    inStock: true
  },
  {
    id: 5,
    name: "Leather Tote Bag",
    category: "Accessories",
    price: 249.99,
    image: "/api/placeholder/300/400",
    rating: 4.5,
    reviews: 78,
    description: "Genuine leather tote with gold hardware",
    colors: ["#78350F", "#000000"],
    sizes: ["One Size"],
    isNew: true,
    isBestseller: false,
    inStock: false
  },
  {
    id: 6,
    name: "Wide-Leg Trousers",
    category: "Bottoms",
    price: 119.99,
    originalPrice: 149.99,
    discount: 20,
    image: "/api/placeholder/300/400",
    rating: 4.4,
    reviews: 92,
    description: "High-waisted wide-leg trousers",
    colors: ["#6B7280", "#1F2937"],
    sizes: ["S", "M", "L"],
    isNew: false,
    isBestseller: true,
    inStock: true
  },
  {
    id: 7,
    name: "Linen Shirt Dress",
    category: "Dresses",
    price: 139.99,
    image: "/api/placeholder/300/400",
    rating: 4.8,
    reviews: 67,
    description: "Breathable linen shirt dress",
    colors: ["#FEF3C7", "#A7F3D0"],
    sizes: ["XS", "S", "M", "L"],
    isNew: true,
    isBestseller: false,
    inStock: true
  },
  {
    id: 8,
    name: "Silk Scarf Set",
    category: "Accessories",
    price: 79.99,
    image: "/api/placeholder/300/400",
    rating: 4.9,
    reviews: 145,
    description: "Set of 3 luxury silk scarves",
    colors: ["#EC4899", "#8B5CF6", "#06B6D4"],
    sizes: ["One Size"],
    isNew: false,
    isBestseller: true,
    inStock: true
  }
];

const categories: Category[] = [
  { id: 'dresses', name: 'Dresses', description: 'Evening & casual dresses', icon: Sparkles, productCount: 42 },
  { id: 'tops', name: 'Tops', description: 'Blouses & shirts', icon: Tag, productCount: 67 },
  { id: 'bottoms', name: 'Bottoms', description: 'Pants & skirts', icon: Package, productCount: 38 },
  { id: 'outerwear', name: 'Outerwear', description: 'Jackets & coats', icon: Shield, productCount: 29 },
  { id: 'accessories', name: 'Accessories', description: 'Bags & jewelry', icon: Award, productCount: 54 },
  { id: 'knitwear', name: 'Knitwear', description: 'Sweaters & cardigans', icon: Heart, productCount: 31 }
];

// Product Card Component
function ProductCard({ product }: { product: Product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Card className="overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group">
      <div 
        className="relative overflow-hidden bg-gray-50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Product Image */}
        <div className="aspect-square relative">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.isNew && (
              <Badge className="bg-white text-gray-900 hover:bg-white border border-gray-200">
                New
              </Badge>
            )}
            {product.discount && (
              <Badge className="bg-red-500 text-white hover:bg-red-600">
                -{product.discount}%
              </Badge>
            )}
            {!product.inStock && (
              <Badge variant="outline" className="bg-white/90 text-gray-700">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <Button
              size="icon"
              variant="ghost"
              className="bg-white/90 backdrop-blur-sm hover:bg-white"
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="bg-white/90 backdrop-blur-sm hover:bg-white"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <CardContent className="p-4">
          <div className="mb-2">
            <Badge variant="outline" className="text-xs mb-2">
              {product.category}
            </Badge>
            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-1">
              {product.name}
            </h3>
            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
              {product.description}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-gray-900 text-lg">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-gray-400 line-through text-sm">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-gray-600 text-xs ml-1">
                ({product.reviews})
              </span>
            </div>
            {product.isBestseller && (
              <Badge variant="secondary" className="text-xs">
                Bestseller
              </Badge>
            )}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-500 text-xs">Colors:</span>
            <div className="flex gap-1">
              {product.colors.map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button 
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
            disabled={!product.inStock}
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

// Category Card Component
function CategoryCard({ category }: { category: Category }) {
  const Icon = category.icon;
  
  return (
    <Link href={`/boutique/category/${category.id}`} className="group">
      <Card className="border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 group-hover:from-gray-200 group-hover:to-gray-100 transition-all duration-300">
              <Icon className="h-6 w-6 text-gray-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {category.name}
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              {category.description}
            </p>
            <div className="text-xs text-gray-500">
              {category.productCount} products
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Filter Sidebar Component
function FilterSidebar() {
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<string[]>(['price', 'size']);
  
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Navy', value: '#1E40AF' },
    { name: 'Red', value: '#DC2626' },
    { name: 'Green', value: '#16A34A' },
    { name: 'Pink', value: '#DB2777' },
    { name: 'Yellow', value: '#FBBF24' },
  ];

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          Clear All
        </Button>
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => toggleSection('price')}
            className="flex w-full items-center justify-between py-2 text-left font-medium text-gray-900 hover:text-gray-700"
          >
            <span>Price Range</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('price') ? 'rotate-180' : ''}`} />
          </button>
          {openSections.includes('price') && (
            <div className="pt-4">
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={500}
                step={10}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">${priceRange[0]}</span>
                <span className="text-gray-600">${priceRange[1]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Size */}
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => toggleSection('size')}
            className="flex w-full items-center justify-between py-2 text-left font-medium text-gray-900 hover:text-gray-700"
          >
            <span>Size</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('size') ? 'rotate-180' : ''}`} />
          </button>
          {openSections.includes('size') && (
            <div className="grid grid-cols-3 gap-2 pt-4">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`p-2 text-sm rounded border transition-all ${selectedSizes.includes(size)
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => toggleSection('color')}
            className="flex w-full items-center justify-between py-2 text-left font-medium text-gray-900 hover:text-gray-700"
          >
            <span>Color</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('color') ? 'rotate-180' : ''}`} />
          </button>
          {openSections.includes('color') && (
            <div className="grid grid-cols-3 gap-3 pt-4">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => toggleColor(color.value)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColors.includes(color.value)
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-xs text-gray-600">{color.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <button
            onClick={() => toggleSection('availability')}
            className="flex w-full items-center justify-between py-2 text-left font-medium text-gray-900 hover:text-gray-700"
          >
            <span>Availability</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('availability') ? 'rotate-180' : ''}`} />
          </button>
          {openSections.includes('availability') && (
            <div className="space-y-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-gray-900" />
                <span className="text-sm text-gray-700">In Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-gray-900" />
                <span className="text-sm text-gray-700">On Sale</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-gray-900" />
                <span className="text-sm text-gray-700">New Arrivals</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BoutiquePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('featured');
  const [cartItems, setCartItems] = useState(3);
  const [wishlistItems, setWishlistItems] = useState(7);

  return (
    <>
      <style jsx global>{animationStyles}</style>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link href="/boutique" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-gray-900 text-lg tracking-tight">Élégance</span>
                  <div className="text-xs text-gray-500 -mt-1">BOUTIQUE</div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/boutique" className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium">
                  Home
                </Link>
                
                <DropdownMenu>
                  {({ open, setOpen }: any) => (
                    <>
                      <button
                        onClick={() => setOpen(!open)}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium"
                      >
                        Shop
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {open && (
                        <DropdownMenuContent className="w-48">
                          {categories.map((category) => (
                            <DropdownMenuItem key={category.id}>
                              <Link href={`/boutique/category/${category.id}`} className="w-full">
                                {category.name}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      )}
                    </>
                  )}
                </DropdownMenu>
                
                <Link href="/boutique/new-arrivals" className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium">
                  New Arrivals
                </Link>
                <Link href="/boutique/sale" className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium">
                  Sale
                </Link>
                <Link href="/boutique/about" className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium">
                  About
                </Link>
              </nav>

              {/* Search Bar - Desktop */}
              <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translateY-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-10 border-gray-300 focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 relative">
                    <Heart className="h-5 w-5" />
                    {wishlistItems > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {wishlistItems}
                      </span>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItems > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-gray-900 text-white text-xs rounded-full flex items-center justify-center">
                        {cartItems}
                      </span>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
                    <User className="h-5 w-5" />
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <div className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-gray-600 hover:bg-gray-100"
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="lg:hidden border-t border-gray-200 mt-2 pb-4">
                <div className="pt-4">
                  {/* Mobile Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search products..."
                      className="pl-10 border-gray-300"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Link 
                      href="/boutique" 
                      className="text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Home
                    </Link>
                    
                    <div className="px-4 py-2">
                      <div className="text-sm text-gray-700 font-medium mb-2">Shop</div>
                      <div className="flex flex-col space-y-2 pl-4">
                        {categories.map((category) => (
                          <Link 
                            key={category.id} 
                            href={`/boutique/category/${category.id}`}
                            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <Link 
                      href="/boutique/new-arrivals" 
                      className="text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      New Arrivals
                    </Link>
                    <Link 
                      href="/boutique/sale" 
                      className="text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sale
                    </Link>
                    <Link 
                      href="/boutique/about" 
                      className="text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      About
                    </Link>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200 mt-4">
                    <Button variant="ghost" className="flex-1 text-gray-600">
                      <Heart className="h-4 w-4 mr-2" />
                      Wishlist ({wishlistItems})
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Cart ({cartItems})
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1">
          {/* Hero Banner */}
          <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <div className="container mx-auto px-4 py-20">
              <div className="max-w-2xl">
                <Badge className="mb-6 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0">
                  New Collection
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Autumn Collection 2024
                </h1>
                <p className="text-gray-300 text-lg mb-8 max-w-xl">
                  Discover timeless elegance with our latest collection of luxury fashion and accessories.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-8">
                    Shop Collection
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                    View Lookbook
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Categories Section */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop by Category</h2>
                <p className="text-gray-600">Find exactly what you&apos;re looking for</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CategoryCard category={category} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Products */}
          <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
                  <p className="text-gray-600">Curated collection of our best items</p>
                </div>
                <Link href="/boutique/shop" className="text-sm text-gray-900 hover:text-gray-700 font-medium flex items-center gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.slice(0, 4).map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bestsellers */}
          <section className="py-12 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-gray-700" />
                  <h2 className="text-2xl font-bold text-gray-900">Bestsellers</h2>
                </div>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our most loved items, chosen by our customers
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.filter(p => p.isBestseller).slice(0, 4).map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Shop Grid with Filters */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Filters Sidebar */}
                <div className="lg:w-1/4">
                  <FilterSidebar />
                </div>

                {/* Products Grid */}
                <div className="lg:w-3/4">
                  {/* Products Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">All Products</h2>
                      <p className="text-gray-600 text-sm">Showing {products.length} products</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="icon"
                          onClick={() => setViewMode('grid')}
                          className="h-9 w-9"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="icon"
                          onClick={() => setViewMode('list')}
                          className="h-9 w-9"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <DropdownMenu>
                        {({ open, setOpen }: any) => (
                          <>
                            <button
                              onClick={() => setOpen(!open)}
                              className="inline-flex items-center justify-center gap-2 h-9 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium hover:bg-gray-100"
                            >
                              Sort by: {sortBy === 'featured' ? 'Featured' : sortBy === 'newest' ? 'Newest' : 'Price'}
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            {open && (
                              <DropdownMenuContent className="w-48">
                                <DropdownMenuItem onClick={() => { setSortBy('featured'); setOpen(false); }}>
                                  Featured
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortBy('newest'); setOpen(false); }}>
                                  Newest
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortBy('price-low'); setOpen(false); }}>
                                  Price: Low to High
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortBy('price-high'); setOpen(false); }}>
                                  Price: High to Low
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            )}
                          </>
                        )}
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                    {products.map((product, index) => (
                      <div
                        key={product.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <Button variant="outline" size="icon">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="default" className="h-9 w-9">1</Button>
                    <Button variant="outline" className="h-9 w-9">2</Button>
                    <Button variant="outline" className="h-9 w-9">3</Button>
                    <Button variant="outline" className="h-9 w-9">4</Button>
                    <Button variant="outline" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="p-3 rounded-full bg-gray-100 inline-block mb-4">
                    <Truck className="h-6 w-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Free Shipping</h3>
                  <p className="text-gray-600 text-sm">On orders over $100</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 rounded-full bg-gray-100 inline-block mb-4">
                    <Shield className="h-6 w-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Secure Payment</h3>
                  <p className="text-gray-600 text-sm">100% secure transactions</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 rounded-full bg-gray-100 inline-block mb-4">
                    <Package className="h-6 w-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Easy Returns</h3>
                  <p className="text-gray-600 text-sm">30-day return policy</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 rounded-full bg-gray-100 inline-block mb-4">
                    <Clock className="h-6 w-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
                  <p className="text-gray-600 text-sm">Dedicated customer service</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-800 to-gray-700">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-lg">Élégance</span>
                    <div className="text-xs text-gray-400">BOUTIQUE</div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Luxury fashion boutique offering premium quality clothing and accessories.
                </p>
                <div className="flex gap-4 mt-4">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Instagram className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Twitter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-4 text-sm">Shop</h4>
                <ul className="space-y-2">
                  {categories.slice(0, 4).map((category) => (
                    <li key={category.id}>
                      <Link 
                        href={`/boutique/category/${category.id}`}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-4 text-sm">Customer Service</h4>
                <ul className="space-y-2">
                  <li><Link href="/boutique/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link href="/boutique/shipping" className="text-sm text-gray-400 hover:text-white transition-colors">Shipping Info</Link></li>
                  <li><Link href="/boutique/returns" className="text-sm text-gray-400 hover:text-white transition-colors">Returns & Exchanges</Link></li>
                  <li><Link href="/boutique/faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-4 text-sm">Contact Info</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">123 Fashion Ave, New York</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">(555) 123-4567</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">hello@elegance.com</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <Separator className="my-8 bg-gray-800" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                © {new Date().getFullYear()} Élégance Boutique. All rights reserved.
              </p>
              <div className="flex gap-6">
                <Link href="/boutique/privacy" className="text-xs text-gray-500 hover:text-gray-400">
                  Privacy Policy
                </Link>
                <Link href="/boutique/terms" className="text-xs text-gray-500 hover:text-gray-400">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}