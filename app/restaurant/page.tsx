// app/restaurant/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { RequireAuth } from '@/components/shared/RequireAuth';
import Image from "next/image";
import { 
  Utensils,
  ChefHat,
  MapPin,
  Phone,
  Clock,
  Star,
  Heart,
  User,
  Search,
  Menu as MenuIcon,
  X,
  ChevronRight,
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
  ShoppingBag,
  Filter,
  Sparkles,
  Camera,
  TrendingUp,
  CheckCircle,
  CreditCard,
  Headphones,
  Gift,
  Mail,
  Globe,
  Lock,
  Award,
  Zap,
  ChevronUp,
  Eye,
  Tag,
  Percent,
  Users,
  MessageSquare,
  BadgeCheck,
  Circle,
  Droplets,
  Scissors,
  Home,
  Store,
  Grid,
  ShoppingBasket,
  TrendingDown,
  BookOpen,
  HelpCircle,
  Badge,
  CircleDollarSign,
  Calendar,
  Wine,
  Coffee,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Cake,
  IceCream,
  EggFried,
  Drumstick,
  Fish,
  Carrot,
  Apple,
  Beef,
  Milk,
  Cookie,
  Beer,
  ChefHatIcon,
  Flame,
  Clock3,
  WineIcon,
  CoffeeIcon,
  Martini,
  Bell,
  AwardIcon,
  UsersRound,
  MapPinIcon,
  PhoneCall,
  Mailbox,
  ShoppingCart,
  CreditCardIcon,
  StoreIcon,
  TruckIcon,
  Leaf,
  ShieldCheck,
  Crown,
  Trophy,
  Gem,
  FlameIcon,
  ChefHat as ChefHat2,
  Award as Award2,
  UtensilsCrossed,
  Wine as Wine2,
  Coffee as Coffee2
} from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
//import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from '@/components/app-shell';

// Custom Badge component
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

  @keyframes cooking {
    0% {
      transform: scale(1) rotate(0deg);
    }
    25% {
      transform: scale(1.05) rotate(5deg);
    }
    50% {
      transform: scale(1.1) rotate(0deg);
    }
    75% {
      transform: scale(1.05) rotate(-5deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
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

  .animate-cooking {
    animation: cooking 3s ease-in-out infinite;
  }
`;

// =============== TYPES ===============
type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  rating: number;
  reviewCount: number;
  image: string;
  isNew?: boolean;
  isChefspecial?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  prepTime?: string;
  calories?: number;
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
  visitDate: string;
};

type ReservationTime = {
  time: string;
  available: boolean;
};

// =============== COMPONENTS ===============
function MenuItemCard({ item }: { item: MenuItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50/50 to-orange-50/50 backdrop-blur-sm border border-amber-100/50 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-amber-200/50 group-hover:-translate-y-2">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {item.isNew && (
            <StatusBadge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              <Sparkles className="h-3 w-3 mr-1" /> New
            </StatusBadge>
          )}
          {item.isChefspecial && (
            <StatusBadge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-lg">
              <ChefHat className="h-3 w-3 mr-1" /> Chef&apos;s Special
            </StatusBadge>
          )}
          {item.isVegetarian && (
            <StatusBadge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-lg">
              <Leaf className="h-3 w-3 mr-1" /> Vegetarian
            </StatusBadge>
          )}
          {item.isSpicy && (
            <StatusBadge className="bg-gradient-to-r from-red-600 to-orange-500 text-white border-0 shadow-lg">
              <FlameIcon className="h-3 w-3 mr-1" /> Spicy
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

        {/* Food image */}
        <div className="relative h-48 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-amber-100/30 to-orange-100/30"
            style={{
              backgroundImage: `url('${item.image}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(1.05)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
          
          {/* Quick add to order on hover */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <ShoppingBag className="h-4 w-4 mr-2" /> Add to Order
            </Button>
          </div>
        </div>

        {/* Food info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 bg-amber-100/50 px-2 py-1 rounded-full">
              {item.category}
            </span>
            <div className="flex items-center">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-gray-700 ml-1">{item.rating}</span>
              <span className="text-xs text-gray-500 ml-1">({item.reviewCount})</span>
            </div>
          </div>
          
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1 group-hover:text-amber-700 transition-colors duration-300">
            {item.name}
          </h3>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">${item.price.toFixed(2)}</span>
              {item.calories && (
                <span className="text-xs text-gray-500">{item.calories} cal</span>
              )}
            </div>
            
            {/* Prep time */}
            {item.prepTime && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {item.prepTime}
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
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-amber-50/50 backdrop-blur-sm border border-amber-100/50 hover:border-amber-200 transition-all duration-500 hover:shadow-xl hover:shadow-amber-200/50 hover:-translate-y-1">
        <div className="p-6">
          <div className={`p-3 rounded-xl w-fit mb-4 ${category.color} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
            {category.icon}
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">{category.name}</h3>
          <p className="text-sm text-gray-600">{category.count} items</p>
        </div>
      </div>
    </Link>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-gradient-to-b from-white to-amber-50/30 backdrop-blur-sm rounded-2xl p-6 border border-amber-100/50 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-12 w-12 border-2 border-amber-100">
          <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700">
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
              <BadgeCheck className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">{review.visitDate}</span>
          </div>
        </div>
      </div>
      <p className="text-gray-700 italic">&quot;{review.comment}&quot;</p>
    </div>
  );
}

// Dropdown Menu Component for Restaurant
function RestaurantDropdownMenu({ title, items }: { title: string; items: { name: string; icon: React.ReactNode; href: string }[] }) {
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
      <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-amber-600 px-4 py-2 rounded-lg hover:bg-amber-50 transition-all duration-300 font-medium">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div 
        className={`absolute top-full left-0 mt-1 min-w-[200px] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-amber-100/50 overflow-hidden transition-all duration-300 z-50 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="py-2">
          {items.map((item, index) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:text-amber-600 hover:bg-amber-50/50 transition-all duration-300 group/item"
            >
              <div className="text-amber-500 group-hover/item:scale-110 transition-transform duration-300">
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

// Reservation Time Slot Component
function TimeSlot({ time, available, onClick }: { time: string; available: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
        available
          ? 'bg-white text-gray-800 border border-amber-200 hover:bg-amber-50 hover:border-amber-300 hover:shadow-md'
          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
      }`}
    >
      {time}
      {!available && <span className="block text-xs text-gray-500">Booked</span>}
    </button>
  );
}

// =============== MAIN PAGE ===============
function RestaurantPageContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const heroIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [reservationDate, setReservationDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState('');
  const [reservationTimes, setReservationTimes] = useState<ReservationTime[]>([]);

  // Menu data with food images
  const foodItems: MenuItem[] = [
    {
      id: 1,
      name: "Truffle Mushroom Risotto",
      category: "Italian",
      price: 24.99,
      description: "Creamy arborio rice with wild mushrooms, white truffle oil, and parmesan",
      rating: 4.9,
      reviewCount: 142,
      image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=686&h=686",
      isNew: true,
      isChefspecial: true,
      isVegetarian: true,
      prepTime: "20 min",
      calories: 420
    },
    {
      id: 2,
      name: "Grilled Salmon",
      category: "Seafood",
      price: 32.99,
      description: "Atlantic salmon with lemon butter sauce, asparagus, and roasted potatoes",
      rating: 4.8,
      reviewCount: 189,
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=686&h=686",
      isChefspecial: true,
      prepTime: "25 min",
      calories: 480
    },
    {
      id: 3,
      name: "Wagyu Beef Burger",
      category: "Burgers",
      price: 28.99,
      description: "Premium wagyu beef patty with aged cheddar, truffle aioli, and brioche bun",
      rating: 4.7,
      reviewCount: 203,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=686&h=686",
      isSpicy: true,
      prepTime: "18 min",
      calories: 720
    },
    {
      id: 4,
      name: "Margherita Pizza",
      category: "Pizza",
      price: 19.99,
      description: "Wood-fired pizza with San Marzano tomatoes, fresh mozzarella, and basil",
      rating: 4.6,
      reviewCount: 156,
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=686&h=686",
      isVegetarian: true,
      prepTime: "15 min",
      calories: 380
    },
    {
      id: 5,
      name: "Crab Linguine",
      category: "Pasta",
      price: 26.99,
      description: "Fresh crab meat with garlic, chili, white wine, and parsley",
      rating: 4.9,
      reviewCount: 98,
      image: "https://images.unsplash.com/photo-1563379091339-03246963d9d6?auto=format&fit=crop&q=80&w=686&h=686",
      isNew: true,
      isSpicy: true,
      prepTime: "22 min",
      calories: 450
    },
    {
      id: 6,
      name: "Caesar Salad",
      category: "Salads",
      price: 16.99,
      description: "Crisp romaine, parmesan, croutons, and our signature Caesar dressing",
      rating: 4.5,
      reviewCount: 87,
      image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=686&h=686",
      isVegetarian: true,
      prepTime: "10 min",
      calories: 320
    },
    {
      id: 7,
      name: "Lamb Chops",
      category: "Main Course",
      price: 36.99,
      description: "Herb-crusted lamb chops with mint jus, roasted vegetables, and potato gratin",
      rating: 4.8,
      reviewCount: 124,
      image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=686&h=686",
      isChefspecial: true,
      prepTime: "30 min",
      calories: 520
    },
    {
      id: 8,
      name: "Chocolate Lava Cake",
      category: "Desserts",
      price: 12.99,
      description: "Warm chocolate cake with molten center, vanilla ice cream, and berries",
      rating: 4.9,
      reviewCount: 215,
      image: "https://images.unsplash.com/photo-1624353365286-3f8d62dadadf?auto=format&fit=crop&q=80&w=686&h=686",
      isVegetarian: true,
      prepTime: "12 min",
      calories: 380
    },
  ];

  // Category data for restaurant
  const categoryData: Category[] = [
    {
      id: 'appetizers',
      name: 'Appetizers',
      icon: <EggFried className="h-6 w-6 text-amber-600" />,
      count: 15,
      color: 'bg-gradient-to-br from-amber-100 to-orange-100'
    },
    {
      id: 'main-course',
      name: 'Main Course',
      icon: <Drumstick className="h-6 w-6 text-red-600" />,
      count: 24,
      color: 'bg-gradient-to-br from-red-100 to-rose-100'
    },
    {
      id: 'pizza',
      name: 'Pizza',
      icon: <Pizza className="h-6 w-6 text-orange-600" />,
      count: 12,
      color: 'bg-gradient-to-br from-orange-100 to-amber-100'
    },
    {
      id: 'pasta',
      name: 'Pasta',
      icon: <UtensilsCrossed className="h-6 w-6 text-yellow-600" />,
      count: 8,
      color: 'bg-gradient-to-br from-yellow-100 to-amber-100'
    },
    {
      id: 'seafood',
      name: 'Seafood',
      icon: <Fish className="h-6 w-6 text-brand-600" />,
      count: 10,
      color: 'bg-gradient-to-br from-brand-100 to-cyan-100'
    },
    {
      id: 'desserts',
      name: 'Desserts',
      icon: <Cake className="h-6 w-6 text-rose-600" />,
      count: 18,
      color: 'bg-gradient-to-br from-rose-100 to-pink-100'
    },
    {
      id: 'drinks',
      name: 'Drinks',
      icon: <Wine2 className="h-6 w-6 text-purple-600" />,
      count: 22,
      color: 'bg-gradient-to-br from-purple-100 to-violet-100'
    },
    {
      id: 'specials',
      name: 'Specials',
      icon: <Crown className="h-6 w-6 text-amber-500" />,
      count: 8,
      color: 'bg-gradient-to-br from-amber-100 to-yellow-100'
    },
  ];

  // Review data
  const reviewData: Review[] = [
    {
      id: 1,
      name: "Michael Rossi",
      role: "Food Critic",
      rating: 5,
      comment: "The truffle risotto is absolutely divine! Best I've had outside of Italy.",
      avatar: "",
      verified: true,
      visitDate: "Last week"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "Regular Customer",
      rating: 5,
      comment: "Exceptional service and the lamb chops were cooked to perfection.",
      avatar: "",
      verified: true,
      visitDate: "3 days ago"
    },
    {
      id: 3,
      name: "David Chen",
      role: "Food Blogger",
      rating: 4,
      comment: "Creative menu with amazing flavor combinations. The wine pairing was spot on.",
      avatar: "",
      verified: true,
      visitDate: "Yesterday"
    },
    {
      id: 4,
      name: "Emma Wilson",
      role: "Local Guide",
      rating: 5,
      comment: "Atmosphere, food, service - everything is perfect. My new favorite spot!",
      avatar: "",
      verified: true,
      visitDate: "2 weeks ago"
    },
  ];

  // Hero slides for restaurant
  const heroSlides = [
    {
      id: 1,
      title: "Fine Dining Experience",
      subtitle: "Culinary Excellence",
      description: "Award-winning cuisine in an elegant atmosphere",
      buttonText: "View Menu",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2070",
      color: "from-amber-900/80 to-orange-900/80"
    },
    {
      id: 2,
      title: "Seasonal Specials",
      subtitle: "Fresh Ingredients",
      description: "Farm-to-table dining with locally sourced produce",
      buttonText: "See Specials",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070",
      color: "from-emerald-900/80 to-teal-900/80"
    },
    {
      id: 3,
      title: "Private Events",
      subtitle: "Memorable Gatherings",
      description: "Perfect venue for celebrations and corporate events",
      buttonText: "Book Event",
      image: "https://images.unsplash.com/photo-1554679665-f5537f187268?auto=format&fit=crop&q=80&w=2070",
      color: "from-rose-900/80 to-pink-900/80"
    }
  ];

  // Reservation times
  const timeSlots: ReservationTime[] = [
    { time: "5:00 PM", available: true },
    { time: "5:30 PM", available: true },
    { time: "6:00 PM", available: false },
    { time: "6:30 PM", available: true },
    { time: "7:00 PM", available: false },
    { time: "7:30 PM", available: true },
    { time: "8:00 PM", available: true },
    { time: "8:30 PM", available: true },
    { time: "9:00 PM", available: false },
    { time: "9:30 PM", available: true },
  ];

  // Restaurant features
  const features = [
    {
      icon: <Leaf className="h-6 w-6" />,
      title: "Fresh Ingredients",
      description: "Locally sourced, farm-to-table"
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Award Winning",
      description: "Michelin Guide recommended"
    },
    {
      icon: <Wine className="h-6 w-6" />,
      title: "Curated Wine List",
      description: "300+ wine selections"
    },
    {
      icon: <ChefHat className="h-6 w-6" />,
      title: "Expert Chefs",
      description: "World-class culinary team"
    }
  ];

  // Navigation dropdown items for restaurant
  const menuItemsList = [
    { name: "Full Menu", icon: <MenuIcon className="h-4 w-4" />, href: "/menu" },
    { name: "Specials", icon: <Crown className="h-4 w-4" />, href: "/specials" },
    { name: "Chef's Picks", icon: <ChefHat className="h-4 w-4" />, href: "/chefs-picks" },
    { name: "Seasonal Items", icon: <Leaf className="h-4 w-4" />, href: "/seasonal" },
    { name: "Wine Pairing", icon: <Wine className="h-4 w-4" />, href: "/wine-pairing" },
  ];

  const aboutItems = [
    { name: "Our Story", icon: <BookOpen className="h-4 w-4" />, href: "/story" },
    { name: "Our Chefs", icon: <ChefHat className="h-4 w-4" />, href: "/chefs" },
    { name: "Awards", icon: <Award className="h-4 w-4" />, href: "/awards" },
    { name: "Gallery", icon: <Camera className="h-4 w-4" />, href: "/gallery" },
    { name: "Careers", icon: <UsersRound className="h-4 w-4" />, href: "/careers" },
  ];

  const eventsItems = [
    { name: "Private Dining", icon: <Users className="h-4 w-4" />, href: "/private-dining" },
    { name: "Wine Tasting", icon: <Wine className="h-4 w-4" />, href: "/wine-tasting" },
    { name: "Cooking Classes", icon: <Utensils className="h-4 w-4" />, href: "/cooking-classes" },
    { name: "Holiday Events", icon: <Calendar className="h-4 w-4" />, href: "/holiday-events" },
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuItems(foodItems);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategories(categoryData);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviews(reviewData);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReservationTimes(timeSlots);

    // Set default reservation date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReservationDate(tomorrow.toISOString().split('T')[0]);

    // Auto-rotate hero slides
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

  const handleReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTime) {
      alert(`Reservation confirmed for ${reservationDate} at ${selectedTime} for ${partySize} people!`);
    } else {
      alert('Please select a time for your reservation.');
    }
  };

  return (
    <AppShell>
      <style jsx global>{animationStyles}</style>
      {/* Page Header */}
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
          <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-[#2A4D69] font-medium">Restaurant</span>
        </nav>
        <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">La Belle Vue Restaurant</h1>
        <p className="text-[#6B7B8E] mt-1">Fine dining management, reservations, and menu showcase.</p>
      </div>
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
                    <Button className="bg-white text-amber-700 hover:bg-white/90 px-8 py-3 text-lg rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300">
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
          {/* Features Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-100 hover:border-amber-200 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 w-fit mb-3">
                  <div className="text-amber-600">{feature.icon}</div>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Quick Reservation */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-amber-900/90 to-orange-900/90 rounded-3xl p-8 md:p-12 overflow-hidden">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="lg:w-1/2">
                  <StatusBadge className="mb-4 bg-white/20 backdrop-blur-sm border-white/30 text-white">
                    Reserve Your Table
                  </StatusBadge>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Book a Memorable Dining Experience
                  </h2>
                  <p className="text-amber-100 mb-6">
                    Secure your spot at our award-winning restaurant. Limited seating available.
                  </p>
                  <div className="flex items-center gap-4 text-amber-100">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>(555) 123-4567</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>5 PM - 10 PM Daily</span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-1/2 w-full bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <form onSubmit={handleReservation} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-amber-100 mb-1 block">Date</label>
                        <Input
                          type="date"
                          value={reservationDate}
                          onChange={(e) => setReservationDate(e.target.value)}
                          className="bg-white/90 border-amber-200"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-amber-100 mb-1 block">Party Size</label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="border-amber-300"
                            onClick={() => setPartySize(Math.max(1, partySize - 1))}
                          >
                            -
                          </Button>
                          <span className="px-4 py-2 bg-white/90 rounded-lg border border-amber-200 min-w-[60px] text-center">
                            {partySize}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="border-amber-300"
                            onClick={() => setPartySize(partySize + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-amber-100 mb-2 block">Select Time</label>
                      <div className="grid grid-cols-5 gap-2">
                        {reservationTimes.map((slot) => (
                          <TimeSlot
                            key={slot.time}
                            time={slot.time}
                            available={slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                          />
                        ))}
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-white text-amber-700 hover:bg-white/90"
                      size="lg"
                    >
                      <Calendar className="h-4 w-4 mr-2" /> Confirm Reservation
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          {/* Menu Categories */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Menu Categories</h2>
                <p className="text-gray-600">Explore our culinary offerings</p>
              </div>
              <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700">
                View Full Menu <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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

          {/* Featured Dishes */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Dishes</h2>
                <p className="text-gray-600">Chef&apos;s recommendations this week</p>
              </div>
              <Tabs defaultValue="all" className="w-auto">
                <TabsList className="bg-amber-50 border border-amber-100">
                  <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="specials" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500">
                    Specials
                  </TabsTrigger>
                  <TabsTrigger value="new" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500">
                    New
                  </TabsTrigger>
                  <TabsTrigger value="vegetarian" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500">
                    Vegetarian
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {menuItems.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <MenuItemCard item={item} />
                </div>
              ))}
            </div>
          </section>

          {/* Special Offers Banner */}
          <section className="mb-16">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-500/90 to-orange-500/90 p-8 md:p-12">
              <div className="relative z-10 max-w-xl">
                <StatusBadge className="mb-4 bg-white/20 backdrop-blur-sm border-white/30 text-white">
                  Limited Time Offer
                </StatusBadge>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Weekend Brunch Special
                </h2>
                <p className="text-white/90 mb-6">
                  Enjoy our famous bottomless mimosa brunch every Saturday & Sunday from 11 AM - 3 PM. 
                  Free-flowing mimosas with any brunch entrée.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button className="bg-white text-red-700 hover:bg-white/90 px-6 py-3 rounded-full">
                    View Brunch Menu <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="border-white text-white hover:bg-white/10 px-6 py-3 rounded-full">
                    Reserve Table
                  </Button>
                </div>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/3">
                <div 
                  className="absolute inset-0 bg-gradient-to-l from-red-500/20 to-transparent"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=2071')",
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
              <h2 className="text-3xl font-bold text-gray-900 mb-3">What Our Guests Say</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join thousands of satisfied diners who have experienced La Belle Vue
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

          {/* Awards & Recognition */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Awards & Recognition</h2>
              <p className="text-gray-600">Celebrating excellence in dining</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "Michelin Guide", year: "2024", icon: <Award className="h-8 w-8 text-red-600" /> },
                { name: "Wine Spectator", year: "2023", icon: <Wine className="h-8 w-8 text-purple-600" /> },
                { name: "AAA Diamond", year: "2024", icon: <Gem className="h-8 w-8 text-brand-600" /> },
                { name: "Best Fine Dining", year: "2023", icon: <Trophy className="h-8 w-8 text-amber-600" /> },
              ].map((award, index) => (
                <div 
                  key={award.name}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-100 hover:border-amber-200 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center text-center"
                >
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 mb-4">
                    {award.icon}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1">{award.name}</h3>
                  <p className="text-sm text-gray-600">{award.year}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Newsletter */}
          <section className="mb-16">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-8 md:p-12 border border-amber-100">
              <div className="relative z-10 max-w-2xl mx-auto text-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 w-fit mx-auto mb-6">
                  <Mail className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Stay Updated
                </h2>
                <p className="text-gray-600 mb-8">
                  Subscribe to get exclusive offers, seasonal menus, and event announcements
                </p>
                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 border-amber-200 focus:border-amber-300 focus:ring-amber-200 rounded-full px-6 py-3"
                  />
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-3 rounded-full whitespace-nowrap">
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

    </AppShell>
  );
}

export default function RestaurantPage() {
  return <RequireAuth><RestaurantPageContent /></RequireAuth>;
}