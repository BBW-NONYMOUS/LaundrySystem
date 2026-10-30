<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->string('status', 20)->default('scheduled');
            $table->foreignId('rider_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scheduled_at')->index();
            // Address/phone snapshot: where this trip actually went.
            $table->text('address');
            $table->string('contact_phone', 20);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('completed_at')->nullable();
            $table->string('failure_reason')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();

            // At most one pickup and one delivery per order; failed trips are rescheduled in place.
            $table->unique(['order_id', 'type']);
            $table->index(['rider_id', 'status', 'scheduled_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
