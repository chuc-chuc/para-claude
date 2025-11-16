<?php

namespace App\Utils;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Color\Color;

/**
 * Clase para generar códigos QR para invitados
 */
class QRGenerator
{
    /**
     * Genera un código QR para un invitado
     * 
     * @param string $uuid UUID del invitado
     * @param string $baseUrl URL base de la aplicación
     * @return string Código QR en formato base64
     */
    public static function generarParaInvitado(string $uuid, string $baseUrl): string
    {
        try {
            // URL de confirmación del invitado
            $url = $baseUrl . '/confirmar/' . $uuid;

            // Crear el código QR
            $qrCode = QrCode::create($url)
                ->setEncoding(new Encoding('UTF-8'))
                ->setErrorCorrectionLevel(ErrorCorrectionLevel::High)
                ->setSize(300)
                ->setMargin(10)
                ->setRoundBlockSizeMode(RoundBlockSizeMode::Margin)
                ->setForegroundColor(new Color(0, 0, 0))
                ->setBackgroundColor(new Color(255, 255, 255));

            // Crear el writer
            $writer = new PngWriter();
            
            // Generar la imagen
            $result = $writer->write($qrCode);

            // Convertir a base64
            return 'data:image/png;base64,' . base64_encode($result->getString());
            
        } catch (\Exception $e) {
            error_log("Error al generar QR: " . $e->getMessage());
            return '';
        }
    }

    /**
     * Genera un código QR simple con datos personalizados
     * 
     * @param string $data Datos a codificar en el QR
     * @return string Código QR en formato base64
     */
    public static function generarSimple(string $data): string
    {
        try {
            $qrCode = QrCode::create($data)
                ->setEncoding(new Encoding('UTF-8'))
                ->setErrorCorrectionLevel(ErrorCorrectionLevel::Medium)
                ->setSize(250)
                ->setMargin(10);

            $writer = new PngWriter();
            $result = $writer->write($qrCode);

            return 'data:image/png;base64,' . base64_encode($result->getString());
            
        } catch (\Exception $e) {
            error_log("Error al generar QR simple: " . $e->getMessage());
            return '';
        }
    }
}
