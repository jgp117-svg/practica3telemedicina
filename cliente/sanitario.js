var sanitarioActual = null;
var idRecursoResena = null;
var listaCategorias = [];
var listaModelos = [];
var listaRecursos = [];
var listaUbicaciones = [];
var listaResenas = [];
var conexionWS = null;//WS//
var escrituraNFCEnCurso = false;
var listenerLecturaNFC = null;
var listenerEscrituraNFC = null;

var rpcCliente = rpc("practica3telemedicina-lofu.onrender.com", 80, "hospital");

var loginSanitario = rpcCliente.procedure("loginSanitario");
var obtenerSanitario = rpcCliente.procedure("obtenerSanitario");
var crearSanitario = rpcCliente.procedure("crearSanitario");
var actualizarSanitario = rpcCliente.procedure("actualizarSanitario");
var obtenerReservas = rpcCliente.procedure("obtenerReservas");
var obtenerCategorias = rpcCliente.procedure("obtenerCategorias");
var obtenerModelos = rpcCliente.procedure("obtenerModelos");
var obtenerRecursos = rpcCliente.procedure("obtenerRecursos");
var obtenerUbicaciones = rpcCliente.procedure("obtenerUbicaciones");
var iniciarReservaRPC = rpcCliente.procedure("iniciarReserva");
var finalizarReservaRPC = rpcCliente.procedure("finalizarReserva");
var cancelarReservaRPC = rpcCliente.procedure("cancelarReserva");
var crearResenyaRPC = rpcCliente.procedure("crearResenya");
var obtenerResenyas = rpcCliente.procedure("obtenerResenyas");
var reservarRecursoRPC = rpcCliente.procedure("reservarRecurso");
var tiempoPendiente = rpcCliente.procedure("tiempoPendiente");
var asignarArea = rpcCliente.procedure("asignarArea");

document.addEventListener('deviceready', onDeviceReady, false);

//LA PAGINA DE SANITARIO SE ABRE CON http://localhost:3000/sanitario.html !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
function cambiarseccion(seccion){
    document.getElementById('inicio').style.display="none";
    document.getElementById('registro').style.display="none";
    document.getElementById('aplicacion').style.display="none";
    document.getElementById('editar-registro').style.display="none";
    document.getElementById('nueva-reserva').style.display="none";
    document.getElementById('nueva-resena').style.display="none";
    document.getElementById(seccion).style.display="block";
}

function entrar(){//WS//
    var u = document.getElementById("usuario").value;
    var p = document.getElementById("contrasena").value;

    loginSanitario(u, p, function(idDevuelto){
        if(idDevuelto != null){
            obtenerSanitario(idDevuelto, function(respuesta){
                sanitarioActual = respuesta;
                document.getElementById("nombre-sanitario-bienvenida").innerHTML = respuesta.nombre + " " + respuesta.apellidos;
                
                cargarDatosApoyo(function() {
                    cargarTablas(); 
                    conectarAvisos(); 
                    cambiarseccion("aplicacion");
                });
            });
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    });
}

function registrarse() {
    var s = {
        nombre: document.getElementById("nombre").value,
        apellidos: document.getElementById("apellido").value,
        usuario: document.getElementById("usuario-registro").value,
        password: document.getElementById("contrasena-registro").value,
        id_area: parseInt(document.getElementById("area-medica").value)
    };

    if (s.nombre == "" || s.apellidos == "" || s.usuario == "" || s.password == "") {
        alert("Por favor, rellena todos los campos");
        return;
    }

    crearSanitario(s, function(idRecibido) {
        if (idRecibido != null) {
            alert("Registro completado con éxito");
            cambiarseccion('inicio'); 
        } else {
            alert("El nombre de usuario ya existe");
        }
    });
}

function editardatosusuario() {
    document.getElementById("editar-usuario").value = sanitarioActual.usuario;
    document.getElementById("editar-contrasena").value = sanitarioActual.password;
    document.getElementById("editar-nombre").value = sanitarioActual.nombre;
    document.getElementById("editar-apellido").value = sanitarioActual.apellidos;
    cambiarseccion("editar-registro");
}

function guardardatosusuario() {
    var datosNuevos = {
        usuario: document.getElementById("editar-usuario").value,
        password: document.getElementById("editar-contrasena").value,
        nombre: document.getElementById("editar-nombre").value,
        apellidos: document.getElementById("editar-apellido").value,
        id_area: parseInt(document.getElementById("editar-area").value)
    };

    actualizarSanitario(sanitarioActual.id, datosNuevos, function(exito) {
        if (exito) {
            alert("Datos actualizados correctamente");
            sanitarioActual.usuario = datosNuevos.usuario;
            sanitarioActual.password = datosNuevos.password;
            sanitarioActual.nombre = datosNuevos.nombre;
            sanitarioActual.apellidos = datosNuevos.apellidos;

            document.getElementById("nombre-sanitario-bienvenida").innerHTML = sanitarioActual.nombre + " " + sanitarioActual.apellidos;
            cambiarseccion("aplicacion");
        } else {
            alert("Error al actualizar los datos");
        }
    });
}
function salir() {//WS//
    if (conexionWS) {
        conexionWS.close(); 
    }
    document.getElementById("tabla-avisos").innerHTML = ""; 
    
    sanitarioActual = null;
    document.getElementById("usuario").value = "";
    document.getElementById("contrasena").value = "";
    cambiarseccion("inicio");
    console.log("Sesión y conexión cerradas correctamente");
}


function cargarDatosApoyo(callbackFinal) {
    obtenerCategorias(function(resCat) {
        listaCategorias = resCat;
        obtenerModelos(function(resMod) {
            listaModelos = resMod;
            obtenerRecursos(null, function(resRec) {
                listaRecursos = resRec;
                obtenerUbicaciones(function(resUbi) {
                    listaUbicaciones = resUbi;
                    obtenerResenyas(null, function(resRes) {
                        listaResenas = resRes;
                        if(callbackFinal) callbackFinal();
                    });
                });
            });
        });
    });
}

function cargarTablas() {
    obtenerReservas(sanitarioActual.id, function(lista) {
        var tablaPendientes = document.getElementById("cuerpo-tabla-reservas-pendientes");
        var tablaRealizadas = document.getElementById("cuerpo-tabla-reservas-realizadas"); 
        
        tablaPendientes.innerHTML = ""; 
        tablaRealizadas.innerHTML = ""; 

       for (let i = 0; i < lista.length; i++) {
            let r = lista[i];
            
            let recurso = listaRecursos.find(rec => rec.id == r.recurso);
            let modelo = listaModelos.find(m => m.id == recurso.modelo);
            let categoria = listaCategorias.find(c => c.id == modelo.categoria);

            if (r.fecha_inicio == null) {
                let ubicacion = listaUbicaciones.find(u => u.id == recurso.ubicacion);
                
                tiempoPendiente(recurso.id, function(hRest) {
                    var tr = "<tr>";
                    var nombreCategoria = categoria ? categoria.nombre : "-";
                    var nombreModelo = modelo ? modelo.nombre : "-";
                    var nombreUbicacion = ubicacion ? ubicacion.nombre : "-";
                    var fechaPeticion = r.fecha_peticion ? new Date(r.fecha_peticion).toLocaleDateString("es-ES") : "-";
                    tr += "<td class='movil-resumen'><strong>" + nombreCategoria + "</strong></td>";
                    tr += "<td class='movil-detalles'><span>" + nombreModelo + "</span><span>" + recurso.numero_serie + "</span><span>" + nombreUbicacion + "</span><span class='movil-horas-inline'>Duración: " + hRest + "h</span></td>";
                    tr += "<td class='movil-fecha'>" + fechaPeticion + "</td>";
                    tr += "<td class='movil-horas'>" + hRest + " h</td>";
                    tr += "<td>" + (categoria ? categoria.nombre : "-") + "</td>";
                    tr += "<td>" + (modelo ? modelo.nombre : "-") + "</td>";
                    tr += "<td>" + recurso.numero_serie + "</td>";
                    tr += "<td>" + nombreUbicacion + "</td>";
                    tr += "<td>" + (r.fecha_peticion ? new Date(r.fecha_peticion).toLocaleString() : "-") + "</td>";
                    
                    tr += "<td class='celda-horas-escritorio'>" + hRest + "</td>"; 
                    
                    var celdaRetirar = (hRest === 0) ? "<button onclick='retirarRecurso(" + r.id + ")'>Retirar</button>" : "";
                    var celdaX = "<button translate='no' onclick='cancelarReserva(" + r.id + ")'> X </button>";
                    
                    tr += "<td>" + celdaRetirar + "</td>";
                    tr += "<td>" + celdaX + "</td>";
                    
                    tr += "</tr>";
                    tablaPendientes.innerHTML += tr;
                
                });
            }
            else {                  //tabla2
                var tr = "<tr>";
                var nombreCategoria = categoria ? categoria.nombre : "-";
                var nombreModelo = modelo ? modelo.nombre : "-";
                tr += "<td>" + (categoria ? categoria.nombre : "-") + "</td>";
                tr += "<td>" + (modelo ? modelo.nombre : "-") + "</td>";
                tr += "<td>" + recurso.numero_serie + "</td>";
                tr += "<td>" + r.horas_estimadas + "h</td>";
                var fechaInicio = new Date(r.fecha_inicio).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
                var fechaFin = r.fecha_fin ? new Date(r.fecha_fin).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "En curso";
                tr = "<tr><td class='movil-resumen'><strong>" + nombreCategoria + "</strong></td>";
                tr += "<td class='movil-detalles'><span>" + nombreModelo + "</span><span>" + recurso.numero_serie + "</span><span class='movil-horas-inline'>Duración: " + r.horas_estimadas + "h</span></td>";
                tr += "<td class='movil-fecha'>" + fechaInicio + " -> " + fechaFin + "</td>";
                tr += "<td class='movil-horas'>" + r.horas_estimadas + " h</td>";
                tr += "<td>" + nombreCategoria + "</td>";
                tr += "<td>" + nombreModelo + "</td>";
                tr += "<td>" + recurso.numero_serie + "</td>";
                tr += "<td class='celda-horas-escritorio'>" + r.horas_estimadas + "h</td>";
                tr += "<td class='periodo-reserva'><span>" + fechaInicio + "</span><span class='periodo-flecha'>-></span><span>" + fechaFin + "</span></td>";

                if (r.fecha_fin == null) {
                    tr += "<td><button onclick='devolverRecurso(" + r.id + ")'>Devolver</button></td>";
                } else {
                    tr += "<td><button onclick='prepararResena(" + r.recurso + ", \"" + recurso.numero_serie + "\")'>Reseña</button></td>";
                }
                tr += "</tr>";
                
                tablaRealizadas.innerHTML += tr;
            }
        }
    });
}


function retirarRecurso(id) { //WS//
    if (confirm("¿Desea retirar este recurso ahora?")) {
        iniciarReservaRPC(id, function(exito) {
            if (exito) {
                
                obtenerReservas(sanitarioActual.id, function(lista) {
                    let r = lista.find(res => res.id == id);
                    let recurso = listaRecursos.find(rec => rec.id == r.recurso);
                    let modelo = listaModelos.find(m => m.id == recurso.modelo);
                    let categoria = listaCategorias.find(c => c.id == modelo.categoria);

                    conexionWS.send(JSON.stringify({
                        operacion: "avisoReserva",
                        idRecurso: recurso.id, 
                        origen: sanitarioActual.nombre + " " + sanitarioActual.apellidos,
                        texto: "SE HA INICIADO LA RESERVA DEL " + categoria.nombre.toUpperCase() + 
                               " MODELO " + modelo.nombre.toUpperCase() + 
                               " CON CÓDIGO " + recurso.numero_serie
                    }));
                });

                cargarTablas();
            } else {
                alert("Error al retirar el recurso");
            }
        });
    }
}
function cancelarReserva(id) {
    if (confirm("¿Estás seguro de que quieres cancelar esta reserva?")) {
        cancelarReservaRPC(id, function(exito) {
            if (exito) {
                cargarTablas(); 
            } else {
                alert("No se pudo cancelar la reserva");
            }
        });
    }
}
function devolverRecurso(id) { //WS//
    if (confirm("¿Desea devolver el recurso y finalizar la reserva?")) {
        finalizarReservaRPC(id, function(exito) {
            if (exito) {

                obtenerReservas(sanitarioActual.id, function(lista) {
                    let r = lista.find(res => res.id == id);
                    let recurso = listaRecursos.find(rec => rec.id == r.recurso);
                    let modelo = listaModelos.find(m => m.id == recurso.modelo);
                    let categoria = listaCategorias.find(c => c.id == modelo.categoria);

                    conexionWS.send(JSON.stringify({
                        operacion: "avisoReserva",
                        idRecurso: recurso.id,
                        origen: sanitarioActual.nombre + " " + sanitarioActual.apellidos,
                        texto: "SE HA FINALIZADO LA RESERVA DEL " + categoria.nombre.toUpperCase() + 
                               " MODELO " + modelo.nombre.toUpperCase() + 
                               " CON CÓDIGO " + recurso.numero_serie
                    }));
                });

                cargarTablas(); 
            } else {
                alert("Error al devolver el recurso");
            }
        });
    }
}
function prepararResena(idRecurso, numeroSerie) {
    idRecursoResena = idRecurso;     
    document.getElementById("Recurso").innerHTML = numeroSerie;
    document.getElementById("Valoracion").value = "5";
    document.getElementById("Texto").value = "";
    cambiarseccion("nueva-resena");
}

function guardarnuevaresena() { //WS//
    var valoracion = document.getElementById("Valoracion").value;
    var comentario = document.getElementById("Texto").value;

    if (comentario.trim() === "") {
        alert("Por favor, escribe un comentario para la reseña.");
        return;
    }

    crearResenyaRPC(idRecursoResena, sanitarioActual.id, parseInt(valoracion), comentario, function(idDevuelto) {
        if (idDevuelto != null) {
            let recurso = listaRecursos.find(rec => rec.id == idRecursoResena);
            let modelo = listaModelos.find(m => m.id == recurso.modelo);
            let categoria = listaCategorias.find(c => c.id == modelo.categoria);

            conexionWS.send(JSON.stringify({
                operacion: "avisoResenya",
                origen: sanitarioActual.nombre + " " + sanitarioActual.apellidos,
                texto: "SE HA CREADO UNA RESEÑA PARA EL " + categoria.nombre.toUpperCase() + 
                       " MODELO " + modelo.nombre.toUpperCase() + 
                       " CON CÓDIGO " + recurso.numero_serie + 
                       " Y PUNTUACIÓN " + valoracion
            }));

            alert("Reseña guardada correctamente. ¡Gracias!");
            cambiarseccion("aplicacion"); 
        } else {
            alert("Error al guardar la reseña.");
        }
    });
}


function nuevareserva() {
    document.getElementById("cuerpo-tabla-nueva-reserva").innerHTML = "";
    
    var selectCat = document.getElementById("categoria");
    selectCat.innerHTML = "<option value=''>Seleccione categoría...</option>";
    
    for (var i = 0; i < listaCategorias.length; i++) {
        selectCat.innerHTML += "<option value='" + listaCategorias[i].id + "'>" + listaCategorias[i].nombre + "</option>";
    }
    document.getElementById("modelo").innerHTML = "<option value=''>Seleccione modelo...</option>";
    document.getElementById("Tiempo").value = "1";

    cambiarseccion("nueva-reserva");
}
function filtrarModelos() {
    var idCat = document.getElementById("categoria").value;
    var selectMod = document.getElementById("modelo");
    
    selectMod.innerHTML = "<option value=''>Seleccione modelo...</option>";
    document.getElementById("cuerpo-tabla-nueva-reserva").innerHTML = ""; 

    if (idCat != "") {
        var modelosFiltrados = listaModelos.filter(m => m.categoria == idCat);
        for (var i = 0; i < modelosFiltrados.length; i++) {
            selectMod.innerHTML += "<option value='" + modelosFiltrados[i].id + "'>" + modelosFiltrados[i].nombre + "</option>";
        }
    }
}


function buscarreserva() {
    var idModelo = document.getElementById("modelo").value;
    var tbody = document.getElementById("cuerpo-tabla-nueva-reserva");
    tbody.innerHTML = ""; 

    if (idModelo === "") {
        alert("Por favor, selecciona un modelo primero.");
        return;
    }
    var recursosFiltrados = listaRecursos.filter(r => r.modelo == idModelo);

    if (recursosFiltrados.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>No hay recursos de este modelo.</td></tr>";
        return;
    }

    var i = 0;
    function procesarSiguiente() {
        if (i >= recursosFiltrados.length) return; 

        var recurso = recursosFiltrados[i];
        var ubicacion = listaUbicaciones.find(u => u.id == recurso.ubicacion);

        tiempoPendiente(recurso.id, function(hRest) {
            var tr = "<tr>";
            var nombreUbicacion = ubicacion ? ubicacion.nombre : "-";
            tr += "<td>" + recurso.numero_serie + "</td>";
            tr += "<td>" + nombreUbicacion + "</td>";

            var textoHRest = (hRest === 0) ? "Libre" : hRest;
            tr += "<td>" + textoHRest + "</td>";
            
            var resenasAparato = listaResenas.filter(res => res.recurso == recurso.id);
            var valoracionMedia = "-"; 
            
            if (resenasAparato.length > 0) {
                var suma = 0;
                for (var j = 0; j < resenasAparato.length; j++) {
                    suma += resenasAparato[j].valor;
                }
                valoracionMedia = (suma / resenasAparato.length).toFixed(1);
            }
            
            tr = "<tr><td class='movil-resumen'><strong>" + recurso.numero_serie + "</strong></td>";
            tr += "<td class='movil-detalles'><span>" + nombreUbicacion + "</span><span>Valoración " + valoracionMedia + "</span><span class='movil-hrestantes'>H. Restantes: " + textoHRest + "</span></td>";
            tr += "<td>" + recurso.numero_serie + "</td>";
            tr += "<td>" + nombreUbicacion + "</td>";
            tr += "<td>" + textoHRest + "</td>";
            tr += "<td>" + valoracionMedia + "</td>";

            tr += "<td>";
            if (hRest === 0) {
                tr += "<button onclick='ejecutarPeticion(" + recurso.id + ", \"retirar\")'>Retirar</button>";
            } else {
                tr += "<button translate='no' onclick='ejecutarPeticion(" + recurso.id + ", \"reservar\")'>Reservar</button>";
            }
            tr += "</td>";

            tr += "</tr>";
            tbody.innerHTML += tr;

            i++;
            procesarSiguiente();
        });
    }
    procesarSiguiente(); 
}

function ejecutarPeticion(idRecurso, accion) {
    var horas = document.getElementById("Tiempo").value;
    if (horas === "" || horas < 1) {
        alert("Por favor, introduce un tiempo estimado válido.");
        return;
    }
    var mensaje = (accion === "retirar") 
        ? "¿Deseas retirar este recurso ahora mismo por " + horas + " horas?"
        : "¿Deseas reservar este recurso por " + horas + " horas para cuando esté libre?";

    if (confirm(mensaje)) {
        reservarRecursoRPC(idRecurso, sanitarioActual.id, horas, function(idReserva) {
            if (idReserva != null) {
                if (accion === "retirar") {
                    iniciarReservaRPC(idReserva, function(exito) {
                        alert("¡Recurso retirado con éxito!");
                        cargarTablas();
                        cambiarseccion("aplicacion");
                    });
                } else {
                    alert("¡Recurso reservado con éxito! Está en tu lista de pendientes.");
                    cargarTablas();
                    cambiarseccion("aplicacion");
                }
            } else {
                alert("Error al procesar la solicitud.");
            }
        });
    }
}

function conectarAvisos() {//WS//
    conexionWS = new WebSocket("ws://localhost:4444", "hospital");
    
    conexionWS.onopen = function() {
        conexionWS.send(JSON.stringify({
            operacion: "identificar",
            id: sanitarioActual.id,
            rol: "sanitario",
            nombre: sanitarioActual.nombre + " " + sanitarioActual.apellidos
        }));
    };

    conexionWS.onmessage = function(evt) {
        var msg = JSON.parse(evt.data);
        var tabla = document.getElementById("tabla-avisos");
        var color = "white"; 
        
        if (msg.operacion === "avisoReserva") color = "red";
        if (msg.operacion === "avisoNuevoRecurso") color = "blue";
        if (msg.operacion === "avisoResenya") color = "green";

        var tr = "<tr style='color: " + color + "'>";
        tr += "<td>" + new Date(msg.fecha).toLocaleString() + "</td>";
        tr += "<td>" + msg.origen + "</td>";
        tr += "<td>" + msg.texto + "</td>";
        tr += "</tr>";
        
        tabla.innerHTML += tr;
    };
}

    function asignarAreaSan(){
        console.log("3");
        var idSanitario = sanitarioActual.id;
        codigoPostal = document.getElementById("codigo-postal").value;
        console.log("4");

        asignarArea(idSanitario, codigoPostal, function(exito) {
        if (exito) {
            alert("Datos actualizados correctamente");
        } else {
            alert("Error al actualizar los datos");
        }
    });
}

cambiarseccion("inicio");

// Esperar a que Cordova esté listo según el PDF de la práctica
document.addEventListener('deviceready', onDeviceReady, false);

0
function onDeviceReady() {
    console.log("Cordova inicializado. Preparando NFC...");

    // 1. Configurar el evento del botón de escritura usando tu ID HTML exacto
    var btnEscribir = document.getElementById('btnEscribirNFC');
    if (btnEscribir) {
        btnEscribir.addEventListener('click', function() {
            var codigo = document.getElementById('inputCodigoNFC').value;
            if (codigo) {
                escribirNFC(codigo.trim());
            } else {
                alert("Por favor, introduce un código de recurso en el input.");
            }
        });
    }

    // 2. Escuchar etiquetas NDEF (Lectura) - Basado en los apuntes del profesor
    listenerLecturaNFC = function (nfcEvent) {
            if (escrituraNFCEnCurso) {
                console.log("Etiqueta ignorada: hay una escritura NFC en curso.");
                return;
            }

            var tag = nfcEvent.tag;
            console.log("Etiqueta detectada:", JSON.stringify(tag));

            // Comprobación de seguridad robusta para evitar que pete si la tarjeta está vacía
            if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
                var payload = tag.ndefMessage[0].payload;
                var languageCodeLength = payload[0] & 0x3F;
                
                // Extraer el texto de la etiqueta de forma limpia
                var codigoNFC = nfc.bytesToString(payload.slice(1 + languageCodeLength)).trim();

                if (codigoNFC) {
                    alert("Código detectado en NFC: " + codigoNFC);
                    procesarLecturaNFC(codigoNFC);
                } else {
                    alert("La etiqueta NFC está vacía o no contiene un código válido.");
                }
            } else {
                alert("La etiqueta NFC detectada está vacía (sin formato NDEF).");
            }
        };

    nfc.addNdefListener(
        listenerLecturaNFC,
        function () {
            console.log("Escuchador NFC activado con éxito.");
        },
        function (error) {
            console.log("Error al iniciar el escuchador NFC: " + error);
        }
    );
}

// 3. Función de escritura basada estrictamente en los apuntes del profesor
function escribirNFC(texto) {
    if (escrituraNFCEnCurso) {
        return;
    }

    escrituraNFCEnCurso = true;
    console.log("Preparando escritura para: " + texto);
    alert("Por favor, acerca la etiqueta NFC al móvil ahora para sobrescribir con: " + texto);

    var record = ndef.textRecord(texto);

    nfc.removeNdefListener(
        listenerLecturaNFC,
        function () {
            listenerEscrituraNFC = function (nfcEvent) {
            console.log("Tarjeta interceptada para escritura. Escribiendo...");

            nfc.write(
                [record], 
                function () {
                    alert("¡Escritura y sobrescritura en NFC exitosa!");
                    finalizarEscrituraNFC();
                },
                function (error) {
                    console.log("Error al escribir, intentando formatear el bloque...", error);
                    
                    // Si el chip se resiste, lo formateamos al vuelo y reescribimos
                    nfc.format(
                        function() {
                            nfc.write([record], 
                                function() {
                                    alert("¡Tarjeta formateada y escrita con éxito!");
                                    finalizarEscrituraNFC();
                                },
                                function(err2) {
                                    alert("Error al escribir tras formatear: " + JSON.stringify(err2));
                                    finalizarEscrituraNFC();
                                }
                            );
                        },
                        function(errFormat) {
                            alert("Error crítico al formatear la tarjeta: " + JSON.stringify(errFormat));
                            finalizarEscrituraNFC();
                        }
                    );
                }
            );
            };

            nfc.addTagDiscoveredListener(
                listenerEscrituraNFC,
                function () {
                    console.log("Esperando tarjeta para sobrescribir...");
                },
                function (error) {
                    finalizarEscrituraNFC();
                    alert("Error al activar la escucha de escritura: " + error);
                }
            );
        },
        function (error) {
            escrituraNFCEnCurso = false;
            alert("No se pudo preparar la escritura NFC: " + error);
        }
    );
}

function finalizarEscrituraNFC() {
    var listener = listenerEscrituraNFC;
    listenerEscrituraNFC = null;

    if (!listener) {
        escrituraNFCEnCurso = false;
        registrarLecturaNFC();
        return;
    }

    nfc.removeTagDiscoveredListener(
        listener,
        function () {
            escrituraNFCEnCurso = false;
            registrarLecturaNFC();
        },
        function (error) {
            escrituraNFCEnCurso = false;
            registrarLecturaNFC();
            console.log("No se pudo liberar el listener de escritura: " + error);
        }
    );
}

function registrarLecturaNFC() {
    if (!listenerLecturaNFC) {
        return;
    }

    nfc.addNdefListener(
        listenerLecturaNFC,
        function () {
            console.log("Escuchador NFC de lectura reactivado.");
        },
        function (error) {
            console.log("Error al reactivar el escuchador NFC: " + error);
        }
    );
}

// 4. Distribuidor de lectura NFC
function procesarLecturaNFC(textoLeido) {

    // Barrera
    if (!sanitarioActual) {
        alert("Debes iniciar sesión primero para usar el NFC.");
        return;
    }

    // CASO 1: RECURSO
    var recursoNFC = listaRecursos.find(function(recurso) {
        return String(recurso.numero_serie).trim() === String(textoLeido).trim();
    });

    if (recursoNFC) {
        obtenerReservas(sanitarioActual.id, function(listaRes) {
            let reservaAsociada = listaRes.find(res => res.recurso === recursoNFC.id && res.fecha_fin === null);

            if (reservaAsociada) {
                if (reservaAsociada.fecha_inicio != null) {
                    alert("Devolviendo recurso automáticamente por NFC...");
                    devolverRecurso(reservaAsociada.id);
                } else {
                    alert("Retirando recurso reservado automáticamente por NFC...");
                    retirarRecurso(reservaAsociada.id);
                }
            } else {
                alert("Recurso libre. Creando reserva exprés y retirando por NFC...");

                reservarRecursoRPC(recursoNFC.id, sanitarioActual.id, 1, function(idNuevaReserva) {
                    if (idNuevaReserva != null) {
                        iniciarReservaRPC(idNuevaReserva, function(exito) {
                            if (exito) {
                                alert("Recurso retirado con éxito (Reserva rápida).");
                                cargarTablas();
                            } else {
                                alert("Se creó la reserva pero falló al intentar retirarla.");
                            }
                        });
                    } else {
                        alert("Error: No se pudo crear la nueva reserva desde el NFC.");
                    }
                });
            }
        });
        return;
    }


    // CASO FINAL: CÓDIGO NO RECONOCIDO
    else if (!recursoNFC) {
        alert("El código de la etiqueta (" + textoLeido + ") no coincide con ningún recurso del hospital.");
        return;
    }
}
