<?php

namespace App\Controllers;

use App\Models\InvitadoModel;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Controlador para gestionar los endpoints de invitados
 */
class InvitadoController
{
    private InvitadoModel $invitadoModel;

    public function __construct()
    {
        $this->invitadoModel = new InvitadoModel();
    }

    /**
     * Lista todos los invitados de un evento
     * GET /api/eventos/{eventoId}/invitados
     */
    public function listarPorEvento(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];
        $invitados = $this->invitadoModel->obtenerPorEvento($eventoId);
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $invitados
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Obtiene un invitado específico
     * GET /api/invitados/{uuid}
     */
    public function obtener(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];
        $invitado = $this->invitadoModel->obtenerPorUuid($uuid);
        
        if (!$invitado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Invitado no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $invitado
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Crea un nuevo invitado
     * POST /api/eventos/{eventoId}/invitados
     */
    public function crear(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];
        $datos = $request->getParsedBody();
        
        // Validar datos requeridos
        if (empty($datos['nombre_completo']) || empty($datos['correo'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Faltan datos requeridos (nombre_completo, correo)'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $datosInvitado = [
            'evento_id' => $eventoId,
            'nombre_completo' => $datos['nombre_completo'],
            'correo' => $datos['correo'],
            'telefono' => $datos['telefono'] ?? null,
            'es_familiar' => (int)($datos['es_familiar'] ?? 0),
            'asistentes_esperados' => (int)($datos['asistentes_esperados'] ?? 1),
            'estado' => 'invitado'
        ];

        $uuid = $this->invitadoModel->crear($datosInvitado);
        
        if (!$uuid) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al crear el invitado. Verifica que el correo no esté duplicado.'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Invitado creado exitosamente',
            'data' => ['uuid' => $uuid]
        ]));
        
        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Actualiza un invitado existente
     * PUT /api/invitados/{uuid}
     */
    public function actualizar(Request $request, Response $response, array $args): Response
    {
        $uuid = $args['uuid'];
        $datos = $request->getParsedBody();
        
        // Verificar que el invitado existe
        $invitado = $this->invitadoModel->obtenerPorUuid($uuid);
        if (!$invitado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Invitado no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $datosInvitado = [
            'nombre_completo' => $datos['nombre_completo'] ?? $invitado['nombre_completo'],
            'correo' => $datos['correo'] ?? $invitado['correo'],
            'telefono' => $datos['telefono'] ?? $invitado['telefono'],
            'es_familiar' => (int)($datos['es_familiar'] ?? $invitado['es_familiar']),
            'asistentes_esperados' => (int)($datos['asistentes_esperados'] ?? $invitado['asistentes_esperados']),
            'estado' => $datos['estado'] ?? $invitado['estado']
        ];

        $actualizado = $this->invitadoModel->actualizar($uuid, $datosInvitado);
        
        if (!$actualizado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al actualizar el invitado'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Invitado actualizado exitosamente'
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Elimina un invitado
     * DELETE /api/invitados/{uuid}
     */
    public function eliminar(Request $request, Response $response, array $args): Response
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

        $eliminado = $this->invitadoModel->eliminar($uuid);
        
        if (!$eliminado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al eliminar el invitado'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Invitado eliminado exitosamente'
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Importa invitados de forma masiva desde CSV
     * POST /api/eventos/{eventoId}/invitados/importar
     */
    public function importar(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];
        $uploadedFiles = $request->getUploadedFiles();
        
        if (!isset($uploadedFiles['archivo'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'No se ha enviado ningún archivo'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $archivo = $uploadedFiles['archivo'];
        
        if ($archivo->getError() !== UPLOAD_ERR_OK) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al subir el archivo'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        // Procesar archivo CSV
        $contenido = $archivo->getStream()->getContents();
        $lineas = explode("\n", $contenido);
        $invitados = [];

        // Saltar la primera línea (encabezados)
        for ($i = 1; $i < count($lineas); $i++) {
            $linea = trim($lineas[$i]);
            if (empty($linea)) continue;

            $datos = str_getcsv($linea);
            
            if (count($datos) >= 2) {
                $invitados[] = [
                    'nombre_completo' => $datos[0] ?? '',
                    'correo' => $datos[1] ?? '',
                    'telefono' => $datos[2] ?? null,
                    'es_familiar' => (int) ($datos[3] ?? 0),
                    'asistentes_esperados' => (int) ($datos[4] ?? 1)
                ];
            }
        }

        if (empty($invitados)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'El archivo no contiene datos válidos'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $resultado = $this->invitadoModel->importarMasivo($eventoId, $invitados);
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Importación completada',
            'data' => $resultado
        ]));
        
        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }
}
