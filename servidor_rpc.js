var rpc = require("./rpc.js");
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wtykvfgfwzmsktvkkwcn.supabase.co';
const supabaseKey = 'sb_publishable_YIvkOe8llfa2yH7En4iJYg_Dlt-6VbO';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = function(datos) {

    var servidorRPC = rpc.server(3501, function() {
        console.log("Servidor RPC iniciado en el puerto 3501");
    });
    var appRPC = servidorRPC.createApp("hospital");
    
    appRPC.registerAsync("loginSanitario", async function(u, p, callback) {
        var resultado = await supabase.from("sanitarios").select("id").eq("usuario", u).eq("password", p).maybeSingle();
        if (resultado.error || !resultado.data) return callback(null);
        callback(resultado.data.id);
    });

    appRPC.registerAsync("obtenerSanitario", async function(id, callback) {
        var resultado = await supabase.from("sanitarios").select("*").eq("id", id).maybeSingle();
        if (resultado.error || !resultado.data) return callback(null);
        callback(resultado.data);
    });

    appRPC.registerAsync("crearSanitario", async function(nuevoSanitario, callback) {
        var existente = await supabase.from("sanitarios").select("id").eq("usuario", nuevoSanitario.usuario).maybeSingle();
        if (existente.error || existente.data) return callback(null);

        var insercion = await supabase.from("sanitarios").insert(nuevoSanitario).select("id").maybeSingle();
        if (insercion.error || !insercion.data) return callback(null);
        
        console.log("Nuevo sanitario registrado:", nuevoSanitario.usuario);
        callback(insercion.data.id); 
    });

    appRPC.registerAsync("actualizarSanitario", async function(id, datosNuevos, callback) {
        var actualizacion = await supabase.from("sanitarios").update({
            usuario: datosNuevos.usuario,
            password: datosNuevos.password,
            nombre: datosNuevos.nombre,
            apellidos: datosNuevos.apellidos,
            id_area: datosNuevos.id_area
        }).eq("id", id).select("id").maybeSingle();

        if (actualizacion.error || !actualizacion.data) return callback(false);
        console.log("Datos actualizados para el ID:", id);
        callback(true);
    });

    appRPC.registerAsync("obtenerCategorias", async function(callback) {
        var resultado = await supabase.from("categorias").select("*");
        callback(resultado.error ? [] : resultado.data);
    });

    appRPC.registerAsync("obtenerModelos", async function(callback) {
        var resultado = await supabase.from("modelos").select("*");
        callback(resultado.error ? [] : resultado.data);
    });

    appRPC.registerAsync("obtenerRecursos", async function(idModelo, callback) {
        var consulta = supabase.from("recursos").select("*");
        if (idModelo != null) {
            consulta = consulta.eq("modelo", idModelo).eq("estado", 0);
        }
        var resultado = await consulta;
        callback(resultado.error ? [] : resultado.data);
    });
    
    appRPC.registerAsync("obtenerUbicaciones", async function(callback) {
        var resultado = await supabase.from("ubicaciones").select("*");
        callback(resultado.error ? [] : resultado.data);
    });

    appRPC.registerAsync("obtenerResenyas", async function(idRecurso, callback) {
        var consulta = supabase.from("resenas").select("*");
        if (idRecurso != null) consulta = consulta.eq("recurso", idRecurso);
        var resultado = await consulta;
        callback(resultado.error ? [] : resultado.data);
    });
    
    appRPC.registerAsync("obtenerReservas", async function(idSanitario, callback) {
        var resultado = await supabase.from("reservas").select("*").eq("sanitario", idSanitario);
        callback(resultado.error ? [] : resultado.data);
    });

    appRPC.registerAsync("iniciarReserva", async function(idReserva, callback) {
        var busqueda = await supabase.from("reservas").select("recurso").eq("id", idReserva).maybeSingle();
        if (busqueda.error || !busqueda.data) return callback(false);
        
        var idRecurso = busqueda.data.recurso;
        var r1 = await supabase.from("reservas").update({ fecha_inicio: new Date() }).eq("id", idReserva);
        var r2 = await supabase.from("recursos").update({ estado: 1 }).eq("id", idRecurso);
        
        if (r1.error || r2.error) return callback(false);
        console.log("Recurso retirado para la reserva:", idReserva);
        callback(true);
    });

    appRPC.registerAsync("cancelarReserva", async function(idReserva, callback) {
        var resultado = await supabase.from("reservas").delete().eq("id", idReserva).select("id").maybeSingle();
        if (resultado.error) return callback(false);
        callback(resultado.data != null);
    });

    appRPC.registerAsync("finalizarReserva", async function(idReserva, callback) {
        var busqueda = await supabase.from("reservas").select("recurso").eq("id", idReserva).maybeSingle();
        if (busqueda.error || !busqueda.data) return callback(false);
        
        var idRecurso = busqueda.data.recurso;
        var r1 = await supabase.from("reservas").update({ fecha_fin: new Date() }).eq("id", idReserva);
        var r2 = await supabase.from("recursos").update({ estado: 0 }).eq("id", idRecurso);
        
        if (r1.error || r2.error) return callback(false);
        console.log("Recurso devuelto para la reserva:", idReserva);
        callback(true);
    });

    appRPC.registerAsync("crearResenya", async function(idRecurso, idSanitario, valoracion, descripcion, callback) {
        var nuevaResena = {
            recurso: idRecurso,
            sanitario: idSanitario,
            fecha: new Date(),
            valor: parseInt(valoracion),
            descripcion: descripcion
        };
        
        var insercion = await supabase.from("resenas").insert(nuevaResena).select("id").maybeSingle();
        if (insercion.error || !insercion.data) return callback(null);
        console.log("Nueva reseña guardada, ID:", insercion.data.id);
        callback(insercion.data.id); 
    });

    appRPC.registerAsync("reservarRecurso", async function(idRecurso, idSanitario, horasEstimadas, callback) {
        var nuevaReserva = {
            recurso: idRecurso,
            sanitario: idSanitario,
            horas_estimadas: parseInt(horasEstimadas),
            fecha_peticion: new Date()
        };
        
        var insercion = await supabase.from("reservas").insert(nuevaReserva).select("id").maybeSingle();
        if (insercion.error || !insercion.data) return callback(null);
        callback(insercion.data.id); 
    });

    appRPC.registerAsync("tiempoPendiente", async function(idRecurso, callback) {
        var resultado = await supabase.from("reservas")
            .select("horas_estimadas")
            .eq("recurso", idRecurso)
            .not("fecha_inicio", "is", null)
            .is("fecha_fin", null)
            .maybeSingle();
            
        if (resultado.error || !resultado.data) return callback(0);
        callback(resultado.data.horas_estimadas);
    });
 
    appRPC.registerAsync("asignarArea", async function(idSanitario, codigoPostal, callback) {
        var actualizacion = await supabase.from("sanitarios")
            .update({ area: codigoPostal })
            .eq("id", idSanitario)
            .select("id")
            .maybeSingle();
            
        if (actualizacion.error) return callback(false);
        if (actualizacion.data) {
            console.log("Area añadida para el sanitario");
            callback(true);
        } else {
            callback(false);
        }
    });
};
