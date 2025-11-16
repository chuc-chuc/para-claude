<?php

use App\Controllers\EventoController;
use App\Controllers\InvitadoController;
use App\Controllers\InvitacionController;
use App\Controllers\DetalleBodaController;
use App\Controllers\AcompananteController;
use App\Middleware\CorsMiddleware;
use Slim\Factory\AppFactory;
use Dotenv\Dotenv;

require __DIR__ . '/../vendor/autoload.php';

// Cargar variables de entorno desde el archivo .env
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->load();
}

// Crear la aplicación Slim
$app = AppFactory::create();

// Agregar middleware de CORS (debe ir antes de las rutas)
$app->add(new CorsMiddleware());

// Agregar middleware de manejo de errores
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

// Agregar middleware de parseo del body de las peticiones
$app->addBodyParsingMiddleware();

// =========================================================
// RUTA PRINCIPAL - INFORMACIÓN DE LA API
// =========================================================

/**
 * Ruta principal - Información de la API
 * GET /
 */
$app->get('/', function ($request, $response) {
    $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:4200';

    $response->getBody()->write(json_encode([
        'success' => true,
        'message' => 'API del Sistema de Gestión de Invitaciones para Eventos',
        'version' => '1.0.0',
        'frontend_url' => $frontendUrl,
        'endpoints' => [
            'eventos' => [
                'listar' => 'GET /api/eventos',
                'obtener' => 'GET /api/eventos/{id}',
                'crear' => 'POST /api/eventos',
                'actualizar' => 'PUT /api/eventos/{id}',
                'eliminar' => 'DELETE /api/eventos/{id}',
                'estadisticas' => 'GET /api/eventos/{id}/estadisticas'
            ],
            'detalles_boda' => [
                'obtener' => 'GET /api/eventos/{eventoId}/detalles-boda',
                'crear' => 'POST /api/eventos/{eventoId}/detalles-boda',
                'actualizar' => 'PUT /api/eventos/{eventoId}/detalles-boda',
                'eliminar' => 'DELETE /api/eventos/{eventoId}/detalles-boda'
            ],
            'invitados' => [
                'listar' => 'GET /api/eventos/{eventoId}/invitados',
                'crear' => 'POST /api/eventos/{eventoId}/invitados',
                'obtener' => 'GET /api/invitados/{uuid}',
                'actualizar' => 'PUT /api/invitados/{uuid}',
                'eliminar' => 'DELETE /api/invitados/{uuid}',
                'importar' => 'POST /api/eventos/{eventoId}/invitados/importar'
            ],
            'acompanantes' => [
                'listar_por_invitado' => 'GET /api/invitados/{uuid}/acompanantes',
                'listar_por_evento' => 'GET /api/eventos/{eventoId}/acompanantes',
                'obtener' => 'GET /api/acompanantes/{id}',
                'crear' => 'POST /api/invitados/{uuid}/acompanantes',
                'crear_multiples' => 'POST /api/invitados/{uuid}/acompanantes/multiple',
                'actualizar' => 'PUT /api/acompanantes/{id}',
                'eliminar' => 'DELETE /api/acompanantes/{id}',
                'sincronizar' => 'PUT /api/invitados/{uuid}/acompanantes/sincronizar'
            ],
            'invitaciones' => [
                'info_invitado' => 'GET /api/invitaciones/info/{uuid}',
                'confirmar' => 'POST /api/invitaciones/confirmar/{uuid}',
                'check_in' => 'POST /api/invitaciones/check-in/{uuid}',
                'enviar_individual' => 'POST /api/invitaciones/enviar/{uuid}',
                'enviar_masivo' => 'POST /api/eventos/{eventoId}/invitaciones/enviar-masivo',
                'generar_link' => 'GET /api/invitaciones/link/{uuid}'
            ]
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return $response->withHeader('Content-Type', 'application/json');
});

// =========================================================
// RUTAS DE EVENTOS
// =========================================================
$app->group('/api/eventos', function ($group) {
    $eventoController = new EventoController();

    // Listar todos los eventos
    $group->get('', [$eventoController, 'listar']);

    // Obtener un evento específico
    $group->get('/{id}', [$eventoController, 'obtener']);

    // Crear un nuevo evento
    $group->post('', [$eventoController, 'crear']);

    // Actualizar un evento
    $group->put('/{id}', [$eventoController, 'actualizar']);

    // Eliminar un evento
    $group->delete('/{id}', [$eventoController, 'eliminar']);

    // Obtener estadísticas de un evento
    $group->get('/{id}/estadisticas', [$eventoController, 'estadisticas']);
});

// =========================================================
// RUTAS DE DETALLES DE BODA
// =========================================================
$app->group('/api/eventos/{eventoId}/detalles-boda', function ($group) {
    $detalleBodaController = new DetalleBodaController();

    // Obtener detalles de boda
    $group->get('', [$detalleBodaController, 'obtener']);

    // Crear detalles de boda
    $group->post('', [$detalleBodaController, 'crear']);

    // Actualizar detalles de boda
    $group->put('', [$detalleBodaController, 'actualizar']);

    // Eliminar detalles de boda
    $group->delete('', [$detalleBodaController, 'eliminar']);
});

// =========================================================
// RUTAS DE INVITADOS
// =========================================================
$app->group('/api/eventos/{eventoId}/invitados', function ($group) {
    $invitadoController = new InvitadoController();

    // Listar invitados de un evento
    $group->get('', [$invitadoController, 'listarPorEvento']);

    // Crear un nuevo invitado
    $group->post('', [$invitadoController, 'crear']);

    // Importar invitados desde CSV
    $group->post('/importar', [$invitadoController, 'importar']);
});

$app->group('/api/invitados', function ($group) {
    $invitadoController = new InvitadoController();

    // Obtener un invitado específico
    $group->get('/{uuid}', [$invitadoController, 'obtener']);

    // Actualizar un invitado
    $group->put('/{uuid}', [$invitadoController, 'actualizar']);

    // Eliminar un invitado
    $group->delete('/{uuid}', [$invitadoController, 'eliminar']);
});

// =========================================================
// RUTAS DE ACOMPAÑANTES
// =========================================================
$app->group('/api/invitados/{uuid}/acompanantes', function ($group) {
    $acompananteController = new AcompananteController();

    // Listar acompañantes de un invitado
    $group->get('', [$acompananteController, 'listarPorInvitado']);

    // Crear un acompañante
    $group->post('', [$acompananteController, 'crear']);

    // Crear múltiples acompañantes
    $group->post('/multiple', [$acompananteController, 'crearMultiples']);

    // Sincronizar acompañantes
    $group->put('/sincronizar', [$acompananteController, 'sincronizar']);
});

$app->group('/api/acompanantes', function ($group) {
    $acompananteController = new AcompananteController();

    // Obtener un acompañante específico
    $group->get('/{id}', [$acompananteController, 'obtener']);

    // Actualizar un acompañante
    $group->put('/{id}', [$acompananteController, 'actualizar']);

    // Eliminar un acompañante
    $group->delete('/{id}', [$acompananteController, 'eliminar']);
});

$app->group('/api/eventos/{eventoId}/acompanantes', function ($group) {
    $acompananteController = new AcompananteController();

    // Listar todos los acompañantes de un evento
    $group->get('', [$acompananteController, 'listarPorEvento']);
});

// =========================================================
// RUTAS DE INVITACIONES
// =========================================================
$app->group('/api/invitaciones', function ($group) {
    $invitacionController = new InvitacionController();

    // Obtener información de un invitado (para página pública)
    $group->get('/info/{uuid}', [$invitacionController, 'obtenerInfoInvitado']);

    // Generar link de invitación
    $group->get('/link/{uuid}', [$invitacionController, 'generarLink']);

    // Confirmar asistencia de un invitado
    $group->post('/confirmar/{uuid}', [$invitacionController, 'confirmarAsistencia']);

    // Registrar llegada al evento (check-in)
    $group->post('/check-in/{uuid}', [$invitacionController, 'checkIn']);

    // Enviar invitación individual (opcional - para emails)
    $group->post('/enviar/{uuid}', [$invitacionController, 'enviarInvitacion']);
});

// Ruta para envío masivo de invitaciones (opcional - para emails)
$app->group('/api/eventos/{eventoId}', function ($group) {
    $invitacionController = new InvitacionController();

    // Enviar invitaciones masivas a todos los invitados del evento
    $group->post('/invitaciones/enviar-masivo', [$invitacionController, 'enviarInvitacionesMasivas']);
});

// =========================================================
// EJECUTAR LA APLICACIÓN
// =========================================================
$app->run();
