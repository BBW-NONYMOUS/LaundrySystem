<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Http\Requests\Website\SaveTestimonialRequest;
use App\Http\Resources\TestimonialResource;
use App\Models\Testimonial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Customer reviews: approve the good ones for the website, feature the best.
 */
class TestimonialController extends Controller
{
    public function index(Request $request): Response
    {
        $view = $request->string('view')->toString() ?: 'pending';

        $query = Testimonial::query()->with(['customer:id,name', 'order:id,order_number', 'approver:id,name'])->latest()->latest('id');

        match ($view) {
            'approved' => $query->where('is_approved', true),
            'all' => null,
            default => $query->where('is_approved', false),
        };

        return Inertia::render('website/testimonials/index', [
            'testimonials' => TestimonialResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => [...$this->filters($request, []), 'view' => $view],
            'counts' => [
                'pending' => Testimonial::query()->where('is_approved', false)->count(),
                'approved' => Testimonial::query()->where('is_approved', true)->count(),
                'featured' => Testimonial::query()->where('is_featured', true)->count(),
            ],
            'averageRating' => round((float) Testimonial::query()->avg('rating'), 1),
        ]);
    }

    /**
     * A review received offline (e.g. on Facebook), typed in by the owner.
     */
    public function store(SaveTestimonialRequest $request): RedirectResponse
    {
        Testimonial::query()->create([
            ...$request->validated(),
            'source' => Testimonial::SOURCE_MANUAL,
            ...$this->approvalFields($request),
        ]);

        $this->toast('Review added.');

        return back();
    }

    public function update(SaveTestimonialRequest $request, Testimonial $testimonial): RedirectResponse
    {
        $testimonial->update([...$request->validated(), ...$this->approvalFields($request, $testimonial)]);

        $this->toast($testimonial->is_approved ? 'Review saved and shown on the website.' : 'Review saved (hidden from the website).');

        return back();
    }

    public function destroy(Testimonial $testimonial): RedirectResponse
    {
        $testimonial->delete();

        $this->toast('Review deleted.');

        return back();
    }

    /**
     * Who approved it and when; a review can only be featured if it is approved.
     *
     * @return array{is_featured: bool, approved_by: int|null, approved_at: mixed}
     */
    private function approvalFields(SaveTestimonialRequest $request, ?Testimonial $existing = null): array
    {
        $approved = $request->boolean('is_approved');
        $newlyApproved = $approved && ! ($existing !== null && $existing->is_approved);

        return [
            'is_featured' => $approved && $request->boolean('is_featured'),
            'approved_by' => $approved ? ($newlyApproved ? $request->user()->id : $existing?->approved_by) : null,
            'approved_at' => $approved ? ($newlyApproved ? now() : $existing?->approved_at) : null,
        ];
    }
}
