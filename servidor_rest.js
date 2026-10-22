var conexion = require('./conexion_mysql.js');
var jwt = require('jsonwebtoken');
var CLAVE_SECRETA = "mi_clave_secreta_telemedicina";
const {createClient} = require('@supabase/supabase-js');
const supabaseUrl = 'https://wtykvfgfwzmsktvkkwcn.supabase.co';
const supabaseKey = 'sb_publishable_YIvkOe8llfa2yH7En4iJYg_Dlt-6VbO'
const supabase = createClient(supabaseUrl, supabaseKey);



function verificarToken(req, res, next) {
    var autorizacion = req.headers.authorization;
    if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
        return res.status(401).json("Token no proporcionado");
    }

    var token = autorizacion.slice(7);
    jwt.verify(token, CLAVE_SECRETA, function(error, datosToken) {
        if (error) {
            return res.status(401).json("Token no válido o caducado");
        }

        req.gestor = datosToken;
        next();
    });
}

module.exports = function(app, datos) { 

    //comprueba si el usuario y la contraseña son correctos. Si lo son, devuelve los datos del gestor, si no, devuelve un error 403
    app.post("/api/gestores/login", function(req, res) {
    var body = req.body || {}; //pilla {usuario: u, contrasena: p} de main.js
    var usuario = body.usuario ? String(body.usuario).trim().toLowerCase() : null;
    var contrasena = body.contrasena ? String(body.contrasena).trim() : null;

    if (!usuario || !contrasena) {
        return res.status(400).json("Los datos llegaron vacíos al servidor");
    }

    var query = "SELECT * FROM gestores WHERE usuario = ? AND contrasena = ?";
    
    //ejecutamos la consulta. Los signos '?' se sustituyen por las variables de forma segura
    conexion.query(query, [usuario, contrasena], function(error, resultados) {
        if (error) {
            console.error("Error en la consulta de login:", error);
            return res.status(500).json("Error en la base de datos");
        }

        if (resultados.length > 0) {
            var gestor = resultados[0];
            
            // GENERAMOS EL TOKEN JWT
            // Guardamos el ID del gestor dentro del token, que caduca en 2 horas
            var token = jwt.sign({ id: gestor.id, rol: "gestor" }, CLAVE_SECRETA, { expiresIn: '2h' });
            
            // Devolvemos los datos del gestor Y el token
            res.status(200).json({
                gestor: gestor,
                token: token
            });
        } else {
            res.status(403).json("Usuario o contraseña incorrectos");
        }
    });
});

    //registra un nuevo gestor en la base de datos. Si el usuario ya existe, devuelve un error 400
    app.post("/api/gestores", function(req, res){
     var nuevo = req.body || {};
     if (!nuevo.usuario) return res.status(400).json("Los datos llegaron vacíos al servidor");
     
     nuevo.usuario = String(nuevo.usuario).trim().toLowerCase(); // Prevenimos las mayúsculas

     //Comprobamos si el usuario ya existe
     conexion.query("SELECT id FROM gestores WHERE usuario = ?", [nuevo.usuario], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         if (resultados.length > 0) return res.status(400).json("El usuario ya existe de verdad");

         //Si no existe, lo insertamos
         conexion.query("INSERT INTO gestores SET ?", nuevo, function(error, insercion) {
             if (error) return res.status(500).json("Error en la BD");
             res.status(201).json("añadido");
         });
     });
 });

    app.use("/api", verificarToken);

    //actualiza un gestor existente en la base de datos. Si el usuario ya existe, devuelve un error 400
    app.put("/api/gestores/:id", function(req, res){
     var id = parseInt(req.params.id);
     var nuevo = req.body;
     nuevo.usuario = String(nuevo.usuario).trim().toLowerCase();
     
     //Comprobamos que el nuevo nombre de usuario no esté cogido por OTRO gestor distinto
     var queryCheck = "SELECT id FROM gestores WHERE usuario = ? AND id != ?";
     conexion.query(queryCheck, [nuevo.usuario, id], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         if (resultados.length > 0) return res.status(400).json("El usuario ya existe");
         
         //Si el nombre está libre, actualizamos
         var queryUpdate = "UPDATE gestores SET usuario = ?, contrasena = ?, nombre = ?, apellido = ? WHERE id = ?";
         var valores = [nuevo.usuario, nuevo.contrasena, nuevo.nombre, nuevo.apellido, id];
         
         conexion.query(queryUpdate, valores, function(error, actualizacion) {
             if (error) return res.status(500).json("Error en la BD");
             if (actualizacion.affectedRows > 0) {
                 nuevo.id = id;
                 res.status(200).json(nuevo);
             } else {
                 res.status(404).json("Gestor no encontrado");
             }
         });
     });
 });

    //obtiene todas las categorías de la base de datos
    app.get("/api/categorias", function(req, res){
     conexion.query("SELECT * FROM categorias", function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         // Aquí devolvemos 'resultados', no 'categorias'
         res.status(200).json(resultados);
     });
 });
    app.get("/api/modelos", function(req, res){
     conexion.query("SELECT * FROM modelos", function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         res.status(200).json(resultados);
     });
 });
    app.get("/api/ubicaciones", function(req, res){
     conexion.query("SELECT * FROM ubicaciones", function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         res.status(200).json(resultados);
     });
 });

    app.get("/api/recursos", function(req, res){
     var categoria = req.query.categoria;
     var modelo = req.query.modelo;
     var ubicacion = req.query.ubicacion;
     var estado = req.query.estado;

     //Empezamos la consulta seleccionando todos los recursos
     var query = "SELECT recursos.* FROM recursos";
     var condiciones = [];
     var valores = [];

     //Si nos piden filtrar por categoría, unimos la tabla de modelos (JOIN)
     if (categoria) {
         query += " JOIN modelos ON recursos.modelo = modelos.id";
         condiciones.push("modelos.categoria = ?");
         valores.push(parseInt(categoria));
     }

     //Añadimos el resto de filtros si el usuario los ha rellenado
     if (modelo) {
         condiciones.push("recursos.modelo = ?");
         valores.push(parseInt(modelo));
     }
     if (ubicacion) {
         condiciones.push("recursos.ubicacion = ?");
         valores.push(parseInt(ubicacion));
     }
     if (estado) {
         condiciones.push("recursos.estado = ?");
         valores.push(parseInt(estado));
     }

     //Si hemos acumulado alguna condición, la ensamblamos con WHERE y AND
     if (condiciones.length > 0) {
         query += " WHERE " + condiciones.join(" AND ");
     }

     //Ejecutamos la consulta final
     conexion.query(query, valores, function(error, resultados) {
         if (error) {
             console.error("Error al buscar recursos:", error);
             return res.status(500).json("Error en la base de datos");
         }
         res.status(200).json(resultados);
     });
 });

    app.delete("/api/recursos/:id", function(req, res){
     var id = parseInt(req.params.id);
     var query = "DELETE FROM recursos WHERE id = ?";
     
     conexion.query(query, [id], function(error, resultados) {
         if (error) {
             console.error("Error al borrar recurso:", error);
             return res.status(500).json("Error en la base de datos");
         }
         
         // affectedRows nos dice cuántas filas se han borrado realmente
         if (resultados.affectedRows > 0) {
             res.status(200).json("Recurso borrado");
         } else {
             res.status(404).json("Recurso no encontrado");
         }
     });
    });

    app.get("/api/recursos/:id", function(req, res){
     var id = parseInt(req.params.id);
     var query = "SELECT * FROM recursos WHERE id = ?";
     
     conexion.query(query, [id], function(error, resultados) {
         if (error) {
             console.error("Error al obtener recurso:", error);
             return res.status(500).json("Error en la base de datos");
         }
         
         if (resultados.length > 0) {
             res.status(200).json(resultados[0]);
         } else {
             res.status(404).json("Recurso no encontrado");
         }
     });
    });


    app.post("/api/recursos", function(req, res){ 
     var nuevo = {
         modelo: req.body.modelo,
         numero_serie: req.body.numero_serie,
         ubicacion: req.body.ubicacion,
         estado: req.body.estado
     };

     // INSERT INTO ... SET ? es un atajo de la librería mysql para insertar objetos directamente
     conexion.query("INSERT INTO recursos SET ?", nuevo, function(error, resultados) {
         if (error) {
             console.error("Error al añadir recurso:", error);
             return res.status(500).json("Error en la base de datos");
         }
         res.status(201).json("Recurso añadido");
     });
 });

    app.put("/api/recursos/:id", function(req, res){ 
     var id = parseInt(req.params.id);
     var nuevo = req.body;
     
     var query = "UPDATE recursos SET modelo = ?, numero_serie = ?, ubicacion = ?, estado = ? WHERE id = ?";
     var valores = [nuevo.modelo, nuevo.numero_serie, nuevo.ubicacion, nuevo.estado, id];
     
     conexion.query(query, valores, function(error, resultados) {
         if (error) {
             console.error("Error al modificar recurso:", error);
             return res.status(500).json("Error en la base de datos");
         }
         
         if (resultados.affectedRows > 0) {
             // El cliente espera recibir el objeto actualizado, así que se lo construimos
             nuevo.id = id;
             res.status(200).json(nuevo);
         } else {
             res.status(404).json("Recurso no encontrado");
         }
     });
 });


    app.get("/api/recursos/:id/reservas", function(req, res){
     var id = parseInt(req.params.id);
     conexion.query("SELECT * FROM reservas WHERE recurso = ?", [id], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         res.status(200).json(resultados);
     });
 });

    app.get("/api/recursos/:id/resenyas", function(req, res){
     var id = parseInt(req.params.id);
     conexion.query("SELECT * FROM resenas WHERE recurso = ?", [id], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         res.status(200).json(resultados);
     });
 });

    app.get("/api/sanitarios/:id", function(req, res){
     var id = parseInt(req.params.id);
     // Seleccionamos específicamente las columnas seguras
    var query = "SELECT id, nombre, apellidos, id_area FROM sanitarios WHERE id = ?";
     
     conexion.query(query, [id], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         if (resultados.length > 0) {
             res.status(200).json(resultados[0]);
         } else {
             res.status(404).json("Sanitario no encontrado");
         }
     });
 });

    app.get("/api/gestores/:id", function(req, res){
     var id = parseInt(req.params.id);
     // Seleccionamos específicamente las columnas seguras
     var query = "SELECT id, nombre, apellido, usuario FROM gestores WHERE id = ?";
     
     conexion.query(query, [id], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         if (resultados.length > 0) {
             res.status(200).json(resultados[0]);
         } else {
             res.status(404).json("Gestor no encontrado");
         }
     });
 });

    app.post("/api/area_salud", function(req, res){
     var nuevo = req.body;
     
     nuevo.codigo = parseInt(nuevo.codigo);
     nuevo.nombre = String(nuevo.nombre).trim().toLowerCase(); // Prevenimos las mayúsculas

     //Comprobamos si el codigo ya existe
     conexion.query("SELECT * FROM areas WHERE codigo = ?", [nuevo.codigo], function(error, resultados) {
         if (error) return res.status(500).json("Error en la BD");
         if (resultados.length > 0) return res.status(400).json("El codigo postal ya existe");

         //Si no existe, lo insertamos
         conexion.query("INSERT INTO areas SET ?", nuevo, function(error, insercion) {
             if (error) return res.status(500).json("Error en la BD");
             res.status(201).json("añadido");
         });
     });
 });
};
