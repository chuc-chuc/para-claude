<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

/**
 * Modelo para gestionar los acompañantes de invitados
 * 
 * Los acompañantes son personas adicionales que asisten con un invitado principal.
 * Por ejemplo, si una familia completa está invitada, el padre podría ser el invitado
 * principal y su esposa e hijos serían acompañantes.
 */
class AcompananteModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Obtiene todos los acompañantes de un invitado
     * 
     * @param string $invitadoUuid UUID del invitado principal
     * @return array Lista de acompañantes
     */
    public function obtenerPorInvitado(string $invitadoUuid): array
    {
        try {
            $query = "SELECT * FROM acompanantes 
                      WHERE invitado_uuid = :invitado_uuid 
                      ORDER BY creado_en ASC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':invitado_uuid', $invitadoUuid);
            $stmt->execute();

            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error al obtener acompañantes: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtiene un acompañante específico por su ID
     * 
     * @param int $id ID del acompañante
     * @return array|null Datos del acompañante o null si no existe
     */
    public function obtenerPorId(int $id): ?array
    {
        try {
            $query = "SELECT a.*, i.nombre_completo as invitado_principal 
                      FROM acompanantes a
                      INNER JOIN invitados i ON a.invitado_uuid = i.uuid
                      WHERE a.id = :id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $resultado = $stmt->fetch();
            return $resultado ?: null;
        } catch (PDOException $e) {
            error_log("Error al obtener acompañante: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Crea un nuevo acompañante
     * 
     * @param string $invitadoUuid UUID del invitado principal
     * @param string $nombreCompleto Nombre completo del acompañante
     * @return int|false ID del acompañante creado o false si hay error
     */
    public function crear(string $invitadoUuid, string $nombreCompleto): int|false
    {
        try {
            $query = "INSERT INTO acompanantes (invitado_uuid, nombre_completo) 
                      VALUES (:invitado_uuid, :nombre_completo)";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':invitado_uuid', $invitadoUuid);
            $stmt->bindParam(':nombre_completo', $nombreCompleto);
            $stmt->execute();

            return (int) $this->db->lastInsertId();
        } catch (PDOException $e) {
            error_log("Error al crear acompañante: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Crea múltiples acompañantes de una sola vez
     * 
     * @param string $invitadoUuid UUID del invitado principal
     * @param array $acompanantes Array de nombres de acompañantes
     * @return array Resultado con IDs creados y errores
     */
    public function crearMultiples(string $invitadoUuid, array $acompanantes): array
    {
        $creados = [];
        $errores = [];

        try {
            $this->db->beginTransaction();

            foreach ($acompanantes as $index => $nombre) {
                $nombreLimpio = trim($nombre);

                if (empty($nombreLimpio)) {
                    $errores[] = "Acompañante " . ($index + 1) . ": Nombre vacío";
                    continue;
                }

                $id = $this->crear($invitadoUuid, $nombreLimpio);

                if ($id) {
                    $creados[] = [
                        'id' => $id,
                        'nombre' => $nombreLimpio
                    ];
                } else {
                    $errores[] = "Acompañante " . ($index + 1) . ": Error al crear";
                }
            }

            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Error en creación múltiple de acompañantes: " . $e->getMessage());
            return [
                'creados' => [],
                'errores' => ['Error general en la creación: ' . $e->getMessage()],
                'total' => count($acompanantes)
            ];
        }

        return [
            'creados' => $creados,
            'errores' => $errores,
            'total' => count($acompanantes)
        ];
    }

    /**
     * Actualiza el nombre de un acompañante
     * 
     * @param int $id ID del acompañante
     * @param string $nombreCompleto Nuevo nombre
     * @return bool True si se actualizó correctamente
     */
    public function actualizar(int $id, string $nombreCompleto): bool
    {
        try {
            $query = "UPDATE acompanantes 
                      SET nombre_completo = :nombre_completo 
                      WHERE id = :id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':nombre_completo', $nombreCompleto);

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al actualizar acompañante: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Elimina un acompañante
     * 
     * @param int $id ID del acompañante
     * @return bool True si se eliminó correctamente
     */
    public function eliminar(int $id): bool
    {
        try {
            $query = "DELETE FROM acompanantes WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al eliminar acompañante: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Elimina todos los acompañantes de un invitado
     * 
     * @param string $invitadoUuid UUID del invitado principal
     * @return bool True si se eliminaron correctamente
     */
    public function eliminarTodosPorInvitado(string $invitadoUuid): bool
    {
        try {
            $query = "DELETE FROM acompanantes WHERE invitado_uuid = :invitado_uuid";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':invitado_uuid', $invitadoUuid);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al eliminar acompañantes: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cuenta el número de acompañantes de un invitado
     * 
     * @param string $invitadoUuid UUID del invitado principal
     * @return int Número de acompañantes
     */
    public function contarPorInvitado(string $invitadoUuid): int
    {
        try {
            $query = "SELECT COUNT(*) as total 
                      FROM acompanantes 
                      WHERE invitado_uuid = :invitado_uuid";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':invitado_uuid', $invitadoUuid);
            $stmt->execute();

            $resultado = $stmt->fetch();
            return (int) ($resultado['total'] ?? 0);
        } catch (PDOException $e) {
            error_log("Error al contar acompañantes: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Obtiene todos los acompañantes de un evento
     * 
     * @param int $eventoId ID del evento
     * @return array Lista de acompañantes del evento
     */
    public function obtenerPorEvento(int $eventoId): array
    {
        try {
            $query = "SELECT a.*, i.nombre_completo as invitado_principal, i.evento_id
                      FROM acompanantes a
                      INNER JOIN invitados i ON a.invitado_uuid = i.uuid
                      WHERE i.evento_id = :evento_id
                      ORDER BY i.nombre_completo, a.creado_en";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error al obtener acompañantes del evento: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Sincroniza los acompañantes de un invitado
     * Elimina los existentes y crea los nuevos
     * 
     * @param string $invitadoUuid UUID del invitado
     * @param array $nombresAcompanantes Array de nombres
     * @return bool True si se sincronizó correctamente
     */
    public function sincronizar(string $invitadoUuid, array $nombresAcompanantes): bool
    {
        try {
            $this->db->beginTransaction();

            // Eliminar acompañantes existentes
            $this->eliminarTodosPorInvitado($invitadoUuid);

            // Crear nuevos acompañantes
            if (!empty($nombresAcompanantes)) {
                $this->crearMultiples($invitadoUuid, $nombresAcompanantes);
            }

            $this->db->commit();
            return true;
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Error al sincronizar acompañantes: " . $e->getMessage());
            return false;
        }
    }
}
