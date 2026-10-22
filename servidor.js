
var express=require("express");
var app=express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Si es una petición de pre-vuelo (preflight), respondemos con éxito directamente
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
var datos=require("./datos.js");


app.use(express.static("cliente"));
app.use(express.json())

require("./servidor_rest.js")(app, datos); //////
require("./servidor_rpc.js")(datos);/////////////
var ws = require("./servidor_ws.js")(datos);/////WS

app.listen(3000, function() {
    console.log("Servidor principal iniciado en el puerto 3000");
});

