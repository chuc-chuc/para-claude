<?php

namespace App\Controllers;

use App\Models\DetalleBodaModel;
use App\Models\EventoModel;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Controlador para gestionar los detalles específicos de bodas
 */
class DetalleBodaController
{
    private DetalleBodaModel $detalleBodaModel;
    private EventoModel $eventoModel;

    public function __construct()
    {
        $this->detalleBodaModel = new DetalleBodaModel();
        $this->eventoModel = new EventoModel();
    }

    /**
     * Obtiene los detalles de una boda
     * GET /api/eventos/{eventoId}/detalles-boda
     */
    public function obtener(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];

        // Verificar que el evento existe
        $evento = $this->eventoModel->obtenerPorId($eventoId);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $detalles = $this->detalleBodaModel->obtenerPorEvento($eventoId);

        if (!$detalles) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Este evento no tiene detalles de boda configurados'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $detalles
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Crea los detalles de una boda
     * POST /api/eventos/{eventoId}/detalles-boda
     */
    public function crear(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];
        $datos = $request->getParsedBody();

        // Verificar que el evento existe y es de tipo boda
        $evento = $this->eventoModel->obtenerPorId($eventoId);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        if ($evento['tipo'] !== 'boda') {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Este endpoint solo es válido para eventos de tipo "boda"'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        // Verificar que no existan detalles previos
        if ($this->detalleBodaModel->existe($eventoId)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Este evento ya tiene detalles de boda. Usa PUT para actualizar.'
            ]));
            return $response->withStatus(409)->withHeader('Content-Type', 'application/json');
        }

        // Validar datos requeridos
        if (empty($datos['novia']) || empty($datos['novio'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Los nombres de novia y novio son requeridos'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $creado = $this->detalleBodaModel->crear($eventoId, $datos);

        if (!$creado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al crear los detalles de la boda'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Detalles de boda creados exitosamente'
        ]));

        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Actualiza los detalles de una boda
     * PUT /api/eventos/{eventoId}/detalles-boda
     */
    public function actualizar(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];
        $datos = $request->getParsedBody();

        // Verificar que el evento existe
        $evento = $this->eventoModel->obtenerPorId($eventoId);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Verificar que existen detalles previos
        if (!$this->detalleBodaModel->existe($eventoId)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Este evento no tiene detalles de boda. Usa POST para crear.'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $actualizado = $this->detalleBodaModel->actualizar($eventoId, $datos);

        if (!$actualizado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al actualizar los detalles de la boda'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Detalles de boda actualizados exitosamente'
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Elimina los detalles de una boda
     * DELETE /api/eventos/{eventoId}/detalles-boda
     */
    public function eliminar(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];

        // Verificar que el evento existe
        $evento = $this->eventoModel->obtenerPorId($eventoId);
        if (!$evento) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Evento no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Verificar que existen detalles previos
        if (!$this->detalleBodaModel->existe($eventoId)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Este evento no tiene detalles de boda'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $eliminado = $this->detalleBodaModel->eliminar($eventoId);

        if (!$eliminado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al eliminar los detalles de la boda'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Detalles de boda eliminados exitosamente'
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }
}
