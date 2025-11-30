import { cn } from '@/lib/utils';
import { View, DimensionValue, ViewStyle } from 'react-native';

interface SkeletonProps extends Omit<React.ComponentProps<typeof View>, 'style'> {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

function Skeleton({
    className,
    width,
    height,
    borderRadius,
    style,
    ...props
}: SkeletonProps) {
    return (
        <View
            className={cn('bg-accent animate-pulse rounded-md', className)}
            style={[
                width !== undefined && { width },
                height !== undefined && { height },
                borderRadius !== undefined && { borderRadius },
                style,
            ]}
            {...props}
        />
    );
}

export { Skeleton };
