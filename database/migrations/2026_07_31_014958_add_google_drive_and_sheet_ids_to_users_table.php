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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'google_drive_folder_id')) {
                $table->string('google_drive_folder_id')->nullable()->after('avatar');
            }
            if (!Schema::hasColumn('users', 'google_sheet_id')) {
                $table->string('google_sheet_id')->nullable()->after('google_drive_folder_id');
            }
            if (!Schema::hasColumn('users', 'google_sheet_keluar_id')) {
                $table->string('google_sheet_keluar_id')->nullable()->after('google_sheet_id');
            }
            if (!Schema::hasColumn('users', 'google_token')) {
                $table->text('google_token')->nullable()->after('google_sheet_keluar_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_drive_folder_id', 'google_sheet_id', 'google_sheet_keluar_id', 'google_token']);
        });
    }
};
