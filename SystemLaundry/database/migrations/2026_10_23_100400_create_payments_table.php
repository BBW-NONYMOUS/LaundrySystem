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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $table->string('method', 20);
            $table->string('reference_number', 100)->nullable();
            // Amount applied to the order balance.
            $table->decimal('amount', 10, 2);
            // Cash handed over by the customer; change is computed as tendered - amount.
            $table->decimal('amount_tendered', 10, 2)->nullable();
            $table->dateTime('paid_at')->index();
            // Payments are voided, never deleted, so the audit trail stays complete.
            $table->dateTime('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('void_reason')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
