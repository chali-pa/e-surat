<?php

namespace App\Helpers;

class CaptchaHelper
{
    public static function generateBase64($code)
    {
        $width = 240;
        $height = 70;
        $image = imagecreatetruecolor($width, $height);
        
        // Colors
        $bg = imagecolorallocate($image, 26, 26, 46); // #1a1a2e
        $textColor = imagecolorallocate($image, 255, 255, 255);
        $lineColor = imagecolorallocate($image, 221, 136, 207); // #DD88CF
        $dotColor = imagecolorallocate($image, 240, 168, 230); // #f0a8e6
        
        imagefill($image, 0, 0, $bg);
        
        // Generate on a smaller canvas and scale up for a "pixelated/bold" effect
        // which makes it very hard for OCR without a known font, but readable for humans
        $tempWidth = 80;
        $tempHeight = 25;
        $tempImage = imagecreatetruecolor($tempWidth, $tempHeight);
        imagefill($tempImage, 0, 0, $bg);
        
        // Draw characters with varying heights
        $x = 8;
        $length = strlen($code);
        for ($i = 0; $i < $length; $i++) {
            $y = rand(2, 10);
            imagestring($tempImage, 5, $x, $y, $code[$i], $textColor);
            $x += 12;
            // Add intersecting line per char
            imageline($tempImage, $x - 15, rand(0, 25), $x + 5, rand(0, 25), $lineColor);
        }
        
        // Scale up to main image
        imagecopyresized($image, $tempImage, 0, 0, 0, 0, $width, $height, $tempWidth, $tempHeight);
        
        // Add foreground noise to the large image
        for ($i = 0; $i < 8; $i++) {
            imageline($image, rand(0, $width), rand(0, $height), rand(0, $width), rand(0, $height), $dotColor);
        }
        for ($i = 0; $i < 150; $i++) {
            imagesetpixel($image, rand(0, $width), rand(0, $height), $textColor);
        }
        
        // Add a wave distortion effect
        $distortedImage = imagecreatetruecolor($width, $height);
        imagefill($distortedImage, 0, 0, $bg);
        
        $period = rand(10, 30);
        $amplitude = rand(2, 5);
        for ($x = 0; $x < $width; $x++) {
            $offset = (int) ($amplitude * sin($x / $period));
            imagecopy($distortedImage, $image, $x, $offset, $x, 0, 1, $height);
        }
        
        ob_start();
        imagepng($distortedImage);
        $imageData = ob_get_clean();
        
        imagedestroy($image);
        imagedestroy($tempImage);
        imagedestroy($distortedImage);
        
        return 'data:image/png;base64,' . base64_encode($imageData);
    }
}
