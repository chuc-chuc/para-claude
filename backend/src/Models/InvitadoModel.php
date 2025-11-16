<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;
use Ramsey\Uuid\Uuid;

/**
 * Modelo para gestionar los invitados a eventos
 */
class InvitadoModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Obtiene todos los invitados de un evento
     * 
     * @param int $eventoId ID del evento
     * @return array Lista de invitados con sus estadísticas
     */
    public function obtenerPorEvento(int $eventoId): array
    {
        try {
            $query = "SELECT 
                        i.*,
                        (SELECT COUNT(*) FROM acompanantes WHERE invitado_uuid = i.uuid) as num_acompanantes,
                        (SELECT COUNT(*) FROM registros WHERE invitado_uuid = i.uuid) as registros_entrada
                      FROM invitados i 
                      WHERE i.evento_id = :evento_id 
                      ORDER BY i.creado_en DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error al obtener invitados: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtiene un invitado por su UUID
     * 
     * @param string $uuid UUID del invitado
     * @return array|null Datos del invitado o null si no existe
     */
    public function obtenerPorUuid(string $uuid): ?array
    {
        try {
            $query = "SELECT i.*,
                      e.nombre as evento_nombre,
                      e.fecha as evento_fecha,
                      e.ubicacion as evento_ubicacion,
                      (SELECT COUNT(*) FROM acompanantes WHERE invitado_uuid = i.uuid) as num_acompanantes
                      FROM invitados i
                      INNER JOIN eventos e ON i.evento_id = e.id
                      WHERE i.uuid = :uuid";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':uuid', $uuid);
            $stmt->execute();

            $resultado = $stmt->fetch();
            return $resultado ?: null;
        } catch (PDOException $e) {
            error_log("Error al obtener invitado: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Crea un nuevo invitado
     * 
     * @param array $datos Datos del invitado
     * @return string|false UUID del invitado creado o false si hay error
     */
    public function crear(array $datos): string|false
    {
        try {
            // Generar UUID único
            $uuid = Uuid::uuid4()->toString();

            $query = "INSERT INTO invitados 
                      (uuid, evento_id, nombre_completo, correo, telefono, 
                       es_familiar, asistentes_esperados, estado) 
                      VALUES 
                      (:uuid, :evento_id, :nombre_completo, :correo, :telefono, 
                       :es_familiar, :asistentes_esperados, :estado)";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':uuid', $uuid);
            $stmt->bindParam(':evento_id', $datos['evento_id'], PDO::PARAM_INT);
            $stmt->bindParam(':nombre_completo', $datos['nombre_completo']);
            $stmt->bindParam(':correo', $datos['correo']);

            $telefono = $datos['telefono'] ?? null;
            $stmt->bindParam(':telefono', $telefono);

            $esFamiliar = $datos['es_familiar'] ?? 0;
            $stmt->bindParam(':es_familiar', $esFamiliar, PDO::PARAM_INT);

            $asistentesEsperados = $datos['asistentes_esperados'] ?? 1;
            $stmt->bindParam(':asistentes_esperados', $asistentesEsperados, PDO::PARAM_INT);

            $estado = $datos['estado'] ?? 'invitado';
            $stmt->bindParam(':estado', $estado);

            $stmt->execute();
            return $uuid;
        } catch (PDOException $e) {
            error_log("Error al crear invitado: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Actualiza un invitado existente
     * 
     * @param string $uuid UUID del invitado
     * @param array $datos Datos a actualizar
     * @return bool True si se actualizó correctamente
     */
    public function actualizar(string $uuid, array $datos): bool
    {
        try {
            $query = "UPDATE invitados 
                      SET nombre_completo = :nombre_completo,
                          correo = :correo,
                          telefono = :telefono,
                          es_familiar = :es_familiar,
                          asistentes_esperados = :asistentes_esperados,
                          estado = :estado
                      WHERE uuid = :uuid";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':uuid', $uuid);
            $stmt->bindParam(':nombre_completo', $datos['nombre_completo']);
            $stmt->bindParam(':correo', $datos['correo']);
            $stmt->bindParam(':telefono', $datos['telefono']);
            $stmt->bindParam(':es_familiar', $datos['es_familiar'], PDO::PARAM_INT);
            $stmt->bindParam(':asistentes_esperados', $datos['asistentes_esperados'], PDO::PARAM_INT);
            $stmt->bindParam(':estado', $datos['estado']);

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al actualizar invitado: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Elimina un invitado
     * 
     * @param string $uuid UUID del invitado
     * @return bool True si se eliminó correctamente
     */
    public function eliminar(string $uuid): bool
    {
        try {
            $query = "DELETE FROM invitados WHERE uuid = :uuid";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':uuid', $uuid);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al eliminar invitado: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Actualiza el estado de un invitado (para confirmación)
     * 
     * @param string $uuid UUID del invitado
     * @param string $estado Nuevo estado (confirmado, declinado)
     * @return bool True si se actualizó correctamente
     */
    public function confirmarAsistencia(string $uuid, string $estado): bool
    {
        try {
            $query = "UPDATE invitados 
                      SET estado = :estado 
                      WHERE uuid = :uuid";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':uuid', $uuid);
            $stmt->bindParam(':estado', $estado);

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al confirmar asistencia: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Registra la llegada de un invitado al evento (check-in)
     * 
     * @param string $uuid UUID del invitado
     * @param string|null $dispositivoId ID del dispositivo que registra
     * @return int|false ID del registro o false si hay error
     */
    public function registrarLlegada(string $uuid, ?string $dispositivoId = null): int|false
    {
        try {
            // Verificar que el invitado existe
            $invitado = $this->obtenerPorUuid($uuid);
            if (!$invitado) {
                return false;
            }

            $this->db->beginTransaction();

            // Insertar registro de llegada
            $query = "INSERT INTO registros (invitado_uuid, dispositivo_id, sincronizado) 
                      VALUES (:invitado_uuid, :dispositivo_id, 1)";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':invitado_uuid', $uuid);
            $stmt->bindParam(':dispositivo_id', $dispositivoId);
            $stmt->execute();

            $registroId = (int) $this->db->lastInsertId();

            // Actualizar estado del invitado a 'registrado'
            $queryUpdate = "UPDATE invitados 
                           SET estado = 'registrado', 
                               registrado_en = CURRENT_TIMESTAMP 
                           WHERE uuid = :uuid";

            $stmtUpdate = $this->db->prepare($queryUpdate);
            $stmtUpdate->bindParam(':uuid', $uuid);
            $stmtUpdate->execute();

            $this->db->commit();

            return $registroId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Error al registrar llegada: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Importa invitados de forma masiva desde un array
     * 
     * @param int $eventoId ID del evento
     * @param array $invitados Array de invitados
     * @return array Resultado de la importación (exitosos, errores, total)
     */
    public function importarMasivo(int $eventoId, array $invitados): array
    {
        $exitosos = 0;
        $errores = [];

        try {
            $this->db->beginTransaction();

            foreach ($invitados as $index => $invitado) {
                $datosInvitado = [
                    'evento_id' => $eventoId,
                    'nombre_completo' => trim($invitado['nombre_completo'] ?? ''),
                    'correo' => trim($invitado['correo'] ?? ''),
                    'telefono' => $invitado['telefono'] ?? null,
                    'es_familiar' => (int)($invitado['es_familiar'] ?? 0),
                    'asistentes_esperados' => (int)($invitado['asistentes_esperados'] ?? 1),
                    'estado' => 'invitado'
                ];

                // Validar datos mínimos
                if (empty($datosInvitado['nombre_completo']) || empty($datosInvitado['correo'])) {
                    $errores[] = "Fila " . ($index + 2) . ": Nombre o correo vacío";
                    continue;
                }

                $uuid = $this->crear($datosInvitado);

                if ($uuid) {
                    $exitosos++;
                } else {
                    $errores[] = "Fila " . ($index + 2) . ": Error al crear invitado (posible correo duplicado)";
                }
            }

            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Error en importación masiva: " . $e->getMessage());
            return [
                'exitosos' => 0,
                'errores' => ['Error general en la importación: ' . $e->getMessage()],
                'total' => count($invitados)
            ];
        }

        return [
            'exitosos' => $exitosos,
            'errores' => $errores,
            'total' => count($invitados)
        ];
    }

    /**
     * Obtiene estadísticas de confirmaciones de un evento
     * 
     * @param int $eventoId ID del evento
     * @return array Estadísticas de confirmaciones
     */
    public function obtenerEstadisticasConfirmacion(int $eventoId): array
    {
        try {
            $query = "SELECT 
                        COUNT(*) as total_invitados,
                        SUM(CASE WHEN estado = 'invitado' THEN 1 ELSE 0 END) as pendientes,
                        SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END) as confirmados,
                        SUM(CASE WHEN estado = 'declinado' THEN 1 ELSE 0 END) as declinados,
                        SUM(CASE WHEN estado = 'registrado' THEN 1 ELSE 0 END) as registrados,
                        SUM(CASE WHEN estado = 'confirmado' THEN asistentes_esperados ELSE 0 END) as total_asistentes_confirmados
                      FROM invitados 
                      WHERE evento_id = :evento_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetch() ?: [];
        } catch (PDOException $e) {
            error_log("Error al obtener estadísticas: " . $e->getMessage());
            return [];
        }
    }
}
