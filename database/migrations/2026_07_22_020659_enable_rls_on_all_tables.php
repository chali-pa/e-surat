<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        foreach ($tables as $table) {
            DB::statement("ALTER TABLE {$table->tablename} ENABLE ROW LEVEL SECURITY;");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        foreach ($tables as $table) {
            DB::statement("ALTER TABLE {$table->tablename} DISABLE ROW LEVEL SECURITY;");
        }
    }
};
