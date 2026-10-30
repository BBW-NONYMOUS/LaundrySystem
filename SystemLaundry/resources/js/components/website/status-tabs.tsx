import { useTableQuery } from '@/components/data-table/use-table-query';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { number } from '@/lib/format';

/**
 * Tabs that switch a list by a query parameter (?status=…, ?view=…), each with a count.
 * The first tab is the default and is left out of the URL.
 */
export function StatusTabs({
    param,
    value,
    tabs,
    label,
}: {
    param: string;
    value: string;
    tabs: { value: string; label: string; count?: number }[];
    label: string;
}) {
    const { setParams } = useTableQuery();
    const first = tabs[0]?.value;

    return (
        <Tabs
            value={value}
            onValueChange={(next) =>
                setParams({ [param]: next === first ? null : next })
            }
        >
            <TabsList
                aria-label={label}
                className="h-auto w-full justify-start overflow-x-auto sm:w-auto"
            >
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-1 h-5 min-w-5 px-1.5 tabular-nums"
                            >
                                {number(tab.count)}
                            </Badge>
                        )}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
