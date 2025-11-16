<?php

namespace App\Controllers;

use App\Models\InvitadoModel;
use App\Utils\EmailSender;
use App\Utils\QRGenerator;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use PDO;
use App\Config\Database;

/**
 * Controlador para gestionar el envío de invitaciones y confirmaciones
 */
class InvitacionController
{
    private InvitadoModel $invitadoModel;
    private PDO $db;

    public function __construct()
    {
        $this->invitadoModel = new InvitadoModel();
        $this->db = Database::getConnection();
    }

    /**
     * Genera el link de invitación para un invitado
     * GET /api/invitaciones/link/{uuid}
     */
    public function generarLink(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];

        // Verificar que el invitado existe
        $invitado = $this->invitadoModel->obtenerPorUuid($uuid);

        if (!$invitado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Invitado no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // URL base del frontend
        $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:4200';
        $urlConfirmacion = $frontendUrl . '/confirmar/' . $uuid;

        // Generar código QR si no existe
        $qrCode = $invitado['codigo_qr'];
        if (empty($qrCode)) {
            $qrCode = QRGenerator::generarParaInvitado($uuid, $frontendUrl);

            // Guardar el código QR en la base de datos
            $queryUpdateQR = "UPDATE invitados SET codigo_qr = :qr WHERE uuid = :uuid";
            $stmtQR = $this->db->prepare($queryUpdateQR);
            $stmtQR->bindParam(':qr', $qrCode);
            $stmtQR->bindParam(':uuid', $uuid);
            $stmtQR->execute();
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => [
                'uuid' => $uuid,
                'nombre_completo' => $invitado['nombre_completo'],
                'url_confirmacion' => $urlConfirmacion,
                'codigo_qr' => $qrCode,
                'evento' => [
                    'nombre' => $invitado['evento_nombre'],
                    'fecha' => $invitado['evento_fecha'],
                    'ubicacion' => $invitado['evento_ubicacion']
                ]
            ]
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Envía una invitación individual a un invitado
     * POST /api/invitaciones/enviar/{uuid}
     */
    public function enviarInvitacion(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];

        // Obtener datos del invitado
        $invitado = $this->invitadoModel->obtenerPorUuid($uuid);

        if (!$invitado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Invitado no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        try {
            // URL base del frontend
            $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:4200';
            $urlConfirmacion = $frontendUrl . '/confirmar/' . $uuid;

            // Generar código QR
            $qrCode = QRGenerator::generarParaInvitado($uuid, $frontendUrl);

            // Guardar el código QR en la base de datos
            $queryUpdateQR = "UPDATE invitados SET codigo_qr = :qr WHERE uuid = :uuid";
            $stmtQR = $this->db->prepare($queryUpdateQR);
            $stmtQR->bindParam(':qr', $qrCode);
            $stmtQR->bindParam(':uuid', $uuid);
            $stmtQR->execute();

            // Enviar email
            $emailSender = new EmailSender();
            $enviado = $emailSender->enviarInvitacion($invitado, $qrCode, $urlConfirmacion);

            if ($enviado) {
                // Registrar el envío en la tabla invitaciones
                $queryInvitacion = "INSERT INTO invitaciones (invitado_uuid, tipo) 
                                   VALUES (:uuid, 'invitacion')";
                $stmtInv = $this->db->prepare($queryInvitacion);
                $stmtInv->bindParam(':uuid', $uuid);
                $stmtInv->execute();

                $response->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'Invitación enviada exitosamente'
                ]));
            } else {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'message' => 'Error al enviar el email. Verifica la configuración SMTP.'
                ]));
                return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
            }
        } catch (\Exception $e) {
            error_log("Error al enviar invitación: " . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al procesar la invitación: ' . $e->getMessage()
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Envía invitaciones masivas a todos los invitados de un evento
     * POST /api/eventos/{eventoId}/invitaciones/enviar-masivo
     */
    public function enviarInvitacionesMasivas(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];

        // Obtener todos los invitados del evento que aún no tienen invitación enviada
        $invitados = $this->invitadoModel->obtenerPorEvento($eventoId);

        if (empty($invitados)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'No hay invitados en este evento'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $enviados = 0;
        $errores = [];
        $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:4200';

        foreach ($invitados as $invitado) {
            try {
                $uuid = $invitado['uuid'];
                $urlConfirmacion = $frontendUrl . '/confirmar/' . $uuid;

                // Generar código QR
                $qrCode = QRGenerator::generarParaInvitado($uuid, $frontendUrl);

                // Guardar el código QR
                $queryUpdateQR = "UPDATE invitados SET codigo_qr = :qr WHERE uuid = :uuid";
                $stmtQR = $this->db->prepare($queryUpdateQR);
                $stmtQR->bindParam(':qr', $qrCode);
                $stmtQR->bindParam(':uuid', $uuid);
                $stmtQR->execute();

                // Enviar email
                $emailSender = new EmailSender();
                $enviado = $emailSender->enviarInvitacion($invitado, $qrCode, $urlConfirmacion);

                if ($enviado) {
                    // Registrar el envío
                    $queryInvitacion = "INSERT INTO invitaciones (invitado_uuid, tipo) 
                                       VALUES (:uuid, 'invitacion')";
                    $stmtInv = $this->db->prepare($queryInvitacion);
                    $stmtInv->bindParam(':uuid', $uuid);
                    $stmtInv->execute();

                    $enviados++;
                } else {
                    $errores[] = "Error al enviar a: " . $invitado['nombre_completo'];
                }

                // Pequeña pausa para no saturar el servidor SMTP
                usleep(500000); // 0.5 segundos

            } catch (\Exception $e) {
                $errores[] = "Error con " . $invitado['nombre_completo'] . ": " . $e->getMessage();
                error_log("Error al enviar invitación masiva: " . $e->getMessage());
            }
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Proceso de envío completado',
            'data' => [
                'total' => count($invitados),
                'enviados' => $enviados,
                'errores' => $errores
            ]
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Confirma la asistencia de un invitado
     * POST /api/invitaciones/confirmar/{uuid}
     */
    public function confirmarAsistencia(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];
        $datos = $request->getParsedBody();

        $confirma = $datos['confirma'] ?? true; // true = confirma, false = declina
        $estado = $confirma ? 'confirmado' : 'declinado';

        $actualizado = $this->invitadoModel->confirmarAsistencia($uuid, $estado);

        if (!$actualizado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al confirmar asistencia. Verifica que el UUID sea correcto.'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $mensaje = $confirma
            ? '¡Gracias por confirmar tu asistencia!'
            : 'Lamentamos que no puedas asistir.';

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => $mensaje,
            'estado' => $estado
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Registra la llegada de un invitado al evento (check-in)
     * POST /api/invitaciones/check-in/{uuid}
     */
    public function checkIn(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];
        $datos = $request->getParsedBody();

        $dispositivoId = $datos['dispositivo_id'] ?? null;

        // Verificar que el invitado existe
        $invitado = $this->invitadoModel->obtenerPorUuid($uuid);

        if (!$invitado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Invitado no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Verificar si ya está registrado
        if ($invitado['estado'] === 'registrado') {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Este invitado ya ha sido registrado previamente',
                'data' => [
                    'nombre' => $invitado['nombre_completo'],
                    'registrado_en' => $invitado['registrado_en']
                ]
            ]));
            return $response->withStatus(409)->withHeader('Content-Type', 'application/json');
        }

        // Registrar llegada
        $registroId = $this->invitadoModel->registrarLlegada($uuid, $dispositivoId);

        if (!$registroId) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al registrar la llegada'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => '¡Bienvenido al evento!',
            'data' => [
                'nombre' => $invitado['nombre_completo'],
                'asistentes_esperados' => $invitado['asistentes_esperados'],
                'registro_id' => $registroId
            ]
        ]));

        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Obtiene información pública de un invitado para la confirmación
     * GET /api/invitaciones/info/{uuid}
     */
    public function obtenerInfoInvitado(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];

        $invitado = $this->invitadoModel->obtenerPorUuid($uuid);

        if (!$invitado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Invitación no encontrada'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Retornar solo información pública necesaria
        $infoPublica = [
            'nombre_completo' => $invitado['nombre_completo'],
            'evento_nombre' => $invitado['evento_nombre'],
            'evento_fecha' => $invitado['evento_fecha'],
            'evento_ubicacion' => $invitado['evento_ubicacion'],
            'asistentes_esperados' => $invitado['asistentes_esperados'],
            'estado' => $invitado['estado']
        ];

        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $infoPublica
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }
}
