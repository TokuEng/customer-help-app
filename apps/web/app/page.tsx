import Hero from '@/components/Hero';
import Categories, { categoryData } from '@/components/Categories';
import { PopularArticles } from '@/components/PopularArticles';
import RecentAndTrending from '@/components/RecentAndTrending';
import SupportBar from '@/components/SupportBar';
import { api } from '@/lib/api';

export default async function HomePage() {
  // Fetch real category counts
  let categoriesWithCounts = categoryData;
  try {
    const counts = await api.getCategoryCounts();
    
    // Update category data with real counts
    categoriesWithCounts = categoryData.map(category => {
      const realCount = counts.find(c => c.category === category.name);
      return {
        ...category,
        count: realCount?.count || 0
      };
    });
  } catch {
    // Fall back to default data if API fails
    categoriesWithCounts = categoryData;
  }

  return (
    <div className="min-h-screen">
      {/* Brand gradient bar */}
      <div className="h-1 sm:h-2 brand-gradient" />
      
      {/* Hero Section with tighter spacing */}
      <Hero />

      {/* Denser Categories */}
      <Categories items={categoriesWithCounts} />

      {/* Popular Articles */}
      <PopularArticles />

      {/* Recent and Trending */}
      <RecentAndTrending />

      {/* Support Bar */}
      <SupportBar />
    </div>
  );
}