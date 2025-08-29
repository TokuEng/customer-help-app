import Hero from '@/components/Hero';
import Categories, { categoryData } from '@/components/Categories';
import { PopularArticles } from '@/components/PopularArticles';
import RecentAndTrending from '@/components/RecentAndTrending';
import SupportBar from '@/components/SupportBar';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Brand gradient bar */}
      <div className="h-1 sm:h-2 brand-gradient" />
      
      {/* Hero Section with tighter spacing */}
      <Hero />

      {/* Denser Categories */}
      <Categories items={categoryData} />

      {/* Popular Articles */}
      <PopularArticles />

      {/* Recent and Trending */}
      <RecentAndTrending />

      {/* Support Bar */}
      <SupportBar />
    </div>
  );
}