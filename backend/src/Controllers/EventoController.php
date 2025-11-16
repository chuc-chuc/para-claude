<?php

namespace App\Controllers;

use App\Models\EventoModel;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Controlador para gestionar los endpoints de eventos
 */
class EventoController
{
    private EventoModel $eventoModel;

    public function __construct()
    {
        $this->eventoModel = new EventoModel();
    }

    /**
     * Lista todos los eventos
     * GET /api/eventos
     */
    public function listar(Request $request, Response $response): Response
    {
        $eventos = $this->eventoModel->obtenerTodos();
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $eventos
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Obtiene un evento específico
     * GET /api/eventos/{id}
     */
    public function obtener(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];
        $evento = $this->eventoModel->obtenerPorId($id);
        
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Obtener estadísticas del evento
        $estadisticas = $this->eventoModel->obtenerEstadisticas($id);
        $evento['estadisticas'] = $estadisticas;
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $evento
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Crea un nuevo evento
     * POST /api/eventos
     */
    public function crear(Request $request, Response $response): Response
    {
        $datos = $request->getParsedBody();
        
        // Validar datos requeridos
        if (empty($datos['nombre']) || empty($datos['fecha']) || empty($datos['ubicacion'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Faltan datos requeridos (nombre, fecha, ubicacion)'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $datosEvento = [
            'nombre' => $datos['nombre'],
            'fecha' => $datos['fecha'],
            'ubicacion' => $datos['ubicacion'],
            'tipo' => $datos['tipo'] ?? 'boda'
        ];

        $id = $this->eventoModel->crear($datosEvento);
        
        if (!$id) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al crear el evento'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Evento creado exitosamente',
            'data' => ['id' => $id]
        ]));
        
        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Actualiza un evento existente
     * PUT /api/eventos/{id}
     */
    public function actualizar(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];
        $datos = $request->getParsedBody();
        
        // Verificar que el evento existe
        $evento = $this->eventoModel->obtenerPorId($id);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $datosEvento = [
            'nombre' => $datos['nombre'] ?? $evento['nombre'],
            'fecha' => $datos['fecha'] ?? $evento['fecha'],
            'ubicacion' => $datos['ubicacion'] ?? $evento['ubicacion'],
            'tipo' => $datos['tipo'] ?? $evento['tipo']
        ];

        $actualizado = $this->eventoModel->actualizar($id, $datosEvento);
        
        if (!$actualizado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al actualizar el evento'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Evento actualizado exitosamente'
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Elimina un evento
     * DELETE /api/eventos/{id}
     */
    public function eliminar(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];
        
        // Verificar que el evento existe
        $evento = $this->eventoModel->obtenerPorId($id);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $eliminado = $this->eventoModel->eliminar($id);
        
        if (!$eliminado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al eliminar el evento'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Evento eliminado exitosamente'
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Obtiene estadísticas de un evento
     * GET /api/eventos/{id}/estadisticas
     */
    public function estadisticas(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];
        
        // Verificar que el evento existe
        $evento = $this->eventoModel->obtenerPorId($id);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $estadisticas = $this->eventoModel->obtenerEstadisticas($id);
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $estadisticas
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    }
}
