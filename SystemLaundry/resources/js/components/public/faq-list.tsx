import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { PublicFaq } from '@/types/public';

/**
 * Questions in an Accordion, one open at a time (Home preview and FAQ page).
 */
export function FaqList({
    faqs,
    className,
}: {
    faqs: PublicFaq[];
    className?: string;
}) {
    return (
        <Accordion
            type="single"
            collapsible
            className={cn(
                'rounded-2xl border bg-card px-4 shadow-sm sm:px-6',
                className,
            )}
        >
            {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={String(faq.id)}>
                    <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">
                        {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base leading-7 whitespace-pre-line text-muted-foreground">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
