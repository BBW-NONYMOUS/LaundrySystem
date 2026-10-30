import type { SVGAttributes } from 'react';

/**
 * Washing-machine brand mark (same shape as the favicon and app/Services/BrandImageService).
 * Inherits its color: use with fill-current.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11 3h18a5 5 0 0 1 5 5v24a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm19 19a10 10 0 1 0-20 0 10 10 0 0 0 20 0Zm-4 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM12.6 8.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 0 0 3.2 0Zm4.5 0a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 0 0 3.2 0ZM24 7.5v2h6v-2h-6Z"
            />
        </svg>
    );
}
