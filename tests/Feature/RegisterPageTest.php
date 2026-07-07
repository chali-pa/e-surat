<?php

namespace Tests\Feature;

use Tests\TestCase;

class RegisterPageTest extends TestCase
{
    public function test_register_page_renders(): void
    {
        $response = $this->get(route('register'));

        $response->assertStatus(200);
        $response->assertSee('Buat Akun');
    }
}
