<?php

namespace App\Controllers;

use App\Models\AcompananteModel;
use App\Models\InvitadoModel;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Controlador para gestionar los acompañantes de invitados
 */
class AcompananteController
{
    private AcompananteModel $acompananteModel;
    private InvitadoModel $invitadoModel;

    public function __construct()
    {
        $this->acompananteModel = new AcompananteModel();
        $this->invitadoModel = new InvitadoModel();
    }

    /**
     * Lista todos los acompañantes de un invitado
     * GET /api/invitados/{uuid}/acompanantes
     */
    public function listarPorInvitado(Request $request, Response $response, array $args): Response
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

        $acompanantes = $this->acompananteModel->obtenerPorInvitado($uuid);

        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => [
                'invitado' => [
                    'uuid' => $invitado['uuid'],
                    'nombre' => $invitado['nombre_completo']
                ],
                'acompanantes' => $acompanantes,
                'total' => count($acompanantes)
            ]
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Obtiene un acompañante específico
     * GET /api/acompanantes/{id}
     */
    public function obtener(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];
        $acompanante = $this->acompananteModel->obtenerPorId($id);

        if (!$acompanante) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Acompañante no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $acompanante
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Crea un nuevo acompañante
     * POST /api/invitados/{uuid}/acompanantes
     */
    public function crear(Request $request, Response $response, array $args): Response
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

        // Validar datos requeridos
        if (empty($datos['nombre_completo'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'El nombre del acompañante es requerido'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $id = $this->acompananteModel->crear($uuid, $datos['nombre_completo']);

        if (!$id) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al crear el acompañante'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Acompañante creado exitosamente',
            'data' => ['id' => $id]
        ]));

        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Crea múltiples acompañantes de una vez
     * POST /api/invitados/{uuid}/acompanantes/multiple
     */
    public function crearMultiples(Request $request, Response $response, array $args): Response
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

        // Validar que se envió un array de acompañantes
        if (empty($datos['acompanantes']) || !is_array($datos['acompanantes'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Debe enviar un array de nombres de acompañantes'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $resultado = $this->acompananteModel->crearMultiples($uuid, $datos['acompanantes']);

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Proceso completado',
            'data' => $resultado
        ]));

        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Actualiza un acompañante
     * PUT /api/acompanantes/{id}
     */
    public function actualizar(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];
        $datos = $request->getParsedBody();

        // Verificar que el acompañante existe
        $acompanante = $this->acompananteModel->obtenerPorId($id);
        if (!$acompanante) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Acompañante no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        // Validar datos
        if (empty($datos['nombre_completo'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'El nombre del acompañante es requerido'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $actualizado = $this->acompananteModel->actualizar($id, $datos['nombre_completo']);

        if (!$actualizado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al actualizar el acompañante'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Acompañante actualizado exitosamente'
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Elimina un acompañante
     * DELETE /api/acompanantes/{id}
     */
    public function eliminar(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];

        // Verificar que el acompañante existe
        $acompanante = $this->acompananteModel->obtenerPorId($id);
        if (!$acompanante) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Acompañante no encontrado'
            ]));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $eliminado = $this->acompananteModel->eliminar($id);

        if (!$eliminado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al eliminar el acompañante'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Acompañante eliminado exitosamente'
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Sincroniza los acompañantes de un invitado
     * PUT /api/invitados/{uuid}/acompanantes/sincronizar
     */
    public function sincronizar(Request $request, Response $response, array $args): Response
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

        // Obtener array de acompañantes (puede estar vacío para eliminar todos)
        $acompanantes = $datos['acompanantes'] ?? [];

        if (!is_array($acompanantes)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'El campo acompañantes debe ser un array'
            ]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $sincronizado = $this->acompananteModel->sincronizar($uuid, $acompanantes);

        if (!$sincronizado) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Error al sincronizar acompañantes'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Acompañantes sincronizados exitosamente',
            'data' => [
                'total_acompanantes' => count($acompanantes)
            ]
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Lista todos los acompañantes de un evento
     * GET /api/eventos/{eventoId}/acompanantes
     */
    public function listarPorEvento(Request $request, Response $response, array $args): Response
    {
        $eventoId = (int) $args['eventoId'];

        $acompanantes = $this->acompananteModel->obtenerPorEvento($eventoId);

        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => $acompanantes,
            'total' => count($acompanantes)
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    }
}
