<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;

/**
 * Middleware para manejar CORS (Cross-Origin Resource Sharing)
 * Permite que el frontend Angular se comunique con el backend PHP
 */
class CorsMiddleware
{
    /**
     * Procesa la solicitud y agrega headers CORS
     * 
     * @param Request $request Solicitud HTTP
     * @param RequestHandler $handler Manejador de la solicitud
     * @return Response Respuesta con headers CORS
     */
    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        // Si es una solicitud OPTIONS (preflight), responder inmediatamente
        if ($request->getMethod() === 'OPTIONS') {
            $response = new \Slim\Psr7\Response();
        } else {
            $response = $handler->handle($request);
        }

        return $response
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            ->withHeader('Access-Control-Max-Age', '3600');
    }
}
