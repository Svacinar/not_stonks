import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  default: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const borderWidthClasses = {
  sm: 'border-2',
  default: 'border-[3px]',
  lg: 'border-4',
};

export function LoadingSpinner({ size = 'default', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          sizeClasses[size],
          borderWidthClasses[size],
          'relative rounded-full',
          // Gradient spinner track - using conic gradient for smooth color transition
          'animate-spin',
          // Smooth easing via CSS custom animation
          '[animation-timing-function:cubic-bezier(0.4,0,0.2,1)]',
          // Subtle pulse effect layered on top
          'animate-pulse-subtle',
          // Border styling - transparent base with gradient via pseudo-element
          'border-transparent',
          // Spinner colors using brand gradient stops
          'border-t-primary border-r-primary/60 border-b-primary/20 border-l-primary/40',
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}
