<?php

namespace App\Utils;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Clase para enviar emails utilizando PHPMailer
 */
class EmailSender
{
    private PHPMailer $mail;

    public function __construct()
    {
        $this->mail = new PHPMailer(true);
        $this->configurar();
    }

    /**
     * Configura PHPMailer con las credenciales del entorno
     */
    private function configurar(): void
    {
        try {
            // Configuración del servidor SMTP
            $this->mail->isSMTP();
            $this->mail->Host = $_ENV['MAIL_HOST'] ?? 'smtp.gmail.com';
            $this->mail->SMTPAuth = true;
            $this->mail->Username = $_ENV['MAIL_USERNAME'] ?? '';
            $this->mail->Password = $_ENV['MAIL_PASSWORD'] ?? '';
            $this->mail->SMTPSecure = $_ENV['MAIL_ENCRYPTION'] ?? PHPMailer::ENCRYPTION_STARTTLS;
            $this->mail->Port = (int)($_ENV['MAIL_PORT'] ?? 587);
            $this->mail->CharSet = 'UTF-8';

            // Remitente por defecto
            $this->mail->setFrom(
                $_ENV['MAIL_FROM'] ?? 'noreply@eventos.com',
                $_ENV['MAIL_FROM_NAME'] ?? 'Sistema de Eventos'
            );
        } catch (Exception $e) {
            error_log("Error al configurar PHPMailer: " . $e->getMessage());
        }
    }

    /**
     * Envía una invitación por email a un invitado
     * 
     * @param array $invitado Datos del invitado
     * @param string $qrCode Código QR en base64
     * @param string $urlConfirmacion URL para confirmar asistencia
     * @return bool True si se envió correctamente
     */
    public function enviarInvitacion(array $invitado, string $qrCode, string $urlConfirmacion): bool
    {
        try {
            // Destinatario
            $this->mail->addAddress($invitado['correo'], $invitado['nombre_completo']);

            // Asunto
            $this->mail->Subject = '¡Estás invitado! - ' . $invitado['evento_nombre'];

            // Contenido del email
            $this->mail->isHTML(true);
            $this->mail->Body = $this->plantillaInvitacion($invitado, $qrCode, $urlConfirmacion);
            $this->mail->AltBody = $this->plantillaInvitacionTexto($invitado, $urlConfirmacion);

            // Enviar
            $resultado = $this->mail->send();
            
            // Limpiar destinatarios para el próximo envío
            $this->mail->clearAddresses();
            
            return $resultado;
        } catch (Exception $e) {
            error_log("Error al enviar email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Plantilla HTML para la invitación
     * 
     * @param array $invitado Datos del invitado y evento
     * @param string $qrCode Código QR en base64
     * @param string $urlConfirmacion URL para confirmar
     * @return string HTML del email
     */
    private function plantillaInvitacion(array $invitado, string $qrCode, string $urlConfirmacion): string
    {
        $fecha = date('d/m/Y H:i', strtotime($invitado['evento_fecha']));
        
        return "
        <!DOCTYPE html>
        <html lang='es'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .evento-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .qr-container { text-align: center; margin: 30px 0; }
                .qr-container img { max-width: 250px; border: 3px solid #667eea; border-radius: 10px; padding: 10px; background: white; }
                .btn { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .btn:hover { background: #5568d3; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>¡Estás Invitado!</h1>
                    <p style='font-size: 18px; margin: 10px 0 0 0;'>{$invitado['evento_nombre']}</p>
                </div>
                
                <div class='content'>
                    <p>Hola <strong>{$invitado['nombre_completo']}</strong>,</p>
                    
                    <p>Nos complace invitarte a nuestro evento especial. Queremos que seas parte de esta celebración.</p>
                    
                    <div class='evento-info'>
                        <h2 style='margin-top: 0; color: #667eea;'>Detalles del Evento</h2>
                        <p><strong>📅 Fecha:</strong> {$fecha}</p>
                        <p><strong>📍 Ubicación:</strong> {$invitado['evento_ubicacion']}</p>
                        <p><strong>👥 Asistentes esperados:</strong> {$invitado['asistentes_esperados']} persona(s)</p>
                    </div>
                    
                    <div style='text-align: center;'>
                        <a href='{$urlConfirmacion}' class='btn'>
                            ✓ Confirmar Asistencia
                        </a>
                    </div>
                    
                    <div class='qr-container'>
                        <p><strong>Tu código QR de invitación:</strong></p>
                        <img src='{$qrCode}' alt='Código QR'>
                        <p style='font-size: 12px; color: #666;'>Presenta este código al llegar al evento</p>
                    </div>
                    
                    <p style='margin-top: 30px;'>Por favor, confirma tu asistencia lo antes posible haciendo clic en el botón de arriba o escaneando el código QR.</p>
                    
                    <p>¡Esperamos verte pronto!</p>
                </div>
                
                <div class='footer'>
                    <p>Este es un email automático del Sistema de Gestión de Eventos</p>
                    <p>Si tienes alguna pregunta, por favor contáctanos</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Plantilla de texto plano para la invitación
     * 
     * @param array $invitado Datos del invitado y evento
     * @param string $urlConfirmacion URL para confirmar
     * @return string Texto del email
     */
    private function plantillaInvitacionTexto(array $invitado, string $urlConfirmacion): string
    {
        $fecha = date('d/m/Y H:i', strtotime($invitado['evento_fecha']));
        
        return "
¡Estás Invitado!

{$invitado['evento_nombre']}

Hola {$invitado['nombre_completo']},

Nos complace invitarte a nuestro evento especial.

DETALLES DEL EVENTO:
- Fecha: {$fecha}
- Ubicación: {$invitado['evento_ubicacion']}
- Asistentes esperados: {$invitado['asistentes_esperados']} persona(s)

Para confirmar tu asistencia, visita el siguiente enlace:
{$urlConfirmacion}

¡Esperamos verte pronto!

---
Sistema de Gestión de Eventos
        ";
    }

    /**
     * Envía un recordatorio a un invitado
     * 
     * @param array $invitado Datos del invitado
     * @param string $urlConfirmacion URL para confirmar
     * @return bool True si se envió correctamente
     */
    public function enviarRecordatorio(array $invitado, string $urlConfirmacion): bool
    {
        try {
            $this->mail->addAddress($invitado['correo'], $invitado['nombre_completo']);
            $this->mail->Subject = 'Recordatorio: ' . $invitado['evento_nombre'];
            
            $fecha = date('d/m/Y H:i', strtotime($invitado['evento_fecha']));
            
            $this->mail->isHTML(true);
            $this->mail->Body = "
                <h2>Recordatorio de Evento</h2>
                <p>Hola {$invitado['nombre_completo']},</p>
                <p>Te recordamos que tienes una invitación pendiente para:</p>
                <p><strong>{$invitado['evento_nombre']}</strong></p>
                <p>Fecha: {$fecha}</p>
                <p>Ubicación: {$invitado['evento_ubicacion']}</p>
                <p><a href='{$urlConfirmacion}'>Confirmar asistencia</a></p>
            ";

            $resultado = $this->mail->send();
            $this->mail->clearAddresses();
            
            return $resultado;
        } catch (Exception $e) {
            error_log("Error al enviar recordatorio: " . $e->getMessage());
            return false;
        }
    }
}
