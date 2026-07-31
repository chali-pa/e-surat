<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('surats');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Tabel surats sudah deprecated dan tidak dipakai lagi.
        // Data surat dikelola sepenuhnya via Google Sheets & Drive.
    }
};
