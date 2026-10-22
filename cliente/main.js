
var gestoractual=null;

var listaCategorias = [];
var listaModelos = [];
var listaUbicaciones = [];

var idrecursoactual=null;

var conexionWS = null;//WS//
var URL_DATOS_MINISTERIO = "https://undefined.ua.es/telemedicina/api/datos";
var nombresAreasMedicas = {
    1: "Alergología",
    2: "Anestesiología",
    3: "Cardiología",
    4: "Cirugía General",
    5: "Dermatología",
    6: "Aparato Digestivo",
    7: "Endocrinología",
    8: "Ginecología",
    9: "Hematología",
    10: "Medicina Interna",
    11: "Neumología",
    12: "Neurología",
    13: "Oftalmología",
    14: "Oncología",
    15: "Pediatría",
    16: "Psiquiatría",
    17: "Traumatología",
    18: "Urología"
};


function cambiarseccion(seccion){
    document.getElementById('inicio').style.display="none";
    document.getElementById('registro').style.display="none";
    document.getElementById('aplicacion').style.display="none";
    document.getElementById('ficha-recurso').style.display="none"; 
    document.getElementById('editar-registro').style.display="none";
    document.getElementById(seccion).style.display="block";
}

function entrar(){ //ws
    var u = document.getElementById("usuario").value;
    var p = document.getElementById("contrasena").value;
    
    rest.post("/api/gestores/login", {usuario: u, contrasena: p}, function(estado, respuesta){
        if(estado == 200){
            // 1. GUARDAMOS EL TOKEN EN LA MEMORIA DEL DISPOSITIVO
            localStorage.setItem("token", respuesta.token);
            // 2. Leemos los datos del gestor (ahora vienen dentro de respuesta.gestor y antes solo en respuesta)
            gestoractual = respuesta.gestor;
            document.getElementById("nombre-gestor-bienvenida").innerHTML = respuesta.nombre + " " + respuesta.apellido;
            cargardesplegables();          
            cargarRanking();
            conectarAvisosGestor();
            cambiarseccion("aplicacion");
        } else if (estado == 403) {
            alert("Usuario o contraseña incorrectos");
        } else {
            alert("ERROR DEL SERVIDOR. Estado: " + estado + ". Respuesta: " + respuesta);
        }
    });
}

function cargarRanking(){
    rest.get(URL_DATOS_MINISTERIO, function(estado, respuesta){
        if(estado != 200){
            mostrarEstadoMinisterio("No se pudo cargar el ranking");
            return;
        }

        var ranking = contarReservasPorArea(respuesta);
        var tabla = document.getElementById("cuerpo-tabla-ranking");
        tabla.innerHTML = "";

        // Mostrar el ranking en la tabla
        for(var i = 0; i < ranking.length; i++){
            var idArea = ranking[i].id_area;
            var nombreArea = nombresAreasMedicas[idArea] || "Área " + idArea; // Nombre del área médica o "Área X" si no se encuentra en el objeto 
            tabla.innerHTML += "<tr>" +
                "<td>" + (i + 1) + "</td>" +
                "<td>" + nombreArea + "</td>" +
                "<td>" + ranking[i].total + "</td>" +
                "</tr>";
        }

        mostrarEstadoMinisterio("Ranking actualizado");
    });
}

// Función para contar las reservas por área médica a partir de la respuesta del Ministerio
function contarReservasPorArea(respuesta){
    var totales = {};

    function sumar(idArea, cantidad){ // Suma la cantidad de reservas al total del área
        if(idArea == null || isNaN(parseInt(idArea))) return;
            idArea = parseInt(idArea);
        if(!totales[idArea]) 
            totales[idArea] = 0;
            totales[idArea] += cantidad;
    }

    function leerDatos(datos, idArea){ // Lee los datos de reservas y suma al total del área correspondiente
        if(Array.isArray(datos)){
            if(idArea != null) 
                sumar(idArea, datos.length);
            else{
                for(var i = 0; i < datos.length; i++) sumar(datos[i].id_area, 1);
            }
        }else if(datos && typeof datos === "object"){
            if(datos.datos) 
                leerDatos(datos.datos, datos.id_area || idArea); // Si hay subdatos, los leemos recursivamente
            else 
                sumar(datos.id_area || idArea, 1);
        }
    }

    // Comenzamos a leer los datos de la respuesta
    if(Array.isArray(respuesta)){
        for(var i = 0; i < respuesta.length; i++){
            // Si el elemento tiene datos, los leemos recursivamente
            if(respuesta[i] && respuesta[i].datos){
                leerDatos(respuesta[i].datos, respuesta[i].id_area);
            }else{
                sumar(respuesta[i].id_area, 1);
            }
        }
    }
    else if(respuesta && respuesta.datos) leerDatos(respuesta.datos, respuesta.id_area);
    else if(respuesta && typeof respuesta === "object"){
        for(var idArea in respuesta) leerDatos(respuesta[idArea], idArea);
    }
// Convertimos el objeto de totales en un array de objetos y lo ordenamos por total descendente
    return Object.keys(totales).map(function(idArea){
        return {id_area: idArea, total: totales[idArea]};
    }).sort(function(a, b){
        return b.total - a.total;
    });
}

// Función principal para enviar los datos de reservas al Ministerio
function enviarDatosMinisterio(){
    mostrarEstadoMinisterio("Preparando reservas...");
    cargarReservasParaMinisterio(function(datosPorArea){
        var idAreas = Object.keys(datosPorArea);
        if(idAreas.length == 0){
            mostrarEstadoMinisterio("No hay reservas para enviar");
            return;
        }

        var fecha = new Date().toISOString().slice(0, 10);
        var indice = 0;
        // Función recursiva para enviar los datos de cada área al Ministerio
        function enviarSiguiente(){
            if(indice >= idAreas.length){
                mostrarEstadoMinisterio("Reservas enviadas");
                cargarRanking();
                return;
            }

            var idArea = idAreas[indice++];
            var datos = {
                id_area: parseInt(idArea),
                fecha: fecha,
                datos: datosPorArea[idArea]
            };
            // Enviamos los datos al Ministerio
            console.log("Enviando paquete al Ministerio:", datos);
            rest.post(URL_DATOS_MINISTERIO, datos, function(estado){
                if(estado < 200 || estado >= 300){
                    mostrarEstadoMinisterio("Error al enviar las reservas");
                    return;
                }
                enviarSiguiente(); 
            });
        }

        enviarSiguiente();
    });
}

function cargarReservasParaMinisterio(callback){
    // Primero obtenemos la lista de recursos
    rest.get("/api/recursos", function(estado, recursos){
        if(estado != 200){
            mostrarEstadoMinisterio("No se pudieron leer los recursos");
            return;
        }

        var reservas = [];
        var indice = 0;
        
        // Función recursiva para cargar las reservas de cada recurso
        function cargarReservasRecurso(){
            if(indice >= recursos.length){
                cargarDatosSanitarios(reservas, callback);
                return;
            }

            var recurso = recursos[indice++];
            rest.get("/api/recursos/" + recurso.id + "/reservas", function(estadoReservas, lista){ // Cargamos las reservas del recurso
                if(estadoReservas == 200){
                    for(var i = 0; i < lista.length; i++){
                        reservas.push({reserva: lista[i], recurso: recurso});
                    }
                }
                cargarReservasRecurso();
            });
        }

        cargarReservasRecurso();
    });
}

// Lee los datos de los sanitarios y los agrupa por área para enviarlos al Ministerio
function cargarDatosSanitarios(reservas, callback){
    var datosPorArea = {};
    var indice = 0;

    function cargarSiguiente(){
        if(indice >= reservas.length){
            callback(datosPorArea);
            return;
        }

        var elemento = reservas[indice++];
        var reserva = elemento.reserva;
        var recurso = elemento.recurso;

        // Cargamos los datos del sanitario asociado a la reserva
        rest.get("/api/sanitarios/" + reserva.sanitario, function(estado, sanitario){
            if(estado == 200 && sanitario){
                var idArea = sanitario.id_area != null ? sanitario.id_area : sanitario.area;
                if(idArea != null){
                    var modelo = listaModelos.find(function(item){ return item.id == recurso.modelo; });
                    var categoria = modelo ? listaCategorias.find(function(item){ return item.id == modelo.categoria; }) : null;
                    
                    // Agrupamos los datos por área
                    if(!datosPorArea[idArea]) datosPorArea[idArea] = [];
                    datosPorArea[idArea].push({
                        nombre: sanitario.nombre,
                        apellidos: sanitario.apellidos,
                        "categoría": categoria ? categoria.nombre : "-", // Categoría con tilde
                        horas_estimadas: reserva.horas_estimadas,
                        fec_pet: fechaMinisterio(reserva.fecha_peticion),
                        fec_ini: fechaMinisterio(reserva.fecha_inicio),
                        fecha_fin: fechaMinisterio(reserva.fecha_fin)
                    });
                }
            }
            cargarSiguiente();
        });
    }

    cargarSiguiente();
}

// Convierte una fecha a formato ISO para enviarla al Ministerio
function fechaMinisterio(fecha){
    return fecha ? new Date(fecha).toISOString() : null;
}

// Muestra un mensaje de estado en la sección del Ministerio
function mostrarEstadoMinisterio(mensaje){
    var estado = document.getElementById("estado-ministerio");
    if(estado) estado.innerHTML = " " + mensaje;
}

function registrarse(){
    var g ={
        nombre: document.getElementById("nombre").value,
        apellido: document.getElementById("apellido").value,
        usuario: document.getElementById("usuario-registro").value,
        contrasena: document.getElementById("contrasena-registro").value
    }
    if(g.nombre=="" || g.apellido=="" || g.usuario=="" || g.contrasena==""){
        alert("Por favor, rellena todos los campos");
        return;
    }
    rest.post("/api/gestores",g,function(estado,respuesta){
        if(estado==201){
            alert("Registro completado")
            cambiarseccion('inicio')
        } else if (estado==400) {
            alert("Error: " + respuesta); 
        } else {
            alert("ERROR DEL SERVIDOR. Estado: " + estado);
        }
    })
}

function salir() { //WS//
    if (conexionWS) {
        conexionWS.close();
    }
    document.getElementById("tabla-avisos").innerHTML = "";
    document.getElementById("usuario").value = "";
    document.getElementById("contrasena").value = "";
    cambiarseccion("inicio");
    
    console.log("Sesión y conexión de avisos cerradas");
}


function editardatosusuario(){
    if(gestoractual==null)return;
    document.getElementById("editar-usuario").value=gestoractual.usuario
    document.getElementById("editar-contrasena").value=gestoractual.contrasena
    document.getElementById("editar-nombre").value=gestoractual.nombre
    document.getElementById("editar-apellido").value=gestoractual.apellido
    cambiarseccion("editar-registro");
}

 function guardardatosusuario(){
    var g ={
        usuario: document.getElementById("editar-usuario").value,
        contrasena: document.getElementById("editar-contrasena").value,
        nombre: document.getElementById("editar-nombre").value,
        apellido: document.getElementById("editar-apellido").value
    }
    rest.put("/api/gestores/" + gestoractual.id , g, function(estado,respuesta){
        if(estado==200){
            gestoractual=respuesta
            document.getElementById("nombre-gestor-bienvenida").innerHTML= respuesta.nombre + " " + respuesta.apellido;
            cambiarseccion("aplicacion");
        }else{
            alert("El nombre de usuario ya existe")
        }
    })
}


function cargardesplegables(){
    rest.get("/api/categorias",function(estado,respuesta){
        if(estado==200){
            listaCategorias=respuesta;
            var select=document.getElementById("categoria")
            var select2=document.getElementById("categoria-ficha")
            select.innerHTML= "<option value=''>Todas</option>"
            select2.innerHTML= ""
            for(var i=0; i<respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
                select2.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
        }
        
    })
    rest.get("/api/modelos",function(estado,respuesta){
        if(estado==200){
            listaModelos=respuesta;
            var select=document.getElementById("modelo")
            var select2=document.getElementById("modelo-ficha")
            select.innerHTML= "<option value=''>Todos</option>"
            select2.innerHTML= ""
            for(var i=0; i<respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>"
                select2.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>"
            }
        }
    })
    rest.get("/api/ubicaciones",function(estado,respuesta){
        if(estado==200){
            listaUbicaciones=respuesta;
            var select=document.getElementById("ubicacion")
            var select2=document.getElementById("ubicacion-ficha")
            select.innerHTML= "<option value=''>Todas</option>"
            select2.innerHTML= ""
            for(var i=0; i<respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>"
                select2.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>"
            }
        }
    })
}


function buscarrecursos(){
    var categoria=document.getElementById("categoria").value
    var modelo=document.getElementById("modelo").value
    var ubicacion=document.getElementById("ubicacion").value
    var estado=document.getElementById("estado").value

    var url = "/api/recursos?";
    if(categoria!="") url += "categoria=" + categoria + "&";
    if(modelo!="") url += "modelo=" + modelo + "&";
    if(ubicacion!="") url += "ubicacion=" + ubicacion + "&";
    if(estado!="") url += "estado=" + estado + "&";

    rest.get(url,function(estado,respuesta){
        if(estado==200){
            var tabla=document.getElementById("cuerpo-tabla")
            tabla.innerHTML=""
            
            for(var i=0; i<respuesta.length; i++){
                var r=respuesta[i]
                var nombremodelo=""
                var idcategoria=""
               
                for (var j=0; j<listaModelos.length; j++){
                    if(listaModelos[j].id==r.modelo){
                        nombremodelo=listaModelos[j].nombre
                        idcategoria=listaModelos[j].categoria
                        break;
                    }
                }
                var nombrecategoria=""
                for (var j=0; j<listaCategorias.length; j++){
                    if(listaCategorias[j].id==idcategoria){
                        nombrecategoria=listaCategorias[j].nombre
                        break;
                    }
                }

                var nombreubicacion=""
                for (var j=0; j<listaUbicaciones.length; j++){
                    if(listaUbicaciones[j].id==r.ubicacion){
                        nombreubicacion=listaUbicaciones[j].nombre
                        break;
                    }
                }
                var textoestado="Operativo"
                if(r.estado==1) textoestado="Baja"
                if(r.estado==2) textoestado="Mantenimiento"

                var tr = "<tr>";
                tr += "<td>" + r.numero_serie + "</td>";
                tr += "<td>" + nombrecategoria + "</td>";
                tr += "<td>" + nombremodelo + "</td>";
                tr += "<td>" + nombreubicacion + "</td>";
                tr += "<td>" + textoestado + "</td>";
                tr += "<td><button onclick='abrirrecurso(" + r.id + ")'>Abrir</button> <button onclick='borrarrecurso(" + r.id + ")'> Borrar </button></td>";
                tr += "</tr>";

                tabla.innerHTML += tr;
            
            }
        }
    })
}

function borrarrecurso(id){
    if(confirm("¿Está seguro de que desea borrar este recurso?")){
        rest.delete("/api/recursos/" + id, function(estado,respuesta){
            if(estado==200){
                buscarrecursos();
            }else{
                alert("Error al borrar el recurso");
            }
        })
    }
}

function abrirrecurso(id){
    idrecursoactual=id;
    rest.get ("/api/recursos/"+id,function(estado,respuesta){
        if(estado==200){
            document.getElementById("nserie-ficha").value=respuesta.numero_serie
            document.getElementById("ubicacion-ficha").value = respuesta.ubicacion;
            document.getElementById("estado-ficha").value = respuesta.estado;

            var idcategoria=""
            for (var j=0; j<listaModelos.length; j++){
                if(listaModelos[j].id==respuesta.modelo){
                    idcategoria=listaModelos[j].categoria
                    break;
                }
            }
            
            document.getElementById("categoria-ficha").value=idcategoria
            filtrarModelosFicha();
            document.getElementById("modelo-ficha").value = respuesta.modelo;

            cargarreservas(id);
            cargarresenyas(id);
            cambiarseccion("ficha-recurso");
        }
    })
}

function guardarrecurso(){//WS//
    var modelo = document.getElementById("modelo-ficha").value;
    var nserie = document.getElementById("nserie-ficha").value;
    var ubicacion = document.getElementById("ubicacion-ficha").value;
    var estado = document.getElementById("estado-ficha").value;

    if(modelo == "" || nserie == "" || ubicacion == ""){
        alert("Por favor, rellena el modelo, el número de serie y la ubicación");
        return;
    }

    var nuevo={
        modelo: parseInt(modelo),
        numero_serie: nserie,
        ubicacion: parseInt(ubicacion),
        estado: parseInt(estado)
    }

    if(idrecursoactual==null){
        rest.post("/api/recursos",nuevo,function(estado,respuesta){
            if(estado==201){
                
                if (conexionWS) {
                    var idCategoriaElegida = document.getElementById("categoria-ficha").value;
                    var nombreCat = listaCategorias.find(c => c.id == idCategoriaElegida).nombre;
                    var nombreMod = listaModelos.find(m => m.id == modelo).nombre;
                    
                    conexionWS.send(JSON.stringify({
                        operacion: "avisoNuevoRecurso",
                        origen: gestoractual.nombre + " " + gestoractual.apellido,
                        texto: "SE HA CREADO UN NUEVO RECURSO " + nombreCat.toUpperCase() + 
                               " MODELO " + nombreMod.toUpperCase() + 
                               " CON CÓDIGO " + nserie
                    }));
                }

                buscarrecursos();
                cambiarseccion("aplicacion");
            }else{
                alert("Error al añadir el recurso");
            }
        })
    }else{
        rest.put("/api/recursos/" + idrecursoactual, nuevo, function(estado,respuesta){
            if(estado==200){
                buscarrecursos();
                cambiarseccion("aplicacion");
            }else{
                alert("Error al modificar el recurso");
            }
        })
    }
}

function añadirrecurso(){
    idrecursoactual=null;
    document.getElementById("categoria-ficha").value = "";
    document.getElementById("modelo-ficha").value = "";
    document.getElementById("nserie-ficha").value = "";
    document.getElementById("ubicacion-ficha").value = "";
    document.getElementById("estado-ficha").value = "0"; 

    document.getElementById("cuerpo-tabla-reservas").innerHTML = "";
    document.getElementById("cuerpo-tabla-resenas").innerHTML = "";

    filtrarModelosFicha();

    cambiarseccion("ficha-recurso");
}

function filtrarModelosFicha() {
    var idCategoriaElegida = document.getElementById("categoria-ficha").value;
    var selectModelo = document.getElementById("modelo-ficha");
    
    selectModelo.innerHTML = ""; 
    for (var i = 0; i < listaModelos.length; i++) {
        if (idCategoriaElegida == "" || listaModelos[i].categoria == idCategoriaElegida) {
            selectModelo.innerHTML += "<option value='" + listaModelos[i].id + "'>" + listaModelos[i].nombre + "</option>";
        }
    }
}


function cargarreservas(){  
    rest.get("/api/recursos/" + idrecursoactual + "/reservas", function(estado,respuesta){
        if(estado==200){
            var tabla=document.getElementById("cuerpo-tabla-reservas")
            tabla.innerHTML=""
            for(var i=0; i<respuesta.length; i++){
                var reserva=respuesta[i]

                rest.get("/api/sanitarios/" + reserva.sanitario, (function(reservaActual){
                    return function(estado2,respuesta2){
                        var nombreSanitario = "";
                        if(estado2==200){
                            nombreSanitario = respuesta2.nombre + " " + respuesta2.apellidos;
                        }

                        var color="white"
                        if(reservaActual.fecha_inicio == null){
                            color="lightgreen"
                        }else if(reservaActual.fecha_fin == null){
                            var inicio = new Date(reservaActual.fecha_inicio);
                            var ahora = new Date();
                            var horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60);

                            if(horasTranscurridas > reservaActual.horas_estimadas){
                                color = "lightcoral";
                            }else{
                                color = "lightblue";
                            }
                        }
                        var fpeticion = reservaActual.fecha_peticion ? new Date(reservaActual.fecha_peticion).toLocaleString() : "";
                        var finicio = reservaActual.fecha_inicio ? new Date(reservaActual.fecha_inicio).toLocaleString() : "";
                        var ffin = reservaActual.fecha_fin ? new Date(reservaActual.fecha_fin).toLocaleString() : "";

                        var tr = "<tr style='background-color:" + color + "'>";
                        tr += "<td>" + nombreSanitario + "</td>";
                        tr += "<td>" + reservaActual.horas_estimadas + "</td>";
                        tr += "<td>" + fpeticion + "</td>";
                        tr += "<td>" + finicio + "</td>";
                        tr += "<td>" + ffin + "</td>";
                        tr += "</tr>";

                        tabla.innerHTML += tr;
                    }
                })(reserva)); 
            }
        }
    })
}
                   
function cargarresenyas(){  
    rest.get("/api/recursos/"+ idrecursoactual + "/resenyas", function(estado,respuesta){
        if(estado==200){
            var tabla=document.getElementById("cuerpo-tabla-resenas")
            tabla.innerHTML=""
            for(var i=0; i<respuesta.length; i++){
                var resenya=respuesta[i]
                
                rest.get("/api/sanitarios/" + resenya.sanitario, (function(resenyaActual){
                    return function(estado2,respuesta2){
                        var nombreSanitario = "";
                        if(estado2==200){
                            nombreSanitario = respuesta2.nombre + " " + respuesta2.apellidos;
                        }
                        var fresenya = resenyaActual.fecha ? new Date(resenyaActual.fecha).toLocaleString() : "";

                        var tr = "<tr>";
                        tr += "<td>" + fresenya + "</td>";
                        tr += "<td>" + nombreSanitario + "</td>";
                        tr += "<td>" + resenyaActual.valor + "</td>";
                        tr += "<td>" + resenyaActual.descripcion + "</td>";
                        tr += "</tr>";
                        tabla.innerHTML += tr;
                    }
                })(resenya)); 
            }
        }
    })
}

function conectarAvisosGestor() { //WS//
    conexionWS = new WebSocket("ws://localhost:4444", "hospital");
    
    conexionWS.onopen = function() {
        conexionWS.send(JSON.stringify({
            operacion: "identificar",
            id: gestoractual.id, 
            rol: "gestor", 
            nombre: gestoractual.nombre + " " + gestoractual.apellido
        }));
    };

    conexionWS.onmessage = function(evt) {
        var msg = JSON.parse(evt.data);
        var tabla = document.getElementById("tabla-avisos");
        var color = "white";
        
        if (msg.operacion === "avisoResenya") color = "green";


        var tr = "<tr style='color: " + color + "'>";
        tr += "<td>" + new Date(msg.fecha).toLocaleString() + "</td>";
        tr += "<td>" + msg.origen + "</td>";
        tr += "<td>" + msg.texto + "</td>";
        tr += "</tr>";
        
        tabla.innerHTML += tr;
    };
}

function crearArea(){
    var g ={
        codigo: document.getElementById("codigo").value,
        nombre: document.getElementById("nombre_area").value,
        gestor: gestoractual.id
    }
    if(g.nombre=="" || g.apellido==""){
        alert("Por favor, rellena todos los campos");
        return;
    }
    rest.post("/api/area_salud",g,function(estado,respuesta){
        if(estado==201){
            alert("Registro completado");
        } else if (estado==400) {
            alert("Error: " + respuesta); 
        } else {
            alert("ERROR DEL SERVIDOR. Estado: " + estado);
        }
    })
}

cambiarseccion("inicio");