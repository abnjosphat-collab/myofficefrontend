// app/designhome/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RequireAuth } from '@/components/shared/RequireAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Palette, 
  FileText, 
  Users, 
  Star, 
  ArrowRight,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  ChevronRight,
  Quote,
  Clock,
  Award,
  Heart,
  Zap,
  TrendingUp,
  Shield,
  Globe,
  Layers,
  Brush,
  Type,
  Layout,
  Wand2,
  Download,
  Eye,
  Calendar,
  Gift,
  PartyPopper,
  Building,
  Briefcase,
  GraduationCap,
  Diamond,
  ChevronUp,
  Menu,
  X,
  Printer,
  Smartphone,
  CreditCard,
  Headphones,
  FileCheck,
  Clock as ClockIcon
} from '@/components/shared/theme';

// ====== PROFESSIONAL COLOR SCHEME ======
const colors = {
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  accent: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
};

// ====== TYPOGRAPHY SYSTEM ======
const typography = {
  h1: 'text-5xl lg:text-6xl font-bold tracking-tight leading-tight',
  h2: 'text-4xl font-bold tracking-tight leading-tight',
  h3: 'text-2xl font-bold leading-tight',
  h4: 'text-xl font-semibold leading-tight',
  bodyLarge: 'text-lg leading-relaxed',
  body: 'text-base leading-relaxed',
  bodySmall: 'text-sm leading-normal',
  caption: 'text-xs tracking-wide uppercase',
  button: 'text-base font-semibold tracking-wide'
};

// Portfolio Data
const portfolioItems = [
  {
    id: 1,
    type: 'invitation',
    category: 'Wedding',
    title: 'Elegant Gold Foil Wedding',
    description: 'Luxury wedding invitation with gold foil stamping',
    image: '/portfolio/wedding-1.jpg',
    tags: ['Premium', 'Foil', 'Elegant'],
    featured: true,
    colorScheme: 'from-purple-100 to-pink-100'
  },
  {
    id: 2,
    type: 'invitation',
    category: 'Corporate',
    title: 'Modern Business Event',
    description: 'Clean corporate event invitation design',
    image: '/portfolio/corporate-1.jpg',
    tags: ['Modern', 'Professional', 'Clean'],
    featured: true,
    colorScheme: 'from-brand-100 to-cyan-100'
  },
  {
    id: 3,
    type: 'resume',
    category: 'Executive',
    title: 'CEO Resume Design',
    description: 'Luxurious executive resume with premium details',
    image: '/portfolio/resume-1.jpg',
    tags: ['Executive', 'Premium', 'Luxury'],
    featured: true,
    colorScheme: 'from-amber-100 to-orange-100'
  },
  {
    id: 4,
    type: 'invitation',
    category: 'Birthday',
    title: 'Vibrant Birthday Party',
    description: 'Colorful birthday party invitation',
    image: '/portfolio/birthday-1.jpg',
    tags: ['Colorful', 'Fun', 'Modern'],
    featured: false,
    colorScheme: 'from-pink-100 to-rose-100'
  },
  {
    id: 5,
    type: 'resume',
    category: 'Creative',
    title: 'Designer Portfolio Resume',
    description: 'Creative resume for designers and artists',
    image: '/portfolio/resume-2.jpg',
    tags: ['Creative', 'Modern', 'Portfolio'],
    featured: false,
    colorScheme: 'from-emerald-100 to-teal-100'
  },
  {
    id: 6,
    type: 'invitation',
    category: 'Anniversary',
    title: 'Romantic Anniversary Card',
    description: 'Elegant anniversary celebration invitation',
    image: '/portfolio/anniversary-1.jpg',
    tags: ['Romantic', 'Elegant', 'Classic'],
    featured: false,
    colorScheme: 'from-rose-100 to-pink-100'
  },
  {
    id: 7,
    type: 'resume',
    category: 'Tech',
    title: 'Tech Professional Resume',
    description: 'Modern tech resume with clean layout',
    image: '/portfolio/resume-3.jpg',
    tags: ['Tech', 'Modern', 'Clean'],
    featured: false,
    colorScheme: 'from-brand-100 to-indigo-100'
  },
  {
    id: 8,
    type: 'invitation',
    category: 'Graduation',
    title: 'Academic Achievement Card',
    description: 'Graduation and academic celebration invitation',
    image: '/portfolio/graduation-1.jpg',
    tags: ['Academic', 'Elegant', 'Celebration'],
    featured: false,
    colorScheme: 'from-violet-100 to-purple-100'
  },
];

// Services Data
const services = [
  {
    icon: <PartyPopper className="h-10 w-10" />,
    title: "Wedding Invitations",
    description: "Elegant and romantic designs for your special day. Custom illustrations, foil stamping, and premium paper options.",
    features: ["Custom Illustrations", "Foil Stamping", "Premium Paper", "RSVP Cards", "Save the Dates"],
    price: "From $249",
    color: "from-purple-500 to-pink-500",
    delivery: "7-10 days",
    revisions: "3 rounds included"
  },
  {
    icon: <Building className="h-10 w-10" />,
    title: "Corporate Invitations",
    description: "Professional designs for business events, conferences, and corporate gatherings. Brand-aligned and sophisticated.",
    features: ["Brand Alignment", "Multiple Formats", "Bulk Orders", "Digital RSVP", "Custom Envelopes"],
    price: "From $199",
    color: "from-brand-500 to-cyan-500",
    delivery: "5-7 days",
    revisions: "2 rounds included"
  },
  {
    icon: <Briefcase className="h-10 w-10" />,
    title: "Executive Resumes",
    description: "Luxurious resume designs for C-level executives and senior professionals. Premium layouts with strategic formatting.",
    features: ["ATS Friendly", "Premium Paper", "Cover Letters", "Digital Version", "LinkedIn Makeover"],
    price: "From $349",
    color: "from-amber-500 to-orange-500",
    delivery: "5-7 days",
    revisions: "Unlimited until satisfied"
  },
  {
    icon: <GraduationCap className="h-10 w-10" />,
    title: "Graduate & Entry-Level",
    description: "Modern resume designs for graduates and entry-level professionals. Highlighting potential and achievements.",
    features: ["Modern Layouts", "Skills Section", "Portfolio Integration", "Interview Guide", "Career Advice"],
    price: "From $199",
    color: "from-emerald-500 to-teal-500",
    delivery: "3-5 days",
    revisions: "2 rounds included"
  },
];

// Testimonials
const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Marketing Director",
    company: "TechCorp Inc.",
    content: "Our corporate event invitations were absolutely stunning! The attention to detail and quality exceeded our expectations. We received countless compliments from our guests.",
    rating: 5,
    image: "/testimonials/sarah.jpg",
    date: "2 weeks ago"
  },
  {
    name: "Michael Chen",
    role: "CEO",
    company: "StartUp Ventures",
    content: "The executive resume design completely transformed my job search. Within two weeks of using the new resume, I landed interviews with three Fortune 500 companies.",
    rating: 5,
    image: "/testimonials/michael.jpg",
    date: "1 month ago"
  },
  {
    name: "Emma Rodriguez",
    role: "Creative Director",
    company: "Studio Moderna",
    content: "Working with this studio elevated our brand's visual identity. Their attention to typography and color harmony is exceptional.",
    rating: 5,
    image: "/testimonials/emma.jpg",
    date: "3 weeks ago"
  },
];

// Process Steps
const processSteps = [
  {
    step: "01",
    title: "Discovery & Consultation",
    description: "We discuss your vision, requirements, and preferences in detail",
    icon: <Users className="h-6 w-6" />,
    duration: "1-2 days"
  },
  {
    step: "02",
    title: "Concept Design",
    description: "We create 2-3 initial design concepts for your review",
    icon: <Palette className="h-6 w-6" />,
    duration: "3-5 days"
  },
  {
    step: "03",
    title: "Refinement",
    description: "You provide feedback and we refine the design until perfect",
    icon: <Brush className="h-6 w-6" />,
    duration: "2-4 days"
  },
  {
    step: "04",
    title: "Final Delivery",
    description: "We prepare final files for print or digital delivery",
    icon: <FileCheck className="h-6 w-6" />,
    duration: "1-2 days"
  },
];

// Stats
const stats = [
  { value: "500+", label: "Projects Completed", icon: <CheckCircle className="h-6 w-6" /> },
  { value: "98%", label: "Client Satisfaction", icon: <Star className="h-6 w-6" /> },
  { value: "48hr", label: "Avg. Response Time", icon: <ClockIcon className="h-6 w-6" /> },
  { value: "50+", label: "Industry Awards", icon: <Award className="h-6 w-6" /> },
];

function DesignStudioContent() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const contactFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredPortfolio = portfolioItems.filter(item => 
    activeFilter === 'all' || item.type === activeFilter
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add form submission logic here
    alert('Thank you for your message! We\'ll get back to you within 24 hours.');
    if (contactFormRef.current) {
      contactFormRef.current.reset();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50/50 font-sans">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-4'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-800 shadow-md">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`${typography.h4} bg-gradient-to-r from-primary-700 to-primary-800 bg-clip-text text-transparent`}>
                  Design Studio
                </h1>
                <p className={`${typography.caption} text-neutral-600`}>Premium Invitations & Resumes</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {['Services', 'Portfolio', 'Process', 'Testimonials'].map((item) => (
                <Link 
                  key={item} 
                  href={`#${item.toLowerCase()}`}
                  className="text-neutral-700 hover:text-primary-700 transition-colors font-medium tracking-wide"
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Link href="#contact">
                <button className="hidden sm:block bg-gradient-to-r from-primary-600 to-primary-800 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-xl hover:shadow-primary-200 transition-all duration-300 transform hover:-translate-y-0.5">
                  Get Started
                </button>
              </Link>
              <button 
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="pt-4 pb-6 space-y-4">
                  {['Services', 'Portfolio', 'Process', 'Testimonials', 'Contact'].map((item) => (
                    <Link
                      key={item}
                      href={`#${item.toLowerCase()}`}
                      className="block py-2 text-neutral-700 hover:text-primary-700 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-transparent to-secondary-50/30" />
        
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-800 mb-6">
                <Sparkles className="h-4 w-4" />
                <span className={`${typography.caption} font-medium`}>Award-Winning Design Studio</span>
              </div>
              
              <h1 className={`${typography.h1} mb-6`}>
                <span className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Professional Designs
                </span>
                <br />
                <span className="text-neutral-900">That Elevate Your</span>
                <br />
                <span className="text-neutral-900">Professional Presence</span>
              </h1>
              
              <p className={`${typography.bodyLarge} text-neutral-600 mb-8 max-w-lg`}>
                Expertly crafted invitation cards and resume designs that communicate excellence. 
                From corporate events to career transitions, we deliver designs that make lasting impressions.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="#portfolio">
                  <button className="group relative bg-gradient-to-r from-primary-600 to-primary-800 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl hover:shadow-primary-200 transition-all duration-300 transform hover:-translate-y-0.5">
                    View Portfolio
                    <ArrowRight className="inline ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="#contact">
                  <button className="border-2 border-primary-600 text-primary-700 px-8 py-4 rounded-lg font-semibold hover:bg-primary-50 transition-all duration-300">
                    Free Consultation
                  </button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent.success" />
                  <span className="text-neutral-600">Secure Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent.info" />
                  <span className="text-neutral-600">24-48hr Turnaround</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary-600" />
                  <span className="text-neutral-600">Dedicated Support</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-neutral-100">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl rotate-12 shadow-xl flex items-center justify-center">
                  <Award className="h-10 w-10 text-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl border border-primary-100">
                      <FileText className="h-8 w-8 text-primary-600 mb-3" />
                      <h3 className="font-semibold text-neutral-900">Resume Designs</h3>
                      <p className="text-sm text-neutral-600 mt-2">ATS Optimized & Professional</p>
                    </div>
                    <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-6 rounded-xl border border-secondary-100">
                      <Calendar className="h-8 w-8 text-secondary-600 mb-3" />
                      <h3 className="font-semibold text-neutral-900">Event Cards</h3>
                      <p className="text-sm text-neutral-600 mt-2">Print & Digital Formats</p>
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-100">
                      <Smartphone className="h-8 w-8 text-emerald-600 mb-3" />
                      <h3 className="font-semibold text-neutral-900">Digital Ready</h3>
                      <p className="text-sm text-neutral-600 mt-2">Mobile Optimized Designs</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-100">
                      <Printer className="h-8 w-8 text-amber-600 mb-3" />
                      <h3 className="font-semibold text-neutral-900">Print Production</h3>
                      <p className="text-sm text-neutral-600 mt-2">Premium Paper & Finishes</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex p-3 rounded-xl bg-white shadow-md mb-4">
                  <div className="text-primary-600">{stat.icon}</div>
                </div>
                <div className="text-3xl font-bold text-neutral-900 mb-2">{stat.value}</div>
                <div className="text-sm text-neutral-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className={`${typography.caption} text-primary-600 font-semibold mb-2 block`}>OUR SERVICES</span>
            <h2 className={`${typography.h2} text-neutral-900 mb-4`}>Professional Design Solutions</h2>
            <p className={`${typography.bodyLarge} text-neutral-600 max-w-2xl mx-auto`}>
              Tailored design services that combine aesthetic excellence with functional precision
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                <div className="relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-100 h-full flex flex-col">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${service.color} mb-6`}>
                    {service.icon}
                  </div>
                  <h3 className={`${typography.h4} text-neutral-900 mb-3`}>{service.title}</h3>
                  <p className={`${typography.body} text-neutral-600 mb-6 flex-grow`}>{service.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-accent.success flex-shrink-0" />
                        <span className="text-sm text-neutral-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`${typography.h3} text-neutral-900`}>{service.price}</span>
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <ClockIcon className="h-4 w-4" />
                        {service.delivery}
                      </div>
                    </div>
                    <Link href="#contact">
                      <button className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-white py-3 rounded-lg font-semibold hover:shadow-md transition-all duration-300">
                        Start Project
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className={`${typography.caption} text-primary-600 font-semibold mb-2 block`}>OUR WORK</span>
            <h2 className={`${typography.h2} text-neutral-900 mb-4`}>Featured Projects</h2>
            <p className={`${typography.bodyLarge} text-neutral-600 max-w-2xl mx-auto mb-8`}>
              Explore our curated collection of professional designs
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {['all', 'invitation', 'resume'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                    activeFilter === filter
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                >
                  {filter === 'all' ? 'All Projects' : filter === 'invitation' ? 'Invitations' : 'Resumes'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredPortfolio.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  onMouseEnter={() => setHoveredCard(item.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative"
                >
                  <div className={`relative overflow-hidden rounded-xl ${item.colorScheme} h-64`}>
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="text-center">
                        {item.type === 'invitation' ? (
                          <FileText className="h-12 w-12 text-neutral-400 mx-auto" />
                        ) : (
                          <Briefcase className="h-12 w-12 text-neutral-400 mx-auto" />
                        )}
                        <p className="text-neutral-700 mt-3 font-medium">{item.title}</p>
                      </div>
                    </div>
                    
                    <div className={`absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/40 to-transparent transition-all duration-300 ${
                      hoveredCard === item.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.tags.map(tag => (
                            <span key={tag} className="px-2.5 py-1 bg-white/20 rounded-md text-xs backdrop-blur-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm text-neutral-200">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className={`${typography.caption} text-primary-600 font-semibold mb-2 block`}>HOW WE WORK</span>
            <h2 className={`${typography.h2} text-neutral-900 mb-4`}>Our Design Process</h2>
            <p className={`${typography.bodyLarge} text-neutral-600 max-w-2xl mx-auto`}>
              A structured approach ensuring quality, consistency, and client satisfaction
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-0 right-0 top-24 h-0.5 bg-gradient-to-r from-primary-100 via-primary-200 to-primary-100"></div>
            
            <div className="grid lg:grid-cols-4 gap-8">
              {processSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="relative bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-100 text-center">
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-primary-600 to-primary-800 text-white text-lg font-bold flex items-center justify-center shadow-lg">
                      {step.step}
                    </div>
                    <div className="inline-flex p-3 rounded-lg bg-primary-50 text-primary-600 mb-6 mt-6">
                      {step.icon}
                    </div>
                    <h3 className={`${typography.h4} text-neutral-900 mb-3`}>{step.title}</h3>
                    <p className={`${typography.body} text-neutral-600 mb-4`}>{step.description}</p>
                    <div className="text-sm text-primary-600 font-medium">
                      <ClockIcon className="inline h-4 w-4 mr-1" />
                      {step.duration}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className={`${typography.caption} text-primary-600 font-semibold mb-2 block`}>TESTIMONIALS</span>
            <h2 className={`${typography.h2} text-neutral-900 mb-4`}>Client Success Stories</h2>
            <p className={`${typography.bodyLarge} text-neutral-600 max-w-2xl mx-auto`}>
              Trusted by professionals and organizations worldwide
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-100 ${
                  index === activeTestimonial ? 'ring-2 ring-primary-200' : ''
                }`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">{testimonial.name}</h4>
                    <p className="text-sm text-neutral-600">{testimonial.role}</p>
                    <p className="text-xs text-neutral-500">{testimonial.company}</p>
                  </div>
                </div>
                
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-current" />
                  ))}
                  <span className="text-sm text-neutral-500 ml-2">{testimonial.date}</span>
                </div>
                
                <Quote className="h-6 w-6 text-primary-200 mb-4" />
                <p className="text-neutral-700 italic mb-6">&quot;{testimonial.content}&quot;</p>
              </motion.div>
            ))}
          </div>

          {/* Testimonial Navigation Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeTestimonial ? 'bg-primary-600 w-8' : 'bg-neutral-300'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white">
            <h2 className={`${typography.h2} mb-6`}>
              Ready to Elevate Your Professional Image?
            </h2>
            <p className={`${typography.bodyLarge} mb-8 max-w-2xl mx-auto opacity-90`}>
              Let&apos;s collaborate to create designs that communicate excellence and attention to detail.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#contact">
                <button className="bg-white text-primary-700 px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-all duration-300 shadow-2xl">
                  Start Your Project
                </button>
              </Link>
              <Link href="#portfolio">
                <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  View Case Studies
                </button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                <span>NDA Protection</span>
              </div>
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <span className={`${typography.caption} text-primary-600 font-semibold mb-2 block`}>CONTACT US</span>
              <h2 className={`${typography.h2} text-neutral-900 mb-6`}>Get in Touch</h2>
              <p className={`${typography.bodyLarge} text-neutral-600 mb-8`}>
                Have a project in mind? Let&apos;s discuss how we can bring your vision to life with stunning, professional designs.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary-50 text-primary-600 mt-1">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Email</h4>
                    <p className="text-neutral-600">hello@designstudio.com</p>
                    <p className="text-sm text-neutral-500">Response within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-secondary-50 text-secondary-600 mt-1">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Phone</h4>
                    <p className="text-neutral-600">+1 (555) 123-4567</p>
                    <p className="text-sm text-neutral-500">Mon-Fri, 9AM-6PM EST</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 mt-1">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Studio Location</h4>
                    <p className="text-neutral-600">123 Design Street, Creative City</p>
                    <p className="text-sm text-neutral-500">Available for in-person consultations</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12">
                <h4 className="font-semibold text-neutral-900 mb-4">Connect With Us</h4>
                <div className="flex gap-3">
                  {[Instagram, Facebook, Twitter, Linkedin].map((Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className="p-3 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-lg border border-neutral-100">
              <form ref={contactFormRef} onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-300"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-300"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-300"
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Project Type *
                  </label>
                  <select className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-300">
                    <option value="">Select a service</option>
                    <option value="wedding">Wedding Invitation</option>
                    <option value="corporate">Corporate Invitation</option>
                    <option value="executive">Executive Resume</option>
                    <option value="graduate">Graduate Resume</option>
                    <option value="other">Other Design Project</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Project Details
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-300"
                    placeholder="Tell us about your project, timeline, and budget..."
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="newsletter" className="rounded" />
                  <label htmlFor="newsletter" className="text-sm text-neutral-600">
                    Subscribe to our newsletter for design tips and exclusive offers
                  </label>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-white py-4 rounded-lg font-semibold hover:shadow-md hover:scale-[1.02] transition-all duration-300"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-800">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Design Studio</h3>
                  <p className="text-neutral-400 text-sm">Professional Invitations & Resumes</p>
                </div>
              </div>
              <p className="text-neutral-400 text-sm">
                Creating professional designs that communicate excellence and attention to detail.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-white">Services</h4>
              <ul className="space-y-3">
                {services.map((service, index) => (
                  <li key={index}>
                    <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">
                      {service.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-white">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">Design Portfolio</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">Case Studies</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">Design Blog</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-white">Stay Updated</h4>
              <p className="text-neutral-400 mb-4 text-sm">Subscribe for design insights and exclusive offers</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-4 py-3 rounded-l-lg bg-neutral-800 text-white border-0 focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <button className="bg-gradient-to-r from-primary-600 to-primary-800 px-4 rounded-r-lg hover:opacity-90 transition-opacity">
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-neutral-400 text-sm">© {new Date().getFullYear()} Design Studio. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">Terms of Service</a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-primary-600 to-primary-800 text-white p-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 z-40"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DesignStudio() {
  return <RequireAuth><DesignStudioContent /></RequireAuth>;
}
