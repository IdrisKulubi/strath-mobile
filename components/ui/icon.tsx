import { cn } from '@/lib/utils';
import type { IconProps as PhosphorIconProps, IconWeight } from 'phosphor-react-native';
import { cssInterop } from 'nativewind';
import React from 'react';

type IconComponent = React.ComponentType<PhosphorIconProps>;

type IconWrapperProps = {
  as: IconComponent;
  className?: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
  mirrored?: boolean;
  testID?: string;
};

function IconImpl({ as: IconComponent, className, ...props }: IconWrapperProps) {
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: false as const,
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
      color: 'color',
    },
  },
});

/**
 * A wrapper component for Phosphor icons with Nativewind `className` support via `cssInterop`.
 *
 * This component allows you to render any Phosphor icon while applying utility classes
 * using `nativewind`. It avoids the need to wrap or configure each icon individually.
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from 'phosphor-react-native';
 * import { Icon } from '@/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500" size={16} />
 * ```
 *
 * @param {IconComponent} as - The Phosphor icon component to render.
 * @param {string} className - Utility classes to style the icon using Nativewind.
 * @param {number} size - Icon size (defaults to 14).
 */
function Icon({ as: IconComponent, className, size = 14, ...props }: IconWrapperProps) {
  return (
    <IconImpl
      as={IconComponent}
      className={cn('text-foreground', className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
export type { IconWrapperProps as IconProps, IconComponent };
