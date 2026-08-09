// app/roomRental/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { RequireAuth } from '@/components/shared/RequireAuth';
import { 
  Home,
  MapPin,
  Search,
  Filter,
  Heart,
  User,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Star,
  CheckCircle,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Wifi,
  Coffee,
  Car,
  Dog,
  Cat,
  Utensils,
  Tv,
  Snowflake,
  ThermometerSun,
  Shield,
  Lock,
  Smartphone,
  Mail,
  Phone,
  ChevronLeft,
  ChevronDown,
  Eye,
  TrendingUp,
  TrendingDown,
  Building,
  Key,
  DoorOpen,
  Bed,
  Bath,
  Square,
  MoveVertical,
  ArrowRight,
  Sparkles,
  Award,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Badge as BadgeIcon,
  CircleDollarSign,
  ShieldCheck,
  CreditCard,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Globe,
  Map,
  Navigation,
  Check,
  X as XIcon,
  Briefcase,
  CalendarDays,
  CalendarRange,
  UsersRound,
  ShieldIcon
} from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { AppShell } from '@/components/app-shell';

// Custom Badge component
const Badge = ({ 
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

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
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

  .animate-slide-up {
    animation: slide-up 0.5s ease-out forwards;
    opacity: 0;
  }
`;

// =============== TYPES ===============
type RentalProperty = {
  id: number;
  title: string;
  type: 'apartment' | 'house' | 'room' | 'studio';
  location: string;
  price: number;
  rating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  availableFrom: string;
  minStay: number;
  maxStay: number;
  isVerified: boolean;
  isSuperhost: boolean;
  isInstantBook: boolean;
  isFeatured?: boolean;
  isDiscounted?: boolean;
  discountPercentage?: number;
  distance?: string;
  latitude: number;
  longitude: number;
};

type FilterOptions = {
  priceRange: [number, number];
  propertyTypes: string[];
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  minStay: number;
  maxStay: number;
  availableFrom: string;
  instantBook: boolean;
  verifiedOnly: boolean;
  superhostOnly: boolean;
};

// =============== COMPONENTS ===============
function PropertyCard({ property }: { property: RentalProperty }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'apartment': return <Building className="h-4 w-4" />;
      case 'house': return <Home className="h-4 w-4" />;
      case 'room': return <Bed className="h-4 w-4" />;
      case 'studio': return <DoorOpen className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50/50 to-indigo-50/50 backdrop-blur-sm border border-brand-100/50 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-brand-200/50 group-hover:-translate-y-2">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {property.isFeatured && (
            <Badge className="bg-gradient-to-r from-brand-500 to-indigo-500 text-white border-0 shadow-lg">
              <Sparkles className="h-3 w-3 mr-1" /> Featured
            </Badge>
          )}
          {property.isDiscounted && (
            <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-lg">
              <TrendingDown className="h-3 w-3 mr-1" /> {property.discountPercentage}% Off
            </Badge>
          )}
          {property.isInstantBook && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              <Key className="h-3 w-3 mr-1" /> Instant Book
            </Badge>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>

        {/* Property images */}
        <div className="relative h-56 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-brand-100/30 to-indigo-100/30 transition-all duration-500"
            style={{
              backgroundImage: `url('${property.images[currentImageIndex]}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(1.05)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
          
          {/* Image navigation */}
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
            {property.images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
          
          {/* Quick view on hover */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <Button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-brand-700 shadow-xl">
              <Eye className="h-4 w-4 mr-2" /> View Details
            </Button>
          </div>
        </div>

        {/* Property info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-100/50 px-2 py-1 rounded-full">
                {getPropertyTypeIcon(property.type)}
                <span className="capitalize">{property.type}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600">{property.distance}</span>
              </div>
            </div>
            <div className="flex items-center">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-gray-700 ml-1">{property.rating}</span>
              <span className="text-xs text-gray-500 ml-1">({property.reviewCount})</span>
            </div>
          </div>
          
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1 group-hover:text-brand-700 transition-colors duration-300">
            {property.title}
          </h3>
          
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Square className="h-3 w-3" />
              <span>{property.area} sq ft</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">${property.price}</span>
                <span className="text-sm text-gray-600">/month</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">Available {property.availableFrom}</span>
              </div>
            </div>
            
            {/* Stay duration */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{property.minStay} - {property.maxStay} months</span>
              </div>
              {property.isVerified && (
                <div className="flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ filters, onFilterChange }: { filters: FilterOptions; onFilterChange: (filters: FilterOptions) => void }) {
  const propertyTypes = [
    { id: 'apartment', label: 'Apartments', icon: <Building className="h-4 w-4" /> },
    { id: 'house', label: 'Houses', icon: <Home className="h-4 w-4" /> },
    { id: 'room', label: 'Rooms', icon: <Bed className="h-4 w-4" /> },
    { id: 'studio', label: 'Studios', icon: <DoorOpen className="h-4 w-4" /> },
  ];

  const amenitiesList = [
    { id: 'wifi', label: 'WiFi', icon: <Wifi className="h-4 w-4" /> },
    { id: 'parking', label: 'Parking', icon: <Car className="h-4 w-4" /> },
    { id: 'pets', label: 'Pet Friendly', icon: <Dog className="h-4 w-4" /> },
    { id: 'kitchen', label: 'Kitchen', icon: <Utensils className="h-4 w-4" /> },
    { id: 'ac', label: 'Air Conditioning', icon: <Snowflake className="h-4 w-4" /> },
    { id: 'heating', label: 'Heating', icon: <ThermometerSun className="h-4 w-4" /> },
    { id: 'tv', label: 'TV', icon: <Tv className="h-4 w-4" /> },
    { id: 'laundry', label: 'Laundry', icon: <Snowflake className="h-4 w-4" /> }, // Replaced WashingMachine
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-brand-100 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-800 text-lg">Filters</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-brand-600 hover:text-brand-700 hover:bg-brand-50"
          onClick={() => onFilterChange({
            priceRange: [500, 5000],
            propertyTypes: [],
            bedrooms: 0,
            bathrooms: 0,
            amenities: [],
            minStay: 1,
            maxStay: 36,
            availableFrom: '',
            instantBook: false,
            verifiedOnly: false,
            superhostOnly: false,
          })}
        >
          Clear All
        </Button>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Price Range</h4>
        <div className="space-y-4">
          <Slider
            defaultValue={filters.priceRange}
            min={300}
            max={10000}
            step={100}
            onValueChange={(value) => onFilterChange({ ...filters, priceRange: value as [number, number] })}
            className="my-6"
          />
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>${filters.priceRange[0]}</span>
            <span>${filters.priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Property Types */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Property Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {propertyTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                const newTypes = filters.propertyTypes.includes(type.id)
                  ? filters.propertyTypes.filter(t => t !== type.id)
                  : [...filters.propertyTypes, type.id];
                onFilterChange({ ...filters, propertyTypes: newTypes });
              }}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-300 ${
                filters.propertyTypes.includes(type.id)
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bedrooms & Bathrooms */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Bedrooms</h4>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => onFilterChange({ ...filters, bedrooms: num })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                  filters.bedrooms === num
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num === 0 ? 'Any' : `${num}+`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Bathrooms</h4>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => onFilterChange({ ...filters, bathrooms: num })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                  filters.bathrooms === num
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num === 0 ? 'Any' : `${num}+`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Amenities</h4>
        <div className="grid grid-cols-2 gap-2">
          {amenitiesList.map((amenity) => (
            <button
              key={amenity.id}
              onClick={() => {
                const newAmenities = filters.amenities.includes(amenity.id)
                  ? filters.amenities.filter(a => a !== amenity.id)
                  : [...filters.amenities, amenity.id];
                onFilterChange({ ...filters, amenities: newAmenities });
              }}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-300 ${
                filters.amenities.includes(amenity.id)
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {amenity.icon}
              {amenity.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stay Duration */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Stay Duration</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Min Stay (months)</label>
            <Input
              type="number"
              min="1"
              value={filters.minStay}
              onChange={(e) => onFilterChange({ ...filters, minStay: parseInt(e.target.value) || 1 })}
              className="border-brand-200"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Max Stay (months)</label>
            <Input
              type="number"
              min={filters.minStay}
              value={filters.maxStay}
              onChange={(e) => onFilterChange({ ...filters, maxStay: parseInt(e.target.value) || 36 })}
              className="border-brand-200"
            />
          </div>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.instantBook}
            onChange={(e) => onFilterChange({ ...filters, instantBook: e.target.checked })}
            className="h-4 w-4 text-brand-500 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Instant Book Available</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => onFilterChange({ ...filters, verifiedOnly: e.target.checked })}
            className="h-4 w-4 text-brand-500 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Verified Properties Only</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.superhostOnly}
            onChange={(e) => onFilterChange({ ...filters, superhostOnly: e.target.checked })}
            className="h-4 w-4 text-brand-500 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Superhost Properties Only</span>
        </label>
      </div>
    </div>
  );
}

function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckIn(today.toISOString().split('T')[0]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckOut(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(`${location} from ${checkIn} to ${checkOut} for ${guests} guest${guests !== 1 ? 's' : ''}`);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-brand-100 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Where to?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 border-brand-200 focus:border-brand-300 focus:ring-brand-200"
              />
            </div>
          </div>

          {/* Check-in */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Check-in</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="pl-10 border-brand-200 focus:border-brand-300 focus:ring-brand-200"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Check-out */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Check-out</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="pl-10 border-brand-200 focus:border-brand-300 focus:ring-brand-200"
                min={checkIn}
              />
            </div>
          </div>

          {/* Guests */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Guests</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                min="1"
                max="10"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                className="pl-10 border-brand-200 focus:border-brand-300 focus:ring-brand-200"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-600 hover:to-indigo-600 text-white px-8"
          >
            <Search className="h-4 w-4 mr-2" /> Search Properties
          </Button>
          <Button variant="outline" className="border-brand-200 text-brand-600 hover:bg-brand-50">
            <Filter className="h-4 w-4 mr-2" /> Advanced Filters
          </Button>
        </div>
      </form>
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
      <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 transition-all duration-300 font-medium">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div 
        className={`absolute top-full left-0 mt-1 min-w-[200px] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-brand-100/50 overflow-hidden transition-all duration-300 z-50 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="py-2">
          {items.map((item, index) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:text-brand-600 hover:bg-brand-50/50 transition-all duration-300 group/item"
            >
              <div className="text-brand-500 group-hover/item:scale-110 transition-transform duration-300">
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
function RentalPageContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<RentalProperty[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [500, 5000],
    propertyTypes: [],
    bedrooms: 0,
    bathrooms: 0,
    amenities: [],
    minStay: 1,
    maxStay: 36,
    availableFrom: '',
    instantBook: false,
    verifiedOnly: false,
    superhostOnly: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Sample rental properties data
  const rentalProperties: RentalProperty[] = [
    {
      id: 1,
      title: "Modern Studio in Downtown",
      type: 'studio',
      location: "Downtown, Manhattan",
      price: 1850,
      rating: 4.8,
      reviewCount: 142,
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'kitchen', 'ac', 'heating', 'tv'],
      bedrooms: 1,
      bathrooms: 1,
      area: 450,
      availableFrom: "Now",
      minStay: 3,
      maxStay: 12,
      isVerified: true,
      isSuperhost: true,
      isInstantBook: true,
      isFeatured: true,
      isDiscounted: true,
      discountPercentage: 15,
      distance: "0.5 mi from center",
      latitude: 40.7128,
      longitude: -74.0060
    },
    {
      id: 2,
      title: "Luxury 2BR Apartment with View",
      type: 'apartment',
      location: "Financial District, NYC",
      price: 4200,
      rating: 4.9,
      reviewCount: 89,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'parking', 'kitchen', 'ac', 'heating', 'tv', 'laundry'],
      bedrooms: 2,
      bathrooms: 2,
      area: 950,
      availableFrom: "Next week",
      minStay: 6,
      maxStay: 24,
      isVerified: true,
      isSuperhost: true,
      isInstantBook: true,
      isFeatured: true,
      distance: "0.2 mi from center",
      latitude: 40.7034,
      longitude: -74.0134
    },
    {
      id: 3,
      title: "Cozy Private Room in Shared House",
      type: 'room',
      location: "Brooklyn Heights",
      price: 950,
      rating: 4.6,
      reviewCount: 156,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'kitchen', 'ac', 'heating', 'tv', 'laundry'],
      bedrooms: 1,
      bathrooms: 1,
      area: 180,
      availableFrom: "Today",
      minStay: 1,
      maxStay: 36,
      isVerified: true,
      isSuperhost: false,
      isInstantBook: true,
      isDiscounted: true,
      discountPercentage: 10,
      distance: "1.2 mi from center",
      latitude: 40.6953,
      longitude: -73.9952
    },
    {
      id: 4,
      title: "Spacious 3BR Family House",
      type: 'house',
      location: "Queens, NYC",
      price: 3200,
      rating: 4.7,
      reviewCount: 203,
      images: [
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1567496898669-ee935f003f30?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'parking', 'pets', 'kitchen', 'ac', 'heating', 'tv', 'laundry'],
      bedrooms: 3,
      bathrooms: 2,
      area: 1450,
      availableFrom: "In 3 days",
      minStay: 12,
      maxStay: 36,
      isVerified: true,
      isSuperhost: true,
      isInstantBook: false,
      isFeatured: true,
      distance: "2.5 mi from center",
      latitude: 40.7282,
      longitude: -73.7949
    },
    {
      id: 5,
      title: "Premium 1BR Loft with Balcony",
      type: 'apartment',
      location: "Williamsburg, Brooklyn",
      price: 2850,
      rating: 4.9,
      reviewCount: 78,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'kitchen', 'ac', 'heating', 'tv', 'laundry'],
      bedrooms: 1,
      bathrooms: 1,
      area: 650,
      availableFrom: "In 2 days",
      minStay: 3,
      maxStay: 18,
      isVerified: true,
      isSuperhost: true,
      isInstantBook: true,
      distance: "0.8 mi from center",
      latitude: 40.7081,
      longitude: -73.9571
    },
    {
      id: 6,
      title: "Budget-Friendly Shared Room",
      type: 'room',
      location: "Upper East Side",
      price: 750,
      rating: 4.3,
      reviewCount: 92,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'ac', 'heating'],
      bedrooms: 1,
      bathrooms: 1,
      area: 120,
      availableFrom: "Now",
      minStay: 1,
      maxStay: 12,
      isVerified: false,
      isSuperhost: false,
      isInstantBook: false,
      isDiscounted: true,
      discountPercentage: 20,
      distance: "1.5 mi from center",
      latitude: 40.7736,
      longitude: -73.9566
    },
    {
      id: 7,
      title: "Modern Penthouse Suite",
      type: 'apartment',
      location: "Midtown Manhattan",
      price: 5500,
      rating: 4.95,
      reviewCount: 45,
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'parking', 'kitchen', 'ac', 'heating', 'tv', 'laundry'],
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      availableFrom: "Next month",
      minStay: 6,
      maxStay: 24,
      isVerified: true,
      isSuperhost: true,
      isInstantBook: true,
      isFeatured: true,
      distance: "0.1 mi from center",
      latitude: 40.7549,
      longitude: -73.9840
    },
    {
      id: 8,
      title: "Charming Garden Studio",
      type: 'studio',
      location: "West Village",
      price: 2200,
      rating: 4.7,
      reviewCount: 112,
      images: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=686&h=686',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=686&h=686'
      ],
      amenities: ['wifi', 'kitchen', 'ac', 'heating', 'pets'],
      bedrooms: 1,
      bathrooms: 1,
      area: 500,
      availableFrom: "Now",
      minStay: 3,
      maxStay: 12,
      isVerified: true,
      isSuperhost: false,
      isInstantBook: true,
      isDiscounted: true,
      discountPercentage: 12,
      distance: "0.3 mi from center",
      latitude: 40.7336,
      longitude: -74.0027
    }
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProperties(rentalProperties);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilteredProperties(rentalProperties);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...properties];

    // Price range filter
    filtered = filtered.filter(property => 
      property.price >= filters.priceRange[0] && 
      property.price <= filters.priceRange[1]
    );

    // Property types filter
    if (filters.propertyTypes.length > 0) {
      filtered = filtered.filter(property => 
        filters.propertyTypes.includes(property.type)
      );
    }

    // Bedrooms filter
    if (filters.bedrooms > 0) {
      filtered = filtered.filter(property => 
        property.bedrooms >= filters.bedrooms
      );
    }

    // Bathrooms filter
    if (filters.bathrooms > 0) {
      filtered = filtered.filter(property => 
        property.bathrooms >= filters.bathrooms
      );
    }

    // Amenities filter
    if (filters.amenities.length > 0) {
      filtered = filtered.filter(property =>
        filters.amenities.every(amenity => property.amenities.includes(amenity))
      );
    }

    // Stay duration filter
    filtered = filtered.filter(property =>
      property.minStay >= filters.minStay && property.maxStay <= filters.maxStay
    );

    // Additional filters
    if (filters.instantBook) {
      filtered = filtered.filter(property => property.isInstantBook);
    }

    if (filters.verifiedOnly) {
      filtered = filtered.filter(property => property.isVerified);
    }

    if (filters.superhostOnly) {
      filtered = filtered.filter(property => property.isSuperhost);
    }

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query) ||
        property.type.toLowerCase().includes(query)
      );
    }

    // Active tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(property => property.type === activeTab);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilteredProperties(filtered);
  }, [filters, properties, searchQuery, activeTab]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleViewModeToggle = () => {
    setViewMode(viewMode === 'grid' ? 'map' : 'grid');
  };

  // Stats for dashboard
  const stats = [
    { label: 'Total Properties', value: properties.length, icon: <Home className="h-5 w-5" />, change: '+12%' },
    { label: 'Average Price', value: `$${Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length)}`, icon: <DollarSign className="h-5 w-5" />, change: '+5%' },
    { label: 'Verified Hosts', value: properties.filter(p => p.isVerified).length, icon: <ShieldCheck className="h-5 w-5" />, change: '+8%' },
    { label: 'Instant Book', value: properties.filter(p => p.isInstantBook).length, icon: <Key className="h-5 w-5" />, change: '+15%' },
  ];

  return (
    <AppShell>
      <style jsx global>{animationStyles}</style>
      {/* Page Header */}
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
          <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-[#2A4D69] font-medium">Room Rental</span>
        </nav>
        <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">RentSpace</h1>
        <p className="text-[#6B7B8E] mt-1">Find, manage, and book room rentals with ease.</p>
      </div>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Find Your Perfect
              <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent"> Rental Space</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Discover comfortable and affordable rentals for any duration. Verified properties, trusted hosts, and seamless booking.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-6xl mx-auto mb-8">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card 
                key={stat.label} 
                className="border-brand-100 bg-white/50 backdrop-blur-sm animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {stat.change.startsWith('+') ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {stat.change} from last month
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-full bg-gradient-to-br from-brand-50 to-indigo-50 text-brand-500">
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content - Updated Layout */}
          <div className="flex flex-col">
            {/* Filters at the top (horizontal scroll on mobile) */}
            <div className="mb-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {filteredProperties.length} Properties Found
                    </h2>
                    <p className="text-gray-600">In {filters.propertyTypes.length > 0 ? filters.propertyTypes.join(', ') : 'all categories'}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={`px-3 ${viewMode === 'grid' ? 'bg-white shadow' : 'text-gray-600'}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </Button>
                      <Button
                        variant={viewMode === 'map' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className={`px-3 ${viewMode === 'map' ? 'bg-white shadow' : 'text-gray-600'}`}
                      >
                        <Map className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Sort Dropdown */}
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-500">
                      <option>Sort by: Recommended</option>
                      <option>Price: Low to High</option>
                      <option>Price: High to Low</option>
                      <option>Rating: Highest First</option>
                      <option>Newest First</option>
                    </select>
                  </div>
                </div>

                {/* Property Type Tabs */}
                <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
                  <TabsList className="bg-brand-50/50 p-1 rounded-xl w-full overflow-x-auto">
                    <TabsTrigger value="all" className="data-[state=active]:bg-white rounded-lg whitespace-nowrap">All Types</TabsTrigger>
                    <TabsTrigger value="apartment" className="data-[state=active]:bg-white rounded-lg whitespace-nowrap">Apartments</TabsTrigger>
                    <TabsTrigger value="house" className="data-[state=active]:bg-white rounded-lg whitespace-nowrap">Houses</TabsTrigger>
                    <TabsTrigger value="room" className="data-[state=active]:bg-white rounded-lg whitespace-nowrap">Rooms</TabsTrigger>
                    <TabsTrigger value="studio" className="data-[state=active]:bg-white rounded-lg whitespace-nowrap">Studios</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Quick Filters Bar */}
                <div className="mb-6">
                  <div className="bg-white rounded-xl p-4 border border-brand-100">
                    <div className="flex flex-col space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Price Range Quick Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={filters.priceRange[0]}
                              onChange={(e) => setFilters({...filters, priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]]})}
                              className="w-full"
                            />
                            <span className="text-gray-500">-</span>
                            <Input
                              type="number"
                              placeholder="Max"
                              value={filters.priceRange[1]}
                              onChange={(e) => setFilters({...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value) || 10000]})}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Bedrooms Quick Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Bedrooms</label>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map((num) => (
                              <button
                                key={num}
                                onClick={() => setFilters({ ...filters, bedrooms: num })}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                                  filters.bedrooms === num
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {num === 0 ? 'Any' : `${num}+`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Instant Book Quick Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Booking</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setFilters({ ...filters, instantBook: !filters.instantBook })}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                                filters.instantBook
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Instant Book
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, verifiedOnly: !filters.verifiedOnly })}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                                filters.verifiedOnly
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Verified Only
                            </button>
                          </div>
                        </div>

                        {/* Amenities Quick Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Top Amenities</label>
                          <div className="flex gap-2">
                            {['wifi', 'parking', 'pets'].map((amenity) => (
                              <button
                                key={amenity}
                                onClick={() => {
                                  const newAmenities = filters.amenities.includes(amenity)
                                    ? filters.amenities.filter(a => a !== amenity)
                                    : [...filters.amenities, amenity];
                                  setFilters({ ...filters, amenities: newAmenities });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 flex items-center gap-1 ${
                                  filters.amenities.includes(amenity)
                                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                    : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                              >
                                {amenity === 'wifi' && <Wifi className="h-3 w-3" />}
                                {amenity === 'parking' && <Car className="h-3 w-3" />}
                                {amenity === 'pets' && <Dog className="h-3 w-3" />}
                                <span className="capitalize">{amenity}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Show More Filters Button */}
                      <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          className="border-brand-200 text-brand-600 hover:bg-brand-50"
                          onClick={() => {
                            // Scroll to filter panel
                            const filterPanel = document.getElementById('filter-panel');
                            if (filterPanel) {
                              filterPanel.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          <Filter className="h-4 w-4 mr-2" /> Show All Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties Grid or Map View */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((property, index) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property}
                  />
                ))}
              </div>
            ) : (
              <div className="h-[600px] rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50/50 to-indigo-50/50 flex items-center justify-center">
                <div className="text-center">
                  <Map className="h-16 w-16 text-brand-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Interactive Map View</h3>
                  <p className="text-gray-600 mb-4">View properties on an interactive map</p>
                  <Button className="bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-600 hover:to-indigo-600 text-white">
                    <Navigation className="h-4 w-4 mr-2" /> Open Full Map
                  </Button>
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No properties found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search criteria</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      priceRange: [500, 5000],
                      propertyTypes: [],
                      bedrooms: 0,
                      bathrooms: 0,
                      amenities: [],
                      minStay: 1,
                      maxStay: 36,
                      availableFrom: '',
                      instantBook: false,
                      verifiedOnly: false,
                      superhostOnly: false,
                    });
                    setSearchQuery('');
                    setActiveTab('all');
                  }}
                >
                  <XIcon className="h-4 w-4 mr-2" /> Clear All Filters
                </Button>
              </div>
            )}

            {/* Full Filter Panel (Initially hidden, can be accessed via "Show All Filters") */}
            <div id="filter-panel" className="mt-12">
              <FilterPanel filters={filters} onFilterChange={setFilters} />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-brand-500 to-indigo-500 mt-12">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to Find Your Perfect Stay?</h2>
              <p className="text-lg mb-8 text-brand-100">
                Join thousands of happy renters who found their ideal home through RentSpace
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-white text-brand-600 hover:bg-brand-50 px-8">
                  Start Searching
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  <BookOpen className="h-4 w-4 mr-2" /> Learn How it Works
                </Button>
              </div>
            </div>
          </div>
        </div>
    </AppShell>
  );
}

export default function RentalPage() {
  return <RequireAuth><RentalPageContent /></RequireAuth>;
}