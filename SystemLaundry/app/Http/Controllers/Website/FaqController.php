<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Http\Requests\Website\SaveFaqRequest;
use App\Http\Resources\FaqResource;
use App\Models\Faq;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Website FAQs, managed by the owner.
 */
class FaqController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('website/faqs/index', [
            'faqs' => FaqResource::collection(Faq::query()->orderBy('sort_order')->orderBy('id')->get()),
            'categories' => Faq::query()->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function store(SaveFaqRequest $request): RedirectResponse
    {
        Faq::query()->create([
            ...$request->validated(),
            // New questions go to the end unless an order was given.
            'sort_order' => $request->input('sort_order') ?? ((int) Faq::query()->max('sort_order') + 10),
        ]);
        Cache::forget('public.sitemap');

        $this->toast('Question added.');

        return back();
    }

    public function update(SaveFaqRequest $request, Faq $faq): RedirectResponse
    {
        $faq->update([...$request->validated(), 'sort_order' => $request->input('sort_order') ?? $faq->sort_order]);
        Cache::forget('public.sitemap');

        $this->toast('Question saved.');

        return back();
    }

    public function destroy(Faq $faq): RedirectResponse
    {
        $faq->delete();

        $this->toast('Question deleted.');

        return back();
    }
}
