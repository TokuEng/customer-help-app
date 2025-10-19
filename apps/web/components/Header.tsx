import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" aria-label="Toku home">
            <Image
              src="/brand/4-removebg.png"
              alt="Toku logo"
              width={160}
              height={54}
              priority
              className="h-10 sm:h-14 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-0.5 sm:space-x-2 md:space-x-3 lg:space-x-6">
            <Link
              href="/"
              className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-700 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1.5 sm:px-2 md:px-3 py-2"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-700 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1.5 sm:px-2 md:px-3 py-2"
            >
              Search
            </Link>
            <Link
              href="/calendar"
              className="hidden md:inline-flex text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-700 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1.5 sm:px-2 md:px-3 py-2"
            >
              Calendar
            </Link>
            <Link
              href="/calculators/employer-cost"
              className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-700 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1.5 sm:px-2 md:px-3 py-2"
            >
              <span className="hidden sm:inline">Cost Calculator</span>
              <span className="sm:hidden">Cost</span>
            </Link>
            <Link
              href="/calculators/prorated"
              className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-700 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1.5 sm:px-2 md:px-3 py-2"
            >
              <span className="hidden sm:inline">Prorated</span>
              <span className="sm:hidden">Pro</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

