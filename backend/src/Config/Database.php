<?php

namespace App\Config;

use PDO;
use PDOException;

/**
 * Clase para gestionar la conexión a la base de datos MySQL
 * Implementa el patrón Singleton para mantener una única conexión
 */
class Database
{
    private static ?PDO $connection = null;

    /**
     * Obtiene la conexión a la base de datos (patrón Singleton)
     * 
     * @return PDO Instancia de conexión PDO
     * @throws PDOException Si hay error en la conexión
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            try {
                $host = $_ENV['DB_HOST'] ?? 'localhost';
                $dbname = $_ENV['DB_NAME'] ?? 'gestor_eventos';
                $username = $_ENV['DB_USER'] ?? 'root';
                $password = $_ENV['DB_PASS'] ?? '';
                $charset = 'utf8mb4';

                $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
                
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ];

                self::$connection = new PDO($dsn, $username, $password, $options);
                
            } catch (PDOException $e) {
                error_log("Error de conexión a la base de datos: " . $e->getMessage());
                throw new PDOException("No se pudo conectar a la base de datos", 500);
            }
        }

        return self::$connection;
    }

    /**
     * Cierra la conexión a la base de datos
     */
    public static function closeConnection(): void
    {
        self::$connection = null;
    }
}
