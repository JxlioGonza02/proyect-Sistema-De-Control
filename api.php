<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$host = "beyhvpokzuey16ay7fyd-mysql.services.clever-cloud.com";
$port = 3306;
$user = "ue793vykf4vqxvgz";
$pass = "vjX8CF0v9iaMNQGIIx5e";
$db   = "beyhvpokzuey16ay7fyd";

$conn = new mysqli($host, $user, $pass, $db, $port);

if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $m1_estado = intval($_POST["motor1_estado"] ?? 0);
    $m1_rpm    = floatval($_POST["motor1_rpm"]   ?? 0);
    $m2_estado = intval($_POST["motor2_estado"] ?? 0);
    $m2_rpm    = floatval($_POST["motor2_rpm"]   ?? 0);
    $vibracion = floatval($_POST["vibracion"]    ?? 0);
    $alerta    = ($vibracion > 2.5) ? 1 : 0;

    $stmt = $conn->prepare(
        "INSERT INTO registros 
         (motor1_estado, motor1_rpm, motor2_estado, motor2_rpm, vibracion, alerta)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("idided", $m1_estado, $m1_rpm, $m2_estado, $m2_rpm, $vibracion, $alerta);
    $stmt->execute();

    if ($alerta) {
        $conn->query("INSERT INTO alertas (tipo, valor, descripcion) 
                      VALUES ('vibracion_alta', $vibracion, 'Vibración excesiva detectada')");
    }

    echo json_encode(["status" => "ok", "id" => $conn->insert_id]);

} elseif ($_SERVER["REQUEST_METHOD"] == "GET") {
    $result = $conn->query("SELECT * FROM registros ORDER BY fecha_hora DESC LIMIT 50");
    $datos = [];
    while ($row = $result->fetch_assoc()) $datos[] = $row;
    echo json_encode($datos);
}

$conn->close();
?>