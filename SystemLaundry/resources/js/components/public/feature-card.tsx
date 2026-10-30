import type { LucideIcon } from 'lucide-react';
import { IconTile } from '@/components/public/service-card';

/**
 * Icon tile, title and one sentence; borderless, for feature and value grids.
 */
export function FeatureCard({
    icon,
    title,
    text,
}: {
    icon: LucideIcon;
    title: string;
    text: string;
}) {
    return (
        <div className="flex gap-4">
            <IconTile icon={icon} />
            <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-pretty text-muted-foreground">{text}</p>
            </div>
        </div>
    );
}
