import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="mt-auto">
      {/* Wave Banner */}
      <div className="w-full h-20 sm:h-32 relative overflow-hidden">
        <Image
          src="/brand/brand-wave.svg"
          alt=""
          fill
          className="object-cover object-bottom"
          aria-hidden="true"
        />
      </div>
      
      {/* Footer Content */}
      <div className="bg-gray-50 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            {/* Copyright and Address */}
            <div className="text-xs text-gray-500">
              <p className="font-semibold">© {new Date().getFullYear()} Toku. All rights reserved.</p>
              <p>1209 Orange Street, Wilmington, Delaware, 19801</p>
            </div>
            
            {/* Links */}
            <nav className="flex items-center space-x-6 text-xs sm:text-sm">
              <a 
                href="https://www.toku.com/privacy-policy" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary transition-colors font-medium"
              >
                Privacy Policy
              </a>
              <a 
                href="https://www.toku.com/terms-of-use" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary transition-colors font-medium"
              >
                Terms of Service
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
