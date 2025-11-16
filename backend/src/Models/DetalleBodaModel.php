<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

/**
 * Modelo para gestionar los detalles específicos de bodas
 * 
 * Este modelo maneja toda la información adicional exclusiva de eventos tipo 'boda',
 * incluyendo información de novios, padres, padrinos, ceremonia y recepción.
 */
class DetalleBodaModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Obtiene los detalles de una boda por el ID del evento
     * 
     * @param int $eventoId ID del evento
     * @return array|null Detalles de la boda o null si no existen
     */
    public function obtenerPorEvento(int $eventoId): ?array
    {
        try {
            $query = "SELECT * FROM detalles_boda WHERE evento_id = :evento_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();

            $resultado = $stmt->fetch();
            return $resultado ?: null;
        } catch (PDOException $e) {
            error_log("Error al obtener detalles de boda: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Crea los detalles de una boda
     * 
     * @param int $eventoId ID del evento asociado
     * @param array $datos Datos de los detalles de la boda
     * @return bool True si se creó correctamente
     */
    public function crear(int $eventoId, array $datos): bool
    {
        try {
            $query = "INSERT INTO detalles_boda (
                        evento_id, novia, novio, fecha_ceremonia, iglesia, direccion_iglesia,
                        salon_recepcion, direccion_salon, padre_novia, madre_novia,
                        padre_novio, madre_novio, padrino_novia, madrina_novia,
                        padrino_novio, madrina_novio, hashtag, colores, frase_bienvenida,
                        foto_portada, cuenta_bancaria, regalo_registro
                    ) VALUES (
                        :evento_id, :novia, :novio, :fecha_ceremonia, :iglesia, :direccion_iglesia,
                        :salon_recepcion, :direccion_salon, :padre_novia, :madre_novia,
                        :padre_novio, :madre_novio, :padrino_novia, :madrina_novia,
                        :padrino_novio, :madrina_novio, :hashtag, :colores, :frase_bienvenida,
                        :foto_portada, :cuenta_bancaria, :regalo_registro
                    )";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->bindParam(':novia', $datos['novia']);
            $stmt->bindParam(':novio', $datos['novio']);

            // Campos opcionales
            $fechaCeremonia = $datos['fecha_ceremonia'] ?? null;
            $iglesia = $datos['iglesia'] ?? null;
            $direccionIglesia = $datos['direccion_iglesia'] ?? null;
            $salonRecepcion = $datos['salon_recepcion'] ?? null;
            $direccionSalon = $datos['direccion_salon'] ?? null;
            $padreNovia = $datos['padre_novia'] ?? null;
            $madreNovia = $datos['madre_novia'] ?? null;
            $padreNovio = $datos['padre_novio'] ?? null;
            $madreNovio = $datos['madre_novio'] ?? null;
            $padrinoNovia = $datos['padrino_novia'] ?? null;
            $madrinaNovia = $datos['madrina_novia'] ?? null;
            $padrinoNovio = $datos['padrino_novio'] ?? null;
            $madrinaNovio = $datos['madrina_novio'] ?? null;
            $hashtag = $datos['hashtag'] ?? null;
            $colores = $datos['colores'] ?? null;
            $fraseBienvenida = $datos['frase_bienvenida'] ?? null;
            $fotoPortada = $datos['foto_portada'] ?? null;
            $cuentaBancaria = $datos['cuenta_bancaria'] ?? null;
            $regaloRegistro = $datos['regalo_registro'] ?? null;

            $stmt->bindParam(':fecha_ceremonia', $fechaCeremonia);
            $stmt->bindParam(':iglesia', $iglesia);
            $stmt->bindParam(':direccion_iglesia', $direccionIglesia);
            $stmt->bindParam(':salon_recepcion', $salonRecepcion);
            $stmt->bindParam(':direccion_salon', $direccionSalon);
            $stmt->bindParam(':padre_novia', $padreNovia);
            $stmt->bindParam(':madre_novia', $madreNovia);
            $stmt->bindParam(':padre_novio', $padreNovio);
            $stmt->bindParam(':madre_novio', $madreNovio);
            $stmt->bindParam(':padrino_novia', $padrinoNovia);
            $stmt->bindParam(':madrina_novia', $madrinaNovia);
            $stmt->bindParam(':padrino_novio', $padrinoNovio);
            $stmt->bindParam(':madrina_novio', $madrinaNovio);
            $stmt->bindParam(':hashtag', $hashtag);
            $stmt->bindParam(':colores', $colores);
            $stmt->bindParam(':frase_bienvenida', $fraseBienvenida);
            $stmt->bindParam(':foto_portada', $fotoPortada);
            $stmt->bindParam(':cuenta_bancaria', $cuentaBancaria);
            $stmt->bindParam(':regalo_registro', $regaloRegistro);

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al crear detalles de boda: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Actualiza los detalles de una boda
     * 
     * @param int $eventoId ID del evento
     * @param array $datos Datos a actualizar
     * @return bool True si se actualizó correctamente
     */
    public function actualizar(int $eventoId, array $datos): bool
    {
        try {
            // Obtener datos actuales
            $actual = $this->obtenerPorEvento($eventoId);
            if (!$actual) {
                return false;
            }

            $query = "UPDATE detalles_boda SET
                        novia = :novia,
                        novio = :novio,
                        fecha_ceremonia = :fecha_ceremonia,
                        iglesia = :iglesia,
                        direccion_iglesia = :direccion_iglesia,
                        salon_recepcion = :salon_recepcion,
                        direccion_salon = :direccion_salon,
                        padre_novia = :padre_novia,
                        madre_novia = :madre_novia,
                        padre_novio = :padre_novio,
                        madre_novio = :madre_novio,
                        padrino_novia = :padrino_novia,
                        madrina_novia = :madrina_novia,
                        padrino_novio = :padrino_novio,
                        madrina_novio = :madrina_novio,
                        hashtag = :hashtag,
                        colores = :colores,
                        frase_bienvenida = :frase_bienvenida,
                        foto_portada = :foto_portada,
                        cuenta_bancaria = :cuenta_bancaria,
                        regalo_registro = :regalo_registro
                      WHERE evento_id = :evento_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);

            // Usar datos actuales si no se proporcionan nuevos
            $stmt->bindValue(':novia', $datos['novia'] ?? $actual['novia']);
            $stmt->bindValue(':novio', $datos['novio'] ?? $actual['novio']);
            $stmt->bindValue(':fecha_ceremonia', $datos['fecha_ceremonia'] ?? $actual['fecha_ceremonia']);
            $stmt->bindValue(':iglesia', $datos['iglesia'] ?? $actual['iglesia']);
            $stmt->bindValue(':direccion_iglesia', $datos['direccion_iglesia'] ?? $actual['direccion_iglesia']);
            $stmt->bindValue(':salon_recepcion', $datos['salon_recepcion'] ?? $actual['salon_recepcion']);
            $stmt->bindValue(':direccion_salon', $datos['direccion_salon'] ?? $actual['direccion_salon']);
            $stmt->bindValue(':padre_novia', $datos['padre_novia'] ?? $actual['padre_novia']);
            $stmt->bindValue(':madre_novia', $datos['madre_novia'] ?? $actual['madre_novia']);
            $stmt->bindValue(':padre_novio', $datos['padre_novio'] ?? $actual['padre_novio']);
            $stmt->bindValue(':madre_novio', $datos['madre_novio'] ?? $actual['madre_novio']);
            $stmt->bindValue(':padrino_novia', $datos['padrino_novia'] ?? $actual['padrino_novia']);
            $stmt->bindValue(':madrina_novia', $datos['madrina_novia'] ?? $actual['madrina_novia']);
            $stmt->bindValue(':padrino_novio', $datos['padrino_novio'] ?? $actual['padrino_novio']);
            $stmt->bindValue(':madrina_novio', $datos['madrina_novio'] ?? $actual['madrina_novio']);
            $stmt->bindValue(':hashtag', $datos['hashtag'] ?? $actual['hashtag']);
            $stmt->bindValue(':colores', $datos['colores'] ?? $actual['colores']);
            $stmt->bindValue(':frase_bienvenida', $datos['frase_bienvenida'] ?? $actual['frase_bienvenida']);
            $stmt->bindValue(':foto_portada', $datos['foto_portada'] ?? $actual['foto_portada']);
            $stmt->bindValue(':cuenta_bancaria', $datos['cuenta_bancaria'] ?? $actual['cuenta_bancaria']);
            $stmt->bindValue(':regalo_registro', $datos['regalo_registro'] ?? $actual['regalo_registro']);

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al actualizar detalles de boda: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Elimina los detalles de una boda
     * 
     * @param int $eventoId ID del evento
     * @return bool True si se eliminó correctamente
     */
    public function eliminar(int $eventoId): bool
    {
        try {
            $query = "DELETE FROM detalles_boda WHERE evento_id = :evento_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error al eliminar detalles de boda: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Verifica si un evento tiene detalles de boda
     * 
     * @param int $eventoId ID del evento
     * @return bool True si tiene detalles
     */
    public function existe(int $eventoId): bool
    {
        return $this->obtenerPorEvento($eventoId) !== null;
    }
}
