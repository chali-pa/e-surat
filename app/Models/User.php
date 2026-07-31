<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'google_id', 'avatar', 'email_verified_at', 'google_drive_folder_id', 'google_sheet_id', 'google_sheet_keluar_id', 'google_token'])]
#[Hidden(['password', 'remember_token', 'google_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'google_token' => 'array',
        ];
    }

    public function hasGoogleConfigured(): bool
    {
        return !empty($this->google_token) && !empty($this->google_drive_folder_id) && !empty($this->google_sheet_id);
    }

    public function getGoogleToken(): ?array
    {
        return $this->google_token;
    }

    public function setGoogleToken(array $token): void
    {
        $this->google_token = $token;
        $this->save();
    }
}
