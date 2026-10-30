<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            {{--
                Public pages pass an `seo` prop (App\Services\SeoService). It is printed here so crawlers
                that don't run JavaScript (Facebook link previews) still see it. The data-inertia keys
                match the React <SeoHead>, which takes these tags over after the page loads.
            --}}
            @php($seo = $page['props']['seo'] ?? null)
            @if (is_array($seo))
                <title data-inertia="">{{ $seo['title'] }}</title>
                <meta name="description" content="{{ $seo['description'] }}" data-inertia="description">
                <link rel="canonical" href="{{ $seo['url'] }}" data-inertia="canonical">
                @if (! empty($seo['noindex']))
                    <meta name="robots" content="noindex, nofollow" data-inertia="robots">
                @endif
                <meta property="og:type" content="{{ $seo['type'] }}" data-inertia="og:type">
                <meta property="og:site_name" content="{{ $seo['site_name'] }}" data-inertia="og:site_name">
                <meta property="og:title" content="{{ $seo['title'] }}" data-inertia="og:title">
                <meta property="og:description" content="{{ $seo['description'] }}" data-inertia="og:description">
                <meta property="og:url" content="{{ $seo['url'] }}" data-inertia="og:url">
                <meta property="og:image" content="{{ $seo['image'] }}" data-inertia="og:image">
                <meta property="og:locale" content="en_PH" data-inertia="og:locale">
                <meta name="twitter:card" content="summary_large_image" data-inertia="twitter:card">
                @foreach ($seo['json_ld'] ?? [] as $index => $schema)
                    {{-- JSON_HEX_TAG: no setting value can close this script tag. --}}
                    <script type="application/ld+json" data-inertia="json-ld-{{ $index }}">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
                @endforeach
            @else
                <title>{{ config('app.name', 'Laravel') }}</title>
            @endif
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
