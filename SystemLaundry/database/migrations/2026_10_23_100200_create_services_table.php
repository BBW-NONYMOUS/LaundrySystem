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
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->string('pricing_unit', 10);
            $table->decimal('price', 10, 2);
            // Minimum billable quantity, e.g. "minimum of 3 kg".
            $table->decimal('min_quantity', 8, 2)->default(0);
            $table->unsignedSmallInteger('turnaround_hours')->default(48);
            // NULL means express/rush is not offered for this service.
            $table->unsignedSmallInteger('express_turnaround_hours')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
