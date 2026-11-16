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
        Schema::table('deliveries', function (Blueprint $table) {
            // Why the trip was last moved to another date/time; shown to the customer.
            $table->string('reschedule_reason')->nullable()->after('failure_reason');
            $table->dateTime('rescheduled_at')->nullable()->after('reschedule_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['reschedule_reason', 'rescheduled_at']);
        });
    }
};
