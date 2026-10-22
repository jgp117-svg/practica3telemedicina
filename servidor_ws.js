
var http = require("http");
var WebSocketServer = require("websocket").server;

module.exports = function(datos) {
    var httpServer = http.createServer();
    var wsServer = new WebSocketServer({ httpServer: httpServer });

    httpServer.listen(4444, function () {
        console.log("Servidor WebSocket (Avisos) iniciado en puerto 4444");
    });

    var clientes = [];

    wsServer.on("request", function (request) {
        var connection = request.accept("hospital", request.origin);
        var cliente = { connection: connection, id: null, rol: null, nombre: null };
        clientes.push(cliente);

        connection.on("message", function (message) {
            if (message.type === "utf8") {
                var msg = JSON.parse(message.utf8Data);
                msg.fecha = new Date(); 

                switch (msg.operacion) {
                    case "identificar":  
                        cliente.id = msg.id;
                        cliente.rol = msg.rol;
                        cliente.nombre = msg.nombre;
                        break;

                    case "avisoReserva":
                        let sanitariosAfectados = datos.reservas
                            .filter(r => r.recurso == msg.idRecurso && r.fecha_fin == null)
                            .map(r => r.sanitario);

                        clientes.forEach(c => {
                            if (c.rol === "sanitario" && sanitariosAfectados.includes(c.id) && c.id !== cliente.id) {
                                c.connection.sendUTF(JSON.stringify(msg));
                            }
                        });
                        break;

                    case "avisoNuevoRecurso": 
                        clientes.forEach(c => {
                            if (c.rol === "sanitario") c.connection.sendUTF(JSON.stringify(msg));
                        });
                        break;

                    case "avisoResenya": 
                        clientes.forEach(c => {
                            if (c.rol === "gestor") c.connection.sendUTF(JSON.stringify(msg));
                        });
                        break;
                }
            }
        });

        connection.on("close", function () {
            clientes = clientes.filter(c => c !== cliente);
        });
    });
};