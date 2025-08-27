import { SearchBar } from '@/components/SearchBar';
import { PopularArticles } from '@/components/PopularArticles';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Book, Coins, Heart, Shield } from 'lucide-react';

const categories = [
  {
    name: 'Library',
    description: 'General resources and documentation',
    icon: Book,
    href: '/search?category=Library',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    name: 'Token Payroll',
    description: 'Payroll processing and management',
    icon: Coins,
    href: '/search?category=Token+Payroll',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    name: 'Benefits',
    description: 'Benefits and perks',
    icon: Heart,
    href: '/search?category=Benefits',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    name: 'Policy',
    description: 'Company policies and procedures',
    icon: Shield,
    href: '/search?category=Policy',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Brand gradient bar */}
      <div className="h-1 sm:h-2 brand-gradient" />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
              How can we help you?
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Search our knowledge base for answers to common questions
            </p>
            <div className="max-w-2xl mx-auto pt-2">
              <SearchBar size="large" autoFocus />
            </div>
            
            {/* Sample Questions */}
            <div className="max-w-2xl mx-auto pt-4 sm:pt-6">
              <p className="text-sm text-gray-500 mb-3 text-center font-medium">Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "How do I view my payslips?",
                  "How to submit an expense report?",
                  "How do I add a new employee?",
                  "How to set up background checks?"
                ].map((question, index) => (
                  <Link 
                    key={index}
                    href={`/search?q=${encodeURIComponent(question)}`}
                    className="text-xs sm:text-sm text-primary hover:text-primary-700 transition-colors px-3 py-1.5 rounded-full bg-gray-50 hover:bg-primary/10 border border-gray-200 hover:border-primary/30 font-medium"
                  >
                    {question}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Browse by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.name} href={category.href}>
                <Card className="h-full hover:shadow-lg hover:brand-surface transition-all cursor-pointer rounded-2xl border-gray-200 group">
                  <CardHeader className="text-center p-4 sm:p-6">
                    <div className={`${category.bgColor} ${category.color} w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-transform group-hover:scale-110`}>
                      <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold mb-2">{category.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Popular Articles */}
      <PopularArticles />
    </div>
  );
}