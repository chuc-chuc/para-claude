<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

/**
 * Modelo para gestionar los eventos
 */
class EventoModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Obtiene todos los eventos
     * 
     * @return array Lista de eventos
     */
    public function obtenerTodos(): array
    {
        try {
            $query = "SELECT * FROM eventos ORDER BY fecha DESC";
            $stmt = $this->db->query($query);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error al obtener eventos: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Obtiene un evento por su ID
     * 
     * @param int $id ID del evento
     * @return array|null Datos del evento o null si no existe
     */
    public function obtenerPorId(int $id): ?array
    {
        try {
            $query = "SELECT * FROM eventos WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            $resultado = $stmt->fetch();
            return $resultado ?: null;
        } catch (PDOException $e) {
            error_log("Error al obtener evento: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Crea un nuevo evento
     * 
     * @param array $datos Datos del evento (nombre, fecha, ubicacion, tipo)
     * @return int|false ID del evento creado o false si hay error
     */
    public function crear(array $datos): int|false
    {
        try {
            $query = "INSERT INTO eventos (nombre, fecha, ubicacion, tipo) 
                      VALUES (:nombre, :fecha, :ubicacion, :tipo)";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':nombre', $datos['nombre']);
            $stmt->bindParam(':fecha', $datos['fecha']);
            $stmt->bindParam(':ubicacion', $datos['ubicacion']);
            
            $tipo = $datos['tipo'] ?? 'boda';
            $stmt->bindParam(':tipo', $tipo);
            
            $stmt->execute();
            return (int) $this->db->lastInsertId();
        } catch (PDOException $e) {
            error_log("Error al crear evento: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Actualiza un evento existente
     * 
     * @param int $id ID del evento
     * @param array $datos Datos a actualizar
     * @return bool True si se actualizó correctamente
     */
    public function actualizar(int $id, array $datos): bool
    {
        try {
            $query = "UPDATE eventos 
                      SET nombre = :nombre, 
                          fecha = :fecha, 
                          ubicacion = :ubicacion, 
                          tipo = :tipo 
                      WHERE id = :id";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':nombre', $datos['nombre']);
            $stmt->bindParam(':fecha', $datos['fecha']);
            $stmt->bindParam(':ubicacion', $datos['ubicacion']);
            $stmt->bindParam(':tipo', $datos['tipo']);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al actualizar evento: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Elimina un evento
     * 
     * @param int $id ID del evento
     * @return bool True si se eliminó correctamente
     */
    public function eliminar(int $id): bool
    {
        try {
            $query = "DELETE FROM eventos WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al eliminar evento: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtiene estadísticas de un evento
     * 
     * @param int $eventoId ID del evento
     * @return array Estadísticas del evento
     */
    public function obtenerEstadisticas(int $eventoId): array
    {
        try {
            $query = "SELECT 
                        COUNT(*) as total_invitados,
                        SUM(CASE WHEN estado = 'invitado' THEN 1 ELSE 0 END) as pendientes,
                        SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END) as confirmados,
                        SUM(CASE WHEN estado = 'declinado' THEN 1 ELSE 0 END) as declinados,
                        SUM(CASE WHEN estado = 'registrado' THEN 1 ELSE 0 END) as registrados,
                        SUM(asistentes_esperados) as total_asistentes_esperados,
                        SUM(CASE WHEN estado = 'confirmado' THEN asistentes_esperados ELSE 0 END) as asistentes_confirmados
                      FROM invitados 
                      WHERE evento_id = :evento_id";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();
            
            $resultado = $stmt->fetch();
            
            return $resultado ?: [
                'total_invitados' => 0,
                'pendientes' => 0,
                'confirmados' => 0,
                'declinados' => 0,
                'registrados' => 0,
                'total_asistentes_esperados' => 0,
                'asistentes_confirmados' => 0
            ];
        } catch (PDOException $e) {
            error_log("Error al obtener estadísticas: " . $e->getMessage());
            return [];
        }
    }
}
