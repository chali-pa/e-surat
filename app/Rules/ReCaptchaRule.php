<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;

class ReCaptchaRule implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) {
            $fail('Harap selesaikan verifikasi reCAPTCHA.');
            return;
        }

        $secret = config('services.recaptcha.secret_key');
        
        $response = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
            'secret' => $secret,
            'response' => $value,
        ]);

        if (!$response->json('success')) {
            $fail('Verifikasi reCAPTCHA gagal, silakan coba lagi.');
        }
    }
}
