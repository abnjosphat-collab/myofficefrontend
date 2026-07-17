// app/bank/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Globe, 
  TrendingUp, 
  Users, 
  CreditCard,
  Smartphone,
  Lock
} from '@/components/shared/theme';

// Mock user type
interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  createdAt: string;
}

// Mock API functions (replace with real calls later)
const mockGetCurrentUser = async (token: string): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // For demo purposes, accept any token and return a dummy user
  return {
    id: 1,
    username: 'demo',
    email: 'demo@example.com',
    fullName: 'Demo User',
    createdAt: new Date().toISOString(),
  };
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      mockGetCurrentUser(token)
        .then(setUser)
        .catch(() => {
          // If token invalid, clear it
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, []);

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // If not logged in, show the landing page
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-brand-600">BankSecure</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-brand-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-brand-600 text-white hover:bg-brand-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Open Account
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Banking that works<br />for your future
            </h1>
            <p className="mt-6 text-xl text-gray-600">
              Experience secure, seamless banking with cutting-edge technology. 
              Manage your accounts, transfer funds, and grow your savings—all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="relative h-96 lg:h-auto">
            <img
              src="https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
              alt="Banking app on phone"
              className="rounded-lg shadow-xl object-cover w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why choose BankSecure?
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              We combine security with simplicity to give you the best banking experience.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Bank‑Grade Security</h3>
              <p className="mt-2 text-gray-600">
                Your money and data are protected with advanced encryption and multi‑factor authentication.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Instant Transfers</h3>
              <p className="mt-2 text-gray-600">
                Send money to any account in real‑time, 24/7. No waiting days for clearance.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Global Access</h3>
              <p className="mt-2 text-gray-600">
                Manage your accounts from anywhere in the world with our mobile‑optimized platform.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Savings Goals</h3>
              <p className="mt-2 text-gray-600">
                Set and track savings goals with automated tools and personalized insights.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Family Accounts</h3>
              <p className="mt-2 text-gray-600">
                Create joint accounts and manage finances together with family members.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Virtual Cards</h3>
              <p className="mt-2 text-gray-600">
                Generate virtual debit cards for secure online shopping – one‑time or recurring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to take control of your finances?
          </h2>
          <p className="mt-4 text-xl text-brand-100">
            Join thousands of satisfied customers who trust BankSecure.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-brand-600 bg-white hover:bg-gray-50"
            >
              Open Your Free Account Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-lg font-semibold">BankSecure</h3>
              <p className="mt-2 text-sm">
                Safe, smart, and simple banking for everyone.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Products</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Checking Accounts</Link></li>
                <li><Link href="#" className="hover:text-white">Savings Accounts</Link></li>
                <li><Link href="#" className="hover:text-white">Credit Cards</Link></li>
                <li><Link href="#" className="hover:text-white">Loans</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium">Company</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">About Us</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium">Legal</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
            © {new Date().getFullYear()} BankSecure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}


