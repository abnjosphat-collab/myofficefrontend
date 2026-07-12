// app/shop/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  ShoppingBag, 
  Star, 
  Search, 
  User,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Truck,
  Shield,
  RefreshCw,
  Sparkles,
  Flower,
  Droplets,
  Smile,
  ShoppingCart,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Award,
  Clock,
  Palette,
  Gem,
  Leaf,
  Waves,
  Shell,
  Moon,
  Sparkle,
  Package,
  Plus,
  Minus,
  Check,
  TrendingUp,
  ArrowUpRight,
  Gift,
  Tag,
  Zap,
  Sun,
  Cloud,
  Wind,
  Brush,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Octagon
} from "@/components/shared/theme";

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [cartItems, setCartItems] = useState(3);
  const [activeProduct, setActiveProduct] = useState<typeof featuredProducts[0] | null>(null);

  const heroSlides = [
    {
      id: 1,
      title: "Radiant Skin Starts Here",
      subtitle: "Discover Our Luxurious Skincare Collection",
      description: "Premium formulas for glowing, healthy skin",
      buttonText: "Shop Now",
      bgGradient: "from-rose-100 via-pink-50 to-rose-50",
      icon: <Droplets className="w-20 h-20 text-rose-600" />,
      iconBg: "bg-gradient-to-br from-rose-500 to-pink-500"
    },
    {
      id: 2,
      title: "Makeup That Makes You Shine",
      subtitle: "New Arrivals: Spring Collection",
      description: "Vibrant colors for every occasion",
      buttonText: "Explore Collection",
      bgGradient: "from-purple-100 via-violet-50 to-purple-50",
      icon: <Palette className="w-20 h-20 text-purple-600" />,
      iconBg: "bg-gradient-to-br from-purple-500 to-violet-500"
    },
    {
      id: 3,
      title: "Organic & Natural Beauty",
      subtitle: "Clean Beauty Essentials",
      description: "Eco-friendly products that care for you and the planet",
      buttonText: "Discover Clean Beauty",
      bgGradient: "from-emerald-100 via-teal-50 to-emerald-50",
      icon: <Leaf className="w-20 h-20 text-emerald-600" />,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500"
    }
  ];

  const categories = [
    { id: 1, name: "Skincare", icon: <Droplets className="w-8 h-8" />, products: 142, color: "bg-rose-50", gradient: "from-rose-400 to-pink-500" },
    { id: 2, name: "Makeup", icon: <Sparkles className="w-8 h-8" />, products: 89, color: "bg-purple-50", gradient: "from-purple-400 to-violet-500" },
    { id: 3, name: "Hair Care", icon: <Flower className="w-8 h-8" />, products: 76, color: "bg-amber-50", gradient: "from-amber-400 to-orange-500" },
    { id: 4, name: "Fragrance", icon: <Waves className="w-8 h-8" />, products: 54, color: "bg-blue-50", gradient: "from-blue-400 to-cyan-500" },
    { id: 5, name: "Wellness", icon: <Smile className="w-8 h-8" />, products: 38, color: "bg-emerald-50", gradient: "from-emerald-400 to-teal-500" },
    { id: 6, name: "Bath & Body", icon: <Shell className="w-8 h-8" />, products: 67, color: "bg-pink-50", gradient: "from-pink-400 to-rose-500" }
  ];

  const featuredProducts = [
    {
      id: 1,
      name: "Luminous Glow Serum",
      category: "Skincare",
      price: 89.99,
      originalPrice: 109.99,
      rating: 4.9,
      reviews: 234,
      icon: <Droplets className="w-16 h-16" />,
      gradient: "from-rose-200 to-pink-200",
      badge: "Best Seller",
      badgeColor: "bg-rose-500",
      isNew: true,
      productIcon: <Sparkle className="w-8 h-8" />,
      description: "A revolutionary serum with hyaluronic acid and vitamin C for radiant, hydrated skin that glows from within.",
      benefits: [
        "Hydrates and plumps skin",
        "Reduces appearance of fine lines",
        "Brightens complexion",
        "Suitable for all skin types"
      ],
      ingredients: ["Hyaluronic Acid", "Vitamin C", "Niacinamide", "Peptides"]
    },
    {
      id: 2,
      name: "Velvet Matte Lipstick Set",
      category: "Makeup",
      price: 45.99,
      originalPrice: 59.99,
      rating: 4.7,
      reviews: 189,
      icon: <Brush className="w-16 h-16" />, // Changed from Lipstick to Brush
      gradient: "from-purple-200 to-violet-200",
      badge: "Limited Edition",
      badgeColor: "bg-purple-500",
      isNew: false,
      productIcon: <Gem className="w-8 h-8" />,
      description: "A collection of six velvety matte lipsticks in universally flattering shades for every occasion.",
      benefits: [
        "Long-lasting color",
        "Creamy matte finish",
        "Transfer-resistant",
        "Moisturizing formula"
      ],
      ingredients: ["Vitamin E", "Shea Butter", "Jojoba Oil", "Natural Pigments"]
    },
    {
      id: 3,
      name: "Silk Hydration Shampoo",
      category: "Hair Care",
      price: 34.99,
      originalPrice: 42.99,
      rating: 4.8,
      reviews: 156,
      icon: <Flower className="w-16 h-16" />,
      gradient: "from-amber-200 to-orange-200",
      badge: "Organic",
      badgeColor: "bg-emerald-500",
      isNew: true,
      productIcon: <Leaf className="w-8 h-8" />,
      description: "Nourishing shampoo with silk proteins and argan oil for soft, shiny, and manageable hair.",
      benefits: [
        "Repairs damaged hair",
        "Adds shine and softness",
        "Sulfate-free formula",
        "Suitable for color-treated hair"
      ],
      ingredients: ["Silk Proteins", "Argan Oil", "Biotin", "Aloe Vera"]
    },
    {
      id: 4,
      name: "Midnight Bloom Perfume",
      category: "Fragrance",
      price: 129.99,
      originalPrice: 149.99,
      rating: 4.9,
      reviews: 89,
      icon: <Waves className="w-16 h-16" />,
      gradient: "from-blue-200 to-cyan-200",
      badge: "Luxury",
      badgeColor: "bg-amber-500",
      isNew: false,
      productIcon: <Moon className="w-8 h-8" />,
      description: "An intoxicating blend of night-blooming flowers, musk, and amber for a captivating evening scent.",
      benefits: [
        "Long-lasting fragrance",
        "Alcohol-free formula",
        "Phthalate-free",
        "Vegan and cruelty-free"
      ],
      ingredients: ["Jasmine", "Sandalwood", "Amber", "Vanilla"]
    }
  ];

  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Beauty Influencer",
      content: "The quality of these products is exceptional! My skin has never looked better. The Luminous Glow Serum is now a staple in my routine.",
      rating: 5,
      initials: "SJ",
      color: "bg-gradient-to-br from-rose-400 to-pink-500"
    },
    {
      id: 2,
      name: "Maria Garcia",
      role: "Regular Customer",
      content: "I've tried many brands, but nothing compares to the results I get here. The customer service is outstanding too!",
      rating: 5,
      initials: "MG",
      color: "bg-gradient-to-br from-purple-400 to-violet-500"
    },
    {
      id: 3,
      name: "Lisa Chen",
      role: "Makeup Artist",
      content: "Professional-grade products at reasonable prices. My go-to for all my kit essentials. Highly recommended!",
      rating: 4,
      initials: "LC",
      color: "bg-gradient-to-br from-emerald-400 to-teal-500"
    }
  ];

  const benefits = [
    {
      icon: <Truck className="w-8 h-8" />,
      title: "Free Shipping",
      description: "On orders over $50"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Payment",
      description: "100% secure & encrypted"
    },
    {
      icon: <RefreshCw className="w-8 h-8" />,
      title: "Easy Returns",
      description: "30-day return policy"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Quality Guaranteed",
      description: "Premium ingredients only"
    }
  ];

  const toggleWishlist = (productId: number): void => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    
    const product = featuredProducts.find(p => p.id === productId);
    toast.success(
      wishlist.includes(productId) 
        ? "Removed from wishlist" 
        : "Added to wishlist",
      {
        description: wishlist.includes(productId) 
          ? `${product?.name} removed from your wishlist`
          : `${product?.name} added to your wishlist`,
        action: {
          label: "View",
          onClick: () => setActiveProduct(product ?? null)
        },
      }
    );
  };

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Welcome to Bloom Beauty!", {
        description: "Check your email for a 15% discount code!",
        action: {
          label: "Got it",
          onClick: () => console.log("Toast dismissed"),
        },
        duration: 5000,
      });
      
      setNewsletterEmail("");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (productId: number, amount: number): void => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + amount)
    }));
  };

  const addToCart = (product: { name: string; price: number }, quantity = 1): void => {
    setCartItems(prev => prev + quantity);
    
    toast.success(`${product.name} added to cart`, {
      description: `Quantity: ${quantity}`,
      action: {
        label: "View Cart",
        onClick: () => {
          // Navigate to cart page
          console.log("Navigate to cart");
        },
      },
      duration: 3000,
    });
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50/30">
      {/* Navigation */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-br from-rose-400 to-pink-500">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">
                Bloom Beauty
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {["Home", "Shop", "Collections", "New Arrivals", "Sale", "Blog"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-gray-700 hover:text-rose-600 transition-colors font-medium relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 group-hover:w-full transition-all duration-300"></span>
                </a>
              ))}
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" aria-label="Search">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Account">
                <User className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative" aria-label="Shopping cart">
                <ShoppingCart className="w-5 h-5" />
                <motion.span 
                  key={cartItems}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-xs text-white flex items-center justify-center"
                >
                  {cartItems}
                </motion.span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-16 left-0 right-0 bg-white border-t shadow-lg"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                {["Home", "Shop", "Collections", "New Arrivals", "Sale", "Blog"].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="block py-2 text-gray-700 hover:text-rose-600 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative h-[600px]">
          <AnimatePresence mode="wait">
            {heroSlides.map((slide, index) => (
              index === currentSlide && (
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient}`}
                >
                  <div className="container mx-auto px-4 h-full flex items-center">
                    <motion.div 
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="max-w-2xl space-y-6"
                    >
                      <Badge className="bg-white/90 text-rose-600 border-none">
                        New Collection
                      </Badge>
                      <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
                        {slide.title}
                      </h1>
                      <p className="text-xl text-gray-700">
                        {slide.description}
                      </p>
                      <div className="flex gap-4 pt-4">
                        <Button size="lg" className="bg-rose-600 hover:bg-rose-700">
                          {slide.buttonText} <ChevronRight className="ml-2 w-4 h-4" />
                        </Button>
                        <Button size="lg" variant="outline">
                          Learn More
                        </Button>
                      </div>
                    </motion.div>
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="hidden lg:block absolute right-0 top-1/2 transform -translate-y-1/2 -translate-x-20"
                    >
                      <div className={`p-12 rounded-full ${slide.iconBg} bg-opacity-20`}>
                        <div className="p-8 rounded-full bg-white/90 backdrop-blur-sm">
                          {slide.icon}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )
            ))}
          </AnimatePresence>
          
          {/* Carousel Controls */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
            onClick={nextSlide}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          {/* Carousel Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? "bg-rose-600 w-8" : "bg-gray-300"
                }`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="py-8 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-4"
              >
                <div className="p-3 rounded-full bg-rose-100 text-rose-600">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-12 bg-white"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: "10K+", label: "Happy Customers" },
              { value: "500+", label: "Premium Products" },
              { value: "4.9★", label: "Average Rating" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-4"
              >
                <div className="text-3xl font-bold text-rose-600 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our carefully curated collection of beauty essentials for every need
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card 
                  className={`${category.color} border-none hover:shadow-xl transition-shadow cursor-pointer group`}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="p-4 rounded-full bg-white mb-4 group-hover:scale-110 transition-transform">
                      <div className="text-rose-600">
                        {category.icon}
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.products} products</p>
                    <div className="mt-2 w-12 h-1 bg-gradient-to-r rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                         style={{background: `linear-gradient(to right, ${category.gradient})`}}>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gradient-to-b from-white to-rose-50/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-center mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Featured Products
              </h2>
              <p className="text-gray-600">Customer favorites this week</p>
            </div>
            <Button variant="outline" className="gap-2">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="group border-none hover:shadow-xl transition-all duration-300">
                  <div className="relative overflow-hidden rounded-t-lg">
                    {/* Product Icon Display */}
                    <div 
                      className={`aspect-square relative bg-gradient-to-br ${product.gradient} flex items-center justify-center`}
                    >
                      {/* Decorative Elements */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white"></div>
                        <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white"></div>
                      </div>
                      
                      {/* Main Product Icon */}
                      <div className="relative z-10 p-8 rounded-full bg-white/90 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <div className="text-rose-600">
                          {product.icon}
                        </div>
                      </div>

                      {/* Badge */}
                      {product.badge && (
                        <div className="absolute top-4 left-4 z-20">
                          <Badge className={`${product.badgeColor} text-white border-none`}>
                            {product.badge}
                          </Badge>
                        </div>
                      )}
                      {product.isNew && (
                        <div className="absolute top-4 right-4 z-20">
                          <Badge className="bg-emerald-500 text-white border-none">
                            New
                          </Badge>
                        </div>
                      )}
                      
                      {/* Wishlist Button */}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onClick={() => toggleWishlist(product.id)}
                      >
                        <Heart 
                          className={`w-5 h-5 transition-colors ${
                            wishlist.includes(product.id) 
                              ? "fill-rose-500 text-rose-500" 
                              : ""
                          }`}
                        />
                      </Button>

                      {/* Product Type Icon */}
                      <div className="absolute bottom-4 left-4 p-2 rounded-full bg-white/80 backdrop-blur-sm">
                        {product.productIcon}
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors">
                        {product.name}
                      </h3>
                      {renderStars(product.rating)}
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <span className="text-xl font-bold text-gray-900">
                            ${product.price.toFixed(2)}
                          </span>
                          {product.originalPrice && (
                            <span className="ml-2 text-sm text-gray-400 line-through">
                              ${product.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setActiveProduct(product)}
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <div className="text-center">
                              <div className={`p-8 rounded-full bg-gradient-to-br ${product.gradient} mx-auto w-32 h-32 flex items-center justify-center mb-6`}>
                                <div className="p-6 rounded-full bg-white/90">
                                  {product.icon}
                                </div>
                              </div>
                              <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
                              <p className="text-gray-600 mb-4">{product.category}</p>
                              {renderStars(product.rating)}
                              
                              <div className="text-2xl font-bold text-rose-600 my-4">
                                ${product.price.toFixed(2)}
                                {product.originalPrice && (
                                  <span className="ml-2 text-base text-gray-400 line-through">
                                    ${product.originalPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-left">Description</h4>
                                  <p className="text-sm text-gray-600 text-left">
                                    {product.description}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-left">Key Benefits</h4>
                                  <ul className="text-sm text-gray-600 text-left list-disc pl-4 space-y-1">
                                    {product.benefits.map((benefit, i) => (
                                      <li key={i}>{benefit}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-6 mb-4">
                                <span className="text-sm">Quantity:</span>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateQuantity(product.id, -1)}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {productQuantities[product.id] || 1}
                                  </span>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateQuantity(product.id, 1)}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <Button 
                                className="w-full bg-rose-600 hover:bg-rose-700"
                                onClick={() => addToCart(product, productQuantities[product.id] || 1)}
                              >
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                Add to Cart (${(product.price * (productQuantities[product.id] || 1)).toFixed(2)})
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sale Banner */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="py-16"
      >
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-16 -translate-x-16"></div>
            
            <div className="relative z-10 max-w-2xl">
              <Badge className="bg-white/20 text-white border-none mb-4">
                <Clock className="w-3 h-3 mr-1" /> Limited Time Offer
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Summer Sale: Up to 50% Off
              </h2>
              <p className="text-rose-100 mb-8">
                Don&apos;t miss out on our biggest sale of the season. Premium beauty essentials at unbeatable prices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-white text-rose-600 hover:bg-gray-100">
                  Shop Sale <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button variant="outline" className="text-white border-white hover:bg-white/10">
                  View All Deals
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Beauty Enthusiasts
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust Bloom Beauty
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className={`w-12 h-12 rounded-full ${testimonial.color} flex items-center justify-center text-white font-bold mr-4`}>
                        {testimonial.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                        <p className="text-sm text-gray-600">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < testimonial.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-700 italic">&quot;{testimonial.content}&quot;</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-16 bg-gradient-to-br from-rose-50 to-pink-50"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-3 rounded-full bg-white/50 w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Join Our Beauty Community
            </h2>
            <p className="text-gray-600 mb-8">
              Subscribe to get exclusive offers, beauty tips, and early access to new products.
              <span className="block text-rose-600 font-semibold mt-2">
                Get 15% off your first order!
              </span>
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white"
                required
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="bg-rose-600 hover:bg-rose-700 whitespace-nowrap"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
                    />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
            
            <p className="text-sm text-gray-500 mt-4">
              By subscribing, you agree to our Privacy Policy and consent to receive updates.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-full bg-gradient-to-br from-rose-400 to-pink-500">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Bloom Beauty</span>
              </div>
              <p className="text-gray-400 mb-6">
                Your destination for premium beauty products and expert advice.
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Instagram, label: "Instagram" },
                  { icon: Facebook, label: "Facebook" },
                  { icon: Twitter, label: "Twitter" },
                  { icon: Youtube, label: "YouTube" }
                ].map((social, index) => (
                  <Button
                    key={index}
                    size="icon"
                    variant="outline"
                    className="border-gray-700 text-gray-400 hover:border-rose-500 hover:text-rose-500 transition-all"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6">Shop</h3>
              <ul className="space-y-3">
                {["Skincare", "Makeup", "Hair Care", "Fragrance", "Bath & Body", "Wellness"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-rose-400 transition-colors flex items-center gap-2">
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="text-lg font-bold mb-6">Help</h3>
              <ul className="space-y-3">
                {["Contact Us", "Shipping Info", "Returns & Exchanges", "FAQ", "Privacy Policy", "Terms of Service"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-rose-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold mb-6">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-rose-400" />
                  <span className="text-gray-400">(555) 123-4567</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-rose-400" />
                  <span className="text-gray-400">hello@bloombeauty.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-rose-400" />
                  <span className="text-gray-400">123 Beauty Street, City, State 12345</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">
                © {new Date().getFullYear()} Bloom Beauty. All rights reserved.
              </p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Shield className="w-4 h-4" /> Secure Shopping
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Package className="w-4 h-4" /> Free Shipping
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
