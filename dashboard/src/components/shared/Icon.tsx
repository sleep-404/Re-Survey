interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

export function Icon({ name, className = '', filled = false, size = 'md' }: IconProps) {
  const fontVariationSettings = filled ? "'FILL' 1" : "'FILL' 0";

  return (
    <span
      className={`material-symbols-outlined ${sizeClasses[size]} ${className}`}
      style={{ fontVariationSettings }}
    >
      {name}
    </span>
  );
}
