import { cn } from "@/lib/utils";

type BadgeType = 'How-To' | 'Guide' | 'Policy' | 'FAQ' | 'Process' | 'Info';
type BadgeCategory = 'Library' | 'Token Payroll' | 'Benefits' | 'Policy' | string;

interface BadgeProps {
  type?: BadgeType | string;
  category?: BadgeCategory | string;
  className?: string;
  children?: React.ReactNode;
}

const typeColorMap: Record<BadgeType, { bg: string; text: string; border: string }> = {
  'How-To': { 
    bg: 'bg-teal-50', 
    text: 'text-teal-600', 
    border: 'border-teal-200' 
  },
  'Guide': { 
    bg: 'bg-green-50', 
    text: 'text-green-600', 
    border: 'border-green-200' 
  },
  'Policy': { 
    bg: 'bg-purple-50', 
    text: 'text-purple-600', 
    border: 'border-purple-200' 
  },
  'FAQ': { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-600', 
    border: 'border-indigo-200' 
  },
  'Process': { 
    bg: 'bg-orange-50', 
    text: 'text-orange-600', 
    border: 'border-orange-200' 
  },
  'Info': { 
    bg: 'bg-slate-50', 
    text: 'text-slate-600', 
    border: 'border-slate-200' 
  },
};

const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Library': { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-600', 
    border: 'border-indigo-200' 
  },
  'Token Payroll': { 
    bg: 'bg-teal-50', 
    text: 'text-teal-600', 
    border: 'border-teal-200' 
  },
  'Benefits': { 
    bg: 'bg-pink-50', 
    text: 'text-pink-600', 
    border: 'border-pink-200' 
  },
  'Policy': { 
    bg: 'bg-purple-50', 
    text: 'text-purple-600', 
    border: 'border-purple-200' 
  },
};

export function Badge({ type, category, className, children }: BadgeProps) {
  let colors = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  
  if (type && typeColorMap[type as BadgeType]) {
    colors = typeColorMap[type as BadgeType];
  } else if (category && categoryColorMap[category]) {
    colors = categoryColorMap[category];
  }

  const content = children || type || category;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        className
      )}
    >
      {content}
    </span>
  );
}
