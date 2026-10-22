var jwt = require('jsonwebtoken');
var CLAVE_SECRETA = "mi_clave_secreta_telemedicina";

const {createClient} = require('@supabase/supabase-js');
const supabaseUrl = 'https://wtykvfgfwzmsktvkkwcn.supabase.co';
const supabaseKey = 'sb_publishable_YIvkOe8llfa2yH7En4iJYg_Dlt-6VbO';
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
    app.post("/api/gestores/login", async function(req, res) {
    var body = req.body || {}; //pilla {usuario: u, contrasena: p} de main.js
    var usuario = body.usuario ? String(body.usuario).trim().toLowerCase() : null;
    var contrasena = body.contrasena ? String(body.contrasena).trim() : null;

    if (!usuario || !contrasena) {
        return res.status(400).json("Los datos llegaron vacíos al servidor");
    }

    var resultado = await supabase.from("gestores").select("*").eq("usuario", usuario).eq("contrasena", contrasena).maybeSingle();
    if (resultado.error) {
        console.error("Error en la consulta de login:", resultado.error);
        return res.status(500).json("Error en la base de datos");
    }

    if (resultado.data) {
        var gestor = resultado.data;
        var token = jwt.sign({ id: gestor.id, rol: "gestor" }, CLAVE_SECRETA, { expiresIn: '2h' });
        res.status(200).json({
            gestor: gestor,
            token: token
        });
    } else {
        res.status(403).json("Usuario o contraseña incorrectos");
    }
});

    //registra un nuevo gestor en la base de datos. Si el usuario ya existe, devuelve un error 400
    app.post("/api/gestores", async function(req, res){
     var nuevo = req.body || {};
     if (!nuevo.usuario) return res.status(400).json("Los datos llegaron vacíos al servidor");
     
     nuevo.usuario = String(nuevo.usuario).trim().toLowerCase(); // Prevenimos las mayúsculas

     var existente = await supabase.from("gestores").select("id").eq("usuario", nuevo.usuario).maybeSingle();
     if (existente.error) return res.status(500).json("Error en la BD");
     if (existente.data) return res.status(400).json("El usuario ya existe de verdad");

     var insercion = await supabase.from("gestores").insert(nuevo);
     if (insercion.error) return res.status(500).json("Error en la BD");
     res.status(201).json("añadido");
 });

    app.use("/api", verificarToken);

    //actualiza un gestor existente en la base de datos. Si el usuario ya existe, devuelve un error 400
    app.put("/api/gestores/:id", async function(req, res){
     var id = parseInt(req.params.id);
     var nuevo = req.body;
     nuevo.usuario = String(nuevo.usuario).trim().toLowerCase();
     
     //Comprobamos que el nuevo nombre de usuario no esté cogido por OTRO gestor distinto
     var existente = await supabase.from("gestores").select("id").eq("usuario", nuevo.usuario).neq("id", id).maybeSingle();
     if (existente.error) return res.status(500).json("Error en la BD");
     if (existente.data) return res.status(400).json("El usuario ya existe");

     var actualizacion = await supabase.from("gestores").update({
         usuario: nuevo.usuario,
         contrasena: nuevo.contrasena,
         nombre: nuevo.nombre,
         apellido: nuevo.apellido
     }).eq("id", id).select().maybeSingle();
     if (actualizacion.error) return res.status(500).json("Error en la BD");
     if (actualizacion.data) {
         res.status(200).json(actualizacion.data);
     } else {
         res.status(404).json("Gestor no encontrado");
     }
 });

    //obtiene todas las categorías de la base de datos
    app.get("/api/categorias", async function(req, res){
     var resultado = await supabase.from("categorias").select("*");
     if (resultado.error) return res.status(500).json("Error en la BD");
     res.status(200).json(resultado.data);
 });
    app.get("/api/modelos", async function(req, res){
     var resultado = await supabase.from("modelos").select("*");
     if (resultado.error) return res.status(500).json("Error en la BD");
     res.status(200).json(resultado.data);
 });
    app.get("/api/ubicaciones", async function(req, res){
     var resultado = await supabase.from("ubicaciones").select("*");
     if (resultado.error) return res.status(500).json("Error en la BD");
     res.status(200).json(resultado.data);
 });

    app.get("/api/recursos", async function(req, res){
     var categoria = req.query.categoria;
     var modelo = req.query.modelo;
     var ubicacion = req.query.ubicacion;
     var estado = req.query.estado;

     var consulta = supabase.from("recursos").select("*");

     if (categoria) {
         var modelos = await supabase.from("modelos").select("id").eq("categoria", parseInt(categoria));
         if (modelos.error) return res.status(500).json("Error en la base de datos");
         var idsModelos = modelos.data.map(function(modelo) { return modelo.id; });
         consulta = consulta.in("modelo", idsModelos.length ? idsModelos : [-1]);
     }
     if (modelo) consulta = consulta.eq("modelo", parseInt(modelo));
     if (ubicacion) consulta = consulta.eq("ubicacion", parseInt(ubicacion));
    if (estado) consulta = consulta.eq("estado", parseInt(estado));

     var resultado = await consulta;
     if (resultado.error) {
         console.error("Error al buscar recursos:", resultado.error);
         return res.status(500).json("Error en la base de datos");
     }
     res.status(200).json(resultado.data);
 });

    app.delete("/api/recursos/:id", async function(req, res){
     var id = parseInt(req.params.id);
     var resultado = await supabase.from("recursos").delete().eq("id", id).select("id").maybeSingle();
     if (resultado.error) {
         console.error("Error al borrar recurso:", resultado.error);
         return res.status(500).json("Error en la base de datos");
     }
     if (resultado.data) res.status(200).json("Recurso borrado");
     else res.status(404).json("Recurso no encontrado");
    });

    app.get("/api/recursos/:id", async function(req, res){
     var id = parseInt(req.params.id);
     var resultado = await supabase.from("recursos").select("*").eq("id", id).maybeSingle();
     if (resultado.error) {
         console.error("Error al obtener recurso:", resultado.error);
         return res.status(500).json("Error en la base de datos");
     }
     if (resultado.data) res.status(200).json(resultado.data);
     else res.status(404).json("Recurso no encontrado");
    });


    app.post("/api/recursos", async function(req, res){ 
     var nuevo = {
         modelo: req.body.modelo,
         numero_serie: req.body.numero_serie,
         ubicacion: req.body.ubicacion,
         estado: req.body.estado
     };

     var resultado = await supabase.from("recursos").insert(nuevo);
     if (resultado.error) {
         console.error("Error al añadir recurso:", resultado.error);
         return res.status(500).json("Error en la base de datos");
     }
     res.status(201).json("Recurso añadido");
 });

    app.put("/api/recursos/:id", async function(req, res){ 
     var id = parseInt(req.params.id);
     var nuevo = req.body;

     var resultado = await supabase.from("recursos").update({
         modelo: nuevo.modelo,
         numero_serie: nuevo.numero_serie,
         ubicacion: nuevo.ubicacion,
         estado: nuevo.estado
     }).eq("id", id).select().maybeSingle();
     if (resultado.error) {
         console.error("Error al modificar recurso:", resultado.error);
         return res.status(500).json("Error en la base de datos");
     }
     if (resultado.data) res.status(200).json(resultado.data);
     else res.status(404).json("Recurso no encontrado");
 });


    app.get("/api/recursos/:id/reservas", async function(req, res){
     var id = parseInt(req.params.id);
     var resultado = await supabase.from("reservas").select("*").eq("recurso", id);
     if (resultado.error) return res.status(500).json("Error en la BD");
     res.status(200).json(resultado.data);
 });

    app.get("/api/recursos/:id/resenyas", async function(req, res){
     var id = parseInt(req.params.id);
     var resultado = await supabase.from("resenas").select("*").eq("recurso", id);
     if (resultado.error) return res.status(500).json("Error en la BD");
     res.status(200).json(resultado.data);
 });

    app.get("/api/sanitarios/:id", async function(req, res){
     var id = parseInt(req.params.id);
     var resultado = await supabase.from("sanitarios").select("id, nombre, apellidos, id_area").eq("id", id).maybeSingle();
     if (resultado.error) return res.status(500).json("Error en la BD");
     if (resultado.data) res.status(200).json(resultado.data);
     else res.status(404).json("Sanitario no encontrado");
 });

    app.get("/api/gestores/:id", async function(req, res){
     var id = parseInt(req.params.id);
     var resultado = await supabase.from("gestores").select("id, nombre, apellido, usuario").eq("id", id).maybeSingle();
     if (resultado.error) return res.status(500).json("Error en la BD");
     if (resultado.data) res.status(200).json(resultado.data);
     else res.status(404).json("Gestor no encontrado");
 });

    app.post("/api/area_salud", async function(req, res){
     var nuevo = req.body || {};
     
     nuevo.codigo = parseInt(nuevo.codigo);
     nuevo.nombre = String(nuevo.nombre).trim().toLowerCase(); // Prevenimos las mayúsculas

     var existente = await supabase.from("areas").select("codigo").eq("codigo", nuevo.codigo).maybeSingle();
     if (existente.error) return res.status(500).json("Error en la BD");
     if (existente.data) return res.status(400).json("El codigo postal ya existe");

     var insercion = await supabase.from("areas").insert(nuevo);
     if (insercion.error) return res.status(500).json("Error en la BD");
     res.status(201).json("añadido");
 });
};