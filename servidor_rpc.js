var rpc = require("./rpc.js");
var conexion = require('./conexion_mysql.js');

module.exports = function(datos) {

    var servidorRPC = rpc.server(3501, function() {
        console.log("Servidor RPC iniciado en el puerto 3501");
    });
    var appRPC = servidorRPC.createApp("hospital");
    
    //LA PAGINA DE SANITARIO SE ABRE CON http://localhost:3000/sanitario.html !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    
    
    appRPC.registerAsync("loginSanitario", function(u, p, callback) {
        var query = "SELECT id FROM sanitarios WHERE usuario = ? AND password = ?";
        
        conexion.query(query, [u, p], function(error, resultados) {
            if (error) {
                console.error("Error en BD durante el login:", error);
                return callback(null); // Si la BD falla, denegamos el acceso devolviendo null
            }
            
            if (resultados.length > 0) {
                callback(resultados[0].id); // Credenciales correctas: devolvemos su ID
            } else {
                callback(null); // Credenciales incorrectas
            }
        });
    });

    appRPC.registerAsync("obtenerSanitario", function(id, callback) {
        conexion.query("SELECT * FROM sanitarios WHERE id = ?", [id], function(error, resultados) {
            if (error || resultados.length === 0) {
                return callback(null); // Si hay error o no existe, devolvemos null
            }
            callback(resultados[0]); // Devolvemos el objeto del sanitario
        });
    });

    appRPC.registerAsync("crearSanitario", function(nuevoSanitario, callback) {
        // 1. Comprobamos si el nombre de usuario ya está cogido
        conexion.query("SELECT id FROM sanitarios WHERE usuario = ?", [nuevoSanitario.usuario], function(error, resultados) {
            if (error) return callback(null);
            if (resultados.length > 0) return callback(null); // Ya existe, abortamos

            // 2. Si está libre, lo insertamos. 
            // MySQL calculará el ID automáticamente gracias al Auto Increment
            conexion.query("INSERT INTO sanitarios SET ?", nuevoSanitario, function(error, insercion) {
                if (error) {
                    console.error("Error al crear:", error);
                    return callback(null);
                }
                console.log("Nuevo sanitario registrado:", nuevoSanitario.usuario);
                // insercion.insertId contiene el ID que MySQL acaba de generar
                callback(insercion.insertId); 
            });
        });
    });

    appRPC.registerAsync("actualizarSanitario", function(id, datosNuevos, callback) {
        var query = "UPDATE sanitarios SET usuario = ?, password = ?, nombre = ?, apellidos = ?, id_area = ? WHERE id = ?";
        var valores = [datosNuevos.usuario, datosNuevos.password, datosNuevos.nombre, datosNuevos.apellidos, datosNuevos.id_area, id];
        
        conexion.query(query, valores, function(error, resultados) {
            if (error) {
                console.error("Error al actualizar:", error);
                return callback(false);
            }
            
            // affectedRows nos dice cuántas filas se han modificado. Si es > 0, ha sido un éxito.
            if (resultados.affectedRows > 0) {
                console.log("Datos actualizados para el ID:", id);
                callback(true);
            } else {
                callback(false);
            }
        });
    });

    

    appRPC.registerAsync("obtenerCategorias", function(callback) {
        conexion.query("SELECT * FROM categorias", function(error, resultados) {
            callback(error ? [] : resultados); 
        });
    });

    appRPC.registerAsync("obtenerModelos", function(callback) {
        conexion.query("SELECT * FROM modelos", function(error, resultados) {
            callback(error ? [] : resultados); 
        });
    });

    appRPC.registerAsync("obtenerRecursos", function(idModelo, callback) {
        if (idModelo == null) {
            conexion.query("SELECT * FROM recursos", function(error, resultados) {
                callback(error ? [] : resultados); 
            });
        } else {
            // Buscamos directamente en MySQL los recursos de ese modelo que estén operativos (estado = 0)
            conexion.query("SELECT * FROM recursos WHERE modelo = ? AND estado = 0", [idModelo], function(error, resultados) {
                callback(error ? [] : resultados); 
            });
        }
    });
    
    appRPC.registerAsync("obtenerUbicaciones", function(callback) {
        conexion.query("SELECT * FROM ubicaciones", function(error, resultados) {
            callback(error ? [] : resultados); 
        });
    });

    appRPC.registerAsync("obtenerResenyas", function(idRecurso, callback) {
        if (idRecurso == null) {
            conexion.query("SELECT * FROM resenas", function(error, resultados) {
                callback(error ? [] : resultados); 
            });
        } else {
            // Sustituimos el filter() de javascript por un WHERE en SQL
            conexion.query("SELECT * FROM resenas WHERE recurso = ?", [idRecurso], function(error, resultados) {
                callback(error ? [] : resultados); 
            });
        }
    });
    


    
    appRPC.registerAsync("obtenerReservas", function(idSanitario, callback) {
        conexion.query("SELECT * FROM reservas WHERE sanitario = ?", [idSanitario], function(error, resultados) {
            callback(error ? [] : resultados);
        });
    });

    appRPC.registerAsync("iniciarReserva", function(idReserva, callback) {
        // Miramos qué recurso pertenece a esta reserva
        conexion.query("SELECT recurso FROM reservas WHERE id = ?", [idReserva], function(error, resultados) {
            if (error || resultados.length === 0) return callback(false);
            var idRecurso = resultados[0].recurso;
            
            // Actualizamos la reserva poniendo la fecha de inicio actual
            conexion.query("UPDATE reservas SET fecha_inicio = ? WHERE id = ?", [new Date(), idReserva], function(err1) {
                if (err1) return callback(false);
                
                // Marcamos el recurso como ocupado (estado = 1)
                conexion.query("UPDATE recursos SET estado = 1 WHERE id = ?", [idRecurso], function(err2) {
                    if (err2) return callback(false);
                    console.log("Recurso retirado para la reserva:", idReserva);
                    callback(true);
                });
            });
        });
    });

    appRPC.registerAsync("cancelarReserva", function(idReserva, callback) {
        conexion.query("DELETE FROM reservas WHERE id = ?", [idReserva], function(error, resultados) {
            if (error) return callback(false);
            callback(resultados.affectedRows > 0); // Si borró algo, devuelve true
        });
    });

    appRPC.registerAsync("finalizarReserva", function(idReserva, callback) {
        // Miramos qué recurso pertenece a esta reserva
        conexion.query("SELECT recurso FROM reservas WHERE id = ?", [idReserva], function(error, resultados) {
            if (error || resultados.length === 0) return callback(false);
            var idRecurso = resultados[0].recurso;
            
            // Actualizamos la reserva poniendo la fecha de fin
            conexion.query("UPDATE reservas SET fecha_fin = ? WHERE id = ?", [new Date(), idReserva], function(err1) {
                if (err1) return callback(false);
                
                // Devolvemos el recurso a estado libre (estado = 0)
                conexion.query("UPDATE recursos SET estado = 0 WHERE id = ?", [idRecurso], function(err2) {
                    if (err2) return callback(false);
                    console.log("Recurso devuelto para la reserva:", idReserva);
                    callback(true);
                });
            });
        });
    });

    appRPC.registerAsync("crearResenya", function(idRecurso, idSanitario, valoracion, descripcion, callback) {
        var nuevaResena = {
            recurso: idRecurso,
            sanitario: idSanitario,
            fecha: new Date(),
            valor: parseInt(valoracion),
            descripcion: descripcion
        };
        
        conexion.query("INSERT INTO resenas SET ?", nuevaResena, function(error, insercion) {
            if (error) return callback(null);
            console.log("Nueva reseña guardada, ID:", insercion.insertId);
            callback(insercion.insertId); 
        });
    });

    


    appRPC.registerAsync("reservarRecurso", function(idRecurso, idSanitario, horasEstimadas, callback) {
        var nuevaReserva = {
            recurso: idRecurso,
            sanitario: idSanitario,
            horas_estimadas: parseInt(horasEstimadas),
            fecha_peticion: new Date()
        };
        
        conexion.query("INSERT INTO reservas SET ?", nuevaReserva, function(error, insercion) {
            if (error) return callback(null);
            callback(insercion.insertId); 
        });
    });


    appRPC.registerAsync("tiempoPendiente", function(idRecurso, callback) {
        // Le pedimos a MySQL que busque directamente la reserva de este recurso que ha empezado pero no ha terminado
        var query = "SELECT horas_estimadas FROM reservas WHERE recurso = ? AND fecha_inicio IS NOT NULL AND fecha_fin IS NULL";
        
        conexion.query(query, [idRecurso], function(error, resultados) {
            if (error || resultados.length === 0) {
                return callback(0); // Si no hay reserva activa, el tiempo pendiente es 0
            }
            callback(resultados[0].horas_estimadas);
        });
    });
 
    appRPC.registerAsync("asignarArea", function(idSanitario, codigoPostal, callback) {
        var query = "UPDATE sanitarios SET area = ? WHERE id = ?";
        
        conexion.query(query, [codigoPostal, idSanitario], function(error, resultados) {
            console.log("2");
            if (error) {
                console.error("Error al actualizar:", error);
                return callback(false);
            }
            
            // affectedRows nos dice cuántas filas se han modificado. Si es > 0, ha sido un éxito.
            if (resultados.affectedRows > 0) {
                console.log("1")
                console.log("Area añadida para el sanitario");
                callback(true);
            } else {
                callback(false);
            }
        });
    });
//LA PAGINA DE SANITARIO SE ABRE CON http://localhost:3000/sanitario.html !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
};