<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tables behind the public website (docs/public-site/02-database.md).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Guest pickup requests from /book. Staff confirm them into a real order.
        Schema::create('booking_requests', function (Blueprint $table) {
            $table->id();
            // Random suffix (BKG-20261023-7KQ2) so references can't be guessed in sequence.
            $table->string('reference', 20)->unique();
            $table->string('status', 15)->default('pending');
            $table->string('name', 150);
            $table->string('phone', 20)->index();
            $table->string('email')->nullable();
            $table->text('address');
            $table->date('pickup_date');
            $table->string('time_slot', 5);
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('estimated_quantity', 8, 2)->nullable();
            $table->boolean('is_express')->default(false);
            $table->boolean('wants_delivery')->default(false);
            $table->text('special_instructions')->nullable();
            // Filled when staff confirm: who the customer turned out to be and the order created.
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('handled_at')->nullable();
            $table->string('decline_reason')->nullable();
            // Kept for spam investigation only.
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            // Slot capacity check: pending requests for a date + slot.
            $table->index(['status', 'pickup_date', 'time_slot']);
        });

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('subject', 150)->nullable();
            $table->text('message');
            $table->string('status', 10)->default('new');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('read_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        // Customer feedback; only approved rows appear on the website.
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            // One review per order.
            $table->foreignId('order_id')->nullable()->unique()->constrained()->nullOnDelete();
            // Shown publicly, e.g. "Maria S." — never the full name unless the owner edits it.
            $table->string('author_name', 100);
            $table->unsignedTinyInteger('rating');
            $table->text('comment');
            $table->string('source', 10)->default('feedback');
            $table->boolean('is_approved')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->timestamps();

            $table->index(['is_approved', 'is_featured']);
        });

        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question');
            $table->text('answer');
            $table->string('category', 50)->default('General');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(true);
            // The 5 shown in the Home page FAQ preview.
            $table->boolean('show_on_home')->default(false);
            $table->timestamps();

            $table->index(['is_published', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('testimonials');
        Schema::dropIfExists('contact_messages');
        Schema::dropIfExists('booking_requests');
    }
};
