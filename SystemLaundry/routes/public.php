<?php

use App\Http\Controllers\Public\BookingRequestController;
use App\Http\Controllers\Public\ContactController;
use App\Http\Controllers\Public\FeedbackController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\PageController;
use App\Http\Controllers\Public\PricingController;
use App\Http\Controllers\Public\SitemapController;
use App\Http\Controllers\Public\TrackOrderController;
use App\Http\Controllers\TrackingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public website (no login) — docs/public-site/03-backend.md
|--------------------------------------------------------------------------
| Rate limiters are defined in AppServiceProvider::configureRateLimiting().
*/

Route::get('/', HomeController::class)->name('home');
Route::get('pricing', PricingController::class)->name('public.pricing');
Route::get('about', [PageController::class, 'about'])->name('public.about');
Route::get('faq', [PageController::class, 'faq'])->name('public.faq');
Route::get('contact', [PageController::class, 'contact'])->name('public.contact');
Route::get('privacy', [PageController::class, 'privacy'])->name('public.privacy');
Route::post('contact', [ContactController::class, 'store'])->middleware('throttle:public-forms')->name('public.contact.store');

// Track: order number + mobile number → the private /track/{code} page.
Route::get('track', [TrackOrderController::class, 'create'])->name('public.track');
Route::post('track', [TrackOrderController::class, 'store'])->middleware('throttle:public-tracking')->name('public.track.lookup');
Route::get('track/{code}', [TrackingController::class, 'show'])->middleware('throttle:public-tracking')->name('tracking.show');

// Guest pickup booking (signed-in customers are sent to the portal booking).
Route::get('book', [BookingRequestController::class, 'create'])->name('public.book');
Route::post('book', [BookingRequestController::class, 'store'])->middleware('throttle:public-forms')->name('public.book.store');

// "Rate us" link from the order-completed message.
Route::get('feedback/{code}', [FeedbackController::class, 'create'])->middleware('throttle:public-tracking')->name('public.feedback');
Route::post('feedback/{code}', [FeedbackController::class, 'store'])->middleware('throttle:public-forms')->name('public.feedback.store');

Route::get('sitemap.xml', [SitemapController::class, 'sitemap'])->name('sitemap');
Route::get('robots.txt', [SitemapController::class, 'robots'])->name('robots');
