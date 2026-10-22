var gestores = [{id:1,usuario:"joel", contrasena:"1234", nombre:"Joel", apellido:"Gomariz"}];
var siguientegestor=2

////////////////////////////////

var categorias = [
    {id: 1, nombre: "Termómetro"},
    {id: 2, nombre: "Estetoscopio"},
    {id: 3, nombre: "Silla de ruedas"},
    {id: 4, nombre: "Ecógrafo" }
];

var modelos = [
    { id: 1, categoria: 1, nombre: "TermoMax" },
    { id: 2, categoria: 1, nombre: "ASY-234" },
    { id: 3, categoria: 2, nombre: "CardioLite" },
    { id: 4, categoria: 3, nombre: "Silla básica" },
    { id: 5, categoria: 4, nombre: "EcoPro XL" }
];

var ubicaciones = [
        { id: 1, nombre: "Almacén 1" },
        { id: 2, nombre: "Almacén 2" },
        { id: 3, nombre: "Planta 3" }
];

var recursos = [
        { id: 1, modelo: 1, numero_serie: "TMX-001", ubicacion: 1, estado: 0 },
        { id: 2, modelo: 1, numero_serie: "TMX-002", ubicacion: 2, estado: 1 }, 
        { id: 3, modelo: 2, numero_serie: "ASY-001", ubicacion: 1, estado: 0 },
        { id: 4, modelo: 3, numero_serie: "CAR-001", ubicacion: 1, estado: 1 }, 
        { id: 5, modelo: 4, numero_serie: "SIL-001", ubicacion: 3, estado: 0 },
        { id: 6, modelo: 4, numero_serie: "SIL-002", ubicacion: 3, estado: 1 }, 
        { id: 7, modelo: 5, numero_serie: "ECO-001", ubicacion: 2, estado: 0 }
];
var siguienterecurso = 8;


//////////////////////////////


var sanitarios = [
    {id: 1, nombre: "María Estrella", apellidos: "López", usuario: "maria", password: "1234"},
    {id: 2, nombre: "Luis", apellidos: "Navarro García", usuario: "luis", password: "1234"},
    {id: 3, nombre: "Amparo", apellidos: "Maciá Ruiz", usuario: "amparo", password: "1234"}
];
var siguientesanitario = 4

var reservas = [
        { id: 1, recurso: 3, sanitario: 1, horas_estimadas: 1, fecha_peticion: "2026-03-20T10:00:00", fecha_inicio: "2026-03-20T10:05:00", fecha_fin: "2026-03-20T11:00:00" }, 
        { id: 2, recurso: 1, sanitario: 2, horas_estimadas: 2, fecha_peticion: "2026-03-21T09:00:00", fecha_inicio: "2026-03-21T09:10:00", fecha_fin: "2026-03-21T11:30:00" }, 
        { id: 3, recurso: 4, sanitario: 3, horas_estimadas: 4, fecha_peticion: "2026-03-22T08:00:00", fecha_inicio: "2026-03-22T08:15:00", fecha_fin: "2026-03-22T12:00:00" }, 
        { id: 4, recurso: 4, sanitario: 1, horas_estimadas: 3, fecha_peticion: "2026-03-23T12:00:00", fecha_inicio: "2026-03-23T12:05:00", fecha_fin: null }, 
        { id: 5, recurso: 2, sanitario: 2, horas_estimadas: 3, fecha_peticion: "2026-03-23T13:00:00", fecha_inicio: "2026-03-23T13:10:00", fecha_fin: null }, 
        { id: 6, recurso: 6, sanitario: 3, horas_estimadas: 5, fecha_peticion: "2026-03-23T10:00:00", fecha_inicio: "2026-03-23T10:15:00", fecha_fin: null }, 
        { id: 7, recurso: 2, sanitario: 1, horas_estimadas: 1, fecha_peticion: "2026-03-23T13:30:00", fecha_inicio: null, fecha_fin: null }, 
        { id: 8, recurso: 5, sanitario: 2, horas_estimadas: 4, fecha_peticion: "2026-03-23T13:32:00", fecha_inicio: null, fecha_fin: null }, 
        { id: 9, recurso: 7, sanitario: 3, horas_estimadas: 2, fecha_peticion: "2026-03-23T13:00:00", fecha_inicio: null, fecha_fin: null }]  
var siguientereserva = 10;

var resenas = [
    { id: 1, recurso: 1, sanitario: 1, fecha: new Date("2025-04-11T13:52:00"), valor: 5, descripcion: "Todo perfecto"},
    { id: 2, recurso: 2, sanitario: 2, fecha: new Date("2025-04-15T11:20:00"), valor: 3, descripcion: "tiene la pantalla un poco rayada."},
    { id: 3, recurso: 1, sanitario: 3, fecha: "2026-03-15T09:15:00", valor: 5, descripcion: "Muy preciso y fácil de usar, como siempre." },
    { id: 4, recurso: 2, sanitario: 1, fecha: "2026-03-16T12:30:00", valor: 4, descripcion: "Funciona bien pero la pantalla tiene un pequeño arañazo que molesta un poco con la luz." },
    { id: 5, recurso: 4, sanitario: 2, fecha: "2026-03-17T14:45:00", valor: 3, descripcion: "Los auriculares están un poco desgastados, habría que revisarlos pronto." },
    { id: 6, recurso: 5, sanitario: 1, fecha: "2026-03-18T16:00:00", valor: 5, descripcion: "Silla en perfecto estado, rueda muy suave por los pasillos." },        
    { id: 7, recurso: 6, sanitario: 2, fecha: "2026-03-19T10:20:00", valor: 2, descripcion: "El freno derecho se atasca a veces. Lo he dejado reportado a mantenimiento." },
    { id: 8, recurso: 7, sanitario: 3, fecha: "2026-03-19T18:00:00", valor: 5, descripcion: "Calidad de imagen excelente, sonda en perfectas condiciones y limpia." },
    { id: 9, recurso: 3, sanitario: 2, fecha: "2026-03-20T14:10:00", valor: 4, descripcion: "Todo correcto, devuelto limpio y en su caja." },
    { id: 10, recurso: 1, sanitario: 1, fecha: "2026-03-21T16:50:00", valor: 5, descripcion: "Batería recién cambiada, dura muchísimo. Da gusto usarlo así." },
    { id: 11, recurso: 2, sanitario: 3, fecha: "2026-03-22T09:40:00", valor: 3, descripcion: "Tarda un poco en estabilizarse para dar la lectura, pero aceptable para un apuro." },
    { id: 12, recurso: 4, sanitario: 1, fecha: "2026-03-22T19:15:00", valor: 5, descripcion: "Se escucha el latido súper nítido, sin ruidos de fondo." }
];
var siguienteresena = 13;

module.exports = {
    gestores: gestores,
    siguientegestor: siguientegestor,
    categorias: categorias,
    modelos: modelos,
    ubicaciones: ubicaciones,   
    recursos: recursos,
    siguienterecurso: siguienterecurso,
    sanitarios: sanitarios,
    siguientesanitario: siguientesanitario,
    reservas: reservas,
    siguientereserva: siguientereserva,
    resenas: resenas,
    siguienteresena: siguienteresena
};