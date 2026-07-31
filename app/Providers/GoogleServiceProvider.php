<?php

namespace App\Providers;

use App\Services\GoogleClientFactory;
use App\Services\GoogleDriveService;
use App\Services\GoogleSheetService;
use Illuminate\Support\ServiceProvider;

class GoogleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(GoogleClientFactory::class);

        $this->app->singleton(GoogleDriveService::class, function ($app) {
            return new GoogleDriveService($app->make(GoogleClientFactory::class));
        });

        $this->app->singleton(GoogleSheetService::class, function ($app) {
            return new GoogleSheetService($app->make(GoogleClientFactory::class));
        });
    }
}
