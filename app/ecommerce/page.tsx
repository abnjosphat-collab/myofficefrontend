// app/ecommerce/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import Image from "next/image";
import { 
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  ChevronRight,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Package,
  ArrowRight,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  ChevronLeft,
  ChevronDown,
  ShoppingCart,
  Filter,
  Sparkles,
  Palette,
  Shirt,
  Watch,
  Gem,
  Camera,
  TrendingUp,
  CheckCircle,
  CreditCard,
  Headphones,
  Gift,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Award,
  Zap,
  Moon,
  Sun,
  ChevronUp,
  Eye,
  Tag,
  Percent,
  Clock,
  Users,
  MessageSquare,
  BadgeCheck,
  Circle,
  Droplets,
  Brush,
  Scissors,
  Home,
  Store,
  Grid,
  ShoppingBasket,
  TrendingDown,
  BookOpen,
  HelpCircle,
  AwardIcon,
  Badge,
  CircleDollarSign
} from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom Badge component (since Badge icon conflicts with component name)
const StatusBadge = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className || ''}`}>
      {children}
    </span>
  );
};

// =============== ANIMATION STYLES ===============
const animationStyles = `
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
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
      transform: translateY(-10px);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  @keyframes slide-in-right {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
    opacity: 0;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    background-size: 1000px 100%;
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.6s ease-out forwards;
    opacity: 0;
  }

  .animate-pulse-slow {
    animation: pulse 2s ease-in-out infinite;
  }
`;

// =============== TYPES ===============
type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  isNew?: boolean;
  isBestseller?: boolean;
  isSale?: boolean;
  colors?: string[];
};

type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
};

type Review = {
  id: number;
  name: string;
  role: string;
  rating: number;
  comment: string;
  avatar: string;
  verified: boolean;
};

// =============== COMPONENTS ===============
function ProductCard({ product }: { product: Product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-pink-50/50 to-rose-50/50 backdrop-blur-sm border border-rose-100/50 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-rose-200/50 group-hover:-translate-y-2">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {product.isNew && (
            <StatusBadge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 shadow-lg">
              <Sparkles className="h-3 w-3 mr-1" /> New
            </StatusBadge>
          )}
          {product.isBestseller && (
            <StatusBadge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              <TrendingUp className="h-3 w-3 mr-1" /> Bestseller
            </StatusBadge>
          )}
          {product.isSale && (
            <StatusBadge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg">
              <Percent className="h-3 w-3 mr-1" /> Sale
            </StatusBadge>
          )}
        </div>

        {/* Like button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}`} />
        </button>

        {/* Product image */}
        <div className="relative h-64 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-pink-100/30 to-rose-100/30"
            style={{
              backgroundImage: `url('${product.image}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(1.05)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
          
          {/* Quick add to cart on hover */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <ShoppingBag className="h-4 w-4 mr-2" /> Add to Cart
            </Button>
          </div>
        </div>

        {/* Product info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-rose-700 bg-rose-100/50 px-2 py-1 rounded-full">
              {product.category}
            </span>
            <div className="flex items-center">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-gray-700 ml-1">{product.rating}</span>
              <span className="text-xs text-gray-500 ml-1">({product.reviewCount})</span>
            </div>
          </div>
          
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1 group-hover:text-pink-700 transition-colors duration-300">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
              )}
            </div>
            
            {/* Color options */}
            {product.colors && (
              <div className="flex gap-1">
                {product.colors.slice(0, 3).map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {product.colors.length > 3 && (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-[8px] flex items-center justify-center text-gray-600 border border-gray-200">
                    +{product.colors.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.id}`}>
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-pink-50/50 backdrop-blur-sm border border-pink-100/50 hover:border-pink-200 transition-all duration-500 hover:shadow-xl hover:shadow-pink-200/50 hover:-translate-y-1">
        <div className="p-6">
          <div className={`p-3 rounded-xl w-fit mb-4 ${category.color} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
            {category.icon}
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">{category.name}</h3>
          <p className="text-sm text-gray-600">{category.count} products</p>
        </div>
      </div>
    </Link>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-gradient-to-b from-white to-pink-50/30 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-12 w-12 border-2 border-pink-100">
          <AvatarFallback className="bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700">
            {review.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">{review.name}</h4>
              <p className="text-sm text-gray-600">{review.role}</p>
            </div>
            {review.verified && (
              <BadgeCheck className="h-5 w-5 text-pink-500" />
            )}
          </div>
          <div className="flex items-center mt-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < review.rating ? 'fill-pink-500 text-pink-500' : 'text-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-gray-700 italic">&quot;{review.comment}&quot;</p>
    </div>
  );
}

// Dropdown Menu Component
function DropdownMenu({ title, items }: { title: string; items: { name: string; icon: React.ReactNode; href: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50 transition-all duration-300 font-medium">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div 
        className={`absolute top-full left-0 mt-1 min-w-[200px] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-pink-100/50 overflow-hidden transition-all duration-300 z-50 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="py-2">
          {items.map((item, index) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:text-pink-600 hover:bg-pink-50/50 transition-all duration-300 group/item"
            >
              <div className="text-pink-500 group-hover/item:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============== MAIN PAGE ===============
export default function EcommercePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const heroIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Product data with optimized images (no shimmer animation)
  const products: Product[] = [
    {
      id: 1,
      name: "Radiant Glow Serum",
      category: "Skincare",
      price: 42.99,
      originalPrice: 55.99,
      rating: 4.8,
      reviewCount: 124,
      image: "https://images.unsplash.com/photo-1556228578-9c360e1d8d34?auto=format&fit=crop&q=80&w=686&h=686",
      isNew: true,
      isBestseller: true,
      colors: ["#FFB6C1", "#FFD700", "#98FB98"]
    },
    {
      id: 2,
      name: "Silk Evening Dress",
      category: "Fashion",
      price: 189.99,
      rating: 4.9,
      reviewCount: 89,
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=686&h=686",
      isBestseller: true,
      colors: ["#000000", "#C0C0C0", "#8B4513"]
    },
    {
      id: 3,
      name: "Luxury Watch Gold",
      category: "Accessories",
      price: 349.99,
      originalPrice: 449.99,
      rating: 4.7,
      reviewCount: 203,
      image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=686&h=686",
      isSale: true,
      colors: ["#FFD700", "#C0C0C0", "#000000"]
    },
    {
      id: 4,
      name: "Hydrating Lipstick Set",
      category: "Makeup",
      price: 29.99,
      rating: 4.6,
      reviewCount: 156,
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=686&h=686",
      isNew: true,
      colors: ["#FF69B4", "#FF0000", "#8B0000"]
    },
    {
      id: 5,
      name: "Designer Handbag",
      category: "Accessories",
      price: 299.99,
      rating: 4.9,
      reviewCount: 67,
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=686&h=686",
      isBestseller: true,
      colors: ["#8B4513", "#000000", "#F5F5DC"]
    },
    {
      id: 6,
      name: "Organic Face Mask",
      category: "Skincare",
      price: 24.99,
      originalPrice: 34.99,
      rating: 4.5,
      reviewCount: 98,
      image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&q=80&w=686&h=686",
      isSale: true,
      colors: ["#98FB98", "#FFE4B5", "#E6E6FA"]
    },
    {
      id: 7,
      name: "Summer Collection Dress",
      category: "Fashion",
      price: 79.99,
      rating: 4.8,
      reviewCount: 142,
      image: "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?auto=format&fit=crop&q=80&w=686&h=686",
      isNew: true,
      colors: ["#FF69B4", "#00CED1", "#FFD700"]
    },
    {
      id: 8,
      name: "Diamond Earrings",
      category: "Jewelry",
      price: 459.99,
      rating: 5.0,
      reviewCount: 45,
      image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=686&h=686",
      isBestseller: true,
      colors: ["#C0C0C0", "#FFD700", "#E6E6FA"]
    },
  ];

  // Category data
  const categoryData: Category[] = [
    {
      id: 'skincare',
      name: 'Skincare',
      icon: <Palette className="h-6 w-6 text-pink-600" />,
      count: 156,
      color: 'bg-gradient-to-br from-pink-100 to-rose-100'
    },
    {
      id: 'makeup',
      name: 'Makeup',
      icon: <Brush className="h-6 w-6 text-rose-600" />,
      count: 234,
      color: 'bg-gradient-to-br from-rose-100 to-pink-100'
    },
    {
      id: 'fashion',
      name: 'Fashion',
      icon: <Shirt className="h-6 w-6 text-fuchsia-600" />,
      count: 189,
      color: 'bg-gradient-to-br from-fuchsia-100 to-purple-100'
    },
    {
      id: 'accessories',
      name: 'Accessories',
      icon: <Gem className="h-6 w-6 text-violet-600" />,
      count: 123,
      color: 'bg-gradient-to-br from-violet-100 to-purple-100'
    },
    {
      id: 'jewelry',
      name: 'Jewelry',
      icon: <Sparkles className="h-6 w-6 text-amber-500" />,
      count: 89,
      color: 'bg-gradient-to-br from-amber-100 to-orange-100'
    },
    {
      id: 'perfumes',
      name: 'Perfumes',
      icon: <Droplets className="h-6 w-6 text-emerald-500" />,
      count: 67,
      color: 'bg-gradient-to-br from-emerald-100 to-teal-100'
    },
  ];

  // Review data
  const reviewData: Review[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Beauty Influencer",
      rating: 5,
      comment: "The quality is exceptional! My skin has never felt better. Highly recommended!",
      avatar: "",
      verified: true
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Fashion Editor",
      rating: 5,
      comment: "Stylish and high-quality products. The perfect blend of fashion and comfort.",
      avatar: "",
      verified: true
    },
    {
      id: 3,
      name: "Emma Wilson",
      role: "Makeup Artist",
      rating: 4,
      comment: "Impressive collection! The makeup products are pigmented and long-lasting.",
      avatar: "",
      verified: true
    },
    {
      id: 4,
      name: "David Park",
      role: "Lifestyle Blogger",
      rating: 5,
      comment: "Outstanding customer service and premium quality products. My go-to shop!",
      avatar: "",
      verified: true
    },
  ];

  // Hero slides
  const heroSlides = [
    {
      id: 1,
      title: "Summer Collection",
      subtitle: "Discover the Latest Trends",
      description: "Up to 50% off on selected items",
      buttonText: "Shop Now",
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=2071",
      color: "from-pink-500/90 to-rose-500/90"
    },
    {
      id: 2,
      title: "Beauty Essentials",
      subtitle: "Glow From Within",
      description: "Premium skincare for radiant skin",
      buttonText: "Explore Skincare",
      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=2080",
      color: "from-purple-500/90 to-pink-500/90"
    },
    {
      id: 3,
      title: "Luxury Accessories",
      subtitle: "Elevate Your Style",
      description: "Handcrafted jewelry and watches",
      buttonText: "View Collection",
      image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=2080",
      color: "from-amber-500/90 to-orange-500/90"
    }
  ];

  // Brand logos with proper brand names and styles
  const featuredBrands = [
    { 
      name: "Chanel", 
      logo: "C",
      color: "from-black to-gray-800",
      textColor: "text-white"
    },
    { 
      name: "Dior", 
      logo: "D",
      color: "from-gray-900 to-black",
      textColor: "text-white"
    },
    { 
      name: "Gucci", 
      logo: "G",
      color: "from-red-900 to-red-700",
      textColor: "text-white"
    },
    { 
      name: "Estée Lauder", 
      logo: "EL",
      color: "from-blue-900 to-blue-700",
      textColor: "text-white"
    },
    { 
      name: "L'Oréal", 
      logo: "L",
      color: "from-pink-600 to-rose-600",
      textColor: "text-white"
    },
    { 
      name: "Sephora", 
      logo: "S",
      color: "from-purple-700 to-pink-600",
      textColor: "text-white"
    },
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeaturedProducts(products);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategories(categoryData);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviews(reviewData);

    // Auto-rotate hero slides (slower)
    heroIntervalRef.current = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);

    return () => {
      if (heroIntervalRef.current) {
        clearInterval(heroIntervalRef.current);
      }
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const benefits = [
    {
      icon: <Truck className="h-6 w-6" />,
      title: "Free Shipping",
      description: "On orders over $50"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Payment",
      description: "100% secure & encrypted"
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: "Easy Returns",
      description: "30-day return policy"
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: "24/7 Support",
      description: "Dedicated customer service"
    }
  ];

  // Navigation dropdown items
  const shopItems = [
    { name: "All Products", icon: <Store className="h-4 w-4" />, href: "/shop/all" },
    { name: "New Arrivals", icon: <Sparkles className="h-4 w-4" />, href: "/shop/new" },
    { name: "Bestsellers", icon: <TrendingUp className="h-4 w-4" />, href: "/shop/bestsellers" },
    { name: "On Sale", icon: <Tag className="h-4 w-4" />, href: "/shop/sale" },
    { name: "Gift Cards", icon: <Gift className="h-4 w-4" />, href: "/shop/gift-cards" },
  ];

  const categoryItems = [
    { name: "Skincare", icon: <Palette className="h-4 w-4" />, href: "/category/skincare" },
    { name: "Makeup", icon: <Brush className="h-4 w-4" />, href: "/category/makeup" },
    { name: "Fashion", icon: <Shirt className="h-4 w-4" />, href: "/category/fashion" },
    { name: "Accessories", icon: <Gem className="h-4 w-4" />, href: "/category/accessories" },
    { name: "Jewelry", icon: <Sparkles className="h-4 w-4" />, href: "/category/jewelry" },
    { name: "Perfumes", icon: <Droplets className="h-4 w-4" />, href: "/category/perfumes" },
  ];

  const moreItems = [
    { name: "About Us", icon: <Users className="h-4 w-4" />, href: "/about" },
    { name: "Our Blog", icon: <BookOpen className="h-4 w-4" />, href: "/blog" },
    { name: "Careers", icon: <Badge className="h-4 w-4" />, href: "/careers" },
    { name: "Sustainability", icon: <AwardIcon className="h-4 w-4" />, href: "/sustainability" },
    { name: "Help Center", icon: <HelpCircle className="h-4 w-4" />, href: "/help" },
  ];

  return (
    <>
      <style jsx global>{animationStyles}</style>
      
      {/* Background gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-pink-50/20 to-rose-50/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-200/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-pink-100/50 bg-white/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              {/* Logo - More e-commerce focused */}
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                  <div className="flex items-center justify-center">
                    <CircleDollarSign className="h-5 w-5 text-white" />
                    <ShoppingBag className="h-3 w-3 text-white absolute -right-1 -bottom-1" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-xl tracking-tight">AuraShop</span>
                  <span className="text-xs text-pink-600">Premium E-Commerce</span>
                </div>
              </Link>

              {/* Desktop Navigation with Dropdowns */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/" className="text-sm text-gray-700 hover:text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50 transition-all duration-300 font-medium">
                  <Home className="h-4 w-4 inline mr-2" /> Home
                </Link>
                
                <DropdownMenu 
                  title="Shop" 
                  items={shopItems}
                />

                <DropdownMenu 
                  title="Categories" 
                  items={categoryItems}
                />

                <DropdownMenu 
                  title="More" 
                  items={moreItems}
                />

                <Link href="/deals" className="text-sm text-gray-700 hover:text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50 transition-all duration-300 font-medium">
                  <Tag className="h-4 w-4 inline mr-2" /> Deals
                </Link>
              </nav>

              {/* Search Bar */}
              <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <form onSubmit={handleSearch} className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search products, brands, categories..."
                    className="w-full pl-10 pr-4 py-2 bg-white/50 backdrop-blur-sm border-pink-100 focus:border-pink-300 focus:ring-pink-200 rounded-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50 relative group">
                    <Heart className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[8px] text-white flex items-center justify-center">
                      5
                    </span>
                    <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-pink-100 p-4 z-50">
                      <p className="text-sm font-medium text-gray-800">Wishlist</p>
                      <p className="text-xs text-gray-600">5 items saved</p>
                    </div>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50 relative group">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[10px] text-white flex items-center justify-center">
                      3
                    </span>
                    <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-pink-100 p-4 z-50">
                      <p className="text-sm font-medium text-gray-800">Shopping Cart</p>
                      <p className="text-xs text-gray-600">3 items • $458.97</p>
                    </div>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50 relative group">
                    <User className="h-5 w-5" />
                    <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-pink-100 p-4 z-50">
                      <p className="text-sm font-medium text-gray-800">Account</p>
                      <p className="text-xs text-gray-600">Sign in or Register</p>
                    </div>
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <div className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-gray-600 hover:text-pink-600"
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-pink-100 bg-white/95 backdrop-blur-xl mt-2 py-4 rounded-b-xl shadow-xl">
              <div className="container mx-auto px-4">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 bg-white border-pink-100 rounded-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>

                {/* Mobile Navigation */}
                <div className="space-y-1">
                  <Link 
                    href="/" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 text-sm text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-300"
                  >
                    <Home className="h-4 w-4" /> Home
                  </Link>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 text-sm text-gray-700">
                      <span className="font-medium">Shop</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      {shopItems.slice(0, 3).map((item) => (
                        <Link 
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 text-sm text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-300"
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 text-sm text-gray-700">
                      <span className="font-medium">Categories</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      {categoryItems.slice(0, 3).map((item) => (
                        <Link 
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 text-sm text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-300"
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link 
                    href="/deals" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 text-sm text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-300"
                  >
                    <Tag className="h-4 w-4" /> Deals
                  </Link>
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center justify-around mt-6 pt-6 border-t border-pink-100">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-pink-600">
                    <Heart className="h-4 w-4 mr-2" /> Wishlist
                    <span className="ml-2 h-5 w-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[8px] text-white flex items-center justify-center">
                      5
                    </span>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-pink-600 relative">
                    <ShoppingBag className="h-4 w-4 mr-2" /> Cart
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[8px] text-white flex items-center justify-center">
                      3
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl mx-4 mt-6 mb-12">
          <div className="relative h-[500px] overflow-hidden rounded-3xl">
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentHeroSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent"
                  style={{
                    backgroundImage: `url('${slide.image}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${slide.color} mix-blend-overlay`} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
                
                <div className="relative container mx-auto h-full px-8 flex items-center">
                  <div className="max-w-xl text-white animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <StatusBadge className="mb-4 bg-white/20 backdrop-blur-sm border-white/30 text-white">
                      {slide.subtitle}
                    </StatusBadge>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                      {slide.title}
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 mb-8">
                      {slide.description}
                    </p>
                    <Button className="bg-white text-pink-700 hover:bg-white/90 px-8 py-3 text-lg rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300">
                      {slide.buttonText} <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Slide Indicators */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHeroSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentHeroSlide 
                      ? 'w-8 bg-white' 
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
            
            {/* Navigation Arrows */}
            <button
              onClick={() => setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* Main Content */}
        <main className="container mx-auto px-4">
          {/* Benefits Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {benefits.map((benefit, index) => (
              <div 
                key={benefit.title}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100 hover:border-pink-200 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 w-fit mb-3">
                  <div className="text-pink-600">{benefit.icon}</div>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Categories Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop by Category</h2>
                <p className="text-gray-600">Discover our curated collections</p>
              </div>
              <Button variant="outline" className="border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700">
                View All <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category, index) => (
                <div 
                  key={category.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CategoryCard category={category} />
                </div>
              ))}
            </div>
          </section>

          {/* Featured Products */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Products</h2>
                <p className="text-gray-600">Editor&apos;s picks this week</p>
              </div>
              <Tabs defaultValue="all" className="w-auto">
                <TabsList className="bg-pink-50 border border-pink-100">
                  <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="new" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500">
                    New
                  </TabsTrigger>
                  <TabsTrigger value="bestsellers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500">
                    Bestsellers
                  </TabsTrigger>
                  <TabsTrigger value="sale" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500">
                    On Sale
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <div 
                  key={product.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>

          {/* Promo Banner */}
          <section className="mb-16">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500/90 to-pink-500/90 p-8 md:p-12">
              <div className="relative z-10 max-w-xl">
                <StatusBadge className="mb-4 bg-white/20 backdrop-blur-sm border-white/30 text-white">
                  Limited Time Offer
                </StatusBadge>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Summer Sale! Up to 50% Off
                </h2>
                <p className="text-white/90 mb-6">
                  Discover amazing deals on premium beauty and fashion products. 
                  Don&apos;t miss out on our biggest sale of the season!
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button className="bg-white text-pink-700 hover:bg-white/90 px-6 py-3 rounded-full">
                    Shop Sale <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="border-white text-white hover:bg-white/10 px-6 py-3 rounded-full">
                    View Offers
                  </Button>
                </div>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/3">
                <div 
                  className="absolute inset-0 bg-gradient-to-l from-purple-500/20 to-transparent"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=2087')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              </div>
            </div>
          </section>

          {/* Customer Reviews */}
          <section className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">What Our Customers Say</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join thousands of satisfied customers who trust AuraShop for premium beauty and fashion
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {reviews.map((review, index) => (
                <div 
                  key={review.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>
          </section>

          {/* Brands Section */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Featured Brands</h2>
              <p className="text-gray-600">Shop premium brands you love</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {featuredBrands.map((brand, index) => (
                <div 
                  key={brand.name}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-pink-300 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${brand.color} opacity-90 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative p-8 flex flex-col items-center justify-center h-32">
                    <div className="text-2xl font-bold mb-2">
                      <span className={brand.textColor}>{brand.logo}</span>
                    </div>
                    <span className={`font-semibold text-sm ${brand.textColor} opacity-90 group-hover:opacity-100 transition-opacity duration-500`}>
                      {brand.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Newsletter */}
          <section className="mb-16">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 p-8 md:p-12 border border-pink-100">
              <div className="relative z-10 max-w-2xl mx-auto text-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 w-fit mx-auto mb-6">
                  <Mail className="h-6 w-6 text-pink-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Stay in the Loop
                </h2>
                <p className="text-gray-600 mb-8">
                  Subscribe to get exclusive offers, beauty tips, and early access to new collections
                </p>
                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 border-pink-200 focus:border-pink-300 focus:ring-pink-200 rounded-full px-6 py-3"
                  />
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 py-3 rounded-full whitespace-nowrap">
                    Subscribe
                  </Button>
                </form>
                <p className="text-sm text-gray-500 mt-4">
                  By subscribing, you agree to our Privacy Policy
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-pink-100 bg-white/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
                    <div className="flex items-center justify-center">
                      <CircleDollarSign className="h-5 w-5 text-white" />
                      <ShoppingBag className="h-3 w-3 text-white absolute -right-1 -bottom-1" />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-xl">AuraShop</span>
                    <span className="text-xs text-pink-600">Premium E-Commerce</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  Premium beauty and fashion products curated for the modern lifestyle.
                </p>
                <div className="flex gap-4">
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50">
                    <Instagram className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50">
                    <Facebook className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50">
                    <Youtube className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-6">Quick Links</h3>
                <ul className="space-y-3">
                  <li><Link href="/shop" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Shop All</Link></li>
                  <li><Link href="/new" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">New Arrivals</Link></li>
                  <li><Link href="/bestsellers" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Bestsellers</Link></li>
                  <li><Link href="/sale" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Sale</Link></li>
                  <li><Link href="/blog" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Blog</Link></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-6">Support</h3>
                <ul className="space-y-3">
                  <li><Link href="/contact" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Contact Us</Link></li>
                  <li><Link href="/faq" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">FAQ</Link></li>
                  <li><Link href="/shipping" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Shipping Info</Link></li>
                  <li><Link href="/returns" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Returns & Exchanges</Link></li>
                  <li><Link href="/privacy" className="text-gray-600 hover:text-pink-600 transition-colors duration-300">Privacy Policy</Link></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-6">Contact Info</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-gray-600">
                    <MapPin className="h-4 w-4 text-pink-500" />
                    123 Fashion Ave, New York, NY
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <Phone className="h-4 w-4 text-pink-500" />
                    (555) 123-4567
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <Mail className="h-4 w-4 text-pink-500" />
                    support@aurashop.com
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <Clock className="h-4 w-4 text-pink-500" />
                    Mon-Fri: 9AM-6PM EST
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-pink-100">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-600 text-sm">
                  © {new Date().getFullYear()} AuraShop. All rights reserved.
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">SSL Encrypted</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">We accept:</span>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">Visa</span>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">MasterCard</span>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">PayPal</span>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">Apple Pay</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}