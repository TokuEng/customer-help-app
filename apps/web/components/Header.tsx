import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" aria-label="Toku home">
            <Image
              src="/brand/4-removebg.png"
              alt="Toku logo"
              width={160}
              height={54}
              priority
              className="h-8 sm:h-10 lg:h-14 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-11 sm:h-9 lg:h-10 px-2 sm:px-3 lg:px-4 min-w-[44px] text-xs sm:text-sm lg:text-base"
              )}
            >
              Home
            </Link>
            
            <Link
              href="/search"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-11 sm:h-9 lg:h-10 px-2 sm:px-3 lg:px-4 min-w-[44px] text-xs sm:text-sm lg:text-base"
              )}
            >
              Search
            </Link>
            
            <Link
              href="/calendar"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex h-9 lg:h-10 px-3 lg:px-4 min-w-[44px] text-sm lg:text-base"
              )}
            >
              Calendar
            </Link>
            
            <Link
              href="/calculators/employer-cost"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-11 sm:h-9 lg:h-10 px-1 sm:px-2 lg:px-4 min-w-[44px] text-xs sm:text-sm lg:text-base"
              )}
            >
              <span className="hidden sm:inline">Cost Calculator</span>
              <span className="sm:hidden">Cost</span>
            </Link>
            
            <Link
              href="/calculators/prorated"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-11 sm:h-9 lg:h-10 px-1 sm:px-2 lg:px-4 min-w-[44px] text-xs sm:text-sm lg:text-base"
              )}
            >
              <span className="hidden lg:inline">Prorated Calculator</span>
              <span className="lg:hidden">Prorated</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

