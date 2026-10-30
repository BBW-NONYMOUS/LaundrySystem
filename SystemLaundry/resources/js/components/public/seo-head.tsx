import { Head } from '@inertiajs/react';
import type { Seo } from '@/types/public';

/**
 * Title, description, Open Graph and JSON-LD for a public page.
 *
 * The same tags are already in the server HTML (resources/views/app.blade.php) for crawlers
 * that don't run JavaScript. The head-keys here match its data-inertia keys, so Inertia
 * replaces those tags instead of adding duplicates.
 */
export function SeoHead({ seo }: { seo: Seo }) {
    return (
        <Head title={seo.title}>
            <meta
                head-key="description"
                name="description"
                content={seo.description}
            />
            <link head-key="canonical" rel="canonical" href={seo.url} />
            {seo.noindex && (
                <meta
                    head-key="robots"
                    name="robots"
                    content="noindex, nofollow"
                />
            )}
            <meta head-key="og:type" property="og:type" content={seo.type} />
            <meta
                head-key="og:site_name"
                property="og:site_name"
                content={seo.site_name}
            />
            <meta head-key="og:title" property="og:title" content={seo.title} />
            <meta
                head-key="og:description"
                property="og:description"
                content={seo.description}
            />
            <meta head-key="og:url" property="og:url" content={seo.url} />
            <meta head-key="og:image" property="og:image" content={seo.image} />
            <meta head-key="og:locale" property="og:locale" content="en_PH" />
            <meta
                head-key="twitter:card"
                name="twitter:card"
                content="summary_large_image"
            />
            {seo.json_ld.map((schema, index) => (
                <script
                    key={index}
                    head-key={`json-ld-${index}`}
                    type="application/ld+json"
                >
                    {JSON.stringify(schema)}
                </script>
            ))}
        </Head>
    );
}
