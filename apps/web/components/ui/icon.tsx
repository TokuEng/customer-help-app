import Image from 'next/image';

interface IconProps {
  name: 'clock' | 'calendar' | 'chevron-down' | 'chevron-up' | 'search' | 'thumbs-down' | 'thumbs-up';
  className?: string;
  alt?: string;
}

export function Icon({ name, className = "w-4 h-4", alt }: IconProps) {
  const iconMap = {
    clock: '/brand/clock.png',
    calendar: '/brand/calander.png', // Using the filename as uploaded
    'chevron-down': '/brand/chevron-down.png',
    'chevron-up': '/brand/chevron-up.png',
    search: '/brand/search.png',
    'thumbs-down': '/brand/thumbs-down.png',
    'thumbs-up': '/brand/thumbs-up.png',
  };

  const altText = alt || `${name} icon`;

  return (
    <Image
      src={iconMap[name]}
      alt={altText}
      width={24}
      height={24}
      className={className}
      priority={false}
      style={{
        filter: name === 'search' ? 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(202deg) brightness(102%) contrast(97%)' : undefined
      }}
    />
  );
}
