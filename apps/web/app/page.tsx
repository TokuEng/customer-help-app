import { SearchBar } from '@/components/SearchBar';
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
    description: 'Employee benefits and perks',
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            How can we help you?
          </h1>
          <p className="text-xl text-gray-600">
            Search our knowledge base for answers to common questions
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar size="large" autoFocus />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.name} href={category.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <div className={`${category.bgColor} ${category.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
          <div className="space-y-4">
            <Link href="/a/how-to-submit-expenses" className="block group">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      How to Submit Expenses
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">2 min read</span>
                  </div>
                  <CardDescription>
                    Learn how to submit expense reports for reimbursement
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/a/employee-onboarding-guide" className="block group">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      Employee Onboarding Guide
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">5 min read</span>
                  </div>
                  <CardDescription>
                    Everything you need to know about getting started
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/a/benefits-overview" className="block group">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      Benefits Overview
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">3 min read</span>
                  </div>
                  <CardDescription>
                    Comprehensive guide to your employee benefits package
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}