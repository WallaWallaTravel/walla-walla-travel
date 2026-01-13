import Image from 'next/image';
import Link from 'next/link';

interface PageHeroProps {
  title: string;
  description: string;
  backLink?: {
    href: string;
    label: string;
  };
  imageSrc?: string;
}

/**
 * Reusable hero component with background image and dark overlay
 * Used across content pages (guides, best-of, neighborhoods, itineraries)
 */
export function PageHero({
  title,
  description,
  backLink,
  imageSrc = '/images/IMG_9762.jpg',
}: PageHeroProps) {
  return (
    <div className="relative text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt="Walla Walla Wine Country"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16">
        {backLink && (
          <nav className="mb-6">
            <Link
              href={backLink.href}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              ← {backLink.label}
            </Link>
          </nav>
        )}
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-xl text-white/90 max-w-2xl drop-shadow-md">
          {description}
        </p>
      </div>
    </div>
  );
}
