/* =====================================================================
   REPASO CONTABLE PGC — app.js
   1. Utilidades
   2. Cuadro de cuentas del PGC (reutilizable en todos los bloques)
   3. Contenido de los bloques
   4. Estado y rutas
   5. Renderizado general (menú, cabecera, pestañas)
   6. Teoría · 7. Test · 8. Casos prácticos
   9. Acciones (clics y toques) · 10. Menú móvil · 11. Arranque
   ===================================================================== */
'use strict';

/* =====================================================================
   1. UTILIDADES
   ===================================================================== */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cargarJSON(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) {
    /* almacenamiento no disponible: la app sigue funcionando sin recordar */
  }
}

function svgIcono(ruta, clases = 'h-5 w-5', grosor = 1.8) {
  return `<svg class="${clases}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="${grosor}" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${ruta}"/></svg>`;
}

const ICONO_OK = 'M5 12l4 4 10-10';
const ICONO_MAL = 'M6 6l12 12M18 6L6 18';
const ICONO_INFO = 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 110 18 9 9 0 010-18z';
const ICONO_BOMBILLA = 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0012 3z';
const ICONO_DOCUMENTO = 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6';
const ICONO_PAPELERA = 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3';

// 6000 → "6.000,00 €" (formato español, siempre con separador de miles)
function formatoEuros(n) {
  const negativo = n < 0;
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.');
  return `${negativo ? '−' : ''}${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales} €`;
}

// Acepta "6000", "6.000", "6000,5", "6.000,50" → número (o NaN)
function leerImporte(texto) {
  let t = String(texto).replace(/[\s€]/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100) / 100;
}

const centimos = (n) => Math.round(n * 100);

// Fisher-Yates: devuelve una copia desordenada del array
function barajar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function vibrar(patron) {
  try {
    if (navigator.vibrate) navigator.vibrate(patron);
  } catch (e) { /* sin vibración */ }
}

/* =====================================================================
   2. CUADRO DE CUENTAS DEL PGC
   Se usa en la teoría, en los casos prácticos y en los próximos bloques
   para obtener el nombre de cualquier cuenta a partir de su código.
   ===================================================================== */
const CUADRO_PGC = [
  {
    grupo: 1,
    nombre: 'Financiación básica',
    nombreCorto: 'Financiación básica',
    destino: 'balance',
    masa: 'Patrimonio neto y pasivo no corriente',
    saldo: 'acreedor',
    resumen: 'Los fondos estables de la empresa: lo que aportaron los socios, los beneficios que se quedan dentro y las deudas a largo plazo.',
    enOficina: 'Lo tocarás poco en el día a día: constitución, ampliaciones de capital, préstamos a largo plazo y el reparto del resultado tras el cierre.',
    subgrupos: [
      { codigo: '10', nombre: 'Capital', cuentas: [['100', 'Capital social']] },
      { codigo: '11', nombre: 'Reservas', cuentas: [['112', 'Reserva legal'], ['113', 'Reservas voluntarias']] },
      { codigo: '12', nombre: 'Resultados pendientes de aplicación', cuentas: [['129', 'Resultado del ejercicio']] },
      { codigo: '13', nombre: 'Subvenciones, donaciones y legados', cuentas: [['130', 'Subvenciones oficiales de capital']] },
      { codigo: '17', nombre: 'Deudas a largo plazo por préstamos recibidos', cuentas: [['170', 'Deudas a largo plazo con entidades de crédito'], ['173', 'Proveedores de inmovilizado a largo plazo'], ['174', 'Acreedores por arrendamiento financiero a largo plazo']] },
    ],
  },
  {
    grupo: 2,
    nombre: 'Activo no corriente',
    nombreCorto: 'Activo no corriente',
    destino: 'balance',
    masa: 'Activo no corriente',
    saldo: 'deudor (las amortizaciones del 28, acreedor)',
    resumen: 'Los bienes que la empresa usará durante varios años: locales, vehículos, ordenadores, mobiliario o programas informáticos.',
    enOficina: 'Si llega la factura de un ordenador, un vehículo o una licencia de software para varios años, no es un gasto: va aquí y se amortiza poco a poco.',
    subgrupos: [
      { codigo: '20', nombre: 'Inmovilizaciones intangibles', cuentas: [['206', 'Aplicaciones informáticas']] },
      { codigo: '21', nombre: 'Inmovilizaciones materiales', cuentas: [['211', 'Construcciones'], ['213', 'Maquinaria'], ['216', 'Mobiliario'], ['217', 'Equipos para procesos de información'], ['218', 'Elementos de transporte']] },
      { codigo: '28', nombre: 'Amortización acumulada del inmovilizado', cuentas: [['280', 'Amortización acumulada del inmovilizado intangible'], ['281', 'Amortización acumulada del inmovilizado material']] },
    ],
  },
  {
    grupo: 3,
    nombre: 'Existencias',
    nombreCorto: 'Existencias',
    destino: 'balance',
    masa: 'Activo corriente',
    saldo: 'deudor',
    resumen: 'La mercancía y los materiales que hay en el almacén a fecha de cierre.',
    enOficina: 'Ojo: las compras del día a día NO van aquí, van a la 600. El grupo 3 solo se ajusta al cierre con el inventario final.',
    subgrupos: [
      { codigo: '30', nombre: 'Comerciales', cuentas: [['300', 'Mercaderías']] },
      { codigo: '31', nombre: 'Materias primas', cuentas: [['310', 'Materias primas']] },
      { codigo: '35', nombre: 'Productos terminados', cuentas: [['350', 'Productos terminados']] },
    ],
  },
  {
    grupo: 4,
    nombre: 'Acreedores y deudores por operaciones comerciales',
    nombreCorto: 'Acreedores y deudores',
    destino: 'balance',
    masa: 'Activo corriente o pasivo corriente (según la cuenta)',
    saldo: 'deudor en clientes, acreedor en proveedores',
    resumen: 'Todo lo que la empresa debe o le deben por su actividad diaria: proveedores, acreedores, clientes, personal y Hacienda.',
    enOficina: 'Es tu grupo principal: cada factura de compra genera una deuda con un proveedor (400) o un acreedor (410) y, casi siempre, un IVA soportado (472).',
    subgrupos: [
      { codigo: '40', nombre: 'Proveedores', clave: true, cuentas: [['400', 'Proveedores'], ['401', 'Proveedores, efectos comerciales a pagar'], ['407', 'Anticipos a proveedores']] },
      { codigo: '41', nombre: 'Acreedores varios', clave: true, cuentas: [['410', 'Acreedores por prestaciones de servicios']] },
      { codigo: '43', nombre: 'Clientes', clave: true, cuentas: [['430', 'Clientes'], ['431', 'Clientes, efectos comerciales a cobrar'], ['4311', 'Efectos comerciales descontados'], ['436', 'Clientes de dudoso cobro'], ['438', 'Anticipos de clientes']] },
      { codigo: '46', nombre: 'Personal', cuentas: [['460', 'Anticipos de remuneraciones'], ['465', 'Remuneraciones pendientes de pago']] },
      { codigo: '47', nombre: 'Administraciones Públicas', clave: true, cuentas: [['472', 'Hacienda Pública, IVA soportado'], ['473', 'Hacienda Pública, retenciones y pagos a cuenta'], ['4750', 'Hacienda Pública, acreedora por IVA'], ['477', 'Hacienda Pública, IVA repercutido'], ['4751', 'Hacienda Pública, acreedora por retenciones practicadas'], ['476', 'Organismos de la Seguridad Social, acreedores']] },
      { codigo: '48', nombre: 'Ajustes por periodificación', cuentas: [['480', 'Gastos anticipados'], ['485', 'Ingresos anticipados']] },
      { codigo: '49', nombre: 'Deterioro de valor de créditos comerciales y provisiones a corto plazo', cuentas: [['490', 'Deterioro de valor de créditos por operaciones comerciales']] },
    ],
  },
  {
    grupo: 5,
    nombre: 'Cuentas financieras',
    nombreCorto: 'Cuentas financieras',
    destino: 'balance',
    masa: 'Activo corriente o pasivo corriente (según la cuenta)',
    saldo: 'deudor en tesorería, acreedor en deudas',
    resumen: 'El dinero disponible (caja y bancos) y las deudas y créditos a corto plazo que no son comerciales.',
    enOficina: 'La 572 es la cuenta que más vas a puntear: cada movimiento del extracto tiene su reflejo aquí. La 555 sirve para aparcar un cobro o pago que aún no sabes identificar.',
    subgrupos: [
      { codigo: '52', nombre: 'Deudas a corto plazo por préstamos recibidos y otros conceptos', cuentas: [['520', 'Deudas a corto plazo con entidades de crédito'], ['5208', 'Deudas por efectos descontados'], ['523', 'Proveedores de inmovilizado a corto plazo'], ['524', 'Acreedores por arrendamiento financiero a corto plazo']] },
      { codigo: '55', nombre: 'Otras cuentas no bancarias', cuentas: [['551', 'Cuenta corriente con socios y administradores'], ['555', 'Partidas pendientes de aplicación']] },
      { codigo: '57', nombre: 'Tesorería', clave: true, cuentas: [['570', 'Caja, euros'], ['572', 'Bancos e instituciones de crédito c/c vista, euros']] },
    ],
  },
  {
    grupo: 6,
    nombre: 'Compras y gastos',
    nombreCorto: 'Compras y gastos',
    destino: 'pyg',
    masa: 'Pérdidas y Ganancias (gastos)',
    saldo: 'deudor',
    resumen: 'Todo lo que consume la empresa para funcionar: compras, alquileres, suministros, profesionales, sueldos o intereses.',
    enOficina: 'La mayoría de facturas de proveedor llevan su gasto aquí. Elegir bien la cuenta (¿suministro 628 o reparación 622?) es buena parte de tu trabajo.',
    subgrupos: [
      { codigo: '60', nombre: 'Compras', cuentas: [['600', 'Compras de mercaderías'], ['602', 'Compras de otros aprovisionamientos'], ['606', 'Descuentos sobre compras por pronto pago'], ['607', 'Trabajos realizados por otras empresas'], ['608', 'Devoluciones de compras y operaciones similares'], ['609', 'Rappels por compras']] },
      { codigo: '62', nombre: 'Servicios exteriores', clave: true, cuentas: [['621', 'Arrendamientos y cánones'], ['622', 'Reparaciones y conservación'], ['623', 'Servicios de profesionales independientes'], ['624', 'Transportes'], ['625', 'Primas de seguros'], ['626', 'Servicios bancarios y similares'], ['627', 'Publicidad, propaganda y relaciones públicas'], ['628', 'Suministros'], ['629', 'Otros servicios']] },
      { codigo: '63', nombre: 'Tributos', cuentas: [['631', 'Otros tributos']] },
      { codigo: '64', nombre: 'Gastos de personal', cuentas: [['640', 'Sueldos y salarios'], ['642', 'Seguridad Social a cargo de la empresa']] },
      { codigo: '65', nombre: 'Otros gastos de gestión', cuentas: [['650', 'Pérdidas de créditos comerciales incobrables']] },
      { codigo: '66', nombre: 'Gastos financieros', cuentas: [['662', 'Intereses de deudas'], ['665', 'Intereses por descuento de efectos y operaciones de factoring']] },
      { codigo: '68', nombre: 'Dotaciones para amortizaciones', cuentas: [['681', 'Amortización del inmovilizado material']] },
      { codigo: '69', nombre: 'Pérdidas por deterioro y otras dotaciones', cuentas: [['694', 'Pérdidas por deterioro de créditos por operaciones comerciales']] },
    ],
  },
  {
    grupo: 7,
    nombre: 'Ventas e ingresos',
    nombreCorto: 'Ventas e ingresos',
    destino: 'pyg',
    masa: 'Pérdidas y Ganancias (ingresos)',
    saldo: 'acreedor',
    resumen: 'Lo que la empresa gana con su actividad: ventas de mercaderías, servicios prestados y otros ingresos.',
    enOficina: 'Es el espejo del grupo 6: aquí va la base imponible (el importe sin IVA) de cada factura emitida.',
    subgrupos: [
      { codigo: '70', nombre: 'Ventas de mercaderías, de producción propia, de servicios, etc.', cuentas: [['700', 'Ventas de mercaderías'], ['705', 'Prestaciones de servicios'], ['706', 'Descuentos sobre ventas por pronto pago'], ['708', 'Devoluciones de ventas y operaciones similares'], ['709', 'Rappels sobre ventas']] },
      { codigo: '75', nombre: 'Otros ingresos de gestión', cuentas: [['752', 'Ingresos por arrendamientos'], ['759', 'Ingresos por servicios diversos']] },
      { codigo: '76', nombre: 'Ingresos financieros', cuentas: [['769', 'Otros ingresos financieros']] },
      { codigo: '79', nombre: 'Excesos y aplicaciones de provisiones y de pérdidas por deterioro', cuentas: [['794', 'Reversión del deterioro de créditos por operaciones comerciales']] },
    ],
  },
];

const CUENTAS = {};
CUADRO_PGC.forEach((g) => g.subgrupos.forEach((s) => s.cuentas.forEach(([codigo, nombre]) => { CUENTAS[codigo] = nombre; })));

// Etiquetas genéricas usadas en ejemplos (no son cuentas del PGC)
CUENTAS['6xx'] = 'Cuenta de gasto (621, 623, 627…)';
CUENTAS['7xx'] = 'Cuenta de ingreso (700, 705…)';

const nombreCuenta = (codigo) => CUENTAS[codigo] || `Cuenta ${codigo}`;
const grupoPGC = (numero) => CUADRO_PGC.find((g) => g.grupo === Number(numero));

const ESTILO_DESTINO = {
  balance: { etiqueta: 'Balance', punto: 'bg-acento-500', chip: 'bg-acento-50 text-acento-700 ring-acento-500/20' },
  pyg: { etiqueta: 'Pérdidas y Ganancias', punto: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-500/20' },
};

/* =====================================================================
   3. CONTENIDO DE LOS BLOQUES
   ---------------------------------------------------------------------
   teoria: secciones { id, titulo, resumen, piezas: [...] }
           tipos de pieza: html · asiento · consejo · ecuacion · masas ·
           reglas · simulador-balance · explorador-pgc · codificacion
   configTest: { preguntasPorIntento, aprobado }   (opcional)
   test:   banco de preguntas. Cada intento sortea «preguntasPorIntento»
           y baraja las opciones. Formatos admitidos:
           { id, pregunta, correcta: 'texto', incorrectas: ['…'], explicacion }
           { id, pregunta, opciones: ['…'], correcta: índice, explicacion }
   casos:  { id, tipo: 'asiento', titulo, enunciado, cuentasDisponibles,
             solucion: [{ cuenta, debe | haber }], pista, explicacion }
           { id, tipo: 'clasificar', titulo, enunciado, rejilla,
             opciones: [{ valor, etiqueta, tono?, ancho? }],
             cuentas: [{ codigo, correcta: valor, pista, explicacion }],
             resumenOk }
   ===================================================================== */
const ICONOS = {
  balanza: 'M12 3v18M8 21h8M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z',
  factura: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  ventas: 'M6 7h12l-1 13H7L6 7zM9 7a3 3 0 016 0',
  nominas: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0',
  banco: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  impuestos: 'M19 5L5 19M7 9a2 2 0 100-4 2 2 0 000 4zm10 10a2 2 0 100-4 2 2 0 000 4z',
  cierre: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 14l2 2 4-4',
  analisis: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
};

/* ---------- Bloque 0: Fundamentos, Partida Doble y PGC ---------- */
const CONTENIDO_B0 = {
  teoria: [
    {
      id: 'partida-doble',
      titulo: 'La partida doble: todo asiento cuadra',
      resumen: 'La regla de oro de la contabilidad.',
      piezas: [
        {
          tipo: 'html',
          html: `<p>Cada operación de la empresa afecta, como mínimo, a <strong>dos cuentas</strong>: una recoge <em>a dónde va</em> el valor y otra <em>de dónde sale</em>. Por eso, en todo asiento, <strong>la suma del Debe es siempre igual a la suma del Haber</strong>.</p>
                 <p>Es la regla que vigila tu programa contable (A3, Sage, Holded, Contasol…): si el asiento no cuadra, no te deja guardarlo. Y es la primera comprobación que harás cuando algo «no sale».</p>`,
        },
        {
          tipo: 'asiento',
          titulo: 'Compras un portátil de 900 € y lo pagas con la tarjeta de la empresa',
          subtitulo: 'Sin IVA de momento: lo añadiremos en el Bloque 1.',
          lineas: [{ cuenta: '217', debe: 900 }, { cuenta: '572', haber: 900 }],
          nota: 'Entra un ordenador (217) que la empresa usará varios años y sale dinero del banco (572). 900 = 900: el asiento cuadra.',
        },
        {
          tipo: 'consejo',
          html: '<strong>En la oficina:</strong> si un asiento no cuadra, casi siempre es un importe mal tecleado o una línea olvidada (muchas veces, el IVA). Si la diferencia es divisible entre 9, sospecha de dos cifras intercambiadas: teclear 1.250 en vez de 1.520 da una diferencia de 270 = 9 × 30.',
        },
      ],
    },
    {
      id: 'ecuacion',
      titulo: 'La ecuación del balance',
      resumen: 'Lo que tiene la empresa siempre está financiado por alguien.',
      piezas: [
        { tipo: 'ecuacion' },
        {
          tipo: 'html',
          html: '<p>Dicho de otra forma: <strong>todo lo que tiene la empresa (activo) está financiado por alguien</strong>, ya sea por terceros (pasivo) o por los propios socios (patrimonio neto). Por eso los dos lados del balance siempre suman lo mismo.</p>',
        },
        { tipo: 'masas' },
        {
          tipo: 'consejo',
          html: '<strong>¿Corriente o no corriente?</strong> La frontera es <strong>un año</strong>. Un préstamo que vence en 8 meses es pasivo corriente (520); si vence en 3 años, no corriente (170). Al cierre se reclasifica a corto plazo la parte que vence en los 12 meses siguientes.',
        },
      ],
    },
    {
      id: 'debe-haber',
      titulo: 'Debe y Haber: cómo se mueve cada cuenta',
      resumen: 'La regla que resuelve casi cualquier asiento.',
      piezas: [
        {
          tipo: 'html',
          html: '<p><strong>Debe</strong> es la columna de la izquierda y <strong>Haber</strong> la de la derecha. No significan que alguien «deba» o «tenga»: son solo los dos lados de cada cuenta. <strong>Cargar</strong> una cuenta es anotar en su Debe; <strong>abonar</strong> es anotar en su Haber.</p>',
        },
        { tipo: 'reglas' },
        {
          tipo: 'consejo',
          html: '<strong>Truco de oficina:</strong> pregúntate <em>¿qué entra y de dónde sale?</em> Lo que entra en la empresa (dinero, un bien, un servicio recibido) va al <strong>Debe</strong>. El origen (de dónde sale el dinero o a quién se le queda debiendo) va al <strong>Haber</strong>.',
        },
        {
          tipo: 'simulador-balance',
          titulo: 'Mira cómo se mueve el balance',
          masas: { 572: 'activo', 217: 'activo', 100: 'pn', 523: 'pasivo', 520: 'pasivo' },
          operaciones: [
            {
              titulo: 'Los socios aportan el capital',
              texto: 'Los socios ingresan 10.000 € en la cuenta del banco para constituir la sociedad.',
              lineas: [{ cuenta: '572', debe: 10000 }, { cuenta: '100', haber: 10000 }],
              nota: 'Sube el activo (banco) y sube el patrimonio neto (capital).',
            },
            {
              titulo: 'Compra de ordenadores a crédito',
              texto: 'Compras equipos informáticos por 3.000 € y los pagarás en 30 días.',
              lineas: [{ cuenta: '217', debe: 3000 }, { cuenta: '523', haber: 3000 }],
              nota: 'Sube el activo (equipos) y sube el pasivo. El proveedor de un bien de inmovilizado va a la 523, no a la 400.',
            },
            {
              titulo: 'Pagas parte de la deuda',
              texto: 'Transfieres 1.000 € al proveedor de los ordenadores.',
              lineas: [{ cuenta: '523', debe: 1000 }, { cuenta: '572', haber: 1000 }],
              nota: 'Baja el activo (banco) y baja el pasivo (deuda). El balance sigue cuadrando.',
            },
            {
              titulo: 'El banco te concede un préstamo',
              texto: 'Recibes en la cuenta un préstamo de 5.000 € que devolverás en 10 meses.',
              lineas: [{ cuenta: '572', debe: 5000 }, { cuenta: '520', haber: 5000 }],
              nota: 'Sube el activo (banco) y sube el pasivo corriente (vence en menos de un año).',
            },
          ],
        },
      ],
    },
    {
      id: 'cuadro-pgc',
      titulo: 'El cuadro de cuentas del PGC',
      resumen: 'Los 7 grupos y los subgrupos que usarás a diario.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>El PGC ordena todas las cuentas en grupos numerados. El <strong>primer dígito</strong> te dice el grupo y, con él, dónde acaba la cuenta: los grupos <strong>1 a 5</strong> forman el <strong>Balance</strong>; los grupos <strong>6 y 7</strong>, la <strong>Cuenta de Pérdidas y Ganancias</strong>. Toca cada grupo para ver sus subgrupos clave.</p>',
        },
        { tipo: 'explorador-pgc' },
        { tipo: 'codificacion' },
        {
          tipo: 'consejo',
          html: '<strong>¿Y los grupos 8 y 9?</strong> Recogen gastos e ingresos que se imputan directamente al patrimonio neto (por ejemplo, ciertas subvenciones). En el día a día de una pyme apenas los verás.',
        },
      ],
    },
  ],

  // Cada intento sortea 10 preguntas del banco y baraja sus opciones.
  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  // Banco de preguntas. La opción correcta se escribe en «correcta» y las
  // erróneas en «incorrectas»; el orden en pantalla se baraja en cada intento,
  // así que las explicaciones nunca se refieren a letras (A, B, C).
  test: [
    /* --- Masas patrimoniales --- */
    {
      id: 'b0-q01',
      pregunta: 'Revisas el extracto del banco: la cuenta corriente de la empresa tiene 8.500 €. ¿En qué masa patrimonial está ese saldo?',
      correcta: 'Activo corriente',
      incorrectas: ['Activo no corriente', 'Patrimonio neto'],
      explicacion: 'La 572 Bancos es tesorería: dinero disponible de inmediato, así que es activo corriente. El activo no corriente es para bienes que se usan más de un año, como un ordenador o un vehículo.',
    },
    {
      id: 'b0-q02',
      pregunta: 'Contabilizas la factura de un proveedor de mercaderías que pagarás a 60 días. ¿Qué es el saldo de la cuenta 400 Proveedores para la empresa?',
      correcta: 'Un pasivo corriente',
      incorrectas: ['Un activo, porque la mercancía ya está en el almacén', 'Un gasto del grupo 6'],
      explicacion: 'La 400 recoge lo que debes al proveedor: es una deuda que vence en menos de un año, así que es pasivo corriente. La mercancía comprada va a la 600 Compras de mercaderías (gasto), no a la 400.',
    },
    {
      id: 'b0-q03',
      pregunta: 'La empresa compra una furgoneta de reparto que usará unos 6 años. ¿En qué masa patrimonial la registras?',
      correcta: 'Activo no corriente',
      incorrectas: ['Activo corriente', 'Gasto del ejercicio (grupo 6)'],
      explicacion: 'Un bien que se usa más de un año es inmovilizado: va a la 218 Elementos de transporte, en el activo no corriente. Su coste se reparte entre los años de uso mediante la amortización.',
    },
    {
      id: 'b0-q04',
      pregunta: 'El banco os concede un préstamo que se devolverá en 4 años. ¿Dónde aparece esa deuda en el balance?',
      correcta: 'Pasivo no corriente',
      incorrectas: ['Pasivo corriente', 'Patrimonio neto'],
      explicacion: 'Las deudas que vencen en más de un año son pasivo no corriente (170 Deudas a largo plazo con entidades de crédito). Al cierre, la parte que vence en los 12 meses siguientes se reclasifica a corto plazo (520).',
    },
    {
      id: 'b0-q05',
      pregunta: 'Tras facturar a varios clientes, la cuenta 430 Clientes tiene saldo. ¿Qué representa ese saldo?',
      correcta: 'Un derecho de cobro: activo corriente',
      incorrectas: ['Una deuda de la empresa: pasivo corriente', 'Un ingreso del grupo 7'],
      explicacion: 'La 430 recoge lo que los clientes deben a la empresa: un derecho de cobro a corto plazo, es decir, activo corriente. El ingreso ya se registró en el grupo 7 (700 o 705) al emitir la factura.',
    },
    {
      id: 'b0-q06',
      pregunta: '¿En qué masa del balance se encuentra la cuenta 100 Capital social?',
      correcta: 'Patrimonio neto',
      incorrectas: ['Pasivo no corriente, porque se debe a los socios', 'Activo, porque es dinero de la empresa'],
      explicacion: 'El capital es financiación propia que aportan los socios: forma parte del patrimonio neto. No es una deuda exigible como un préstamo, y el dinero aportado está en el activo (572), no en la 100.',
    },
    {
      id: 'b0-q07',
      pregunta: 'Al pagar la factura de un abogado has retenido el IRPF, que está en la cuenta 4751. ¿Qué masa es?',
      correcta: 'Pasivo corriente',
      incorrectas: ['Activo corriente', 'Gasto del grupo 6'],
      explicacion: 'La 4751 Hacienda Pública, acreedora por retenciones practicadas recoge el dinero que has retenido y que debes ingresar a Hacienda en el trimestre (modelo 111). Es una deuda a corto plazo: pasivo corriente.',
    },
    {
      id: 'b0-q08',
      pregunta: 'La cuenta 472 Hacienda Pública, IVA soportado tiene saldo antes de la liquidación del trimestre. ¿Qué es?',
      correcta: 'Activo corriente: IVA que se compensará con Hacienda',
      incorrectas: ['Pasivo corriente: IVA que debes a Hacienda', 'Un gasto más de la compra'],
      explicacion: 'El IVA soportado deducible no es gasto: es un crédito frente a Hacienda que se compensa con el IVA repercutido (477) en la liquidación. Por eso es activo corriente.',
    },
    {
      id: 'b0-q09',
      pregunta: 'En el balance de cierre aparece la cuenta 300 Mercaderías con el valor del inventario final. ¿En qué masa está?',
      correcta: 'Activo corriente',
      incorrectas: ['Activo no corriente', 'Gasto del grupo 6'],
      explicacion: 'Las existencias se venderán en el ciclo normal de la actividad, así que son activo corriente. Las compras del año fueron a la 600 (gasto); la 300 solo recoge lo que queda en el almacén al cierre.',
    },
    {
      id: 'b0-q10',
      pregunta: '¿Cómo aparece en el balance la cuenta 281 Amortización acumulada del inmovilizado material?',
      correcta: 'Restando del inmovilizado material, en el activo no corriente',
      incorrectas: ['En el pasivo, como una deuda', 'Como un gasto en la Cuenta de Pérdidas y Ganancias'],
      explicacion: 'La 281 tiene saldo acreedor y corrige el valor del inmovilizado: el balance muestra el coste menos la amortización acumulada. El gasto de cada año va a la 681, en Pérdidas y Ganancias.',
    },

    /* --- Ecuación del balance --- */
    {
      id: 'b0-q11',
      pregunta: 'Una empresa tiene un activo de 50.000 € y un pasivo de 30.000 €. ¿Cuál es su patrimonio neto?',
      correcta: '20.000 €',
      incorrectas: ['80.000 €', '30.000 €'],
      explicacion: 'Activo = Pasivo + Patrimonio neto, así que PN = Activo − Pasivo = 50.000 − 30.000 = 20.000 €.',
    },
    {
      id: 'b0-q12',
      pregunta: 'Los socios amplían capital ingresando 3.000 € en el banco. ¿Qué efecto tiene en la ecuación del balance?',
      correcta: 'Sube el activo y sube el patrimonio neto',
      incorrectas: ['Sube el activo y sube el pasivo', 'Sube el activo y baja el patrimonio neto'],
      explicacion: 'Aumenta el banco (activo) y aumenta el capital social (100), que es patrimonio neto. El capital no es una deuda con terceros, por eso no es pasivo. La ecuación sigue cuadrando: +3.000 a cada lado.',
    },
    {
      id: 'b0-q13',
      pregunta: 'Pagas por banco 1.000 € que debías a un proveedor. ¿Qué ocurre en la ecuación del balance?',
      correcta: 'Bajan el activo y el pasivo en 1.000 €',
      incorrectas: ['Baja el activo y sube el pasivo', 'Baja el activo y baja el patrimonio neto'],
      explicacion: 'Sale dinero del banco (baja el activo) y desaparece la deuda con el proveedor (baja el pasivo). Pagar una deuda no es un gasto: el gasto se registró al recibir la factura.',
    },
    {
      id: 'b0-q14',
      pregunta: 'Compras un ordenador y lo pagas en el momento por banco. ¿Qué ocurre con el total del activo?',
      correcta: 'No cambia: sube el inmovilizado y baja el banco en el mismo importe',
      incorrectas: ['Sube, porque la empresa tiene un ordenador más', 'Baja, porque ha salido dinero del banco'],
      explicacion: 'Es un intercambio dentro del activo: entra un ordenador (217) y sale el mismo importe del banco (572). El activo total, el pasivo y el patrimonio neto no varían.',
    },
    {
      id: 'b0-q15',
      pregunta: 'Compras mobiliario para la oficina y lo pagarás en 90 días. ¿Qué efecto tiene al recibirlo?',
      correcta: 'Sube el activo y sube el pasivo',
      incorrectas: ['Sube el activo y baja el patrimonio neto', 'No cambia nada hasta que lo pagues'],
      explicacion: 'El mobiliario (216) entra en el activo desde que lo recibes, y a la vez nace una deuda con el proveedor de inmovilizado (523). La contabilidad registra la operación cuando ocurre, no cuando se paga.',
    },
    {
      id: 'b0-q16',
      pregunta: 'Un compañero te pregunta qué es el patrimonio neto. ¿Cuál es la respuesta correcta?',
      correcta: 'Lo que pertenece a los socios: capital, reservas y resultado',
      incorrectas: ['El dinero que la empresa tiene en el banco', 'Lo que la empresa debe a los bancos'],
      explicacion: 'El patrimonio neto es la financiación propia: lo aportado por los socios (capital), los beneficios que se han quedado en la empresa (reservas) y el resultado del ejercicio. Es la diferencia entre activo y pasivo.',
    },

    /* --- Partida doble y Debe / Haber --- */
    {
      id: 'b0-q17',
      pregunta: '¿Qué se cumple siempre en cualquier asiento contable?',
      correcta: 'La suma del Debe es igual a la suma del Haber',
      incorrectas: ['Intervienen exactamente dos cuentas', 'El Debe recoge lo que la empresa debe'],
      explicacion: 'Es la partida doble: todo asiento cuadra. Puede haber más de dos cuentas (por ejemplo, gasto + IVA + proveedor), y «Debe» es solo el nombre de la columna izquierda, no significa deber dinero.',
    },
    {
      id: 'b0-q18',
      pregunta: 'Tu responsable te dice: «carga la 572». ¿Qué tienes que hacer?',
      correcta: 'Anotar el importe en el Debe de la 572',
      incorrectas: ['Anotar el importe en el Haber de la 572', 'Dejar el saldo de la 572 a cero'],
      explicacion: 'Cargar es anotar en el Debe; abonar es anotar en el Haber. Cargar la 572 significa que entra dinero en el banco.',
    },
    {
      id: 'b0-q19',
      pregunta: '¿Por qué lado aumenta una cuenta de activo?',
      correcta: 'Por el Debe',
      incorrectas: ['Por el Haber', 'Depende de si es corriente o no corriente'],
      explicacion: 'Todas las cuentas de activo, corrientes o no, aumentan por el Debe y disminuyen por el Haber. Por eso su saldo habitual es deudor.',
    },
    {
      id: 'b0-q20',
      pregunta: '¿Por qué lado aumenta una cuenta de pasivo?',
      correcta: 'Por el Haber',
      incorrectas: ['Por el Debe', 'Por el Debe si es a corto plazo y por el Haber si es a largo'],
      explicacion: 'Los pasivos (y el patrimonio neto) aumentan por el Haber y disminuyen por el Debe, sea cual sea su plazo. Por eso su saldo habitual es acreedor.',
    },
    {
      id: 'b0-q21',
      pregunta: 'Registras la factura del alquiler de la oficina. ¿En qué lado va la cuenta de gasto 621?',
      correcta: 'En el Debe',
      incorrectas: ['En el Haber', 'Directamente en el patrimonio neto'],
      explicacion: 'Los gastos del grupo 6 se cargan (Debe). La contrapartida en el Haber es la deuda con el arrendador (410) o el banco (572) si se paga en el momento.',
    },
    {
      id: 'b0-q22',
      pregunta: 'Emites una factura a un cliente por un servicio prestado. ¿En qué lado va la cuenta de ingreso 705?',
      correcta: 'En el Haber',
      incorrectas: ['En el Debe', 'En el activo corriente'],
      explicacion: 'Los ingresos del grupo 7 se abonan (Haber). La contrapartida en el Debe es el derecho de cobro: 430 Clientes.',
    },
    {
      id: 'b0-q23',
      pregunta: 'En el mayor de una cuenta ves que tiene «saldo deudor». ¿Qué significa?',
      correcta: 'Que la suma de su Debe es mayor que la de su Haber',
      incorrectas: ['Que alguien debe dinero a la empresa', 'Que la suma de su Haber es mayor que la de su Debe'],
      explicacion: 'El saldo es la diferencia entre Debe y Haber. Deudor: gana el Debe (activos y gastos). Acreedor: gana el Haber (pasivos, patrimonio neto e ingresos).',
    },
    {
      id: 'b0-q24',
      pregunta: '¿Cuál es el saldo habitual de la cuenta 400 Proveedores?',
      correcta: 'Acreedor',
      incorrectas: ['Deudor, porque la empresa le debe dinero', 'No tiene saldo habitual: depende del mes'],
      explicacion: 'Es un pasivo: se abona al recibir la factura y se carga al pagarla. Mientras queden facturas pendientes, su saldo es acreedor. Un saldo deudor en un proveedor suele indicar un pago duplicado o una factura sin contabilizar.',
    },
    {
      id: 'b0-q25',
      pregunta: '¿Cuál es el saldo habitual de la cuenta 572 Bancos?',
      correcta: 'Deudor',
      incorrectas: ['Acreedor, porque el banco nos guarda el dinero', 'No tiene saldo habitual: depende del mes'],
      explicacion: 'Es un activo: el dinero de la empresa. Si un día ves la 572 con saldo acreedor, la cuenta está en descubierto (o hay un error de registro): revísalo con el extracto.',
    },
    {
      id: 'b0-q26',
      pregunta: 'Pagas por transferencia una factura de proveedor de 1.200 € que ya estaba contabilizada. ¿Cuál es el asiento del pago?',
      correcta: '400 Proveedores al Debe · 572 Bancos al Haber',
      incorrectas: ['572 Bancos al Debe · 400 Proveedores al Haber', '600 Compras al Debe · 572 Bancos al Haber'],
      explicacion: 'Al pagar, la deuda con el proveedor desaparece (un pasivo baja por el Debe) y sale dinero del banco (un activo baja por el Haber). Usar la 600 duplicaría el gasto, que ya se registró con la factura.',
    },
    {
      id: 'b0-q27',
      pregunta: 'Un cliente te paga por transferencia una factura que ya estaba contabilizada. ¿Cuál es el asiento del cobro?',
      correcta: '572 Bancos al Debe · 430 Clientes al Haber',
      incorrectas: ['430 Clientes al Debe · 572 Bancos al Haber', '572 Bancos al Debe · 700 Ventas al Haber'],
      explicacion: 'Entra dinero en el banco (activo sube por el Debe) y se cancela el derecho de cobro (activo baja por el Haber). Abonar la 700 duplicaría la venta, que ya se registró al facturar.',
    },
    {
      id: 'b0-q28',
      pregunta: 'Sacas 500 € del banco para el fondo de caja de la oficina. ¿Qué asiento haces?',
      correcta: '570 Caja al Debe · 572 Bancos al Haber',
      incorrectas: ['572 Bancos al Debe · 570 Caja al Haber', '629 Otros servicios al Debe · 572 Bancos al Haber'],
      explicacion: 'El dinero solo cambia de sitio: aumenta la caja (Debe) y disminuye el banco (Haber). No hay gasto hasta que se pague algo con ese efectivo.',
    },
    {
      id: 'b0-q29',
      pregunta: 'Al final del día ingresas en el banco 800 € en efectivo que había en la caja. ¿Qué asiento haces?',
      correcta: '572 Bancos al Debe · 570 Caja al Haber',
      incorrectas: ['570 Caja al Debe · 572 Bancos al Haber', '572 Bancos al Debe · 705 Prestaciones de servicios al Haber'],
      explicacion: 'Es el traspaso inverso: aumenta el banco (Debe) y disminuye la caja (Haber). No es un ingreso nuevo: si ese efectivo venía de un cobro, ya se registró en su momento.',
    },
    {
      id: 'b0-q30',
      pregunta: 'Un asiento descuadra por 270 €. ¿Cuál es la causa más probable?',
      correcta: 'Has intercambiado dos cifras al teclear un importe',
      incorrectas: ['Falta siempre la línea del IVA', 'El programa contable tiene un error'],
      explicacion: 'Cuando la diferencia es divisible entre 9 (270 = 9 × 30), casi siempre hay dos cifras traspuestas: por ejemplo, 1.250 en lugar de 1.520. Es la primera comprobación ante un descuadre.',
    },

    /* --- Estructura del PGC --- */
    {
      id: 'b0-q31',
      pregunta: '¿Qué grupos del PGC forman el Balance de situación?',
      correcta: 'Los grupos 1 a 5',
      incorrectas: ['Los grupos 1 a 7', 'Solo los grupos 6 y 7'],
      explicacion: 'Los grupos 1 a 5 son cuentas de balance (patrimoniales). Los grupos 6 y 7, gastos e ingresos, forman la Cuenta de Pérdidas y Ganancias; su diferencia, el resultado, acaba en el patrimonio neto (129).',
    },
    {
      id: 'b0-q32',
      pregunta: 'Te piden registrar el alquiler mensual de la oficina. ¿En qué grupo del PGC buscas la cuenta del gasto?',
      correcta: 'Grupo 6 · Compras y gastos',
      incorrectas: ['Grupo 2 · Activo no corriente', 'Grupo 4 · Acreedores y deudores'],
      explicacion: 'El alquiler es un gasto: va a la 621 Arrendamientos y cánones (subgrupo 62, Servicios exteriores). En el grupo 4 estaría la deuda con el arrendador (410), no el gasto.',
    },
    {
      id: 'b0-q33',
      pregunta: 'Llega la factura mensual de la gestoría que lleva las nóminas. ¿En qué cuenta registras el gasto?',
      correcta: '623 Servicios de profesionales independientes',
      incorrectas: ['621 Arrendamientos y cánones', '410 Acreedores por prestaciones de servicios'],
      explicacion: 'Asesores, abogados, gestorías y notarios van a la 623. La 410 es la cuenta del acreedor (a quien se le debe la factura), no la del gasto.',
    },
    {
      id: 'b0-q34',
      pregunta: 'Recibes la factura de la luz de la oficina. ¿Qué cuenta de gasto usas?',
      correcta: '628 Suministros',
      incorrectas: ['622 Reparaciones y conservación', '631 Otros tributos'],
      explicacion: 'Electricidad, agua y gas son suministros: cuenta 628. La 622 es para reparaciones y mantenimiento, y la 631 para tributos como el IBI o tasas municipales.',
    },
    {
      id: 'b0-q35',
      pregunta: 'En el extracto aparece una comisión de mantenimiento de la cuenta de 15 €. ¿Qué cuenta de gasto usas?',
      correcta: '626 Servicios bancarios y similares',
      incorrectas: ['662 Intereses de deudas', '629 Otros servicios'],
      explicacion: 'Las comisiones bancarias van a la 626, con abono a la 572. Los intereses de un préstamo son otra cosa: gasto financiero en la 662.',
    },
    {
      id: 'b0-q36',
      pregunta: 'En el programa contable ves la subcuenta 40000012. ¿Qué te indica?',
      correcta: 'Un proveedor concreto dentro de la cuenta 400 Proveedores',
      incorrectas: ['El grupo 4000 del PGC', 'La factura número 12 de un proveedor'],
      explicacion: 'Los tres primeros dígitos son la cuenta del PGC (400) y el resto identifica a cada proveedor. Así se puede ver qué se debe a cada uno sin perder la cuenta general.',
    },
    {
      id: 'b0-q37',
      pregunta: 'Recibes la factura del taller que ha reparado la máquina del almacén. ¿En qué cuenta registras la deuda con el taller?',
      correcta: '410 Acreedores por prestaciones de servicios',
      incorrectas: ['400 Proveedores', '523 Proveedores de inmovilizado a corto plazo'],
      explicacion: 'La 400 es para quien te vende mercaderías u otros aprovisionamientos. Quien te presta un servicio (taller, gestoría, limpieza) es un acreedor: 410. El gasto de la reparación va a la 622.',
    },
    {
      id: 'b0-q38',
      pregunta: 'Una tienda de informática te vende un ordenador para la oficina y te lo cobrará en 30 días. ¿En qué cuenta registras la deuda?',
      correcta: '523 Proveedores de inmovilizado a corto plazo',
      incorrectas: ['400 Proveedores', '410 Acreedores por prestaciones de servicios'],
      explicacion: 'El ordenador es inmovilizado (217), así que la deuda con quien lo vende va a la 523 si vence en menos de un año, o a la 173 si vence a más plazo. La 400 se reserva para mercaderías y aprovisionamientos.',
    },
    {
      id: 'b0-q39',
      pregunta: 'Contabilizas una factura de compra de mercaderías para revender. ¿Qué cuenta de gasto usas?',
      correcta: '600 Compras de mercaderías',
      incorrectas: ['300 Mercaderías', '700 Ventas de mercaderías'],
      explicacion: 'Las compras del día a día van a la 600 (gasto). La 300 solo se ajusta al cierre con el inventario final, y la 700 es para las ventas.',
    },
    {
      id: 'b0-q40',
      pregunta: 'Emites una factura por un servicio de consultoría. ¿En qué cuenta registras el ingreso?',
      correcta: '705 Prestaciones de servicios',
      incorrectas: ['700 Ventas de mercaderías', '430 Clientes'],
      explicacion: 'Los servicios facturados van a la 705; la 700 es para la venta de productos. La 430 es la contrapartida: el derecho de cobro sobre el cliente, no el ingreso.',
    },
  ],

  // Circuito de casos: se recomienda hacerlos en orden (cada uno se apoya en el anterior).
  casos: [
    {
      id: 'b0-capital',
      tipo: 'asiento',
      titulo: 'Aportación de capital social',
      enunciado: 'Se constituye <strong>Distribuciones Levante, S.L.</strong> Los dos socios ingresan <strong>3.000 € cada uno</strong> en la cuenta de la empresa en el banco. El capital social total es de 6.000 €. Registra el asiento.',
      cuentasDisponibles: ['572', '570', '100', '551', '129', '400'],
      solucion: [{ cuenta: '572', debe: 6000 }, { cuenta: '100', haber: 6000 }],
      pista: 'Piensa qué aumenta en la empresa (¿dónde está ahora el dinero?) y de dónde procede.',
      explicacion: 'El banco (activo) aumenta: se carga la 572 por 6.000 €. El capital social (patrimonio neto) aumenta: se abona la 100 por 6.000 €. Puedes registrarlo en dos líneas de 3.000 € por socio o en una sola: el resultado es el mismo.',
    },
    {
      id: 'b0-banco-caja',
      tipo: 'asiento',
      titulo: 'Traspaso del banco a la caja',
      enunciado: 'Sacas <strong>300 €</strong> del cajero con la tarjeta de la empresa para el fondo de caja de la oficina (mensajería, pequeños gastos…). Registra el asiento.',
      cuentasDisponibles: ['570', '572', '629', '626', '551', '100'],
      solucion: [{ cuenta: '570', debe: 300 }, { cuenta: '572', haber: 300 }],
      pista: 'No se ha gastado nada todavía: el dinero solo cambia de sitio.',
      explicacion: 'La caja (570, activo) aumenta y se carga; el banco (572, activo) disminuye y se abona. No es un gasto (629) ni una comisión (626): el gasto se registrará cuando pagues algo con ese efectivo y tengas el ticket o la factura.',
    },
    {
      id: 'b0-compra-equipos',
      tipo: 'asiento',
      titulo: 'Compra de equipos informáticos a crédito',
      enunciado: 'Compras <strong>dos ordenadores y una impresora</strong> a Informática Mediterráneo, S.L. por <strong>2.400 €</strong> (sin IVA, de momento). Te los cobrará <strong>a 60 días</strong>. Registra el asiento de la compra.',
      cuentasDisponibles: ['217', '600', '523', '400', '173', '572'],
      solucion: [{ cuenta: '217', debe: 2400 }, { cuenta: '523', haber: 2400 }],
      pista: '¿Es algo que se consume o que usarás varios años? ¿Y la deuda es con un proveedor de mercaderías o de un bien de inmovilizado?',
      explicacion: 'Los equipos se usarán varios años: son inmovilizado (217, activo no corriente) y se cargan. La deuda con quien vende inmovilizado va a la 523 Proveedores de inmovilizado a corto plazo, porque vence en menos de un año. No es la 400 (mercaderías) ni la 173 (más de un año), ni la 600, porque no es una compra para revender.',
    },
    {
      id: 'b0-pago-equipos',
      tipo: 'asiento',
      titulo: 'Pago de la deuda de los equipos',
      enunciado: 'Pasados los 60 días, pagas por <strong>transferencia</strong> los <strong>2.400 €</strong> que debías a Informática Mediterráneo, S.L. por los equipos del caso anterior. Registra el asiento del pago.',
      cuentasDisponibles: ['523', '572', '217', '400', '570', '626'],
      solucion: [{ cuenta: '523', debe: 2400 }, { cuenta: '572', haber: 2400 }],
      pista: 'Los ordenadores se quedan en la empresa. ¿Qué desaparece al pagar y de dónde sale el dinero?',
      explicacion: 'La deuda con el proveedor de inmovilizado se cancela: un pasivo disminuye por el Debe (523). Sale dinero del banco: un activo disminuye por el Haber (572). La 217 no se toca, porque los equipos siguen siendo de la empresa.',
    },
    {
      id: 'b0-prestamo-lp',
      tipo: 'asiento',
      titulo: 'Préstamo bancario a largo plazo',
      enunciado: 'El banco aprueba un préstamo de <strong>20.000 €</strong> para la empresa, a devolver en <strong>5 años</strong>, y te ingresa el importe en la cuenta corriente. Registra el asiento de la recepción (sin intereses ni comisiones).',
      cuentasDisponibles: ['572', '170', '520', '100', '769', '551'],
      solucion: [{ cuenta: '572', debe: 20000 }, { cuenta: '170', haber: 20000 }],
      pista: 'Entra dinero en el banco. ¿La deuda vence antes o después de un año? ¿Es un ingreso?',
      explicacion: 'El banco (activo) aumenta: se carga la 572. Nace una deuda con el banco a más de un año: se abona la 170 Deudas a largo plazo con entidades de crédito (pasivo no corriente). No es un ingreso (769) ni capital (100). Al cierre, la parte que venza en los 12 meses siguientes se reclasificará a la 520.',
    },
    {
      id: 'b0-masas',
      tipo: 'clasificar',
      titulo: 'Clasifica las cuentas en su masa patrimonial',
      enunciado: 'Preparas el balance de un cliente nuevo. Toca la <strong>masa patrimonial</strong> a la que pertenece cada una de estas 8 cuentas (grupos 1 a 5).',
      rejilla: 'grid-cols-2 sm:grid-cols-5',
      opciones: [
        { valor: 'anc', etiqueta: 'Activo no corriente', tono: 'activo' },
        { valor: 'ac', etiqueta: 'Activo corriente', tono: 'activo' },
        { valor: 'pn', etiqueta: 'Patrimonio neto', tono: 'pn', ancho: true },
        { valor: 'pnc', etiqueta: 'Pasivo no corriente', tono: 'pasivo' },
        { valor: 'pc', etiqueta: 'Pasivo corriente', tono: 'pasivo' },
      ],
      cuentas: [
        { codigo: '430', correcta: 'ac', pista: 'Es dinero que te pagarán tus clientes en pocas semanas.', explicacion: 'Derecho de cobro a corto plazo.' },
        { codigo: '217', correcta: 'anc', pista: 'Ordenadores que la empresa usará durante varios años.', explicacion: 'Inmovilizado material.' },
        { codigo: '400', correcta: 'pc', pista: 'Es lo que debes a quien te vende la mercancía, normalmente a 30–90 días.', explicacion: 'Deuda comercial a corto plazo.' },
        { codigo: '100', correcta: 'pn', pista: 'Lo aportaron los socios y no es una deuda que haya que devolver en una fecha.', explicacion: 'Financiación propia aportada por los socios.' },
        { codigo: '4751', correcta: 'pc', pista: 'Son retenciones de IRPF que has descontado y debes ingresar a Hacienda este trimestre.', explicacion: 'Deuda con Hacienda a corto plazo.' },
        { codigo: '170', correcta: 'pnc', pista: 'Préstamo del banco que vence dentro de varios años.', explicacion: 'Deuda que vence a más de un año.' },
        { codigo: '472', correcta: 'ac', pista: 'Es el IVA de tus compras, que compensarás en la próxima liquidación.', explicacion: 'Crédito con Hacienda a corto plazo.' },
        { codigo: '572', correcta: 'ac', pista: 'Es el dinero disponible en la cuenta corriente.', explicacion: 'Tesorería disponible.' },
      ],
      resumenOk: 'Ya sabes colocar cada cuenta en el balance: es justo lo que necesitarás para leer un balance en el Bloque 5.',
    },
    {
      id: 'b0-saldos',
      tipo: 'clasificar',
      titulo: 'Identifica el saldo habitual',
      enunciado: 'Repasas el balance de sumas y saldos. Toca si el <strong>saldo habitual</strong> de cada cuenta es <strong>deudor</strong> (Debe mayor que Haber) o <strong>acreedor</strong> (Haber mayor que Debe).',
      rejilla: 'grid-cols-2',
      opciones: [
        { valor: 'deudor', etiqueta: 'Deudor' },
        { valor: 'acreedor', etiqueta: 'Acreedor' },
      ],
      cuentas: [
        { codigo: '400', correcta: 'acreedor', pista: 'Es lo que debes al proveedor: un pasivo.', explicacion: 'Pasivo: se abona al recibir la factura y se carga al pagarla.' },
        { codigo: '572', correcta: 'deudor', pista: 'Es el dinero que tiene la empresa: un activo.', explicacion: 'Activo. Si la ves con saldo acreedor, hay un descubierto o un error: revísalo con el extracto.' },
        { codigo: '705', correcta: 'acreedor', pista: 'Es un ingreso del grupo 7.', explicacion: 'Ingreso: se abona al emitir cada factura.' },
        { codigo: '430', correcta: 'deudor', pista: 'Es lo que te deben los clientes: un activo.', explicacion: 'Activo: se carga al facturar y se abona al cobrar.' },
        { codigo: '4751', correcta: 'acreedor', pista: 'Es una deuda con Hacienda.', explicacion: 'Pasivo: se abona al practicar la retención y se carga al ingresarla (modelo 111 o 115).' },
        { codigo: '621', correcta: 'deudor', pista: 'Es un gasto del grupo 6.', explicacion: 'Gasto: se carga por el importe de cada recibo de alquiler.' },
      ],
      resumenOk: 'Conocer el saldo habitual te permite detectar errores de un vistazo: un proveedor con saldo deudor o un banco con saldo acreedor siempre merecen una revisión.',
    },
  ],
};

/* ---------- Bloque 1: Compras y Acreedores (gestoría) ---------- */

// Documento de ejemplo para la «anatomía de una factura»
const FACTURA_EJEMPLO_B1 = {
  tipo: 'factura',
  color: '#0d8a6c',
  emisor: { nombre: 'Papelería Técnica Levante, S.L.', nif: 'B98123456', direccion: ['C/ Colón, 24 · 46004 Valencia'] },
  receptor: { nombre: 'Moda Valentina, S.L.', nif: 'B98765432', direccion: ['Av. del Puerto, 112 · 46023 Valencia'] },
  numero: 'A-2026/0587',
  fecha: '14/10/2026',
  vencimiento: '13/11/2026',
  formaPago: 'Transferencia a 30 días',
  lineas: [
    { concepto: 'Papel A4 80 g (caja de 5 paquetes)', cantidad: 4, precio: 18, iva: 21 },
    { concepto: 'Tóner para impresora láser', cantidad: 1, precio: 58, iva: 21 },
  ],
};

const CONTENIDO_B1 = {
  teoria: [
    {
      id: 'circuito',
      titulo: 'El viaje de una factura en la gestoría',
      resumen: 'Del correo del cliente a las declaraciones.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>En una gestoría no registras «una factura»: registras cientos al trimestre, de clientes muy distintos. Lo que te da seguridad es seguir <strong>siempre el mismo circuito</strong>, sea una factura de 30 € o de 30.000 €.</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Recibir y ordenar', texto: 'Llegan por correo, por el portal del cliente o en papel. Ordénalas por cliente y trimestre nada más recibirlas.' },
            { titulo: 'Validar', texto: '¿Va a nombre del cliente? ¿Cumple los requisitos? ¿Es una factura y no un albarán o una proforma? ¿Ya está registrada? Si algo falla, se pide al proveedor <em>antes</em> de contabilizar.' },
            { titulo: 'Clasificar', texto: '¿Gasto o inversión? ¿Proveedor, acreedor o proveedor de inmovilizado? ¿Lleva IVA deducible, retención o suplidos?' },
            { titulo: 'Registrar', texto: 'Asiento y libro registro de facturas recibidas. De aquí salen las cifras del 303, 111, 115, 349 y 347 del cliente.' },
            { titulo: 'Pagar y archivar', texto: 'El pago se puntea con el banco (Bloque 3). La factura se conserva al menos 6 años.' },
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Antes de tocar las facturas de un cliente nuevo, mira su ficha: <strong>actividad</strong> (¿tiene derecho a deducir el IVA o es una actividad exenta, como una clínica?), <strong>forma jurídica</strong> y cómo tiene montadas sus <strong>subcuentas</strong> (muchos usan 62900001 Material de oficina, 62900002 Limpieza…). Te ahorrará rehacer trimestres.',
        },
      ],
    },
    {
      id: 'validar',
      titulo: 'Validar: factura completa, ticket y errores típicos',
      resumen: 'Qué revisar antes de contabilizar nada.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Una factura defectuosa puede costarle al cliente el IVA deducido y el gasto en una inspección. Toca cada requisito para ver dónde está en la factura y qué tienes que comprobar.</p>',
        },
        {
          tipo: 'anatomia-factura',
          documento: FACTURA_EJEMPLO_B1,
          requisitos: [
            { campo: 'numero', titulo: 'Número y serie', texto: 'Correlativo dentro de cada serie. Te sirve para detectar duplicados: el mismo proveedor y el mismo número no se registran dos veces.' },
            { campo: 'fecha', titulo: 'Fecha de expedición', texto: 'Determina en qué trimestre se registra. Si la operación se hizo en otra fecha, la factura debe indicarlo.' },
            { campo: 'emisor', titulo: 'Datos del emisor', texto: 'Nombre o razón social, NIF y domicilio del proveedor. Con el NIF localizas o das de alta su subcuenta.' },
            { campo: 'receptor', titulo: 'Datos del cliente', texto: 'Nombre, NIF y domicilio de tu cliente. Es el error más frecuente: facturas a nombre del socio, de otra empresa del grupo o con el NIF mal escrito. Sin esto no se deduce el IVA.' },
            { campo: 'descripcion', titulo: 'Descripción', texto: 'Qué se compra y cuánto. Es lo que te dice la cuenta: mercaderías (600), un servicio (62x) o un bien de inversión (21x).' },
            { campo: 'base', titulo: 'Base imponible', texto: 'El importe sin impuestos. Es lo que va a la cuenta de gasto o de inmovilizado, y sobre lo que se calculan IVA y retención.' },
            { campo: 'iva', titulo: 'Tipo y cuota de IVA', texto: 'El tipo aplicado (21, 10 o 4 %) y la cuota en euros, por separado. Si hay varios tipos, deben aparecer desglosados.' },
            { campo: 'total', titulo: 'Total', texto: 'No es un requisito en sí, pero compruébalo: base + IVA − retención + suplidos debe dar el total. Si no cuadra, algo está mal.' },
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Factura completa y factura simplificada (ticket)',
          columnas: ['', 'Factura completa', 'Factura simplificada'],
          filas: [
            ['Datos del cliente', 'Siempre: nombre, NIF y domicilio', 'Normalmente no aparecen'],
            ['Importe máximo', 'Sin límite', '400 € IVA incluido (3.000 € en comercio minorista, hostelería y otros sectores)'],
            ['IVA', 'Base, tipo y cuota separados', 'Puede indicar solo «IVA incluido»'],
            ['¿Permite deducir el IVA?', 'Sí, si cumple los requisitos', 'Solo si incluye NIF y domicilio de la empresa y la cuota desglosada'],
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>Ticket que no permite deducir:</strong> todo el importe, IVA incluido, va a la cuenta de gasto. Si el cliente tiene muchos tickets de un mismo proveedor (gasolinera, ferretería), dile que pida la factura con su NIF: recuperará ese IVA.',
        },
        {
          tipo: 'gestoria',
          html: '<strong>No son facturas</strong> y no se contabilizan: el albarán (justifica la entrega), la factura proforma (es un presupuesto) ni el resguardo de pago con tarjeta. Pide siempre la factura.',
        },
      ],
    },
    {
      id: 'cuentas',
      titulo: '¿Qué cuenta uso?',
      resumen: '400, 410, 523 y las cuentas de gasto de cada día.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Cada factura recibida tiene dos decisiones: <strong>a quién se le debe</strong> (cuenta del grupo 4 o 5) y <strong>qué se ha comprado</strong> (cuenta del grupo 6 o 2).</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'A quién se le debe',
          columnas: ['Cuenta', 'Cuándo se usa'],
          filas: [
            ['400 Proveedores', 'Quien vende lo que el cliente revende o consume en su actividad: mercaderías, materias primas, envases.'],
            ['410 Acreedores por prestaciones de servicios', 'Quien presta un servicio: gestoría, abogado, alquiler, limpieza, luz, teléfono, publicidad, reparaciones.'],
            ['523 Proveedores de inmovilizado a corto plazo', 'Quien vende un bien de inversión (ordenador, maquinaria, mobiliario, vehículo) y cobra en menos de un año.'],
            ['173 Proveedores de inmovilizado a largo plazo', 'Lo mismo, con pago a más de un año.'],
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Las cuentas de gasto que más vas a usar',
          columnas: ['Cuenta', 'Ejemplos'],
          filas: [
            ['600 Compras de mercaderías', 'Ropa para una tienda, recambios que instala un taller, comida y bebida de un bar'],
            ['602 Otros aprovisionamientos', 'Envases, embalajes, material de consumo para la actividad'],
            ['621 Arrendamientos y cánones', 'Alquiler del local, renting de vehículos o fotocopiadora'],
            ['622 Reparaciones y conservación', 'Fontanero, mantenimiento del aire acondicionado, pequeño material de reparación'],
            ['623 Servicios de profesionales independientes', 'Gestoría, abogado, notario, arquitecto, diseñador'],
            ['624 Transportes', 'Mensajería y portes de ventas (los de compras suman al coste de la compra)'],
            ['625 Primas de seguros', 'Seguro del local, de responsabilidad civil, del vehículo'],
            ['626 Servicios bancarios y similares', 'Comisiones de mantenimiento, de transferencias, del TPV'],
            ['627 Publicidad, propaganda y relaciones públicas', 'Anuncios en redes sociales, buscadores, folletos, atenciones a clientes'],
            ['628 Suministros', 'Luz, agua, gas'],
            ['629 Otros servicios', 'Teléfono e internet, material de oficina, limpieza, viajes'],
            ['631 Otros tributos', 'IBI, impuesto de vehículos, tasas municipales'],
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>¿Gasto o inversión?</strong> Si el bien se va a usar <strong>más de un año</strong> (un ordenador, una máquina, una mesa), es inmovilizado aunque sea barato: 213 Maquinaria, 216 Mobiliario, 217 Equipos informáticos. Su coste incluye el <strong>transporte y la instalación</strong> hasta que funciona.',
        },
      ],
    },
    {
      id: 'iva',
      titulo: 'IVA soportado: tipos, exentas y no deducible',
      resumen: 'No todo el IVA que paga el cliente va a la 472.',
      piezas: [
        {
          tipo: 'tabla',
          titulo: 'Tipos de IVA que verás en las facturas',
          columnas: ['Tipo', 'Ejemplos habituales'],
          filas: [
            ['21 % · general', 'La mayoría: ropa, electrónica, servicios profesionales, alquiler de locales, publicidad, reparaciones'],
            ['10 % · reducido', 'Hostelería, carne y pescado, transporte de viajeros, obras de renovación de vivienda'],
            ['4 % · superreducido', 'Pan, leche, huevos, frutas, verduras, tubérculos, libros, medicamentos'],
            ['Exento · sin IVA', 'Seguros, la mayoría de servicios bancarios, sanidad, enseñanza en centros autorizados, alquiler de vivienda'],
          ],
        },
        {
          tipo: 'html',
          html: '<p>Si una factura tiene <strong>varios tipos</strong>, aparece una base y una cuota por cada tipo. En el asiento basta <strong>una sola 472</strong> con la suma de las cuotas; el desglose por tipos lo recoge el libro registro de IVA.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Cuándo el IVA NO se puede deducir',
          columnas: ['Situación', 'Qué pasa con el IVA'],
          filas: [
            ['Atenciones a clientes (comidas, regalos)', 'No deducible aunque la factura esté perfecta'],
            ['Turismo de uso mixto (empresa y privado)', 'Se presume un 50 % de uso empresarial: se deduce el 50 %'],
            ['Cliente con actividad exenta (clínica, correduría de seguros, colegio)', 'No deduce; si combina actividades exentas y no exentas, aplica la prorrata'],
            ['Factura sin requisitos o a nombre de otro', 'No deducible hasta que se corrija'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Comida con un cliente por 110 € (100 + 10 % de IVA), pagada con tarjeta',
          subtitulo: 'Atenciones a clientes: el IVA no se deduce y se suma al gasto.',
          lineas: [{ cuenta: '627', debe: 110 }, { cuenta: '572', haber: 110 }],
          nota: 'No hay línea de 472: los 10 € de IVA son más gasto. Regla general: el IVA no deducible se suma al gasto o al valor del bien.',
        },
        {
          tipo: 'gestoria',
          html: 'Antes de registrar el IVA de un cliente nuevo, pregunta: <strong>¿su actividad está exenta?</strong> Una clínica dental que registra el IVA de sus compras en la 472 tendrá todos sus 303 mal desde el primer trimestre.',
        },
      ],
    },
    {
      id: 'retenciones',
      titulo: 'Retenciones de IRPF: profesionales y alquileres',
      resumen: 'Cuándo se retiene, cuánto y adónde va.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Cuando tu cliente paga a un profesional persona física o el alquiler de un local, <strong>no le paga todo</strong>: se queda una parte (la retención) y la ingresa a Hacienda en nombre del proveedor. Mientras no la ingresa, es una deuda con Hacienda: la cuenta <strong>4751</strong>.</p>',
        },
        { tipo: 'calculadora' },
        {
          tipo: 'tabla',
          titulo: '¿Lleva retención?',
          columnas: ['Proveedor', 'Retención'],
          filas: [
            ['Profesional persona física (abogado, gestor, arquitecto, diseñador)', '15 % sobre la base · modelo 111'],
            ['Profesional en su año de inicio y los dos siguientes', '7 %, si lo comunica por escrito'],
            ['Alquiler de un local (arrendador empresa o particular)', '19 % sobre la base · modelo 115'],
            ['Sociedad (S.L., S.A., S.L.P.) que presta servicios', 'Sin retención'],
            ['Proveedor de mercaderías o suministros', 'Sin retención'],
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>La retención se calcula sobre la base</strong>, nunca sobre el total con IVA. Y no reduce el gasto: el gasto es la base completa; la retención solo cambia <em>a quién</em> se paga una parte.',
        },
      ],
    },
    {
      id: 'especiales',
      titulo: 'Suplidos, rectificativas, descuentos y anticipos',
      resumen: 'Las facturas que no son «base + IVA».',
      piezas: [
        {
          tipo: 'html',
          html: '<p><strong>Suplidos.</strong> Son gastos que el proveedor paga <em>en nombre</em> de tu cliente y luego le repercute tal cual: tasas, aranceles registrales… <strong>No llevan IVA ni retención</strong> y no forman parte de la base imponible. Se registran en su propia cuenta de gasto, como si el cliente los hubiera pagado directamente.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Gestor: 100 € de honorarios + IVA − 15 % de retención + 30 € de tasa (suplido)',
          subtitulo: 'Total de la factura: 100 + 21 − 15 + 30 = 136 €',
          lineas: [
            { cuenta: '623', debe: 100 },
            { cuenta: '631', debe: 30 },
            { cuenta: '472', debe: 21 },
            { cuenta: '4751', haber: 15 },
            { cuenta: '410', haber: 136 },
          ],
          nota: 'IVA y retención solo sobre los honorarios. La tasa va a la 631 Otros tributos, sin IVA.',
        },
        {
          tipo: 'html',
          html: '<p><strong>Facturas rectificativas.</strong> Corrigen una factura anterior: devoluciones, errores de precio, descuentos posteriores. Indican qué factura rectifican y suelen llevar importes negativos. En el asiento se registran con <strong>importes positivos en el lado contrario</strong> al de la factura original.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Descuentos y devoluciones',
          columnas: ['Situación', 'Cómo se registra'],
          filas: [
            ['Descuento dentro de la propia factura', 'No se contabiliza aparte: la compra va por el importe neto'],
            ['Devolución de mercancía', '608 Devoluciones de compras (con factura rectificativa)'],
            ['Rappel por volumen de compras', '609 Rappels por compras'],
            ['Descuento por pronto pago posterior', '606 Descuentos sobre compras por pronto pago'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Anticipo de 1.000 € + IVA a un proveedor, por transferencia',
          subtitulo: 'El anticipo también devenga IVA: el proveedor emite factura del anticipo.',
          lineas: [{ cuenta: '407', debe: 1000 }, { cuenta: '472', debe: 210 }, { cuenta: '572', haber: 1210 }],
          nota: 'Cuando llegue la factura final, se cancela la 407 y solo se registra el IVA de la parte pendiente.',
        },
      ],
    },
    {
      id: 'isp',
      titulo: 'El gran reto: la inversión del sujeto pasivo',
      resumen: 'Facturas sin IVA de Google, Meta, Microsoft…',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Casi todos tus clientes pagan servicios a empresas de otros países de la UE: anuncios en buscadores y redes sociales, licencias de software, plataformas de diseño. Muchas de esas empresas facturan desde Irlanda <strong>sin IVA</strong> y con la mención <em>«reverse charge»</em>. Eso no significa que no haya IVA: <strong>lo declara tu cliente en lugar del proveedor</strong>. Es la inversión del sujeto pasivo (ISP).</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Detectar', texto: 'Proveedor de otro país de la UE, factura sin IVA y mención «reverse charge» o «inversión del sujeto pasivo».' },
            { titulo: 'Comprobar el NIF-IVA', texto: 'El cliente debe estar dado de alta en el Registro de Operadores Intracomunitarios (ROI) y su NIF con prefijo ES debe aparecer en la factura. Se verifica en el VIES.' },
            { titulo: 'Registrar el gasto', texto: 'La cuenta de gasto por la base, y la deuda con el proveedor (410) por lo que de verdad se le paga: la base.' },
            { titulo: 'Autorrepercutir el IVA', texto: '472 al Debe y 477 al Haber por el 21 % de la base. El asiento cuadra y, si el cliente deduce todo su IVA, el coste es cero.' },
            { titulo: 'Declarar', texto: 'En el 303 aparece dos veces, como IVA devengado (casillas 10 y 11) y deducible (casillas 36 y 37), y en el modelo 349 con la clave I.' },
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Anuncios en una red social por 500 €, factura desde Irlanda sin IVA',
          subtitulo: 'Cliente con derecho a deducir todo el IVA.',
          lineas: [
            { cuenta: '627', debe: 500 },
            { cuenta: '472', debe: 105 },
            { cuenta: '477', haber: 105 },
            { cuenta: '410', haber: 500 },
          ],
          nota: 'Al proveedor se le deben 500 €. El IVA (105 €) se repercute y se soporta a la vez: no se paga a nadie.',
        },
        {
          tipo: 'tabla',
          titulo: 'Otros casos de inversión del sujeto pasivo',
          columnas: ['Situación', 'Qué hacer'],
          filas: [
            ['Servicio de una empresa de fuera de la UE (EE. UU., Reino Unido…)', 'También se autorrepercute (472/477), pero no va al 349'],
            ['Ciertas obras de construcción o rehabilitación subcontratadas entre empresarios', 'El subcontratista factura sin IVA y el cliente lo autorrepercute'],
            ['Proveedor de la UE que cobra IVA de su país', 'Ese IVA no se deduce en el 303: revisa el alta del cliente en el ROI'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Revisa los <strong>cargos de tarjeta</strong> de cada cliente: anuncios, software y suscripciones suelen cobrarse por tarjeta y la factura no llega sola. Pídele que la descargue del panel de facturación de cada plataforma. Es de lo primero que mira una revisión de IVA.',
        },
      ],
    },
    {
      id: 'factura-electronica',
      titulo: 'Lo que viene: factura electrónica y VeriFactu',
      resumen: 'Cambios que afectarán a tus clientes.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>La facturación en papel o PDF tiene fecha de caducidad entre empresas. Para quien lleva compras, el cambio clave es que <strong>el cliente tendrá que comunicar el estado de cada factura recibida</strong>: si la acepta o la rechaza y la fecha en que la paga. Así Hacienda verá si se respeta el plazo legal de pago (máximo 60 días).</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Marzo 2026 · aprobada', texto: 'El Real Decreto 238/2026 (BOE de 31/03/2026) regula la factura electrónica obligatoria entre empresarios y profesionales.' },
            { titulo: 'Octubre 2027 · previsto', texto: 'Empresas con más de 8 millones de euros de volumen de operaciones (12 meses desde la orden técnica).' },
            { titulo: 'Octubre 2028 · previsto', texto: 'Resto de empresas y autónomos (24 meses desde la orden técnica).' },
          ],
        },
        {
          tipo: 'html',
          html: '<p><strong>VeriFactu</strong> es otra cosa: afecta al <strong>software con el que se emiten</strong> las facturas, que debe garantizar que no se alteran y poder enviarlas a Hacienda. Las fechas legales vigentes son el 1/1/2027 para sociedades y el 1/7/2027 para el resto, pero Hacienda anunció en octubre de 2026 su intención de aplazarlo a octubre de 2028, pendiente de publicarse en el BOE.</p>',
        },
        {
          tipo: 'consejo',
          html: '<strong>Datos a octubre de 2026.</strong> Son normas en movimiento: antes de asesorar a un cliente sobre fechas, comprueba en la web de la AEAT si han cambiado.',
        },
      ],
    },
  ],

  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  test: [
    /* --- Validación de facturas --- */
    {
      id: 'b1-q01',
      pregunta: 'Un cliente te entrega un ticket de 48 € de una ferretería, sin su NIF y con el IVA solo como «IVA incluido». ¿Puede deducirse ese IVA?',
      correcta: 'No: le faltan el NIF del cliente y la cuota desglosada',
      incorrectas: ['Sí, porque el ticket demuestra que se pagó', 'Sí, porque el importe es inferior a 400 €'],
      explicacion: 'Una factura simplificada solo permite deducir si incluye el NIF y el domicilio del destinatario y la cuota de IVA por separado. Sin eso, todo el importe va al gasto.',
    },
    {
      id: 'b1-q02',
      pregunta: '¿Cuál de estos datos es obligatorio en una factura completa?',
      correcta: 'El NIF del emisor y el del destinatario',
      incorrectas: ['El número de cuenta bancaria del emisor', 'La fecha de vencimiento del pago'],
      explicacion: 'Son obligatorios, entre otros, número y serie, fecha, nombre, NIF y domicilio de emisor y destinatario, descripción, base, tipo y cuota. La cuenta bancaria y el vencimiento son habituales, pero no obligatorios.',
    },
    {
      id: 'b1-q03',
      pregunta: 'En general, ¿hasta qué importe puede emitirse una factura simplificada?',
      correcta: '400 € IVA incluido (3.000 € en sectores como hostelería o comercio minorista)',
      incorrectas: ['1.000 € sin IVA en todos los casos', 'No hay límite si el cliente lo acepta'],
      explicacion: 'El límite general es de 400 € IVA incluido. En ciertos sectores (comercio minorista, hostelería, transporte de personas, entre otros) llega a 3.000 €. Por encima, hay que emitir factura completa.',
    },
    {
      id: 'b1-q04',
      pregunta: 'La factura de un portátil llega a nombre del socio, persona física, y no de la sociedad cliente. ¿Qué haces?',
      correcta: 'Pedir al proveedor una factura rectificativa a nombre de la sociedad',
      incorrectas: ['Registrarla en la sociedad: el gasto es real', 'Deducir solo el 50 % del IVA'],
      explicacion: 'El derecho a deducir el IVA corresponde al destinatario de la factura. Si no va a nombre de la sociedad, esta no puede deducirlo y el gasto puede ser cuestionado. La solución es una rectificativa con los datos correctos.',
    },
    {
      id: 'b1-q05',
      pregunta: 'Un cliente te reenvía una factura que ya tenías: mismo proveedor, mismo número y misma fecha. ¿Qué haces?',
      correcta: 'Comprobar que ya está registrada y no volver a contabilizarla',
      incorrectas: ['Registrarla de nuevo: cada documento recibido se contabiliza', 'Registrarla solo si el importe es distinto'],
      explicacion: 'Registrar dos veces una factura duplica el gasto, el IVA deducido y la deuda con el proveedor. La combinación proveedor + número de factura es la que identifica cada documento.',
    },
    {
      id: 'b1-q06',
      pregunta: 'Aparece en enero una factura de compra de marzo del año pasado que el cliente olvidó entregar. ¿Puede deducir su IVA?',
      correcta: 'Sí, en el periodo en que se registra, dentro del plazo de 4 años',
      incorrectas: ['No: solo podía deducirse en el trimestre de su fecha', 'Solo si se presenta una complementaria del trimestre de marzo'],
      explicacion: 'El IVA soportado puede deducirse en la declaración del periodo en que se recibe la factura o en las siguientes, mientras no pasen 4 años desde el devengo.',
    },
    {
      id: 'b1-q07',
      pregunta: 'El proveedor manda un albarán y una factura proforma, pero aún no la factura. ¿Qué contabilizas?',
      correcta: 'Nada todavía: ni el albarán ni la proforma son facturas',
      incorrectas: ['La proforma, que tiene los mismos importes', 'El albarán, porque demuestra la entrega'],
      explicacion: 'El albarán justifica la entrega y la proforma es un presupuesto. Ninguno da derecho a deducir el IVA. Se espera a la factura (o se reclama).',
    },

    /* --- Cuentas --- */
    {
      id: 'b1-q08',
      pregunta: 'Una tienda de ropa compra camisetas a su fabricante para revenderlas. ¿Qué cuentas usas?',
      correcta: '600 Compras de mercaderías y 400 Proveedores',
      incorrectas: ['602 Otros aprovisionamientos y 410 Acreedores', '300 Mercaderías y 400 Proveedores'],
      explicacion: 'Lo que se compra para revender son mercaderías (600) y quien las vende es un proveedor (400). La 300 solo se ajusta al cierre con el inventario.',
    },
    {
      id: 'b1-q09',
      pregunta: 'Un taller recibe la factura mensual de la empresa que limpia el local. ¿En qué cuenta registras la deuda?',
      correcta: '410 Acreedores por prestaciones de servicios',
      incorrectas: ['400 Proveedores', '523 Proveedores de inmovilizado a corto plazo'],
      explicacion: 'Quien presta un servicio es un acreedor (410). La 400 se reserva para quien vende mercaderías o aprovisionamientos, y la 523 para bienes de inversión.',
    },
    {
      id: 'b1-q10',
      pregunta: 'Una panadería compra un horno industrial que pagará en 6 meses. ¿Qué cuentas usas (sin contar el IVA)?',
      correcta: '213 Maquinaria al Debe y 523 al Haber',
      incorrectas: ['600 Compras al Debe y 400 Proveedores al Haber', '213 Maquinaria al Debe y 173 al Haber'],
      explicacion: 'El horno se usará varios años: es inmovilizado (213). La deuda vence en menos de un año, así que va a la 523. La 173 sería para pagos a más de un año.',
    },
    {
      id: 'b1-q11',
      pregunta: 'Un cliente compra un ordenador de 700 € para la oficina. ¿Gasto o inmovilizado?',
      correcta: 'Inmovilizado (217), porque se usará varios años',
      incorrectas: ['Gasto (629), porque cuesta menos de 1.000 €', 'Existencias (300)'],
      explicacion: 'El criterio es la duración del uso, no el precio: si se usará más de un año, es inmovilizado y se amortiza. Solo los elementos de muy poco valor se suelen llevar a gasto por importancia relativa.',
    },
    {
      id: 'b1-q12',
      pregunta: 'La factura del técnico que ha reparado la caldera del local. ¿Qué cuenta de gasto usas?',
      correcta: '622 Reparaciones y conservación',
      incorrectas: ['628 Suministros', '213 Maquinaria'],
      explicacion: 'Las reparaciones y el mantenimiento que conservan el bien en funcionamiento van a la 622. Solo si la intervención aumentara su capacidad o vida útil se sumaría al inmovilizado.',
    },
    {
      id: 'b1-q13',
      pregunta: 'Llega el recibo de la prima anual del seguro del local. ¿Cómo lo registras?',
      correcta: '625 Primas de seguros, sin IVA porque es una operación exenta',
      incorrectas: ['625 Primas de seguros con un 21 % de IVA en la 472', '621 Arrendamientos y cánones'],
      explicacion: 'Los seguros están exentos de IVA: no hay línea de 472. Si el recibo incluye el impuesto sobre primas de seguros, forma parte del gasto.',
    },
    {
      id: 'b1-q14',
      pregunta: 'Una factura por anuncios patrocinados en una red social. ¿Qué cuenta de gasto usas?',
      correcta: '627 Publicidad, propaganda y relaciones públicas',
      incorrectas: ['623 Servicios de profesionales independientes', '602 Otros aprovisionamientos'],
      explicacion: 'La publicidad en cualquier medio, también en internet, va a la 627. Si el proveedor es de otro país de la UE, recuerda además la inversión del sujeto pasivo.',
    },
    {
      id: 'b1-q15',
      pregunta: 'Un cliente adelanta 1.000 € + IVA a un proveedor antes de recibir la mercancía. ¿Qué cuenta recoge el anticipo?',
      correcta: '407 Anticipos a proveedores',
      incorrectas: ['600 Compras de mercaderías', '400 Proveedores al Haber'],
      explicacion: 'El anticipo es un derecho frente al proveedor (407, al Debe). Devenga IVA, así que también se registra la 472. Al llegar la factura final se cancela la 407.',
    },
    {
      id: 'b1-q16',
      pregunta: 'Un proveedor concede a final de año un rappel por volumen de compras, en factura aparte. ¿Qué cuenta usas?',
      correcta: '609 Rappels por compras',
      incorrectas: ['608 Devoluciones de compras', '759 Ingresos por servicios diversos'],
      explicacion: 'Los descuentos por volumen de compras van a la 609, al Haber, reduciendo el coste de las compras. Las devoluciones de mercancía van a la 608.',
    },
    {
      id: 'b1-q17',
      pregunta: 'Devuelves mercancía defectuosa y el proveedor emite una factura rectificativa. ¿Cómo queda el asiento?',
      correcta: '400 al Debe; 608 Devoluciones de compras y 472 al Haber',
      incorrectas: ['608 y 472 al Debe; 400 al Haber', 'No se contabiliza: se anula la factura original'],
      explicacion: 'La rectificativa reduce la deuda con el proveedor (400 al Debe), el coste de las compras (608 al Haber) y el IVA soportado (472 al Haber). La factura original no se borra.',
    },
    {
      id: 'b1-q18',
      pregunta: 'El proveedor concede un descuento por pagar antes del vencimiento, después de emitir la factura. ¿Qué cuenta usas?',
      correcta: '606 Descuentos sobre compras por pronto pago',
      incorrectas: ['626 Servicios bancarios y similares', '769 Otros ingresos financieros'],
      explicacion: 'El descuento por pronto pago que no figura en la factura se registra en la 606, al Haber. Si el descuento ya viene restado dentro de la factura, no se contabiliza aparte.',
    },

    /* --- IVA --- */
    {
      id: 'b1-q19',
      pregunta: 'Factura de un mayorista a un restaurante con carne y huevos. ¿Qué tipos de IVA esperas encontrar?',
      correcta: '10 % la carne y 4 % los huevos',
      incorrectas: ['21 % para todo', '10 % para todo'],
      explicacion: 'La carne y el pescado tributan al 10 %. Pan, leche, huevos, frutas, verduras y tubérculos van al 4 %. Una misma factura puede tener varios tipos.',
    },
    {
      id: 'b1-q20',
      pregunta: 'En una factura con bases al 10 % y al 4 %, ¿cómo registras el IVA en el asiento?',
      correcta: 'Una sola 472 con la suma de las cuotas',
      incorrectas: ['Solo la cuota del tipo más alto', 'Cada cuota en una cuenta de gasto distinta'],
      explicacion: 'En el asiento basta una línea de 472 con el total de las cuotas. El desglose por tipos queda en el libro registro de facturas recibidas, que es el que alimenta el 303.',
    },
    {
      id: 'b1-q21',
      pregunta: 'El banco cobra una comisión de mantenimiento de la cuenta. ¿Cómo la registras?',
      correcta: '626 Servicios bancarios, sin IVA porque está exenta',
      incorrectas: ['626 Servicios bancarios con un 21 % de IVA', '662 Intereses de deudas'],
      explicacion: 'La mayoría de servicios financieros están exentos de IVA. La comisión va entera a la 626. Los intereses de un préstamo son otra cosa: gasto financiero en la 662.',
    },
    {
      id: 'b1-q22',
      pregunta: 'Llevas una clínica dental, cuya actividad sanitaria está exenta de IVA. ¿Qué pasa con el IVA de sus facturas de compra?',
      correcta: 'No es deducible: se suma al gasto o al valor del bien',
      incorrectas: ['Se deduce en el 303 como cualquier otra empresa', 'Se deduce siempre al 50 %'],
      explicacion: 'Quien solo realiza operaciones exentas no tiene derecho a deducir. Si combinara actividades exentas y no exentas, se aplicaría la prorrata.',
    },
    {
      id: 'b1-q23',
      pregunta: 'Factura de un restaurante, con el NIF de la empresa, por una comida con un cliente. ¿El IVA es deducible?',
      correcta: 'No: el IVA de las atenciones a clientes no es deducible',
      incorrectas: ['Sí, porque la factura cumple todos los requisitos', 'Sí, pero solo el 50 %'],
      explicacion: 'La ley excluye expresamente de la deducción el IVA de las atenciones a clientes, asalariados o terceros. Aunque la factura sea perfecta, el IVA se suma al gasto.',
    },
    {
      id: 'b1-q24',
      pregunta: 'La empresa compra un turismo que el gerente usa también para fines personales. ¿Cuánto IVA puede deducir?',
      correcta: 'En general el 50 %, salvo que se pruebe otro porcentaje de uso',
      incorrectas: ['El 100 %, porque está a nombre de la empresa', 'Nada, porque es un turismo'],
      explicacion: 'Para los turismos se presume una afectación del 50 % a la actividad. Vehículos como los de mensajería, taxis o comerciales pueden deducir el 100 % si se acredita.',
    },
    {
      id: 'b1-q25',
      pregunta: '¿Qué se hace con el IVA soportado que no se puede deducir?',
      correcta: 'Se suma a la cuenta de gasto o al valor del bien',
      incorrectas: ['Se registra en la 472 igualmente', 'No se contabiliza en ningún sitio'],
      explicacion: 'El IVA no deducible es un coste más para el cliente: aumenta el gasto (o el valor del inmovilizado, que luego se amortiza por ese importe).',
    },

    /* --- Retenciones --- */
    {
      id: 'b1-q26',
      pregunta: 'Una abogada (persona física, ejerce desde hace 10 años) factura 1.000 € + IVA. ¿Qué retención se le practica?',
      correcta: '150 €, el 15 % de la base',
      incorrectas: ['181,50 €, el 15 % del total con IVA', 'Ninguna, porque emite factura con IVA'],
      explicacion: 'La retención de profesionales es del 15 % sobre la base imponible. A la abogada se le pagan 1.000 + 210 − 150 = 1.060 €.',
    },
    {
      id: 'b1-q27',
      pregunta: 'Un despacho de abogados que factura como S.L. presta un servicio a tu cliente. ¿Se le practica retención?',
      correcta: 'No: la retención del 15 % se aplica a profesionales personas físicas',
      incorrectas: ['Sí, siempre del 15 %', 'Sí, del 19 %'],
      explicacion: 'Las sociedades que prestan servicios profesionales no soportan retención de IRPF. Fíjate siempre en quién emite la factura: persona física o sociedad.',
    },
    {
      id: 'b1-q28',
      pregunta: 'Un diseñador que empezó como autónomo este año pide que le apliques la retención reducida. ¿Cuál es?',
      correcta: '7 % el año de inicio y los dos siguientes, si lo comunica por escrito',
      incorrectas: ['Ninguna durante el primer año', '10 % durante los tres primeros años'],
      explicacion: 'Los nuevos profesionales pueden aplicar un 7 % en el año de inicio y los dos siguientes, siempre que no hayan ejercido una actividad profesional en el año anterior y lo comuniquen al pagador.',
    },
    {
      id: 'b1-q29',
      pregunta: 'El alquiler mensual del local de un cliente es de 1.000 € de base. ¿Qué retención y qué modelo corresponden?',
      correcta: '190 € (19 %), que se declaran en el modelo 115',
      incorrectas: ['150 € (15 %), en el modelo 111', '190 € (19 %), en el modelo 303'],
      explicacion: 'Los alquileres de inmuebles urbanos llevan una retención del 19 % sobre la base, que se ingresa con el modelo 115. El 111 es para profesionales y trabajadores.',
    },
    {
      id: 'b1-q30',
      pregunta: '¿En qué cuenta registras la retención que tu cliente practica a un profesional?',
      correcta: '4751 Hacienda Pública, acreedora por retenciones practicadas',
      incorrectas: ['473 Hacienda Pública, retenciones y pagos a cuenta', '472 Hacienda Pública, IVA soportado'],
      explicacion: 'La retención practicada es una deuda con Hacienda: 4751, al Haber. La 473 es justo lo contrario: las retenciones que le practican al cliente (por ejemplo, en sus intereses).',
    },
    {
      id: 'b1-q31',
      pregunta: '¿Con qué modelo ingresa tu cliente las retenciones practicadas a profesionales?',
      correcta: 'Con el modelo 111, normalmente trimestral',
      incorrectas: ['Con el modelo 115', 'Con el modelo 303, junto al IVA'],
      explicacion: 'El 111 recoge las retenciones de trabajadores y profesionales; el 115, las de alquileres. La mayoría de pymes los presentan cada trimestre (las grandes empresas, cada mes).',
    },
    {
      id: 'b1-q32',
      pregunta: 'La factura del gestor incluye 45 € de una tasa municipal que pagó en nombre del cliente (suplido). ¿Cómo tributa ese importe?',
      correcta: 'Sin IVA ni retención: no forma parte de la base imponible',
      incorrectas: ['Con un 21 % de IVA, como los honorarios', 'Con IVA y con la retención del 15 %'],
      explicacion: 'Los suplidos son pagos hechos en nombre y por cuenta del cliente. Se excluyen de la base imponible, así que no llevan IVA ni retención.',
    },
    {
      id: 'b1-q33',
      pregunta: '¿Dónde registras ese suplido de una tasa municipal?',
      correcta: 'En su propia cuenta de gasto: 631 Otros tributos',
      incorrectas: ['En la 623, junto a los honorarios del gestor', 'En la 472, porque es un impuesto'],
      explicacion: 'El suplido se registra como si el cliente hubiera pagado la tasa directamente: en la cuenta que corresponde a su naturaleza (631 Otros tributos).',
    },

    /* --- Inversión del sujeto pasivo --- */
    {
      id: 'b1-q34',
      pregunta: 'Llega una factura de una plataforma de anuncios con sede en Irlanda, sin IVA y con la mención «reverse charge». ¿Qué haces?',
      correcta: 'Autorrepercutir el IVA: 472 al Debe y 477 al Haber por el 21 % de la base',
      incorrectas: ['Registrarla sin IVA y olvidarte del impuesto', 'Pedir al proveedor que añada el IVA irlandés'],
      explicacion: 'Es inversión del sujeto pasivo: el cliente declara el IVA en lugar del proveedor. Lo repercute (477) y lo soporta (472) a la vez.',
    },
    {
      id: 'b1-q35',
      pregunta: 'Para un cliente que deduce todo su IVA, ¿cuánto le cuesta autorrepercutir el IVA de una factura intracomunitaria?',
      correcta: 'Nada: la cuota se devenga y se deduce en la misma declaración',
      incorrectas: ['Un 21 % más del importe de la factura', 'La mitad de la cuota'],
      explicacion: 'La misma cuota aparece en el IVA devengado y en el deducible del 303, así que se compensa. Solo tendría coste para un cliente sin derecho a deducir (por ejemplo, una clínica).',
    },
    {
      id: 'b1-q36',
      pregunta: '¿Qué necesita el cliente para que un proveedor de otro país de la UE le facture sin IVA?',
      correcta: 'Un NIF-IVA válido: estar de alta en el Registro de Operadores Intracomunitarios',
      incorrectas: ['Facturar más de 8 millones de euros al año', 'Tener un certificado digital de representante'],
      explicacion: 'El alta en el ROI se pide con el modelo 036 y se comprueba en el VIES. Si el cliente no está dado de alta, el proveedor le cobrará el IVA de su país, que no se puede deducir en el 303.',
    },
    {
      id: 'b1-q37',
      pregunta: 'Además del 303, ¿qué declaración recoge una compra intracomunitaria de servicios?',
      correcta: 'El modelo 349, con la clave I',
      incorrectas: ['El modelo 347 de operaciones con terceros', 'El modelo 111 de retenciones'],
      explicacion: 'El 349 es la declaración recapitulativa de operaciones intracomunitarias; la clave I corresponde a las adquisiciones de servicios. Estas operaciones no se incluyen en el 347.',
    },
    {
      id: 'b1-q38',
      pregunta: 'Factura sin IVA de una empresa de software de Estados Unidos (fuera de la UE). ¿Qué haces?',
      correcta: 'Autorrepercutir el IVA igualmente, pero sin incluirla en el 349',
      incorrectas: ['Nada: los servicios de fuera de la UE no llevan IVA', 'Incluirla en el 349 como una operación de la UE'],
      explicacion: 'Los servicios que una empresa española recibe de fuera de la UE también tributan en España por inversión del sujeto pasivo. Se autorrepercuten en el 303, pero el 349 es solo para operaciones dentro de la UE.',
    },

    /* --- Factura electrónica --- */
    {
      id: 'b1-q39',
      pregunta: 'Con la factura electrónica obligatoria entre empresas (Real Decreto 238/2026), ¿qué tendrá que hacer quien recibe la factura?',
      correcta: 'Comunicar si la acepta o la rechaza y la fecha en que la paga',
      incorrectas: ['Nada distinto: solo cambia el formato del archivo', 'Firmarla digitalmente y reenviarla a Hacienda'],
      explicacion: 'El destinatario deberá informar del estado de cada factura: aceptación o rechazo y pago efectivo con su fecha. Así se podrá controlar el cumplimiento de los plazos de pago.',
    },
    {
      id: 'b1-q40',
      pregunta: 'Según el calendario previsto, ¿cuándo será obligatoria la factura electrónica para una pyme con menos de 8 millones de volumen de operaciones?',
      correcta: 'Hacia octubre de 2028: 24 meses después de la orden técnica',
      incorrectas: ['Ya es obligatoria desde enero de 2026', 'Nunca: solo afecta a empresas de más de 8 millones'],
      explicacion: 'Las empresas de más de 8 millones tienen 12 meses desde la orden técnica (previsto octubre de 2027) y el resto 24 meses (previsto octubre de 2028). Conviene comprobar las fechas en la AEAT, porque pueden cambiar.',
    },
  ],

  casos: [
    {
      id: 'b1-mercaderias',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Compra de mercaderías',
      enunciado: 'El cliente te entrega esta factura de su proveedor habitual de ropa. Revisa la factura y registra el asiento de la compra.',
      documento: {
        tipo: 'factura',
        color: '#6d28d9',
        emisor: { nombre: 'Textiles Albufera, S.L.', nif: 'B46112233', direccion: ['Pol. Ind. Sur, nave 14 · 46470 Catarroja (Valencia)'] },
        receptor: { nombre: 'Moda Valentina, S.L.', nif: 'B98765432', direccion: ['Av. del Puerto, 112 · 46023 Valencia'] },
        numero: 'FV-2026/1184',
        fecha: '06/10/2026',
        vencimiento: '05/11/2026',
        formaPago: 'Transferencia a 30 días',
        lineas: [
          { concepto: 'Pantalón vaquero mujer ref. 2201', cantidad: 20, precio: 35, iva: 21 },
          { concepto: 'Camiseta algodón básica ref. 1104', cantidad: 25, precio: 22, iva: 21 },
        ],
      },
      cuentasDisponibles: ['600', '602', '300', '472', '477', '400', '410', '572'],
      solucion: [{ cuenta: '600', debe: 1250 }, { cuenta: '472', debe: 262.5 }, { cuenta: '400', haber: 1512.5 }],
      pista: 'Tres líneas: qué se compra (sin IVA), el IVA soportado y a quién se le debe el total. Es ropa para revender.',
      explicacion: 'La ropa para revender son mercaderías: 600 por la base (1.250 €). El IVA soportado (262,50 €) va a la 472. La deuda total con el fabricante, 1.512,50 €, a la 400 Proveedores.',
    },
    {
      id: 'b1-varios-tipos',
      tipo: 'asiento',
      cliente: { nombre: 'Mesón La Encina, S.L.', actividad: 'Restaurante' },
      titulo: 'Factura con dos tipos de IVA',
      enunciado: 'El restaurante recibe la factura semanal de su mayorista de alimentación. Fíjate bien en los tipos de IVA y registra la compra.',
      documento: {
        tipo: 'factura',
        color: '#b45309',
        emisor: { nombre: 'Distribuciones Alimentarias del Turia, S.L.', nif: 'B46334455', direccion: ['Camino de Moncada, 120 · 46025 Valencia'] },
        receptor: { nombre: 'Mesón La Encina, S.L.', nif: 'B98556677', direccion: ['C/ Mayor, 8 · 46900 Torrent (Valencia)'] },
        numero: '2026-A-03317',
        fecha: '09/10/2026',
        vencimiento: '08/11/2026',
        formaPago: 'Recibo domiciliado a 30 días',
        lineas: [
          { concepto: 'Solomillo de ternera (kg)', cantidad: 8, precio: 30, iva: 10 },
          { concepto: 'Pechuga de pollo (kg)', cantidad: 20, precio: 8, iva: 10 },
          { concepto: 'Huevos camperos (docena)', cantidad: 30, precio: 3.5, iva: 4 },
          { concepto: 'Patata (saco de 25 kg)', cantidad: 6, precio: 12.5, iva: 4 },
        ],
      },
      cuentasDisponibles: ['600', '602', '627', '472', '477', '400', '410', '572'],
      solucion: [{ cuenta: '600', debe: 580 }, { cuenta: '472', debe: 47.2 }, { cuenta: '400', haber: 627.2 }],
      alternativas: [[{ cuenta: '602', debe: 580 }, { cuenta: '472', debe: 47.2 }, { cuenta: '400', haber: 627.2 }]],
      pista: 'Suma las dos bases para el gasto y las dos cuotas para el IVA. En el asiento basta una línea por cuenta.',
      explicacion: 'Gasto por la suma de bases (400 + 180 = 580 €), una sola 472 con la suma de cuotas (40 + 7,20 = 47,20 €) y 627,20 € a la 400. En hostelería, la comida y bebida que se sirve se suele llevar a la 600 (algunas gestorías usan la 602).',
    },
    {
      id: 'b1-ticket',
      tipo: 'asiento',
      cliente: { nombre: 'Cafetería Plaza Mayor, S.L.', actividad: 'Cafetería' },
      titulo: 'Un ticket de ferretería',
      enunciado: 'El encargado compró material para arreglar un grifo del local y lo pagó con dinero de la caja. Te entrega este ticket. Decide si el IVA es deducible y registra el gasto.',
      documento: {
        tipo: 'ticket',
        emisor: { nombre: 'FERRETERÍA EL CLAVO', nif: 'B46778899', direccion: ['C/ Pintor Sorolla, 3', '46002 Valencia'] },
        numero: 'T-0045-118734',
        fecha: '15/10/2026 10:42',
        ivaIncluido: 21,
        formaPago: 'EFECTIVO',
        lineas: [
          { concepto: 'Tornillería surtida', cantidad: 1, precio: 4.84 },
          { concepto: 'Silicona sanitaria', cantidad: 1, precio: 7.26 },
          { concepto: 'Grifo monomando', cantidad: 1, precio: 24.2 },
        ],
      },
      cuentasDisponibles: ['622', '629', '213', '472', '570', '572', '410'],
      solucion: [{ cuenta: '622', debe: 36.3 }, { cuenta: '570', haber: 36.3 }],
      alternativas: [[{ cuenta: '629', debe: 36.3 }, { cuenta: '570', haber: 36.3 }]],
      pista: '¿Aparece el NIF de la cafetería en el ticket? Si no se puede deducir el IVA, ¿dónde va?',
      explicacion: 'El ticket no incluye los datos de la cafetería, así que el IVA no es deducible: el gasto es el total, 36,30 €, en la 622 Reparaciones y conservación (algunas gestorías usan la 629). Se pagó con efectivo: abono a la 570 Caja.',
    },
    {
      id: 'b1-deducible',
      tipo: 'clasificar',
      titulo: '¿Se puede deducir el IVA?',
      enunciado: 'Revisas la documentación del trimestre de varios clientes. Indica para cada documento si su IVA se puede deducir.',
      rejilla: 'grid-cols-3',
      opciones: [
        { valor: 'si', etiqueta: 'Sí' },
        { valor: 'parcial', etiqueta: 'En parte' },
        { valor: 'no', etiqueta: 'No' },
      ],
      cuentas: [
        { id: 'luz', texto: 'Factura completa de la luz del local, a nombre de la sociedad', correcta: 'si', pista: 'Tiene todos los requisitos y el gasto es de la actividad.', explicacion: 'Factura completa y gasto afecto a la actividad.' },
        { id: 'gasolinera', texto: 'Ticket de gasolinera sin datos de la empresa', correcta: 'no', pista: '¿Qué le falta a un ticket para permitir la deducción?', explicacion: 'Sin NIF de la empresa ni cuota desglosada, no se deduce.' },
        { id: 'comida', texto: 'Factura de restaurante con el NIF de la empresa, por una comida con un cliente', correcta: 'no', pista: 'La factura es correcta, pero hay gastos cuyo IVA la ley excluye siempre.', explicacion: 'Atenciones a clientes: IVA excluido de la deducción.' },
        { id: 'simplificada', texto: 'Factura simplificada de material de oficina con NIF y domicilio de la empresa y la cuota desglosada', correcta: 'si', pista: 'Una factura simplificada puede permitir deducir si incluye ciertos datos. ¿Los tiene?', explicacion: 'Simplificada con los datos del destinatario y la cuota separada.' },
        { id: 'turismo', texto: 'Compra de un turismo que el gerente usa también en su vida privada', correcta: 'parcial', pista: 'Para los turismos, la ley presume un porcentaje de uso empresarial.', explicacion: 'Se presume un 50 % de afectación.' },
        { id: 'socio', texto: 'Factura de un portátil emitida a nombre del socio, no de la sociedad', correcta: 'no', pista: '¿Quién tiene derecho a deducir el IVA de una factura?', explicacion: 'Solo deduce el destinatario: hay que pedir una rectificativa.' },
        { id: 'clinica', texto: 'Factura de material médico de una clínica dental (actividad exenta)', correcta: 'no', pista: '¿Puede deducir IVA quien solo realiza operaciones exentas?', explicacion: 'Actividad exenta sin derecho a deducción.' },
      ],
      resumenOk: 'Esta revisión es la que hace un buen gestor antes de presentar el 303: el IVA que no es deducible nunca debería llegar a la 472.',
    },
    {
      id: 'b1-inmovilizado',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería' },
      titulo: 'Compra de un horno industrial',
      enunciado: 'La panadería ha comprado un horno nuevo. La factura incluye el transporte y la instalación. Registra la compra.',
      documento: {
        tipo: 'factura',
        color: '#0f766e',
        emisor: { nombre: 'Maquinaria Hostelera del Mediterráneo, S.A.', nif: 'A46990011', direccion: ['Av. de la Industria, 45 · 46980 Paterna (Valencia)'] },
        receptor: { nombre: 'Horno San Blas, S.L.', nif: 'B98221133', direccion: ['C/ San Vicente, 77 · 46007 Valencia'] },
        numero: 'MHM-26-00912',
        fecha: '12/10/2026',
        vencimiento: '10/01/2027',
        formaPago: 'Transferencia a 90 días',
        lineas: [
          { concepto: 'Horno de convección eléctrico, 10 bandejas', cantidad: 1, precio: 4500, iva: 21 },
          { concepto: 'Transporte e instalación', cantidad: 1, precio: 300, iva: 21 },
        ],
      },
      cuentasDisponibles: ['213', '600', '622', '624', '472', '400', '523', '173'],
      solucion: [{ cuenta: '213', debe: 4800 }, { cuenta: '472', debe: 1008 }, { cuenta: '523', haber: 5808 }],
      pista: 'El horno se usará muchos años. Lo que cuesta ponerlo en marcha forma parte de su valor. ¿Cuándo se paga?',
      explicacion: 'El horno es inmovilizado (213 Maquinaria) y su valor incluye el transporte y la instalación: 4.800 €. IVA en la 472 (1.008 €). La deuda vence a 90 días: 523 Proveedores de inmovilizado a corto plazo por 5.808 €. No es la 400 (no son mercaderías) ni la 624 (el transporte suma al valor del bien).',
    },
    {
      id: 'b1-quien',
      tipo: 'clasificar',
      titulo: '¿Proveedor, acreedor o proveedor de inmovilizado?',
      enunciado: 'Tienes que dar de alta la subcuenta de varios terceros de distintos clientes. Elige la cuenta que corresponde a cada uno.',
      rejilla: 'grid-cols-2 sm:grid-cols-4',
      opciones: [
        { valor: '400', etiqueta: '400', detalle: 'Proveedores' },
        { valor: '410', etiqueta: '410', detalle: 'Acreedores' },
        { valor: '523', etiqueta: '523', detalle: 'Inmov. corto plazo' },
        { valor: '173', etiqueta: '173', detalle: 'Inmov. largo plazo' },
      ],
      cuentas: [
        { id: 'fabricante', texto: 'Una tienda compra 200 camisetas a su fabricante, a 60 días', correcta: '400', pista: 'Son prendas para revender.', explicacion: 'Mercaderías: proveedor.' },
        { id: 'asesoria', texto: 'Un restaurante recibe la factura mensual de su asesoría laboral', correcta: '410', pista: '¿Vende un producto o presta un servicio?', explicacion: 'Servicio profesional: acreedor.' },
        { id: 'cafetera', texto: 'Un bar compra una cafetera industrial que pagará en 3 meses', correcta: '523', pista: 'La cafetera se usará varios años. ¿Y el plazo de pago?', explicacion: 'Bien de inversión pagadero en menos de un año.' },
        { id: 'alquiler', texto: 'Una academia recibe la factura del alquiler de su local', correcta: '410', pista: 'El alquiler es un servicio.', explicacion: 'Arrendador: acreedor por prestación de servicios.' },
        { id: 'recambios', texto: 'Un taller compra recambios que instalará en los coches de sus clientes', correcta: '400', pista: 'Los recambios se repercuten al cliente en la reparación.', explicacion: 'Aprovisionamientos de la actividad: proveedor.' },
        { id: 'furgoneta', texto: 'Una empresa compra una furgoneta que pagará de una vez dentro de 18 meses', correcta: '173', pista: 'Bien de inversión. ¿El pago vence antes o después de un año?', explicacion: 'Bien de inversión pagadero a más de un año.' },
        { id: 'limpieza', texto: 'Una clínica recibe la factura de la empresa de limpieza', correcta: '410', pista: 'La limpieza es un servicio.', explicacion: 'Servicio: acreedor.' },
      ],
      resumenOk: 'Elegir bien la cuenta del tercero al darlo de alta evita reclasificaciones al cierre y que el balance mezcle deudas comerciales con deudas por inversiones.',
    },
    {
      id: 'b1-profesional',
      tipo: 'asiento',
      cliente: { nombre: 'Reformas Integrales Turia, S.L.', actividad: 'Empresa de reformas' },
      titulo: 'Factura de una abogada',
      enunciado: 'El cliente ha encargado a una abogada la revisión de un contrato de obra. Te reenvía su factura. Registra el asiento.',
      documento: {
        tipo: 'factura',
        color: '#1e3a8a',
        emisor: { nombre: 'Laura Méndez Ruiz · Abogada', nif: '12345678Z', direccion: ['C/ Jorge Juan, 9, 3.º · 46004 Valencia'] },
        receptor: { nombre: 'Reformas Integrales Turia, S.L.', nif: 'B98443322', direccion: ['C/ Músico Ginés, 31 · 46022 Valencia'] },
        numero: '2026/047',
        fecha: '16/10/2026',
        formaPago: 'Transferencia a la recepción',
        retencion: 15,
        lineas: [
          { concepto: 'Honorarios: redacción y revisión de contrato de obra', cantidad: 1, precio: 600, iva: 21 },
        ],
      },
      cuentasDisponibles: ['623', '621', '472', '473', '4751', '400', '410', '572'],
      solucion: [{ cuenta: '623', debe: 600 }, { cuenta: '472', debe: 126 }, { cuenta: '4751', haber: 90 }, { cuenta: '410', haber: 636 }],
      pista: 'Cuatro líneas. La retención no reduce el gasto: es dinero que el cliente debe ingresar a Hacienda.',
      explicacion: 'Gasto por la base en la 623 (600 €) e IVA en la 472 (126 €). La retención del 15 % (90 €) es una deuda con Hacienda: 4751. A la abogada se le debe el total de la factura, 636 €: 410 Acreedores. La 473 es para las retenciones que le practican al cliente, no las que practica él.',
    },
    {
      id: 'b1-alquiler',
      tipo: 'asiento',
      cliente: { nombre: 'Bicicletas Ruedas del Turia, S.L.', actividad: 'Tienda y taller de bicicletas' },
      titulo: 'Alquiler del local',
      enunciado: 'Llega la factura mensual del alquiler del local donde está la tienda. Registra el asiento.',
      documento: {
        tipo: 'factura',
        color: '#be123c',
        emisor: { nombre: 'Inmuebles Ribera, S.L.', nif: 'B98667788', direccion: ['Gran Vía Marqués del Turia, 50 · 46005 Valencia'] },
        receptor: { nombre: 'Bicicletas Ruedas del Turia, S.L.', nif: 'B98112299', direccion: ['C/ Alboraya, 14, bajo · 46010 Valencia'] },
        numero: 'ALQ-2026-10',
        fecha: '01/10/2026',
        formaPago: 'Recibo domiciliado del 1 al 5 de cada mes',
        retencion: 19,
        menciones: ['Retención IRPF/IS del 19 % por arrendamiento de inmueble urbano.'],
        lineas: [
          { concepto: 'Alquiler del local C/ Alboraya, 14, bajo · octubre 2026', cantidad: 1, precio: 1000, iva: 21 },
        ],
      },
      cuentasDisponibles: ['621', '623', '472', '473', '4751', '400', '410', '572'],
      solucion: [{ cuenta: '621', debe: 1000 }, { cuenta: '472', debe: 210 }, { cuenta: '4751', haber: 190 }, { cuenta: '410', haber: 1020 }],
      pista: 'Mismo esquema que un profesional, pero con otro porcentaje de retención. ¿Y la cuenta de gasto?',
      explicacion: 'Alquiler a la 621 por la base (1.000 €) e IVA a la 472 (210 €). La retención del 19 % (190 €) a la 4751: se ingresará con el modelo 115. Al arrendador se le pagan 1.020 €: 410. La tienda vende con IVA, así que deduce el IVA del alquiler.',
    },
    {
      id: 'b1-suplidos',
      tipo: 'asiento',
      cliente: { nombre: 'Floristería Azahar, S.L.', actividad: 'Floristería' },
      titulo: 'Factura del gestor con suplidos',
      enunciado: 'Un gestor administrativo tramitó la licencia de actividad de la floristería y pagó la tasa municipal por ella. Te llega su factura. Registra el asiento.',
      documento: {
        tipo: 'factura',
        color: '#4d7c0f',
        emisor: { nombre: 'Javier Ortiz Lago · Gestor Administrativo', nif: '87654321X', direccion: ['C/ Ruzafa, 40, 1.º · 46006 Valencia'] },
        receptor: { nombre: 'Floristería Azahar, S.L.', nif: 'B98334411', direccion: ['C/ Cádiz, 18 · 46006 Valencia'] },
        numero: 'G-2026-118',
        fecha: '19/10/2026',
        formaPago: 'Transferencia a 15 días',
        retencion: 15,
        lineas: [
          { concepto: 'Honorarios: tramitación de licencia de actividad', cantidad: 1, precio: 150, iva: 21 },
        ],
        suplidos: [
          { concepto: 'Tasa municipal por licencia de actividad (suplido)', importe: 45 },
        ],
      },
      cuentasDisponibles: ['623', '629', '631', '472', '477', '4751', '410', '572'],
      solucion: [{ cuenta: '623', debe: 150 }, { cuenta: '631', debe: 45 }, { cuenta: '472', debe: 31.5 }, { cuenta: '4751', haber: 22.5 }, { cuenta: '410', haber: 204 }],
      pista: 'Cinco líneas. El IVA y la retención se calculan solo sobre los honorarios. ¿Qué tipo de gasto es la tasa?',
      explicacion: 'Honorarios a la 623 (150 €) con su IVA en la 472 (31,50 €) y su retención en la 4751 (22,50 €). La tasa es un suplido: va a la 631 Otros tributos por 45 €, sin IVA ni retención. Al gestor se le debe el total: 150 + 31,50 − 22,50 + 45 = 204 €.',
    },
    {
      id: 'b1-rectificativa',
      tipo: 'asiento',
      cliente: { nombre: 'Calzados Sierra, S.L.', actividad: 'Zapatería' },
      titulo: 'Factura rectificativa por devolución',
      enunciado: 'La zapatería devolvió unos botines defectuosos y el proveedor ha emitido esta factura rectificativa. La factura original ya estaba contabilizada. Registra la rectificativa.',
      documento: {
        tipo: 'factura',
        titulo: 'FACTURA RECTIFICATIVA',
        color: '#c2410c',
        emisor: { nombre: 'Calzados del Vinalopó, S.L.', nif: 'B03556622', direccion: ['C/ Elche, 120 · 03600 Elda (Alicante)'] },
        receptor: { nombre: 'Calzados Sierra, S.L.', nif: 'B98778811', direccion: ['C/ Sueca, 52 · 46006 Valencia'] },
        numero: 'R-2026-014',
        fecha: '20/10/2026',
        rectifica: 'Rectifica la factura F-2026-0311 de 02/10/2026. Motivo: devolución de mercancía defectuosa.',
        formaPago: 'Se compensará en el próximo pago',
        lineas: [
          { concepto: 'Devolución: botines piel ref. 330 (defecto de fabricación)', cantidad: -5, precio: 40, iva: 21 },
        ],
      },
      cuentasDisponibles: ['600', '608', '609', '472', '477', '400', '410', '572'],
      solucion: [{ cuenta: '400', debe: 242 }, { cuenta: '608', haber: 200 }, { cuenta: '472', haber: 42 }],
      alternativas: [[{ cuenta: '400', debe: 242 }, { cuenta: '600', haber: 200 }, { cuenta: '472', haber: 42 }]],
      pista: 'Los importes son negativos: registra cantidades positivas en el lado contrario al de una compra normal.',
      explicacion: 'La rectificativa deshace parte de la compra: baja la deuda con el proveedor (400 al Debe, 242 €), bajan las compras (608 Devoluciones de compras al Haber, 200 €; también es válido abonar directamente la 600) y baja el IVA soportado (472 al Haber, 42 €).',
    },
    {
      id: 'b1-isp',
      tipo: 'asiento',
      cliente: { nombre: 'Estudio Creativo Píxel, S.L.', actividad: 'Agencia de diseño' },
      titulo: 'El gran reto: anuncios facturados desde Irlanda',
      enunciado: 'El estudio paga con tarjeta campañas de anuncios en internet. Has descargado esta factura del panel de la plataforma. Registra el asiento completo, IVA incluido.',
      documento: {
        tipo: 'factura',
        idioma: 'en',
        titulo: 'INVOICE',
        color: '#2563eb',
        emisor: { nombre: 'AdStream Ireland Ltd.', nif: 'IE1234567AB', direccion: ['1 Example Quay, Dublin 2', 'D02 X000, Ireland'] },
        receptor: { nombre: 'Estudio Creativo Píxel, S.L.', nif: 'ESB98445566', direccion: ['C/ Literato Azorín, 11 · 46006 Valencia, Spain'] },
        numero: 'ADS-2026-7781943',
        fecha: '31/10/2026',
        formaPago: 'Paid by card',
        menciones: ['Reverse charge: VAT to be accounted for by the recipient (Art. 196, Council Directive 2006/112/EC).'],
        lineas: [
          { concepto: 'Online advertising services · October 2026', cantidad: 1, precio: 800, iva: 0 },
        ],
      },
      cuentasDisponibles: ['627', '623', '472', '477', '4751', '400', '410', '572'],
      solucion: [{ cuenta: '627', debe: 800 }, { cuenta: '472', debe: 168 }, { cuenta: '477', haber: 168 }, { cuenta: '410', haber: 800 }],
      pista: 'La factura no trae IVA, pero en España sí se devenga: tu cliente lo repercute y lo soporta a la vez, al 21 % de la base.',
      explicacion: 'Gasto de publicidad a la 627 (800 €) y deuda con la plataforma a la 410 por lo que realmente se le paga (800 €). Además, autorrepercusión del 21 %: 472 al Debe y 477 al Haber por 168 €. En el 303 aparecerá como IVA devengado y deducible, y la operación irá al modelo 349 con la clave I.',
    },
  ],
};

/* ---------- Bloque 2: Ventas y Clientes (gestoría) ---------- */

const FACTURA_EMITIDA_EJEMPLO_B2 = {
  tipo: 'factura',
  color: '#0f766e',
  emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030', direccion: ['C/ Font d’en Carròs, 9 · 46017 Valencia'] },
  receptor: { nombre: 'Mesón La Encina, S.L.', nif: 'B98556677', direccion: ['C/ Mayor, 8 · 46900 Torrent (Valencia)'] },
  numero: '2026/0233',
  fecha: '05/10/2026',
  vencimiento: '04/11/2026',
  formaPago: 'Transferencia a 30 días',
  lineas: [
    { concepto: 'Mantel de papel 100 × 100 (caja de 400)', cantidad: 5, precio: 32, iva: 21 },
    { concepto: 'Servilleta de papel 40 × 40 (caja de 1.200)', cantidad: 4, precio: 35, iva: 21 },
  ],
};

const CONTENIDO_B2 = {
  teoria: [
    {
      id: 'emitir',
      titulo: 'Facturar a clientes desde la gestoría',
      resumen: 'Quién emite, cuándo y qué numeración.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>En compras recibes lo que te mandan; en ventas eres responsable de que <strong>cada factura que emite tu cliente esté bien hecha</strong>, porque de ella sale el IVA que ingresará en el 303. Unos clientes facturan con su propio programa y te pasan las facturas; a otros se las preparas tú. En ambos casos, las reglas son las mismas.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Reglas básicas de emisión',
          columnas: ['Regla', 'Qué significa en la práctica'],
          filas: [
            ['Plazo: cliente particular', 'En el momento de la operación'],
            ['Plazo: cliente empresario o profesional', 'Antes del día 16 del mes siguiente a la operación (se admiten facturas recapitulativas mensuales)'],
            ['Numeración', 'Correlativa dentro de cada serie, sin huecos. Puede haber series por año, por tienda o por tipo'],
            ['Rectificativas', 'En una serie propia (por ejemplo, R-2026/001), indicando qué factura rectifican y por qué'],
            ['Operación exenta o sin IVA', 'La factura debe indicar el motivo: el artículo de la ley o «inversión del sujeto pasivo»'],
          ],
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Revisar la serie del trimestre', texto: 'Ordena las facturas por número y busca huecos, duplicados o fechas fuera de orden.' },
            { titulo: 'Registrar', texto: 'Cada factura alimenta el libro registro de facturas expedidas, y de ahí el IVA devengado del 303, el 347 y el 349.' },
            { titulo: 'Puntear los cobros', texto: 'Cada cobro cancela la deuda del cliente (430). Lo que no se cobra en plazo hay que vigilarlo: es el camino a un moroso.' },
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Si falta un número en la serie, <strong>pregunta antes de presentar el 303</strong>. Puede ser una factura que el cliente no te mandó (IVA sin declarar) o una anulada que debe poder justificarse. Hacienda detecta los huecos con facilidad.',
        },
      ],
    },
    {
      id: 'asiento-venta',
      titulo: 'El asiento de venta y las ventas con ticket',
      resumen: '430 · 700 · 705 · 477, y el resumen de caja.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Es el espejo de la compra: el cliente debe el total (<strong>430 Clientes</strong>, al Debe), el ingreso va por la base (<strong>700</strong> si se venden productos, <strong>705</strong> si se prestan servicios) y el IVA cobrado es una deuda con Hacienda (<strong>477 IVA repercutido</strong>, al Haber).</p>',
        },
        { tipo: 'documento', documento: FACTURA_EMITIDA_EJEMPLO_B2 },
        {
          tipo: 'asiento',
          titulo: 'Registro de la factura anterior',
          lineas: [{ cuenta: '430', debe: 363 }, { cuenta: '700', haber: 300 }, { cuenta: '477', haber: 63 }],
          nota: 'Base: 5 × 32 + 4 × 35 = 300 €. IVA: 63 €. El restaurante debe 363 €. Comprueba siempre que las líneas suman la base de la factura.',
        },
        {
          tipo: 'tabla',
          titulo: 'Cuentas de ventas que más vas a usar',
          columnas: ['Cuenta', 'Cuándo se usa'],
          filas: [
            ['700 Ventas de mercaderías', 'Tiendas, distribuidores, hostelería (comida y bebida servida)'],
            ['705 Prestaciones de servicios', 'Profesionales, talleres, academias, agencias, consultoras'],
            ['752 Ingresos por arrendamientos', 'Alquiler de un local o nave cuando no es la actividad principal'],
            ['708 · 709 · 706', 'Devoluciones, rappels y descuentos por pronto pago concedidos'],
            ['438 Anticipos de clientes', 'Cobros recibidos antes de entregar o prestar'],
            ['436 Clientes de dudoso cobro', 'Deudas de clientes con riesgo serio de impago'],
          ],
        },
        {
          tipo: 'html',
          html: '<p><strong>Ventas con ticket.</strong> Bares, tiendas y peluquerías venden a particulares con factura simplificada. No se registra ticket a ticket: se hace un <strong>asiento resumen</strong> (diario o mensual) con los cierres de caja (informes Z), separando lo cobrado en efectivo (570) y con tarjeta (572), y calculando la base y el IVA a partir del total.</p>',
        },
        {
          tipo: 'consejo',
          html: '<strong>De total a base:</strong> divide entre 1,21, 1,10 o 1,04 según el tipo. Por ejemplo, 15.400 € con un 10 % de IVA incluido son 15.400 / 1,10 = 14.000 € de base y 1.400 € de IVA.',
        },
      ],
    },
    {
      id: 'iva-repercutido',
      titulo: 'IVA repercutido y recargo de equivalencia',
      resumen: 'Qué tipo aplica cada cliente y cuándo se añade el recargo.',
      piezas: [
        {
          tipo: 'tabla',
          titulo: 'El tipo depende de lo que vende tu cliente',
          columnas: ['Tipo', 'Ejemplos en tu cartera de clientes'],
          filas: [
            ['21 % · general', 'Tiendas de ropa y electrónica, consultoras, arquitectos, talleres, agencias de publicidad'],
            ['10 % · reducido', 'Restaurantes y bares, bollería y pastelería, carne y pescado, obras de renovación de vivienda para particulares (con requisitos)'],
            ['4 % · superreducido', 'Pan común, leche, huevos, frutas y verduras, libros en papel'],
            ['Exento', 'Médicos, dentistas y fisioterapeutas (asistencia sanitaria), corredurías de seguros, alquiler de vivienda'],
          ],
        },
        {
          tipo: 'html',
          html: '<p><strong>Recargo de equivalencia.</strong> Los comerciantes minoristas que son <strong>personas físicas</strong> (o comunidades de bienes) y revenden sin transformar están en este régimen: no presentan el 303. A cambio, su proveedor les cobra en la factura, además del IVA, un recargo que ingresa a Hacienda.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Tipos de recargo vigentes',
          columnas: ['IVA', 'Recargo de equivalencia'],
          filas: [
            ['21 %', '5,2 %'],
            ['10 %', '1,4 %'],
            ['4 %', '0,5 %'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Venta de 1.000 € al 21 % a una tienda en recargo de equivalencia',
          subtitulo: 'IVA 210 € + recargo 52 € = 262 €',
          lineas: [{ cuenta: '430', debe: 1262 }, { cuenta: '700', haber: 1000 }, { cuenta: '477', haber: 262 }],
          nota: 'El recargo se ingresa en el 303 junto al IVA. Muchas gestorías lo separan en una subcuenta propia (por ejemplo, 47700002) para cuadrarlo mejor.',
        },
        {
          tipo: 'gestoria',
          html: 'Si llevas a un <strong>mayorista</strong>, comprueba qué clientes suyos están en recargo: es un error habitual facturarles sin él. Y si llevas a un <strong>minorista en recargo</strong>, recuerda que no deduce nada: el IVA y el recargo que paga son más coste de sus compras.',
        },
      ],
    },
    {
      id: 'retenciones-emitidas',
      titulo: 'Cuando tu cliente es un profesional: retenciones soportadas',
      resumen: 'El otro lado de la 4751: la cuenta 473.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Muchos clientes de una gestoría son autónomos profesionales: arquitectos, abogados, diseñadores. Cuando facturan a una empresa, esta les retiene el 15 % (o el 7 % los primeros años). Para tu cliente, esa retención <strong>no es una pérdida</strong>: es un pago adelantado de su IRPF, un derecho frente a Hacienda que se registra en la <strong>473</strong>.</p>',
        },
        {
          tipo: 'calculadora',
          modo: 'venta',
          inicial: { base: '2000', iva: 21, ret: 15 },
        },
        {
          tipo: 'consejo',
          html: '<strong>Solo retienen las empresas y los profesionales.</strong> Si el arquitecto factura a un particular para la reforma de su casa, no hay retención: cobra el total.',
        },
        {
          tipo: 'gestoria',
          html: 'Al preparar la renta de un cliente profesional, <strong>cuadra su 473 con los certificados de retenciones</strong> de sus pagadores. Ellos declaran esas retenciones en su modelo 190, así que Hacienda ya tiene los datos: cualquier diferencia saltará.',
        },
      ],
    },
    {
      id: 'anticipos',
      titulo: 'Anticipos de clientes',
      resumen: 'Cobrar antes de entregar: la cuenta 438.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Carpinterías, talleres, agencias o reformistas suelen cobrar una parte por adelantado. El anticipo <strong>devenga IVA en el momento del cobro</strong>, así que hay que emitir una factura de anticipo. El importe recibido es una deuda con el cliente (aún no se ha vendido nada): <strong>438 Anticipos de clientes</strong>.</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Cobro del anticipo', texto: 'Factura de anticipo con IVA. Asiento: 572 al Debe; 438 (base) y 477 (IVA) al Haber.' },
            { titulo: 'Entrega y factura final', texto: 'La factura final recoge la venta completa y descuenta el anticipo ya facturado: solo se repercute el IVA pendiente.' },
            { titulo: 'Cancelar el anticipo', texto: 'En el asiento de la factura final, la 438 se carga (Debe) y la venta se registra por el total.' },
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Anticipo de 1.000 € + IVA cobrado por transferencia',
          lineas: [{ cuenta: '572', debe: 1210 }, { cuenta: '438', haber: 1000 }, { cuenta: '477', haber: 210 }],
          nota: 'Si la venta se cancela, el anticipo se devuelve con una factura rectificativa.',
        },
      ],
    },
    {
      id: 'abonos',
      titulo: 'Abonos, devoluciones y descuentos',
      resumen: 'Rectificativas emitidas: 708, 709 y 706.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Una factura emitida <strong>nunca se borra ni se edita</strong>: si hay un error o una devolución, se emite una <strong>factura rectificativa</strong> (abono) en su propia serie. En el asiento, los importes negativos de la rectificativa se registran en positivo en el lado contrario al de la venta.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Abono por devolución de mercancía: 200 € + IVA',
          lineas: [{ cuenta: '708', debe: 200 }, { cuenta: '477', debe: 42 }, { cuenta: '430', haber: 242 }],
          nota: 'Baja el ingreso (708 Devoluciones de ventas), baja el IVA repercutido y baja lo que debe el cliente. También se admite cargar directamente la 700.',
        },
        {
          tipo: 'tabla',
          titulo: 'Qué cuenta usar',
          columnas: ['Situación', 'Cuenta (al Debe)'],
          filas: [
            ['Devolución de mercancía o error a favor del cliente', '708 Devoluciones de ventas y operaciones similares'],
            ['Rappel por volumen de compras del cliente', '709 Rappels sobre ventas'],
            ['Descuento por pronto pago concedido después de facturar', '706 Descuentos sobre ventas por pronto pago'],
            ['Descuento incluido en la propia factura', 'No se contabiliza aparte: la venta va por el neto'],
          ],
        },
      ],
    },
    {
      id: 'morosos',
      titulo: 'Clientes morosos e impagados',
      resumen: 'De la factura vencida a recuperar el IVA.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>El impago es donde una gestoría demuestra su valor: hay <strong>plazos legales para recuperar el IVA</strong> que tu cliente ya ingresó, y si se pasan, se pierde. La ley de morosidad fija un plazo máximo de pago entre empresas de <strong>60 días</strong> (30 si no se pacta otro).</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Factura vencida', texto: 'Se reclama el cobro y se documenta cada reclamación.' },
            { titulo: 'Dudoso cobro', texto: 'Si hay riesgo serio (meses de retraso, el cliente no contesta, está en concurso), se reclasifica: 436 al Debe, 430 al Haber.' },
            { titulo: 'Deterioro al cierre', texto: 'Se reconoce la pérdida estimada: 694 al Debe, 490 al Haber. Fiscalmente, en general, se exigen 6 meses desde el vencimiento.' },
            { titulo: 'Recuperar el IVA', texto: 'Cumpliendo los requisitos legales, factura rectificativa que anula la cuota: 477 al Debe, 436 al Haber.' },
            { titulo: 'Final', texto: 'Si se cobra: 572 a 436 y se revierte el deterioro (490 a 794). Si es definitivamente incobrable: 650 a 436 (y se aplica el deterioro).' },
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Recuperar el IVA de un impagado (sin concurso): requisitos',
          columnas: ['Requisito', 'Detalle'],
          filas: [
            ['Plazo desde el devengo', '6 meses; 1 año si el cliente facturó más de 6.010.121,04 € el año anterior'],
            ['Reclamación', 'Judicial, requerimiento notarial o cualquier otro medio que acredite fehacientemente la reclamación'],
            ['Importe mínimo', 'Si el deudor es un consumidor final, base imponible de al menos 50 €'],
            ['Rectificativa', 'En los 6 meses siguientes al fin del plazo anterior'],
            ['Comunicación', 'A la AEAT, en el mes siguiente a la emisión de la rectificativa'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Lleva un <strong>registro de impagados por cliente</strong> con la fecha de cada factura, sus reclamaciones y la fecha límite para la rectificativa. Si el deudor entra en <strong>concurso de acreedores</strong>, el procedimiento y los plazos son distintos (artículo 80.Tres de la Ley del IVA): revísalo en cuanto lo sepas.',
        },
      ],
    },
    {
      id: 'extranjero',
      titulo: 'Ventas a clientes de otros países',
      resumen: 'Facturas sin IVA que sí hay que declarar.',
      piezas: [
        {
          tipo: 'tabla',
          titulo: 'Qué IVA lleva la factura',
          columnas: ['Operación', 'Tratamiento'],
          filas: [
            ['Venta de bienes a una empresa de otro país de la UE (con NIF-IVA válido)', 'Entrega intracomunitaria exenta. Modelo 349, clave E'],
            ['Servicio a una empresa de otro país de la UE', 'Sin IVA español: lo autorrepercute el cliente (inversión del sujeto pasivo). Modelo 349, clave S'],
            ['Venta de bienes fuera de la UE', 'Exportación exenta, justificada con el documento aduanero'],
            ['Venta a distancia a un particular de otro país de la UE', 'Con IVA español mientras el total de estas ventas en la UE no supere 10.000 € al año; por encima, IVA del país del cliente (ventanilla única)'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Servicio de 2.000 € a una empresa alemana',
          lineas: [{ cuenta: '430', debe: 2000 }, { cuenta: '705', haber: 2000 }],
          nota: 'Sin línea de 477. La factura debe indicar «inversión del sujeto pasivo» y el NIF-IVA del cliente, comprobado en el VIES.',
        },
        {
          tipo: 'gestoria',
          html: 'Antes de facturar sin IVA a un cliente de la UE, comprueba su NIF-IVA en el <strong>VIES</strong> y guarda la captura. Si no es válido, la operación lleva IVA español y el error lo paga tu cliente.',
        },
      ],
    },
  ],

  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  test: [
    /* --- Emisión --- */
    {
      id: 'b2-q01',
      pregunta: 'Tu cliente vende material a una empresa el 20 de octubre. ¿Hasta cuándo puede emitir la factura?',
      correcta: 'Antes del 16 de noviembre',
      incorrectas: ['Hasta el 31 de diciembre', 'Solo el mismo 20 de octubre'],
      explicacion: 'Cuando el destinatario es empresario o profesional, la factura debe expedirse antes del día 16 del mes siguiente a la operación. A un particular, se le factura en el momento.',
    },
    {
      id: 'b2-q02',
      pregunta: 'Un cliente quiere numerar sus facturas por años (2026/001, 2026/002…) y usar otra serie para las rectificativas. ¿Es correcto?',
      correcta: 'Sí: la numeración es correlativa dentro de cada serie',
      incorrectas: ['No: debe existir una única serie para siempre', 'No: las rectificativas deben llevar el mismo número que la original'],
      explicacion: 'Se pueden usar varias series (por año, por establecimiento o por tipo) siempre que dentro de cada una la numeración sea correlativa. Las rectificativas deben ir en una serie específica.',
    },
    {
      id: 'b2-q03',
      pregunta: '¿Cómo se registran habitualmente las ventas con ticket de un bar?',
      correcta: 'Con un asiento resumen, diario o mensual, a partir de los cierres de caja',
      incorrectas: ['Con un asiento por cada ticket emitido', 'No se registran hasta el cierre del ejercicio'],
      explicacion: 'Las ventas a particulares con factura simplificada se registran de forma agregada, separando lo cobrado en efectivo (570) y con tarjeta (572), y desglosando base e IVA.',
    },
    {
      id: 'b2-q04',
      pregunta: '¿De qué libro registro sale el IVA devengado que declara tu cliente en el 303?',
      correcta: 'Del libro registro de facturas expedidas',
      incorrectas: ['Del libro registro de facturas recibidas', 'Del libro de inventarios y cuentas anuales'],
      explicacion: 'Las facturas emitidas alimentan el IVA devengado (repercutido). Las recibidas, el IVA deducible.',
    },
    {
      id: 'b2-q05',
      pregunta: 'Revisando las ventas del trimestre, entre la factura 044 y la 046 falta la 045. ¿Qué haces?',
      correcta: 'Preguntar al cliente antes de presentar el 303',
      incorrectas: ['Nada: los huecos en la numeración no importan', 'Crear tú una factura 045 por importe cero'],
      explicacion: 'Un hueco puede ser una factura no entregada (con IVA sin declarar) o una anulada que hay que poder justificar. Nunca se inventan facturas para tapar huecos.',
    },

    /* --- Asiento de venta y anticipos --- */
    {
      id: 'b2-q06',
      pregunta: 'Una distribuidora vende mercancía a un restaurante a 30 días. ¿Cómo queda el asiento?',
      correcta: '430 Clientes al Debe; 700 Ventas y 477 IVA repercutido al Haber',
      incorrectas: ['700 Ventas al Debe; 430 Clientes al Haber', '430 Clientes al Debe; 705 y 472 al Haber'],
      explicacion: 'El cliente debe el total (430, Debe). El ingreso por la base (700, Haber) y el IVA cobrado es una deuda con Hacienda (477, Haber). La 472 es el IVA de las compras.',
    },
    {
      id: 'b2-q07',
      pregunta: 'Un taller mecánico factura una reparación a un cliente. ¿Qué cuenta de ingreso usas?',
      correcta: '705 Prestaciones de servicios',
      incorrectas: ['700 Ventas de mercaderías', '759 Ingresos por servicios diversos'],
      explicacion: 'Cuando la actividad principal es prestar un servicio, el ingreso va a la 705. Si el taller vendiera un recambio suelto en el mostrador, sería una venta (700).',
    },
    {
      id: 'b2-q08',
      pregunta: 'Una empresa alquila a otra una nave que no utiliza; alquilar no es su actividad principal. ¿Dónde registras el ingreso?',
      correcta: '752 Ingresos por arrendamientos',
      incorrectas: ['705 Prestaciones de servicios', '621 Arrendamientos y cánones'],
      explicacion: 'Los ingresos accesorios por alquiler van a la 752. La 621 es el gasto del que paga el alquiler.',
    },
    {
      id: 'b2-q09',
      pregunta: 'Una tienda cobra con tarjeta una venta de 121 € (IVA incluido) a un particular. ¿Qué asiento haces?',
      correcta: '572 Bancos 121 al Debe; 700 Ventas 100 y 477 IVA 21 al Haber',
      incorrectas: ['570 Caja 121 al Debe; 700 Ventas 121 al Haber', '572 Bancos 121 al Debe; 700 Ventas 121 al Haber'],
      explicacion: 'El cobro con tarjeta acaba en el banco (572). Del total, 121 / 1,21 = 100 € es la venta y 21 € el IVA repercutido.',
    },
    {
      id: 'b2-q10',
      pregunta: '¿Qué representa el saldo de la cuenta 477 IVA repercutido antes de liquidar el trimestre?',
      correcta: 'Una deuda con Hacienda: el IVA cobrado a los clientes',
      incorrectas: ['Un ingreso de la empresa', 'Un derecho de cobro frente a Hacienda'],
      explicacion: 'El IVA repercutido no es un ingreso: la empresa lo cobra en nombre de Hacienda. En la liquidación del 303 se compensa con el IVA soportado (472).',
    },
    {
      id: 'b2-q11',
      pregunta: 'Un cliente adelanta 2.000 € + IVA antes de recibir un encargo. ¿En qué cuenta registras el anticipo?',
      correcta: '438 Anticipos de clientes',
      incorrectas: ['700 Ventas de mercaderías', '407 Anticipos a proveedores'],
      explicacion: 'Aún no hay venta: el anticipo es una deuda con el cliente (438, Haber). La 407 es la cuenta que usaría quien paga el anticipo.',
    },
    {
      id: 'b2-q12',
      pregunta: '¿Lleva IVA un anticipo cobrado a un cliente?',
      correcta: 'Sí: el IVA se devenga al cobrarlo y hay que emitir factura',
      incorrectas: ['No: el IVA solo se aplica en la factura final', 'Solo si el anticipo supera los 3.000 €'],
      explicacion: 'En los pagos anticipados, el IVA se devenga en el momento del cobro por el importe cobrado. En la factura final solo se repercute el IVA pendiente.',
    },
    {
      id: 'b2-q13',
      pregunta: 'Al registrar la factura final de un encargo con anticipo, ¿qué haces con la cuenta 438?',
      correcta: 'Cargarla (Debe) para cancelarla y registrar la venta completa',
      incorrectas: ['Abonarla otra vez por el importe del anticipo', 'Dejarla abierta hasta el cierre del ejercicio'],
      explicacion: 'La venta se registra por el total (700/705, Haber). El anticipo se aplica cargando la 438, y el cliente queda a deber solo la parte pendiente con su IVA.',
    },

    /* --- IVA repercutido y recargo --- */
    {
      id: 'b2-q14',
      pregunta: 'Un restaurante cobra un menú del día. ¿Qué tipo de IVA repercute?',
      correcta: '10 %',
      incorrectas: ['21 %', '4 %'],
      explicacion: 'Los servicios de hostelería y restauración tributan al tipo reducido del 10 %.',
    },
    {
      id: 'b2-q15',
      pregunta: 'Una panadería vende barras de pan común. ¿Qué tipo de IVA repercute?',
      correcta: '4 %',
      incorrectas: ['10 %', '21 %'],
      explicacion: 'El pan común tributa al tipo superreducido del 4 %, igual que la leche, los huevos, las frutas o las verduras.',
    },
    {
      id: 'b2-q16',
      pregunta: 'Esa misma panadería vende cruasanes y ensaimadas. ¿Qué tipo de IVA aplica?',
      correcta: '10 %',
      incorrectas: ['4 %, como el pan', '21 %'],
      explicacion: 'La bollería y la pastelería tributan al 10 %. Por eso una misma factura de panadería suele tener dos tipos.',
    },
    {
      id: 'b2-q17',
      pregunta: 'Un autónomo reforma el baño de la vivienda de un particular; los materiales son menos del 40 % del total. ¿Qué IVA aplica?',
      correcta: '10 %, si se cumplen los requisitos de las obras de renovación de vivienda',
      incorrectas: ['21 % siempre', '4 %'],
      explicacion: 'Las obras de renovación y reparación de viviendas para particulares pueden ir al 10 % si los materiales aportados no superan el 40 % de la base y la vivienda tiene más de dos años. Si no se cumplen, el 21 %.',
    },
    {
      id: 'b2-q18',
      pregunta: 'Un fisioterapeuta colegiado factura una sesión a un paciente. ¿Qué IVA lleva?',
      correcta: 'Ninguno: es asistencia sanitaria exenta',
      incorrectas: ['21 %', '10 %'],
      explicacion: 'La asistencia sanitaria prestada por profesionales sanitarios está exenta. La factura debe indicar la exención, y el fisioterapeuta no deduce el IVA de sus compras.',
    },
    {
      id: 'b2-q19',
      pregunta: 'Una factura emitida tiene bases al 10 % y al 4 %. ¿Cómo registras el IVA repercutido?',
      correcta: 'Una sola 477 con la suma de las cuotas',
      incorrectas: ['Solo la cuota del tipo más alto', 'Una 477 por la cuota y una 472 por la otra'],
      explicacion: 'En el asiento basta una línea de 477 con el total de cuotas. El desglose por tipos lo recoge el libro de facturas expedidas.',
    },
    {
      id: 'b2-q20',
      pregunta: 'Tu cliente mayorista vende a una tienda de barrio de un autónomo en recargo de equivalencia. ¿Qué cambia en la factura?',
      correcta: 'Además del IVA, se añade el recargo: 5,2 % sobre la base de lo que va al 21 %',
      incorrectas: ['Nada: es una factura normal', 'Se aplica una retención del 1 %'],
      explicacion: 'Al minorista en recargo se le cobra IVA y recargo (5,2 %, 1,4 % o 0,5 % según el tipo de IVA). El mayorista ingresa ambos en su 303.',
    },
    {
      id: 'b2-q21',
      pregunta: '¿Quién puede estar en el régimen de recargo de equivalencia?',
      correcta: 'Comerciantes minoristas personas físicas o comunidades de bienes que revenden sin transformar',
      incorrectas: ['Cualquier sociedad que venda al público', 'Los bares y restaurantes'],
      explicacion: 'El régimen es para minoristas personas físicas (o comunidades de bienes). Las sociedades, la hostelería y quienes transforman lo que venden quedan fuera.',
    },
    {
      id: 'b2-q22',
      pregunta: 'Un minorista en recargo de equivalencia, ¿presenta el modelo 303?',
      correcta: 'No: el IVA y el recargo que paga a sus proveedores son coste de sus compras',
      incorrectas: ['Sí, cada trimestre como cualquier empresa', 'Sí, pero solo para deducir el IVA de sus compras'],
      explicacion: 'El minorista en recargo no repercute ni deduce IVA en sus ventas a consumidores, así que no presenta el 303 por esa actividad.',
    },
    {
      id: 'b2-q23',
      pregunta: 'Una factura emitida está exenta de IVA. ¿Qué debe indicar?',
      correcta: 'La causa de la exención (por ejemplo, el artículo de la Ley del IVA)',
      incorrectas: ['Nada: basta con poner IVA 0 %', 'Que se emite como factura simplificada'],
      explicacion: 'Las facturas exentas, con inversión del sujeto pasivo o entregas intracomunitarias deben mencionar el motivo por el que no llevan IVA.',
    },

    /* --- Retenciones soportadas --- */
    {
      id: 'b2-q24',
      pregunta: 'Tu cliente, una arquitecta autónoma, factura 2.000 € + IVA a una empresa con un 15 % de retención. ¿Cómo queda el asiento?',
      correcta: '430 por 2.120 y 473 por 300 al Debe; 705 por 2.000 y 477 por 420 al Haber',
      incorrectas: ['430 por 2.420 al Debe; 705 por 2.000 y 477 por 420 al Haber', '430 por 2.120 al Debe; 4751 por 300, 705 y 477 al Haber'],
      explicacion: 'La empresa le pagará 2.000 + 420 − 300 = 2.120 €. La retención es un pago a cuenta de su IRPF: un derecho frente a Hacienda (473, Debe).',
    },
    {
      id: 'b2-q25',
      pregunta: 'Para tu cliente profesional, ¿qué es la retención que le practican sus clientes?',
      correcta: 'Un pago a cuenta de su IRPF: un derecho frente a Hacienda (473)',
      incorrectas: ['Una deuda con Hacienda (4751)', 'Un gasto de su actividad'],
      explicacion: 'La 4751 la usa quien retiene; quien soporta la retención usa la 473. La descontará en sus pagos fraccionados y en su declaración de la renta.',
    },
    {
      id: 'b2-q26',
      pregunta: 'La arquitecta factura a un particular el proyecto de reforma de su casa. ¿Hay retención?',
      correcta: 'No: los particulares no practican retenciones',
      incorrectas: ['Sí, del 15 %', 'Sí, del 7 %'],
      explicacion: 'Solo están obligados a retener las empresas y los profesionales. El particular paga el total de la factura.',
    },

    /* --- Abonos y descuentos --- */
    {
      id: 'b2-q27',
      pregunta: 'Un cliente devuelve mercancía y emites un abono. ¿Cómo queda el asiento?',
      correcta: '708 Devoluciones de ventas y 477 al Debe; 430 al Haber',
      incorrectas: ['430 al Debe; 708 y 477 al Haber', 'Se borra la factura original del libro'],
      explicacion: 'El abono reduce el ingreso (708, Debe), el IVA repercutido (477, Debe) y lo que debe el cliente (430, Haber).',
    },
    {
      id: 'b2-q28',
      pregunta: 'A final de año tu cliente concede un rappel por volumen a su mejor comprador. ¿Qué cuenta usa?',
      correcta: '709 Rappels sobre ventas',
      incorrectas: ['609 Rappels por compras', '708 Devoluciones de ventas'],
      explicacion: 'El rappel concedido reduce las ventas: 709, al Debe. La 609 la usaría el comprador que lo recibe.',
    },
    {
      id: 'b2-q29',
      pregunta: 'Tu cliente concede un descuento a un comprador por pagar antes del vencimiento. ¿Qué cuenta usa?',
      correcta: '706 Descuentos sobre ventas por pronto pago',
      incorrectas: ['626 Servicios bancarios y similares', '606 Descuentos sobre compras por pronto pago'],
      explicacion: 'El descuento por pronto pago concedido fuera de factura va a la 706, al Debe. La 606 es la del comprador.',
    },
    {
      id: 'b2-q30',
      pregunta: 'Una factura emitida tiene mal el NIF del cliente. ¿Cómo se corrige?',
      correcta: 'Con una factura rectificativa que haga referencia a la original',
      incorrectas: ['Editando el PDF y volviéndolo a enviar', 'Emitiendo otra factura con el mismo número'],
      explicacion: 'Las facturas emitidas no se modifican ni se borran: se corrigen con una rectificativa en su serie propia, indicando qué factura rectifica y el motivo.',
    },

    /* --- Morosos --- */
    {
      id: 'b2-q31',
      pregunta: 'Un cliente lleva 4 meses sin pagar y ya no contesta. ¿Qué asiento haces?',
      correcta: '436 Clientes de dudoso cobro al Debe; 430 Clientes al Haber',
      incorrectas: ['650 Pérdidas de créditos incobrables al Debe; 430 al Haber', '694 al Debe; 490 al Haber, sin tocar la 430'],
      explicacion: 'El primer paso es reclasificar la deuda a dudoso cobro. La pérdida se reconoce después (deterioro al cierre o baja definitiva si es incobrable).',
    },
    {
      id: 'b2-q32',
      pregunta: 'Al cierre, estimas que una deuda de dudoso cobro de 5.000 € no se cobrará. ¿Qué asiento haces?',
      correcta: '694 Pérdidas por deterioro de créditos comerciales al Debe; 490 Deterioro de valor de créditos al Haber',
      incorrectas: ['650 al Debe; 436 al Haber', '490 al Debe; 794 al Haber'],
      explicacion: 'El deterioro reconoce la pérdida estimada sin dar de baja la deuda: gasto en la 694 y corrección de valor en la 490. La 650 es para la pérdida definitiva.',
    },
    {
      id: 'b2-q33',
      pregunta: 'Una deuda de dudoso cobro, sin deterioro previo, resulta definitivamente incobrable. ¿Qué asiento haces?',
      correcta: '650 Pérdidas de créditos comerciales incobrables al Debe; 436 al Haber',
      incorrectas: ['694 al Debe; 490 al Haber', '436 al Debe; 430 al Haber'],
      explicacion: 'La pérdida definitiva va a la 650 y la deuda se da de baja. Si antes se hubiera dotado deterioro, también se aplicaría la 490.',
    },
    {
      id: 'b2-q34',
      pregunta: 'Cobras por banco una deuda por la que dotaste deterioro el año pasado. Además del cobro (572 a 436), ¿qué haces?',
      correcta: 'Revertir el deterioro: 490 al Debe y 794 al Haber',
      incorrectas: ['Nada más: el cobro lo cierra todo', 'Registrar un ingreso en la 769'],
      explicacion: 'El deterioro ya no tiene sentido, así que se revierte: se cancela la 490 y se reconoce un ingreso en la 794 Reversión del deterioro de créditos por operaciones comerciales.',
    },
    {
      id: 'b2-q35',
      pregunta: '¿Qué hace falta, en general, para recuperar el IVA de una factura impagada cuando el deudor no está en concurso?',
      correcta: 'Que pase el plazo legal, reclamar el cobro de forma fehaciente y emitir una rectificativa',
      incorrectas: ['Basta con que la factura esté vencida', 'Solo es posible si el deudor entra en concurso'],
      explicacion: 'Deben pasar 6 meses desde el devengo (1 año para grandes empresas), reclamarse el cobro (judicialmente, por notario u otro medio fehaciente) y emitirse una rectificativa dentro de los 6 meses siguientes.',
    },
    {
      id: 'b2-q36',
      pregunta: 'Después de emitir la rectificativa por impago, ¿qué falta?',
      correcta: 'Comunicarlo a la AEAT en el plazo de un mes',
      incorrectas: ['Nada más', 'Presentar un 390 complementario'],
      explicacion: 'La modificación de la base imponible por impago debe comunicarse a la Agencia Tributaria en el mes siguiente a la fecha de la rectificativa.',
    },
    {
      id: 'b2-q37',
      pregunta: 'Al registrar la rectificativa que anula el IVA de un impagado, ¿qué ocurre con la 477?',
      correcta: 'Se carga (Debe) por la cuota, con abono a la 436',
      incorrectas: ['Se abona (Haber) por la cuota', 'Se sustituye por la 472'],
      explicacion: 'Se reduce el IVA repercutido que se debía a Hacienda (477, Debe) y la deuda del cliente en ese importe (436, Haber). El resto de la deuda se sigue reclamando.',
    },
    {
      id: 'b2-q38',
      pregunta: '¿Cuál es el plazo máximo de pago entre empresas que fija la ley de morosidad?',
      correcta: '60 días (30 si no se pacta otro)',
      incorrectas: ['90 días', '120 días'],
      explicacion: 'El plazo legal es de 30 días si no se pacta nada, y las partes pueden ampliarlo como máximo a 60 días.',
    },

    /* --- Ventas a otros países --- */
    {
      id: 'b2-q39',
      pregunta: 'Tu cliente vende mercancía a una empresa francesa con un NIF-IVA válido. ¿Qué IVA lleva la factura?',
      correcta: 'Ninguno: es una entrega intracomunitaria exenta, que va al 349 con la clave E',
      incorrectas: ['21 % de IVA español', 'El IVA francés, que cobra tu cliente'],
      explicacion: 'Las entregas de bienes a empresarios de otro país de la UE con NIF-IVA válido están exentas. Hay que comprobar el NIF en el VIES y declararlas en el 349.',
    },
    {
      id: 'b2-q40',
      pregunta: 'Una agencia de diseño española factura un servicio a una empresa alemana. ¿Qué IVA lleva?',
      correcta: 'Ninguno español: lo autorrepercute el cliente alemán; va al 349 con la clave S',
      incorrectas: ['21 % de IVA español', 'Está exenta como una exportación'],
      explicacion: 'Los servicios entre empresas se gravan, en general, donde está el cliente. La factura indica «inversión del sujeto pasivo» y la operación se declara en el 349.',
    },
  ],

  casos: [
    {
      id: 'b2-venta',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje para hostelería' },
      titulo: 'Factura de venta a un restaurante',
      enunciado: 'Tu cliente te pasa una de las facturas que ha emitido este mes. Revisa los datos y registra la venta.',
      documento: {
        tipo: 'factura',
        color: '#0f766e',
        emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030', direccion: ['C/ Font d’en Carròs, 9 · 46017 Valencia'] },
        receptor: { nombre: 'Mesón La Encina, S.L.', nif: 'B98556677', direccion: ['C/ Mayor, 8 · 46900 Torrent (Valencia)'] },
        numero: '2026/0241',
        fecha: '08/10/2026',
        vencimiento: '07/11/2026',
        formaPago: 'Transferencia a 30 días',
        lineas: [
          { concepto: 'Plato llano de porcelana 27 cm (caja de 12)', cantidad: 20, precio: 54, iva: 21 },
          { concepto: 'Copa de vino 35 cl (caja de 24)', cantidad: 10, precio: 24, iva: 21 },
          { concepto: 'Cubertería de acero (set de 24 piezas)', cantidad: 8, precio: 60, iva: 21 },
        ],
      },
      cuentasDisponibles: ['430', '400', '700', '705', '600', '472', '477', '572'],
      solucion: [{ cuenta: '430', debe: 2178 }, { cuenta: '700', haber: 1800 }, { cuenta: '477', haber: 378 }],
      pista: 'Es el espejo de una compra: ¿quién debe el total?, ¿qué se ha vendido?, ¿qué IVA se ha cobrado?',
      explicacion: 'El restaurante debe el total: 430 por 2.178 €. La venta de mercaderías va a la 700 por la base (1.080 + 240 + 480 = 1.800 €) y el IVA cobrado a la 477 (378 €).',
    },
    {
      id: 'b2-dos-tipos',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Venta con pan y bollería',
      enunciado: 'La panadería sirve cada semana a una cafetería. Registra esta factura emitida: fíjate en los tipos de IVA.',
      documento: {
        tipo: 'factura',
        color: '#b45309',
        emisor: { nombre: 'Horno San Blas, S.L.', nif: 'B98221133', direccion: ['C/ San Vicente, 77 · 46007 Valencia'] },
        receptor: { nombre: 'Cafetería Plaza Mayor, S.L.', nif: 'B98445511', direccion: ['Plaza Mayor, 2 · 46001 Valencia'] },
        numero: 'HSB-2026/0388',
        fecha: '11/10/2026',
        vencimiento: '10/11/2026',
        formaPago: 'Recibo domiciliado a 30 días',
        lineas: [
          { concepto: 'Barra de pan común', cantidad: 300, precio: 0.5, iva: 4 },
          { concepto: 'Cruasán de mantequilla', cantidad: 200, precio: 0.6, iva: 10 },
          { concepto: 'Ensaimada', cantidad: 50, precio: 1.2, iva: 10 },
        ],
      },
      cuentasDisponibles: ['430', '700', '705', '472', '477', '438', '572'],
      solucion: [{ cuenta: '430', debe: 354 }, { cuenta: '700', haber: 330 }, { cuenta: '477', haber: 24 }],
      pista: 'Suma las bases de los dos tipos para la venta y las dos cuotas para el IVA.',
      explicacion: 'Pan al 4 % (base 150 €, cuota 6 €) y bollería al 10 % (base 180 €, cuota 18 €). Venta por 330 €, una sola 477 por 24 € y el cliente debe 354 €.',
    },
    {
      id: 'b2-caja',
      tipo: 'asiento',
      cliente: { nombre: 'Bar Los Arcos, S.L.', actividad: 'Bar y restaurante' },
      titulo: 'Ventas del mes según los cierres de caja',
      enunciado: 'El bar no emite facturas completas: vende con ticket. Te manda el resumen mensual de sus cierres de caja. Registra las ventas del mes en un único asiento.',
      documento: {
        tipo: 'resumen',
        titulo: 'Resumen de cierres de caja (informes Z)',
        subtitulo: 'Octubre 2026 · TPV del local',
        emisor: { nombre: 'Bar Los Arcos, S.L.', nif: 'B98667700' },
        columnas: ['Concepto', 'Importe'],
        filas: [
          ['Días con actividad', '27'],
          ['Tickets emitidos', '3.912'],
          ['Ventas totales (IVA 10 % incluido)', '15.400,00 €'],
          ['Cobrado en efectivo', '4.400,00 €'],
          ['Cobrado con tarjeta', '11.000,00 €'],
        ],
        notas: ['Todos los productos y servicios del local tributan al 10 %.', 'Los cobros con tarjeta se abonan íntegros en la cuenta del banco.'],
      },
      cuentasDisponibles: ['570', '572', '430', '700', '705', '477', '472'],
      solucion: [{ cuenta: '570', debe: 4400 }, { cuenta: '572', debe: 11000 }, { cuenta: '700', haber: 14000 }, { cuenta: '477', haber: 1400 }],
      alternativas: [[{ cuenta: '570', debe: 4400 }, { cuenta: '572', debe: 11000 }, { cuenta: '705', haber: 14000 }, { cuenta: '477', haber: 1400 }]],
      pista: 'Los importes del informe llevan el IVA incluido: divide entre 1,10 para obtener la base. El dinero está en la caja y en el banco.',
      explicacion: 'Lo cobrado entra en la caja (570, 4.400 €) y en el banco (572, 11.000 €). La base es 15.400 / 1,10 = 14.000 € de ventas (700; algunas gestorías usan la 705 en hostelería) y el IVA repercutido, 1.400 € (477).',
    },
    {
      id: 'b2-tipos',
      tipo: 'clasificar',
      titulo: '¿Qué IVA repercute cada cliente?',
      enunciado: 'Repasas las ventas de varios clientes de la gestoría. Indica el tipo de IVA que corresponde a cada operación.',
      rejilla: 'grid-cols-4',
      opciones: [
        { valor: '21', etiqueta: '21 %' },
        { valor: '10', etiqueta: '10 %' },
        { valor: '4', etiqueta: '4 %' },
        { valor: 'exenta', etiqueta: 'Exenta' },
      ],
      cuentas: [
        { id: 'menu', texto: 'Un restaurante cobra un menú del día', correcta: '10', pista: 'Es un servicio de hostelería.', explicacion: 'Hostelería y restauración: tipo reducido.' },
        { id: 'pan', texto: 'Una panadería vende barras de pan común', correcta: '4', pista: 'Es un alimento de primera necesidad.', explicacion: 'Pan común: tipo superreducido.' },
        { id: 'consultoria', texto: 'Una consultora factura un estudio de mercado a una empresa', correcta: '21', pista: 'Servicio profesional sin ningún tipo especial.', explicacion: 'Servicios profesionales: tipo general.' },
        { id: 'fisio', texto: 'Un fisioterapeuta colegiado factura una sesión a un paciente', correcta: 'exenta', pista: 'Es asistencia sanitaria.', explicacion: 'Asistencia sanitaria: exenta.' },
        { id: 'libro', texto: 'Una librería vende un libro en papel', correcta: '4', pista: 'Libros, periódicos y revistas tienen un tipo especial.', explicacion: 'Libros: tipo superreducido.' },
        { id: 'reforma', texto: 'Un autónomo reforma el baño de la vivienda de un particular (vivienda de más de 2 años, materiales por debajo del 40 %)', correcta: '10', pista: 'Las obras de renovación de vivienda tienen un tipo reducido si se cumplen requisitos.', explicacion: 'Renovación de vivienda con requisitos: tipo reducido.' },
        { id: 'abrigo', texto: 'Una tienda de ropa vende un abrigo', correcta: '21', pista: 'La ropa no tiene tipo reducido.', explicacion: 'Ropa: tipo general.' },
        { id: 'correduria', texto: 'Una correduría cobra su comisión por mediar en un seguro', correcta: 'exenta', pista: 'Los seguros y su mediación tienen un tratamiento especial.', explicacion: 'Seguros y su mediación: exentos.' },
      ],
      resumenOk: 'Aplicar el tipo correcto es responsabilidad de quien factura: si tu cliente cobra un 10 % donde tocaba un 21 %, la diferencia la pagará él en una comprobación.',
    },
    {
      id: 'b2-recargo',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Venta a una tienda en recargo de equivalencia',
      enunciado: 'Tu cliente vende a un bazar de barrio que lleva una autónoma en recargo de equivalencia. Registra la factura emitida.',
      documento: {
        tipo: 'factura',
        color: '#0f766e',
        recargo: true,
        emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030', direccion: ['C/ Font d’en Carròs, 9 · 46017 Valencia'] },
        receptor: { nombre: 'Rosa Martí Ferrer · Bazar Rosa', nif: '34567890V', direccion: ['C/ Doctor Sumsi, 12 · 46005 Valencia'] },
        numero: '2026/0257',
        fecha: '14/10/2026',
        vencimiento: '13/11/2026',
        formaPago: 'Transferencia a 30 días',
        menciones: ['Cliente acogido al régimen especial del recargo de equivalencia.'],
        lineas: [
          { concepto: 'Juego de vasos (pack de 6)', cantidad: 40, precio: 8, iva: 21 },
          { concepto: 'Sartén antiadherente 24 cm', cantidad: 20, precio: 24, iva: 21 },
        ],
      },
      cuentasDisponibles: ['430', '700', '477', '472', '473', '4751', '572'],
      solucion: [{ cuenta: '430', debe: 1009.6 }, { cuenta: '700', haber: 800 }, { cuenta: '477', haber: 209.6 }],
      pista: 'El recargo, como el IVA, se cobra al cliente y se ingresa a Hacienda. ¿Dónde va entonces?',
      explicacion: 'Venta por la base (800 €). IVA (168 €) y recargo (41,60 €) son deudas con Hacienda: 477 por 209,60 € (muchas gestorías llevan el recargo en una subcuenta propia de la 477). La tienda debe 1.009,60 €.',
    },
    {
      id: 'b2-retencion',
      tipo: 'asiento',
      cliente: { nombre: 'Marta Gil Soler', actividad: 'Arquitecta autónoma' },
      titulo: 'Factura de una profesional con retención',
      enunciado: 'Tu clienta es arquitecta. Ha facturado un proyecto a una promotora, que le practicará la retención. Registra su factura emitida.',
      documento: {
        tipo: 'factura',
        color: '#1e3a8a',
        emisor: { nombre: 'Marta Gil Soler · Arquitecta', nif: '23456789D', direccion: ['C/ Cirilo Amorós, 60, 2.º · 46004 Valencia'] },
        receptor: { nombre: 'Promociones Huerta Norte, S.L.', nif: 'B98990022', direccion: ['Av. de Aragón, 30 · 46021 Valencia'] },
        numero: 'MG-2026/019',
        fecha: '15/10/2026',
        formaPago: 'Transferencia a 15 días',
        retencion: 15,
        lineas: [
          { concepto: 'Honorarios: proyecto básico de reforma de local', cantidad: 1, precio: 2000, iva: 21 },
        ],
      },
      cuentasDisponibles: ['430', '473', '4751', '705', '700', '477', '472', '410'],
      solucion: [{ cuenta: '430', debe: 2120 }, { cuenta: '473', debe: 300 }, { cuenta: '705', haber: 2000 }, { cuenta: '477', haber: 420 }],
      pista: 'La promotora le pagará menos del total con IVA. La diferencia no se pierde: ¿quién la debe ahora?',
      explicacion: 'Ingreso por la base en la 705 (2.000 €) e IVA repercutido en la 477 (420 €). La promotora pagará 2.120 € (430). Los 300 € retenidos los ingresa la promotora a Hacienda a cuenta del IRPF de la arquitecta: para ella son un derecho (473). No es la 4751: esa la usa quien retiene.',
    },
    {
      id: 'b2-anticipo',
      tipo: 'asiento',
      cliente: { nombre: 'Cocinas Martí, S.L.', actividad: 'Venta e instalación de cocinas' },
      titulo: 'Cobro de un anticipo',
      enunciado: 'Una clienta ha encargado una cocina y ha pagado por transferencia el 30 % por adelantado. Tu cliente ha emitido esta factura de anticipo. Registra el cobro.',
      documento: {
        tipo: 'factura',
        titulo: 'FACTURA DE ANTICIPO',
        color: '#7c3aed',
        emisor: { nombre: 'Cocinas Martí, S.L.', nif: 'B98334477', direccion: ['C/ Archiduque Carlos, 88 · 46014 Valencia'] },
        receptor: { nombre: 'Elena Ferrer Sanz', nif: '45678901G', direccion: ['C/ Pintor Benedito, 5, 4.º · 46007 Valencia'] },
        numero: 'A-2026/012',
        fecha: '02/10/2026',
        formaPago: 'Cobrado por transferencia el 02/10/2026',
        lineas: [
          { concepto: 'Anticipo del 30 %: cocina a medida según presupuesto P-2026-118', cantidad: 1, precio: 1500, iva: 21 },
        ],
      },
      cuentasDisponibles: ['572', '430', '438', '407', '700', '477', '472'],
      solucion: [{ cuenta: '572', debe: 1815 }, { cuenta: '438', haber: 1500 }, { cuenta: '477', haber: 315 }],
      pista: 'El dinero ya está en el banco, pero la cocina aún no se ha entregado: todavía no hay venta.',
      explicacion: 'Entra el dinero en el banco (572, 1.815 €). Como aún no hay venta, la base es una deuda con la clienta: 438 Anticipos de clientes (1.500 €). El IVA del anticipo se devenga al cobrarlo: 477 (315 €).',
    },
    {
      id: 'b2-final',
      tipo: 'asiento',
      cliente: { nombre: 'Cocinas Martí, S.L.', actividad: 'Venta e instalación de cocinas' },
      titulo: 'Factura final descontando el anticipo',
      enunciado: 'Se ha instalado la cocina del caso anterior. Tu cliente emite la factura final, que descuenta el anticipo ya facturado. Registra el asiento.',
      documento: {
        tipo: 'factura',
        color: '#7c3aed',
        emisor: { nombre: 'Cocinas Martí, S.L.', nif: 'B98334477', direccion: ['C/ Archiduque Carlos, 88 · 46014 Valencia'] },
        receptor: { nombre: 'Elena Ferrer Sanz', nif: '45678901G', direccion: ['C/ Pintor Benedito, 5, 4.º · 46007 Valencia'] },
        numero: '2026/0154',
        fecha: '23/10/2026',
        vencimiento: '23/10/2026',
        formaPago: 'Transferencia a la entrega',
        lineas: [
          { concepto: 'Cocina a medida: muebles, encimera e instalación (presupuesto P-2026-118)', cantidad: 1, precio: 5000, iva: 21 },
          { concepto: 'A deducir: anticipo facturado (factura A-2026/012)', cantidad: 1, precio: -1500, iva: 21 },
        ],
      },
      cuentasDisponibles: ['430', '438', '572', '700', '705', '477', '472'],
      solucion: [{ cuenta: '430', debe: 4235 }, { cuenta: '438', debe: 1500 }, { cuenta: '700', haber: 5000 }, { cuenta: '477', haber: 735 }],
      alternativas: [[{ cuenta: '430', debe: 4235 }, { cuenta: '438', debe: 1500 }, { cuenta: '705', haber: 5000 }, { cuenta: '477', haber: 735 }]],
      pista: 'La venta es por el total de la cocina. El anticipo se cancela y solo se repercute el IVA pendiente.',
      explicacion: 'La venta se registra completa (700, 5.000 €). Se cancela el anticipo (438 al Debe, 1.500 €). El IVA pendiente es el 21 % de 3.500 € = 735 € (477), y la clienta debe 4.235 € (430).',
    },
    {
      id: 'b2-abono',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje para hostelería' },
      titulo: 'Abono por devolución',
      enunciado: 'El restaurante devolvió unas cajas de copas que llegaron rotas. Tu cliente ha emitido esta factura rectificativa. Registra el abono.',
      documento: {
        tipo: 'factura',
        titulo: 'FACTURA RECTIFICATIVA',
        color: '#c2410c',
        emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030', direccion: ['C/ Font d’en Carròs, 9 · 46017 Valencia'] },
        receptor: { nombre: 'Mesón La Encina, S.L.', nif: 'B98556677', direccion: ['C/ Mayor, 8 · 46900 Torrent (Valencia)'] },
        numero: 'R-2026/007',
        fecha: '16/10/2026',
        rectifica: 'Rectifica la factura 2026/0241 de 08/10/2026. Motivo: devolución de mercancía dañada en el transporte.',
        formaPago: 'Se descontará del próximo cobro',
        lineas: [
          { concepto: 'Devolución: copa de vino 35 cl (caja de 24)', cantidad: -5, precio: 24, iva: 21 },
        ],
      },
      cuentasDisponibles: ['430', '700', '708', '709', '477', '472', '572'],
      solucion: [{ cuenta: '708', debe: 120 }, { cuenta: '477', debe: 25.2 }, { cuenta: '430', haber: 145.2 }],
      alternativas: [[{ cuenta: '700', debe: 120 }, { cuenta: '477', debe: 25.2 }, { cuenta: '430', haber: 145.2 }]],
      pista: 'Los importes son negativos: anota cantidades positivas en el lado contrario al de una venta.',
      explicacion: 'Baja el ingreso (708 Devoluciones de ventas al Debe, 120 €; también vale cargar la 700), baja el IVA repercutido (477 al Debe, 25,20 €) y baja la deuda del restaurante (430 al Haber, 145,20 €).',
    },
    {
      id: 'b2-ue',
      tipo: 'asiento',
      cliente: { nombre: 'Estudio Creativo Píxel, S.L.', actividad: 'Agencia de diseño' },
      titulo: 'Servicio a una empresa francesa',
      enunciado: 'La agencia ha diseñado la imagen de marca de una empresa de Lyon, cuyo NIF-IVA has comprobado en el VIES. Registra la factura emitida.',
      documento: {
        tipo: 'factura',
        color: '#2563eb',
        emisor: { nombre: 'Estudio Creativo Píxel, S.L.', nif: 'ESB98445566', direccion: ['C/ Literato Azorín, 11 · 46006 Valencia'] },
        receptor: { nombre: 'Atelier Lumière SARL', nif: 'FR12345678901', direccion: ['12 rue de l’Exemple · 69002 Lyon (Francia)'] },
        numero: 'PX-2026/077',
        fecha: '20/10/2026',
        vencimiento: '19/11/2026',
        formaPago: 'Transferencia a 30 días',
        menciones: ['Operación con inversión del sujeto pasivo (art. 196 de la Directiva 2006/112/CE).'],
        lineas: [
          { concepto: 'Diseño de identidad corporativa y manual de marca', cantidad: 1, precio: 3000, iva: 0 },
        ],
      },
      cuentasDisponibles: ['430', '705', '700', '477', '472', '473', '572'],
      solucion: [{ cuenta: '430', debe: 3000 }, { cuenta: '705', haber: 3000 }],
      pista: 'La factura no lleva IVA español. ¿Hace falta alguna línea de IVA en tu asiento?',
      explicacion: 'Solo dos líneas: el cliente francés debe 3.000 € (430) y el ingreso es una prestación de servicios (705). No hay 477: el IVA lo autorrepercute la empresa francesa en su país. La operación va al modelo 349 con la clave S.',
    },
    {
      id: 'b2-dudoso',
      tipo: 'asiento',
      cliente: { nombre: 'Reformas Integrales Turia, S.L.', actividad: 'Empresa de reformas' },
      titulo: 'Un cliente que no paga',
      enunciado: 'Revisas el saldo de clientes de la empresa de reformas. Una de sus facturas lleva meses vencida. Registra el asiento que corresponde ahora.',
      documento: {
        tipo: 'resumen',
        titulo: 'Extracto de cuenta de cliente',
        subtitulo: '43000045 · Construcciones Hidalgo, S.L. · a 20/10/2026',
        emisor: { nombre: 'Reformas Integrales Turia, S.L.', nif: 'B98443322' },
        columnas: ['Fecha', 'Concepto', 'Debe', 'Saldo'],
        filas: [
          ['15/03/2026', 'Factura F\u20112026/021 (obra C/\u00a0Sagunto)', '6.050,00', '6.050,00'],
        ],
        notas: [
          'Vencimiento: 14/04/2026. Ningún cobro desde entonces.',
          '02/06/2026: reclamación por correo electrónico, sin respuesta.',
          '10/07/2026: requerimiento notarial de pago, sin respuesta.',
        ],
      },
      cuentasDisponibles: ['436', '430', '490', '694', '650', '477', '572'],
      solucion: [{ cuenta: '436', debe: 6050 }, { cuenta: '430', haber: 6050 }],
      pista: 'Todavía no sabes si se perderá. El primer paso es separar esta deuda de las que se cobran con normalidad.',
      explicacion: 'Con meses de retraso y reclamaciones sin respuesta, la deuda es de dudoso cobro: se reclasifica de la 430 a la 436 por el total (6.050 €). La pérdida se reconocerá después: deterioro al cierre (694/490) o baja definitiva (650).',
    },
    {
      id: 'b2-iva-impagado',
      tipo: 'asiento',
      cliente: { nombre: 'Reformas Integrales Turia, S.L.', actividad: 'Empresa de reformas' },
      titulo: 'Recuperar el IVA del impagado',
      enunciado: 'Se cumplen los requisitos para recuperar el IVA de la factura impagada del caso anterior y has emitido esta rectificativa (ya está comunicada a la AEAT). La deuda se sigue reclamando. Registra solo el efecto en el IVA.',
      documento: {
        tipo: 'factura',
        titulo: 'FACTURA RECTIFICATIVA',
        color: '#c2410c',
        emisor: { nombre: 'Reformas Integrales Turia, S.L.', nif: 'B98443322', direccion: ['C/ Músico Ginés, 31 · 46022 Valencia'] },
        receptor: { nombre: 'Construcciones Hidalgo, S.L.', nif: 'B98113355', direccion: ['C/ Sagunto, 150 · 46009 Valencia'] },
        numero: 'R-2026/003',
        fecha: '20/10/2026',
        rectifica: 'Rectifica la factura F-2026/021 de 15/03/2026. Motivo: modificación de la base imponible por crédito incobrable (art. 80.Cuatro de la Ley del IVA).',
        lineas: [
          { concepto: 'Modificación de la base imponible de la obra facturada en F-2026/021', cantidad: 1, precio: -5000, iva: 21 },
        ],
      },
      cuentasDisponibles: ['477', '472', '436', '430', '650', '694', '490', '708'],
      solucion: [{ cuenta: '477', debe: 1050 }, { cuenta: '436', haber: 1050 }],
      pista: 'Lo que recuperas es el IVA que ya ingresaste a Hacienda. ¿Qué cuenta recogió ese IVA y cuál la deuda del cliente?',
      explicacion: 'Se anula el IVA repercutido que nunca se cobró: 477 al Debe por 1.050 €, con abono a la 436. El cliente sigue debiendo la base (5.000 €), que se deteriorará al cierre o se dará de baja si resulta definitivamente incobrable. Si algún día paga, habrá que volver a repercutir el IVA.',
    },
  ],
};

/* ---------- Bloque 3: Tesorería y Bancos (gestoría) ---------- */

// Datos comunes de los extractos (banco y cuentas ficticios)
const BANCO_FICTICIO = 'Banco Turia';

const EXTRACTO_EJEMPLO_B3 = {
  tipo: 'extracto',
  banco: BANCO_FICTICIO,
  titular: 'Moda Valentina, S.L.',
  iban: 'ES00 9999 0001 1100 0012 3456',
  periodo: '01/10/2026 – 08/10/2026',
  saldoInicial: 6420.15,
  movimientos: [
    { fecha: '01/10', concepto: 'RECIBO ALQUILER LOCAL OCTUBRE', detalle: 'Inmuebles del Puerto, S.L.', importe: -1020 },
    { fecha: '02/10', concepto: 'LIQUIDACION TPV 01/10', detalle: 'Bruto 845,00 · comisión 4,23', importe: 840.77 },
    { fecha: '05/10', concepto: 'TRANSFERENCIA A TEXTILES ALBUFERA SL', detalle: 'Ref. FV-2026/1102', importe: -1210 },
    { fecha: '06/10', concepto: 'COMISION MANTENIMIENTO', importe: -12 },
    { fecha: '08/10', concepto: 'TRANSF. RECIBIDA', detalle: 'Ordenante: J. GARCIA · Concepto: PAGO', importe: 250 },
  ],
};

const CONTENIDO_B3 = {
  teoria: [
    {
      id: 'extracto',
      titulo: 'El extracto: tu fuente de verdad',
      resumen: 'Cómo leerlo sin confundirte de lado.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>En una gestoría, gran parte del trabajo de bancos consiste en <strong>contabilizar el extracto</strong> de cada cliente: cada movimiento debe acabar en un asiento, y al final del periodo el saldo de la cuenta 572 tiene que coincidir con el del banco.</p>',
        },
        { tipo: 'documento', documento: EXTRACTO_EJEMPLO_B3 },
        {
          tipo: 'consejo',
          html: '<strong>La trampa del «abono».</strong> El banco habla desde su punto de vista: cuando dice que te <em>abona</em> 250 €, para tu cliente <strong>entra dinero</strong> y la 572 se carga (Debe). Cuando te <em>carga</em> una comisión, la 572 se abona (Haber). Fíjate en el signo del importe, no en la palabra.',
        },
        {
          tipo: 'tabla',
          titulo: 'Del extracto al asiento',
          columnas: ['Movimiento del extracto', 'Asiento habitual'],
          filas: [
            ['Ingreso (+) de un cliente', '572 al Debe · 430 al Haber'],
            ['Pago (−) a un proveedor o acreedor', '400 / 410 / 523 al Debe · 572 al Haber'],
            ['Pago (−) de un impuesto (303, 111, 115)', '4750 / 4751 al Debe · 572 al Haber'],
            ['Comisión (−)', '626 al Debe · 572 al Haber, sin IVA'],
            ['Cuota de préstamo (−)', '520 (capital) y 662 (intereses) al Debe · 572 al Haber'],
            ['Movimiento sin identificar', '555 Partidas pendientes de aplicación, hasta aclararlo'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Pide los extractos en <strong>formato Norma 43</strong> (también llamado Cuaderno 43): la mayoría de programas contables los importan y proponen asientos automáticos. Tu trabajo pasa a ser revisar esas propuestas, que es donde se cuelan los errores.',
        },
      ],
    },
    {
      id: 'cobros-pagos',
      titulo: 'Cobros y pagos: cancelar saldos',
      resumen: 'Cada movimiento cierra una deuda o un derecho.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Un cobro o un pago <strong>no es un ingreso ni un gasto</strong>: esos se registraron al contabilizar la factura. El movimiento del banco solo cancela la deuda pendiente. Por eso, antes de registrar un cobro, busca la factura en la 430 del cliente; antes de un pago, en la 400 o la 410 del proveedor.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Pago a una abogada: factura de 600 € + IVA − 15 % de retención',
          subtitulo: 'La factura ya se registró (623 / 472 / 4751 / 410).',
          lineas: [{ cuenta: '410', debe: 636 }, { cuenta: '572', haber: 636 }],
          nota: 'Se paga lo que se le debe (636 €), no la base ni el total con IVA. La retención (90 €) se pagará a Hacienda con el modelo 111.',
        },
        {
          tipo: 'tabla',
          titulo: 'Situaciones habituales',
          columnas: ['Situación', 'Cómo se resuelve'],
          filas: [
            ['Una transferencia paga varias facturas', 'Se cancela cada factura en la subcuenta del proveedor (una línea por factura o una por el total)'],
            ['Cobro parcial', 'Se cobra lo recibido; el resto queda pendiente en la 430'],
            ['Cobro neto de un abono', 'Se cancelan la factura y el abono: el cobro coincide con la diferencia'],
            ['Traspaso entre dos bancos del cliente', 'Subcuentas distintas de la 572: ni ingreso ni gasto'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Si un cliente paga facturas agrupadas o con descuentos sin avisar, <strong>no fuerces el cuadre</strong> llevando la diferencia a un gasto: pregunta. Una diferencia de céntimos puede deberse a un redondeo; una de 200 €, a una factura que no tienes.',
        },
      ],
    },
    {
      id: 'comisiones-tpv',
      titulo: 'Comisiones, TPV y devoluciones de recibos',
      resumen: 'Los cargos pequeños que más se olvidan.',
      piezas: [
        {
          tipo: 'html',
          html: '<p><strong>Comisiones.</strong> Van a la <strong>626 Servicios bancarios y similares</strong>. La mayoría de servicios financieros están exentos de IVA, así que no hay línea de 472. Si una factura del banco trae IVA (por ejemplo, el alquiler de un datáfono), revísala: ese importe sí puede deducirse.</p><p><strong>Cobros con tarjeta (TPV).</strong> El banco no abona cada venta: agrupa las del día y descuenta su comisión. Muchas gestorías registran las ventas con tarjeta en una subcuenta de clientes («cobros con tarjeta pendientes») y la liquidación la cancela.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Liquidación del TPV: ventas de 845 €, comisión de 4,23 €',
          lineas: [{ cuenta: '572', debe: 840.77 }, { cuenta: '626', debe: 4.23 }, { cuenta: '430', haber: 845 }],
          nota: 'Entra el neto en el banco, la comisión es gasto y se cancela el total pendiente de las ventas con tarjeta.',
        },
        {
          tipo: 'html',
          html: '<p><strong>Devolución de un recibo.</strong> Si tu cliente cobró un recibo domiciliado y el banco del deudor lo devuelve (falta de saldo, orden de no pagar), el cobro se deshace: <strong>el cliente vuelve a deber</strong> (430 al Debe) y sale el dinero del banco. Además, el banco suele cobrar una comisión por la devolución.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Recibo de 354 € devuelto, con 4,50 € de comisión',
          lineas: [{ cuenta: '430', debe: 354 }, { cuenta: '626', debe: 4.5 }, { cuenta: '572', haber: 358.5 }],
          nota: 'La deuda vuelve a estar pendiente: hay que reclamarla. Si se repite, es la primera señal de un moroso (Bloque 2).',
        },
      ],
    },
    {
      id: 'remesas',
      titulo: 'Remesas de recibos y descuento de efectos',
      resumen: 'Cobrar a muchos clientes de una vez, o adelantar el cobro.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Los clientes con muchos cobros recurrentes (distribuidores, academias, gimnasios) envían al banco una <strong>remesa</strong>: un fichero con todos los recibos del mes. Hay dos modalidades:</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['', 'Gestión de cobro', 'Descuento'],
          filas: [
            ['¿Cuándo cobra tu cliente?', 'Al vencimiento, cuando pagan los deudores', 'Antes: el banco adelanta el dinero'],
            ['Coste', 'Comisión de gestión (626)', 'Intereses (665) y comisiones (626)'],
            ['Cuentas', '430 → 572 al cobrar', '4311 efectos descontados y 5208 deuda con el banco'],
            ['Si un deudor no paga', 'Devolución del recibo: 430 vuelve a deber', 'El banco carga el efecto: se cancela la 5208 y el cliente vuelve a deber'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Abono de una remesa al cobro de 4.537,50 €, con 15 € de comisión',
          lineas: [{ cuenta: '572', debe: 4522.5 }, { cuenta: '626', debe: 15 }, { cuenta: '430', haber: 4537.5 }],
          nota: 'Se cancelan las deudas de todos los clientes incluidos en la remesa (en la práctica, una línea por cliente).',
        },
        {
          tipo: 'asiento',
          titulo: 'Descuento de efectos por 3.000 €: intereses 25 € y comisión 6 €',
          subtitulo: 'Los efectos se habían traspasado a la 4311 Efectos comerciales descontados.',
          lineas: [{ cuenta: '572', debe: 2969 }, { cuenta: '665', debe: 25 }, { cuenta: '626', debe: 6 }, { cuenta: '5208', haber: 3000 }],
          nota: 'Al vencimiento, si los clientes pagan, se cancelan la 5208 y la 4311 entre sí.',
        },
      ],
    },
    {
      id: 'prestamos',
      titulo: 'Préstamos: separar capital e intereses',
      resumen: 'La cuota mensual no es todo gasto.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Cada cuota de un préstamo tiene dos partes: <strong>capital</strong>, que devuelve la deuda (no es gasto), e <strong>intereses</strong>, que son gasto financiero (<strong>662 Intereses de deudas</strong>, sin IVA). El banco detalla ambos en el recibo de cada cuota o en el cuadro de amortización.</p><p>La deuda está en la <strong>170</strong> (largo plazo) y en la <strong>520</strong> (lo que vence en los próximos 12 meses, reclasificado al cierre). Por eso las cuotas del año se cargan a la 520.</p>',
        },
        { tipo: 'prestamo' },
        {
          tipo: 'gestoria',
          html: 'Pide a cada cliente con préstamos el <strong>cuadro de amortización</strong> al firmarlo y guárdalo en su carpeta. Con él contabilizas todas las cuotas del año sin esperar a los recibos y haces la reclasificación de largo a corto plazo al cierre.',
        },
      ],
    },
    {
      id: 'renting-leasing',
      titulo: 'Renting y leasing',
      resumen: 'Parecen iguales en el extracto, pero no lo son.',
      piezas: [
        {
          tipo: 'tabla',
          columnas: ['', 'Renting', 'Leasing'],
          filas: [
            ['Qué es', 'Un alquiler con servicios (mantenimiento, seguro)', 'Una financiación con opción de compra'],
            ['El bien', 'No se registra en el balance', 'Se registra como inmovilizado (218, 213…) y se amortiza'],
            ['La cuota', 'Gasto: 621 Arrendamientos', 'Capital (524) + intereses (662)'],
            ['IVA', 'Sobre toda la cuota', 'Sobre toda la cuota (capital e intereses)'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Cuota de renting de una furgoneta: 300 € + IVA',
          lineas: [{ cuenta: '621', debe: 300 }, { cuenta: '472', debe: 63 }, { cuenta: '572', haber: 363 }],
          nota: 'Si la factura se registra antes que el cargo, primero 621/472 contra la 410 y luego el pago 410/572.',
        },
        {
          tipo: 'asiento',
          titulo: 'Cuota de leasing: capital 450 €, intereses 50 €, IVA 105 €',
          lineas: [{ cuenta: '524', debe: 450 }, { cuenta: '662', debe: 50 }, { cuenta: '472', debe: 105 }, { cuenta: '572', haber: 605 }],
          nota: 'La 524 recoge la deuda del leasing que vence en los próximos 12 meses (la 174, la de más plazo).',
        },
        {
          tipo: 'consejo',
          html: '<strong>Turismos.</strong> Si el vehículo del renting o del leasing es un turismo de uso mixto, recuerda la regla del Bloque 1: en general solo se deduce el 50 % del IVA.',
        },
      ],
    },
    {
      id: 'cuenta-555',
      titulo: 'La cuenta 555: el cajón de sastre',
      resumen: 'Útil un día, peligrosa si se acumula.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>La <strong>555 Partidas pendientes de aplicación</strong> sirve para registrar un movimiento del banco del que <strong>todavía no sabes el origen</strong>: un ingreso de un ordenante desconocido, un cargo sin concepto claro. Así el banco cuadra mientras lo averiguas.</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Buscar primero', texto: 'Antes de usar la 555, busca el importe en las facturas pendientes del cliente: cobros (430), pagos (400, 410) y otros movimientos del mes.' },
            { titulo: 'Registrar en la 555', texto: 'Ingreso desconocido: 572 al Debe, 555 al Haber. Cargo desconocido: 555 al Debe, 572 al Haber.' },
            { titulo: 'Preguntar al cliente', texto: 'Envía una lista de partidas pendientes con fecha, importe y concepto del banco.' },
            { titulo: 'Aplicar', texto: 'Cuando sepas qué era, traspasa el importe de la 555 a su cuenta definitiva (por ejemplo, 555 al Debe y 430 al Haber si era un cobro).' },
          ],
        },
        {
          tipo: 'gestoria',
          html: '<strong>Ningún trimestre debería cerrarse con la 555 llena</strong>, y menos el ejercicio: un cobro sin aplicar puede esconder una venta sin facturar (IVA sin declarar) y un pago sin aplicar, un gasto que no se ha deducido. Revisa su saldo antes de presentar cada 303.',
        },
      ],
    },
    {
      id: 'conciliacion',
      titulo: 'Conciliación bancaria y punteo',
      resumen: 'Explicar por qué el banco y la 572 no coinciden.',
      piezas: [
        {
          tipo: 'html',
          html: '<p><strong>Puntear</strong> es marcar cada movimiento del extracto con su apunte en el mayor de la 572. Lo que queda sin marcar se explica por una de dos razones:</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['Partida sin puntear', 'Qué es', 'Qué hacer'],
          filas: [
            ['Está en el banco, no en la contabilidad', 'Comisiones, recibos domiciliados, cobros que nadie avisó', 'Registrarla en la contabilidad'],
            ['Está en la contabilidad, no en el banco', 'Partidas en tránsito: un cheque ingresado o una transferencia de fin de mes que el banco aún no ha procesado', 'Nada: aparecerá en el extracto siguiente'],
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Estado de conciliación (ejemplo)',
          columnas: ['Concepto', 'Importe'],
          filas: [
            ['Saldo según el extracto', '10.065,00 €'],
            ['+ Cobros registrados que el banco aún no refleja', '+ 1.210,00 €'],
            ['− Pagos registrados que el banco aún no refleja', '− 450,00 €'],
            ['= Saldo del banco ajustado', '10.825,00 €'],
            ['Saldo de la 572 tras registrar lo que faltaba', '10.825,00 € ✓'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Concilia <strong>cada mes</strong>, no solo al cierre: una diferencia de un mes se encuentra en minutos; una de todo el año, en días. Y guarda el estado de conciliación firmado en la carpeta del cliente: es lo primero que pide un auditor o un inspector.',
        },
      ],
    },
  ],

  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  test: [
    /* --- Extracto y conciliación --- */
    {
      id: 'b3-q01',
      pregunta: 'El extracto dice que el banco «abona» 500 € en la cuenta de tu cliente. ¿Qué haces con la 572?',
      correcta: 'Cargarla (Debe): entra dinero en la cuenta',
      incorrectas: ['Abonarla (Haber), como dice el banco', 'Nada hasta el cierre del ejercicio'],
      explicacion: 'El banco habla desde su contabilidad: para él tu dinero es una deuda. Un abono del banco es un ingreso para tu cliente, así que la 572 aumenta por el Debe.',
    },
    {
      id: 'b3-q02',
      pregunta: '¿Qué significa puntear un extracto bancario?',
      correcta: 'Marcar cada movimiento del extracto con su apunte en la 572 para encontrar lo que falta',
      incorrectas: ['Sumar los cargos y los abonos del mes', 'Imprimir el extracto y archivarlo'],
      explicacion: 'Al puntear se emparejan los movimientos del banco con los apuntes contables. Lo que queda sin pareja es lo que hay que registrar o explicar en la conciliación.',
    },
    {
      id: 'b3-q03',
      pregunta: 'A fin de mes, el saldo del banco y el de la 572 no coinciden. ¿Es necesariamente un error?',
      correcta: 'No: puede haber partidas en tránsito o cargos aún no registrados',
      incorrectas: ['Sí, siempre es un error de contabilidad', 'Sí, y se ajusta la 572 al saldo del banco sin más'],
      explicacion: 'La conciliación explica la diferencia: movimientos del banco pendientes de registrar y apuntes contables que el banco aún no ha procesado. Ajustar sin explicar esconde errores.',
    },
    {
      id: 'b3-q04',
      pregunta: 'Al puntear, encuentras una comisión de 12 € en el extracto que no está en la contabilidad. ¿Qué haces?',
      correcta: 'Registrarla: 626 al Debe y 572 al Haber',
      incorrectas: ['Nada: aparecerá en el extracto del mes siguiente', 'Anotarla en la 555 hasta el cierre'],
      explicacion: 'Lo que está en el banco y no en la contabilidad hay que registrarlo. La comisión es un gasto conocido, así que no hace falta la 555.',
    },
    {
      id: 'b3-q05',
      pregunta: 'Registraste una transferencia a un proveedor el 31/10, pero el banco la ejecuta el 2/11. ¿Qué haces en la conciliación de octubre?',
      correcta: 'Nada en la contabilidad: es una partida en tránsito que aparecerá en noviembre',
      incorrectas: ['Anular el apunte de la contabilidad', 'Registrarla otra vez en noviembre'],
      explicacion: 'Lo que está en la contabilidad y aún no en el banco se explica en el estado de conciliación. Cuando llegue al extracto de noviembre, simplemente se puntea.',
    },
    {
      id: 'b3-q06',
      pregunta: '¿Qué es el fichero Norma 43 (o Cuaderno 43)?',
      correcta: 'El formato estándar de extracto bancario que importan los programas contables',
      incorrectas: ['Un modelo de declaración de Hacienda', 'Una norma del PGC sobre las cuentas de bancos'],
      explicacion: 'Es el formato estándar de la banca española para los extractos. Importarlo ahorra teclear movimientos y reduce errores.',
    },
    {
      id: 'b3-q07',
      pregunta: 'En un extracto, ¿qué es la «fecha valor»?',
      correcta: 'La fecha que el banco usa para calcular intereses; puede no coincidir con la de la operación',
      incorrectas: ['La fecha en que vence la factura pagada', 'La fecha en que se contabiliza en la empresa'],
      explicacion: 'Un ingreso puede hacerse un día y tener fecha valor el siguiente. Para la contabilidad se suele usar la fecha de la operación, pero la fecha valor explica algunas diferencias de saldo.',
    },
    {
      id: 'b3-q08',
      pregunta: 'Al cierre de cada trimestre, ¿qué debe cumplirse con la cuenta 572?',
      correcta: 'Que su saldo coincida con el banco, o que la diferencia esté explicada en la conciliación',
      incorrectas: ['Que su saldo sea cero', 'Nada: puede diferir del banco sin explicación'],
      explicacion: 'El saldo de la 572 debe reflejar el dinero real. Si no coincide con el extracto, la conciliación debe justificar cada euro de diferencia.',
    },

    /* --- Cobros y pagos --- */
    {
      id: 'b3-q09',
      pregunta: 'Un cliente transfiere 2.178 € para pagar una factura ya contabilizada. ¿Qué asiento haces?',
      correcta: '572 al Debe; 430 al Haber',
      incorrectas: ['572 al Debe; 700 al Haber', '430 al Debe; 572 al Haber'],
      explicacion: 'El cobro cancela el derecho frente al cliente. La venta ya se registró al emitir la factura: abonar la 700 la duplicaría.',
    },
    {
      id: 'b3-q10',
      pregunta: 'Pagas a una abogada su factura de 1.000 € + IVA con un 15 % de retención. ¿Cuánto sale del banco?',
      correcta: '1.060 €, cargando la 410 y abonando la 572',
      incorrectas: ['1.210 €, el total con IVA', '1.000 €, la base de la factura'],
      explicacion: 'Se paga lo que se debe a la abogada: 1.000 + 210 − 150 = 1.060 €. La retención se ingresará a Hacienda con el modelo 111.',
    },
    {
      id: 'b3-q11',
      pregunta: 'Una sola transferencia paga tres facturas del mismo proveedor. ¿Cómo la registras?',
      correcta: 'Cancelando las tres facturas en la 400 de ese proveedor contra la 572',
      incorrectas: ['Registrando tres gastos nuevos', 'Llevándola a la 555 hasta el cierre'],
      explicacion: 'El pago agrupado cancela varias deudas. Se puede hacer con una línea por factura o una por el total, pero hay que puntear cada factura en la subcuenta del proveedor.',
    },
    {
      id: 'b3-q12',
      pregunta: 'Un cliente paga 500 € de una factura de 1.210 €. ¿Qué haces?',
      correcta: 'Registrar el cobro de 500 € (572 a 430); quedan 710 € pendientes',
      incorrectas: ['Dar la factura por cobrada y llevar la diferencia a gasto', 'No registrar nada hasta que pague todo'],
      explicacion: 'Se registra lo cobrado. El saldo pendiente sigue en la 430 y hay que reclamarlo.',
    },
    {
      id: 'b3-q13',
      pregunta: 'En el extracto aparece el cargo del modelo 111 del tercer trimestre. ¿Qué asiento haces?',
      correcta: '4751 al Debe; 572 al Haber',
      incorrectas: ['631 Otros tributos al Debe; 572 al Haber', '640 Sueldos y salarios al Debe; 572 al Haber'],
      explicacion: 'El 111 ingresa las retenciones practicadas, que estaban como deuda en la 4751. Pagarlas cancela esa deuda: no es un gasto nuevo.',
    },
    {
      id: 'b3-q14',
      pregunta: 'Se domicilia el pago del modelo 303 con un resultado a ingresar de 1.200 €. ¿Qué cuenta se carga?',
      correcta: '4750 Hacienda Pública, acreedora por IVA',
      incorrectas: ['477 Hacienda Pública, IVA repercutido', '631 Otros tributos'],
      explicacion: 'Al liquidar el trimestre, la diferencia entre 477 y 472 se lleva a la 4750 (si sale a ingresar). El pago cancela la 4750. Lo verás en detalle en el Bloque 4.',
    },
    {
      id: 'b3-q15',
      pregunta: 'Tu cliente traspasa 2.000 € de su cuenta en un banco a su cuenta en otro banco. ¿Qué asiento haces?',
      correcta: '572 del banco que recibe al Debe; 572 del banco que envía al Haber',
      incorrectas: ['572 al Debe; 705 al Haber', 'Ninguno: es el mismo dinero'],
      explicacion: 'Cada banco tiene su subcuenta de la 572 (57200001, 57200002…). El traspaso mueve dinero entre ellas: ni ingreso ni gasto, pero sí asiento, para que cada subcuenta cuadre con su extracto.',
    },

    /* --- Comisiones, TPV y devoluciones --- */
    {
      id: 'b3-q16',
      pregunta: 'El banco cobra 15 € de comisión de mantenimiento. ¿Qué asiento haces?',
      correcta: '626 Servicios bancarios al Debe; 572 al Haber, sin IVA',
      incorrectas: ['626 al Debe y 472 por el 21 % al Debe; 572 al Haber', '662 Intereses de deudas al Debe; 572 al Haber'],
      explicacion: 'Las comisiones bancarias son, en general, servicios financieros exentos de IVA. Van enteras a la 626.',
    },
    {
      id: 'b3-q17',
      pregunta: 'Llega una factura del banco por el alquiler del datáfono que sí incluye IVA. ¿Qué haces?',
      correcta: 'Registrar el IVA en la 472: el alquiler del terminal no es un servicio financiero exento',
      incorrectas: ['Ignorar el IVA: los bancos nunca lo cobran', 'Llevar todo a la 662'],
      explicacion: 'La mayoría de comisiones están exentas, pero no todo lo que factura un banco lo está. Si la factura trae IVA y cumple los requisitos, se deduce.',
    },
    {
      id: 'b3-q18',
      pregunta: 'El banco liquida las ventas con tarjeta del día: 2.000 € brutos, 10 € de comisión, abona 1.990 €. Las ventas estaban en la 430. ¿Qué asiento haces?',
      correcta: '572 por 1.990 y 626 por 10 al Debe; 430 por 2.000 al Haber',
      incorrectas: ['572 por 1.990 al Debe; 700 por 1.990 al Haber', '572 por 2.000 al Debe; 430 por 2.000 al Haber'],
      explicacion: 'Se cancela el total pendiente de las ventas con tarjeta (2.000 €). Entra el neto y la comisión descontada es un gasto financiero.',
    },
    {
      id: 'b3-q19',
      pregunta: 'Devuelven un recibo de 300 € que tu cliente ya había dado por cobrado. ¿Qué asiento haces?',
      correcta: '430 al Debe; 572 al Haber: el cliente vuelve a deber',
      incorrectas: ['708 Devoluciones de ventas al Debe; 572 al Haber', '650 Pérdidas de créditos incobrables al Debe; 572 al Haber'],
      explicacion: 'La devolución de un recibo no anula la venta: deshace el cobro. La deuda reaparece en la 430 y hay que reclamarla.',
    },
    {
      id: 'b3-q20',
      pregunta: 'Tu cliente paga la luz con recibo domiciliado, pero el banco lo devuelve por falta de saldo. El pago ya estaba registrado. ¿Qué haces?',
      correcta: 'Deshacer el pago: 572 al Debe y 410 al Haber; la deuda con la eléctrica sigue pendiente',
      incorrectas: ['Registrar un ingreso en la 759', 'Nada: la factura ya estaba pagada'],
      explicacion: 'El dinero no ha salido, así que el pago se anula y la deuda vuelve a la 410. Avisa al cliente: tendrá que pagarla para evitar recargos o cortes.',
    },

    /* --- Remesas y descuento --- */
    {
      id: 'b3-q21',
      pregunta: 'En una remesa de recibos en gestión de cobro, ¿cuándo entra el dinero en la cuenta?',
      correcta: 'Al vencimiento, cuando el banco cobra a los deudores',
      incorrectas: ['Al presentar la remesa', 'Al final del trimestre'],
      explicacion: 'En la gestión de cobro el banco solo se encarga de cobrar. El dinero entra al vencimiento, menos la comisión de gestión.',
    },
    {
      id: 'b3-q22',
      pregunta: 'En el descuento de efectos, el banco adelanta el dinero antes del vencimiento. ¿Qué cuenta recoge la deuda con el banco?',
      correcta: '5208 Deudas por efectos descontados',
      incorrectas: ['170 Deudas a largo plazo con entidades de crédito', '438 Anticipos de clientes'],
      explicacion: 'Si el deudor no paga, el banco devolverá el efecto a tu cliente. Mientras tanto, lo anticipado es una deuda con el banco: 5208.',
    },
    {
      id: 'b3-q23',
      pregunta: 'Al descontar efectos, el banco cobra 25 € de intereses. ¿En qué cuenta los registras?',
      correcta: '665 Intereses por descuento de efectos y operaciones de factoring',
      incorrectas: ['626 Servicios bancarios y similares', '662 Intereses de deudas'],
      explicacion: 'El PGC tiene una cuenta específica para los intereses del descuento: 665. Las comisiones de la operación sí van a la 626.',
    },
    {
      id: 'b3-q24',
      pregunta: 'Llega el vencimiento y el deudor paga el efecto que estaba descontado. ¿Qué asiento haces?',
      correcta: '5208 al Debe; 4311 Efectos comerciales descontados al Haber',
      incorrectas: ['572 al Debe; 430 al Haber', 'Ninguno: el banco ya pagó'],
      explicacion: 'El dinero ya entró al descontar. Al pagar el deudor, se cancelan a la vez la deuda con el banco (5208) y el efecto descontado (4311).',
    },

    /* --- Préstamos --- */
    {
      id: 'b3-q25',
      pregunta: 'Cuota de préstamo de 500 €: 420 € de capital y 80 € de intereses. ¿Qué asiento haces?',
      correcta: '520 por 420 y 662 por 80 al Debe; 572 por 500 al Haber',
      incorrectas: ['662 por 500 al Debe; 572 por 500 al Haber', '170 por 500 al Debe; 572 por 500 al Haber'],
      explicacion: 'El capital devuelve deuda (520) y solo los intereses son gasto (662). Registrar toda la cuota como gasto infla los gastos y deja la deuda sin bajar.',
    },
    {
      id: 'b3-q26',
      pregunta: '¿Llevan IVA los intereses de un préstamo?',
      correcta: 'No: están exentos',
      incorrectas: ['Sí, el 21 %', 'Sí, el 10 %'],
      explicacion: 'La concesión de créditos y sus intereses son operaciones financieras exentas. No hay línea de 472.',
    },
    {
      id: 'b3-q27',
      pregunta: '¿Por qué las cuotas del año de un préstamo a 5 años se cargan a la 520 y no a la 170?',
      correcta: 'Porque al cierre se reclasificó a corto plazo la parte que vence en los 12 meses siguientes',
      incorrectas: ['Porque la 170 solo se usa al recibir el préstamo', 'Porque todos los préstamos son a corto plazo'],
      explicacion: 'Al cierre se traspasa de la 170 a la 520 el capital que vence el año siguiente. Así el balance muestra qué parte de la deuda hay que pagar pronto.',
    },
    {
      id: 'b3-q28',
      pregunta: 'En un préstamo de cuota constante (sistema francés), ¿qué pasa a medida que se pagan cuotas?',
      correcta: 'La cuota no cambia; los intereses bajan y el capital amortizado sube',
      incorrectas: ['Los intereses suben cada mes', 'El capital es fijo y la cuota baja'],
      explicacion: 'Los intereses se calculan sobre la deuda pendiente, que va bajando. Como la cuota es fija, cada mes una parte mayor devuelve capital.',
    },
    {
      id: 'b3-q29',
      pregunta: 'Al recibir un préstamo, el banco cobra 150 € de comisión de apertura. ¿Cómo lo registra normalmente una pyme?',
      correcta: 'Como gasto en la 626 Servicios bancarios, sin IVA',
      incorrectas: ['En la 472, porque lleva IVA', 'Sumándola a la deuda en la 520'],
      explicacion: 'Es el criterio habitual en pymes. En rigor, el PGC permite repartir estos costes a lo largo de la vida del préstamo (coste amortizado), pero no lleva IVA en ningún caso.',
    },
    {
      id: 'b3-q30',
      pregunta: '¿Dónde encuentras el capital y los intereses de cada cuota de un préstamo?',
      correcta: 'En el recibo de la cuota o en el cuadro de amortización del banco',
      incorrectas: ['En el modelo 303 del trimestre', 'En el modelo 347'],
      explicacion: 'El banco detalla cada cuota. Con el cuadro de amortización puedes contabilizar todo el año y reclasificar a corto plazo al cierre.',
    },

    /* --- Renting y leasing --- */
    {
      id: 'b3-q31',
      pregunta: 'Cuota mensual de renting de una furgoneta: 400 € + IVA. ¿Qué asiento haces al pagarla (sin factura previa registrada)?',
      correcta: '621 por 400 y 472 por 84 al Debe; 572 por 484 al Haber',
      incorrectas: ['218 Elementos de transporte por 484 al Debe; 572 al Haber', '662 por 400 y 472 por 84 al Debe; 572 al Haber'],
      explicacion: 'El renting es un alquiler: la cuota es gasto (621) y su IVA, deducible si el vehículo está afecto a la actividad. La furgoneta no entra en el balance.',
    },
    {
      id: 'b3-q32',
      pregunta: '¿Cuál es la principal diferencia contable entre renting y leasing?',
      correcta: 'En el renting la cuota es gasto; en el leasing el bien es inmovilizado y hay una deuda (524/174)',
      incorrectas: ['Ninguna: los dos son gasto', 'En el leasing la cuota es gasto y en el renting el bien es inmovilizado'],
      explicacion: 'El leasing es una financiación con opción de compra: el bien se registra como inmovilizado y se amortiza, y las cuotas devuelven deuda e intereses.',
    },
    {
      id: 'b3-q33',
      pregunta: 'Cuota de leasing: 450 € de capital, 50 € de intereses y 105 € de IVA. ¿Qué asiento haces?',
      correcta: '524 por 450, 662 por 50 y 472 por 105 al Debe; 572 por 605 al Haber',
      incorrectas: ['621 por 500 y 472 por 105 al Debe; 572 por 605 al Haber', '218 por 605 al Debe; 572 por 605 al Haber'],
      explicacion: 'El capital reduce la deuda del leasing a corto plazo (524), los intereses son gasto (662) y el IVA de la cuota se deduce (472).',
    },
    {
      id: 'b3-q34',
      pregunta: 'En una cuota de leasing, ¿sobre qué se calcula el IVA?',
      correcta: 'Sobre la cuota completa: capital e intereses',
      incorrectas: ['Solo sobre los intereses', 'No lleva IVA porque es una financiación'],
      explicacion: 'A diferencia de un préstamo, el leasing es un arrendamiento a efectos de IVA: cada cuota completa lleva IVA.',
    },

    /* --- Cuenta 555 --- */
    {
      id: 'b3-q35',
      pregunta: 'Aparece en el extracto un ingreso de 605 € de un ordenante que no reconoces. ¿Qué haces?',
      correcta: '572 al Debe y 555 Partidas pendientes de aplicación al Haber, y preguntar al cliente',
      incorrectas: ['Registrarlo como venta en la 705', 'Abonarlo a la 430 de cualquier cliente con deuda'],
      explicacion: 'Si no sabes qué es, la 555 deja el banco cuadrado sin inventar un origen. Un ingreso no es automáticamente una venta.',
    },
    {
      id: 'b3-q36',
      pregunta: 'El cliente aclara que esos 605 € eran el cobro de una factura de una clienta. ¿Qué asiento haces?',
      correcta: '555 al Debe; 430 al Haber',
      incorrectas: ['572 al Debe; 430 al Haber', '555 al Debe; 705 al Haber'],
      explicacion: 'El dinero ya entró en el banco. Ahora solo se traspasa la partida de la 555 a su cuenta definitiva: se cancela la deuda de la clienta.',
    },
    {
      id: 'b3-q37',
      pregunta: '¿Puede quedar saldo en la 555 al cerrar el ejercicio?',
      correcta: 'No debería: hay que aclarar y aplicar todas las partidas antes del cierre',
      incorrectas: ['Sí, sin ningún problema', 'Sí: se traspasa al resultado (129)'],
      explicacion: 'Un saldo en la 555 puede esconder ventas sin facturar o gastos sin deducir. Es de lo primero que revisa un auditor.',
    },
    {
      id: 'b3-q38',
      pregunta: 'Hay un cargo de 120 € en el extracto con un concepto que nadie entiende. ¿Qué haces mientras lo averiguas?',
      correcta: '555 al Debe; 572 al Haber',
      incorrectas: ['629 Otros servicios al Debe; 572 al Haber', '626 Servicios bancarios al Debe; 572 al Haber'],
      explicacion: 'Un cargo desconocido también va a la 555, pero en el lado contrario. Llevarlo a un gasto sin saber qué es puede deducir algo que no corresponde.',
    },
    {
      id: 'b3-q39',
      pregunta: 'Antes de usar la 555 con un ingreso desconocido, ¿qué conviene hacer?',
      correcta: 'Buscar ese importe entre las facturas pendientes de cobro y pago del cliente',
      incorrectas: ['Nada: es la cuenta para cualquier duda', 'Preguntar al banco qué IVA lleva'],
      explicacion: 'Muchas veces el importe coincide con una factura pendiente o con la suma de varias. Unos minutos de búsqueda evitan una pregunta innecesaria al cliente.',
    },
    {
      id: 'b3-q40',
      pregunta: '¿Qué riesgo tiene un ingreso sin aplicar en la 555 durante meses?',
      correcta: 'Que esconda una venta sin facturar y, por tanto, IVA sin declarar',
      incorrectas: ['Ninguno: el dinero ya está en el banco', 'Que el banco cobre una comisión por él'],
      explicacion: 'Si el ingreso corresponde a una venta que nunca se facturó, el IVA de esa venta no se ha declarado. Por eso la 555 se revisa antes de cada 303.',
    },
  ],

  casos: [
    {
      id: 'b3-cobro',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Cobro de un cliente, neto de un abono',
      enunciado: 'En el extracto de octubre aparece el cobro del restaurante. Recuerda que tenía pendiente la factura 2026/0241 (2.178 €) y el abono R-2026/007 (−145,20 €). Registra el movimiento resaltado.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Distribuciones Levante, S.L.',
        iban: 'ES00 9999 0001 1100 0045 1290',
        periodo: '20/10/2026 – 24/10/2026',
        saldoInicial: 18304.62,
        movimientos: [
          { fecha: '20/10', concepto: 'RECIBO TELEFONICA', detalle: 'Fibra y móviles octubre', importe: -96.8 },
          { fecha: '22/10', concepto: 'TRANSF. RECIBIDA MESON LA ENCINA SL', detalle: 'Concepto: FRA 2026/0241 Y ABONO R-2026/007', importe: 2032.8, resaltar: true },
          { fecha: '24/10', concepto: 'TRANSFERENCIA A TRANSPORTES RAPIDOS SL', detalle: 'Portes septiembre', importe: -242 },
        ],
      },
      cuentasDisponibles: ['572', '430', '700', '708', '477', '555', '626'],
      solucion: [{ cuenta: '572', debe: 2032.8 }, { cuenta: '430', haber: 2032.8 }],
      pista: 'La venta y el abono ya están registrados. El cobro solo cancela lo que el restaurante debía.',
      explicacion: 'Entran 2.032,80 € en el banco (572 al Debe) y se cancela la deuda neta del restaurante en la 430: 2.178 − 145,20 = 2.032,80 €. No se toca la 700 ni la 708: la venta y el abono ya se registraron.',
    },
    {
      id: 'b3-pago',
      tipo: 'asiento',
      cliente: { nombre: 'Reformas Integrales Turia, S.L.', actividad: 'Empresa de reformas' },
      titulo: 'Pago a la abogada',
      enunciado: 'La empresa ha pagado la factura de la abogada que registraste en el Bloque 1 (600 € + IVA − 15 % de retención). Registra el movimiento resaltado.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Reformas Integrales Turia, S.L.',
        iban: 'ES00 9999 0001 1100 0078 3311',
        periodo: '16/10/2026 – 20/10/2026',
        saldoInicial: 9512.4,
        movimientos: [
          { fecha: '16/10', concepto: 'TRANSF. RECIBIDA PROMOCIONES HUERTA NORTE', detalle: 'Certificación obra n.º 3', importe: 7260 },
          { fecha: '19/10', concepto: 'TRANSFERENCIA A LAURA MENDEZ RUIZ', detalle: 'Concepto: FRA 2026/047', importe: -636, resaltar: true },
          { fecha: '20/10', concepto: 'RECIBO SEGURO RC', detalle: 'Póliza 88-112 · trimestral', importe: -312.5 },
        ],
      },
      cuentasDisponibles: ['410', '400', '623', '472', '4751', '572', '555'],
      solucion: [{ cuenta: '410', debe: 636 }, { cuenta: '572', haber: 636 }],
      pista: 'El gasto, el IVA y la retención se registraron con la factura. ¿Qué queda pendiente con la abogada?',
      explicacion: 'Se cancela la deuda con la abogada (410 al Debe, 636 €) y sale el dinero del banco (572 al Haber). La retención de 90 € no se paga a ella: sigue en la 4751 hasta el modelo 111.',
    },
    {
      id: 'b3-comisiones',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Comisiones bancarias',
      enunciado: 'Al revisar el extracto de la tienda encuentras dos cargos del banco sin registrar. Contabilízalos en un único asiento.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Moda Valentina, S.L.',
        iban: 'ES00 9999 0001 1100 0012 3456',
        periodo: '01/10/2026 – 31/10/2026',
        saldoInicial: 6420.15,
        movimientos: [
          { fecha: '05/10', concepto: 'TRANSFERENCIA A TEXTILES ALBUFERA SL', detalle: 'Ref. FV-2026/1102', importe: -1210 },
          { fecha: '05/10', concepto: 'COMISION EMISION TRANSFERENCIA', importe: -2.5, resaltar: true },
          { fecha: '31/10', concepto: 'COMISION MANTENIMIENTO CUENTA', detalle: 'Periodo 10/2026', importe: -15, resaltar: true },
        ],
      },
      cuentasDisponibles: ['626', '662', '629', '472', '572', '555', '410'],
      solucion: [{ cuenta: '626', debe: 17.5 }, { cuenta: '572', haber: 17.5 }],
      pista: 'Suma las dos comisiones. ¿Llevan IVA los servicios bancarios?',
      explicacion: 'Las comisiones (2,50 + 15 = 17,50 €) van a la 626 Servicios bancarios, sin IVA porque son servicios financieros exentos. No son intereses (662).',
    },
    {
      id: 'b3-tpv',
      tipo: 'asiento',
      cliente: { nombre: 'Calzados Sierra, S.L.', actividad: 'Zapatería' },
      titulo: 'Liquidación del TPV',
      enunciado: 'La zapatería registra sus ventas con tarjeta en la subcuenta 43000999 «Cobros con tarjeta pendientes». Hoy el banco ha liquidado las ventas de ayer. Registra el movimiento resaltado.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Calzados Sierra, S.L.',
        iban: 'ES00 9999 0001 1100 0033 7810',
        periodo: '21/10/2026 – 22/10/2026',
        saldoInicial: 4108.9,
        movimientos: [
          { fecha: '21/10', concepto: 'LIQUIDACION TPV 20/10', detalle: 'Bruto 980,00 · comisión 4,90', importe: 975.1 },
          { fecha: '22/10', concepto: 'LIQUIDACION TPV 21/10', detalle: 'Bruto 1.250,00 · comisión 6,25', importe: 1243.75, resaltar: true },
        ],
      },
      cuentasDisponibles: ['572', '626', '430', '700', '477', '472', '555'],
      solucion: [{ cuenta: '572', debe: 1243.75 }, { cuenta: '626', debe: 6.25 }, { cuenta: '430', haber: 1250 }],
      pista: 'Las ventas (y su IVA) ya están registradas por el bruto. El banco ingresa menos: ¿qué es la diferencia?',
      explicacion: 'Se cancela el total pendiente de cobrar con tarjeta (430, 1.250 €). Entra el neto en el banco (572, 1.243,75 €) y la comisión descontada es gasto (626, 6,25 €). No se vuelve a registrar la venta.',
    },
    {
      id: 'b3-remesa',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Abono de una remesa de recibos',
      enunciado: 'El distribuidor envió al banco una remesa de 15 recibos en gestión de cobro. Ha llegado el vencimiento y todos se han cobrado. Registra los dos movimientos resaltados en un único asiento.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Distribuciones Levante, S.L.',
        iban: 'ES00 9999 0001 1100 0045 1290',
        periodo: '30/10/2026 – 31/10/2026',
        saldoInicial: 20094.62,
        movimientos: [
          { fecha: '30/10', concepto: 'ABONO REMESA RECIBOS SEPA', detalle: 'Remesa 2026-10 · 15 recibos', importe: 4537.5, resaltar: true },
          { fecha: '30/10', concepto: 'COMISION GESTION REMESA', detalle: '15 recibos × 1,00', importe: -15, resaltar: true },
          { fecha: '31/10', concepto: 'RECIBO RENTING FURGONETA', detalle: 'Cuota 10/2026', importe: -484 },
        ],
      },
      cuentasDisponibles: ['572', '626', '665', '430', '5208', '700', '555'],
      solucion: [{ cuenta: '572', debe: 4522.5 }, { cuenta: '626', debe: 15 }, { cuenta: '430', haber: 4537.5 }],
      pista: 'Es gestión de cobro, no descuento: no hay deuda con el banco. ¿Qué cancelan los recibos cobrados?',
      explicacion: 'Se cancelan las deudas de los clientes de la remesa (430, 4.537,50 €; en la práctica, una línea por cliente). Entra en el banco el neto (572, 4.522,50 €) y la comisión de gestión es gasto (626, 15 €). Sin 5208 ni 665: eso sería un descuento.',
    },
    {
      id: 'b3-devolucion',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Devolución de un recibo',
      enunciado: 'La panadería cobró en octubre por recibo domiciliado la factura HSB-2026/0388 de la cafetería (354 €), y ya se registró el cobro. Hoy el banco lo ha devuelto. Registra los movimientos resaltados en un único asiento.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Horno San Blas, S.L.',
        iban: 'ES00 9999 0001 1100 0056 4402',
        periodo: '12/11/2026 – 13/11/2026',
        saldoInicial: 3876.4,
        movimientos: [
          { fecha: '12/11', concepto: 'DEVOLUCION RECIBO CAFETERIA PLAZA MAYOR', detalle: 'Ref. HSB-2026/0388 · Motivo: AM04 fondos insuficientes', importe: -354, resaltar: true },
          { fecha: '12/11', concepto: 'COMISION DEVOLUCION RECIBO', importe: -4.5, resaltar: true },
          { fecha: '13/11', concepto: 'LIQUIDACION TPV 12/11', detalle: 'Bruto 412,00 · comisión 2,06', importe: 409.94 },
        ],
      },
      cuentasDisponibles: ['430', '436', '708', '626', '650', '572', '555'],
      solucion: [{ cuenta: '430', debe: 354 }, { cuenta: '626', debe: 4.5 }, { cuenta: '572', haber: 358.5 }],
      pista: 'La venta sigue siendo válida: lo que se deshace es el cobro. ¿Quién vuelve a deber?',
      explicacion: 'La cafetería vuelve a deber la factura: 430 al Debe por 354 €. La comisión de la devolución es gasto (626, 4,50 €) y del banco salen 358,50 €. No es un abono (708) ni todavía un incobrable (650): primero hay que reclamar.',
    },
    {
      id: 'b3-prestamo',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Cuota del préstamo del horno',
      enunciado: 'La panadería financió el horno con un préstamo a 5 años. Las cuotas de este año ya están reclasificadas a corto plazo. Registra la cuota resaltada.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Horno San Blas, S.L.',
        iban: 'ES00 9999 0001 1100 0056 4402',
        periodo: '01/11/2026 – 05/11/2026',
        saldoInicial: 4521.3,
        movimientos: [
          { fecha: '01/11', concepto: 'RECIBO CUOTA PRESTAMO 0099-123456', detalle: 'Cuota 23/60 · capital 412,30 · intereses 87,70', importe: -500, resaltar: true },
          { fecha: '04/11', concepto: 'TRANSF. RECIBIDA CAFETERIA PLAZA MAYOR SL', detalle: 'Fra HSB-2026/0402', importe: 412.8 },
        ],
      },
      cuentasDisponibles: ['520', '170', '662', '626', '472', '572', '213'],
      solucion: [{ cuenta: '520', debe: 412.3 }, { cuenta: '662', debe: 87.7 }, { cuenta: '572', haber: 500 }],
      pista: 'Lee el detalle del recibo: una parte devuelve deuda y otra es el coste del dinero. ¿Dónde está la deuda de este año?',
      explicacion: 'El capital (412,30 €) reduce la deuda a corto plazo (520) y los intereses (87,70 €) son gasto financiero (662), sin IVA. Sale del banco la cuota completa: 500 €. No es la 170: esa parte ya se reclasificó.',
    },
    {
      id: 'b3-renting',
      tipo: 'asiento',
      cliente: { nombre: 'Reformas Integrales Turia, S.L.', actividad: 'Empresa de reformas' },
      titulo: 'Cuota de renting de una furgoneta',
      enunciado: 'La empresa tiene una furgoneta de obra en renting. Junto con el cargo ha llegado la factura de la cuota (300 € + IVA), que aún no estaba registrada. Registra el movimiento resaltado en un único asiento.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Reformas Integrales Turia, S.L.',
        iban: 'ES00 9999 0001 1100 0078 3311',
        periodo: '01/11/2026 – 03/11/2026',
        saldoInicial: 15823.9,
        movimientos: [
          { fecha: '01/11', concepto: 'RECIBO RENTING VEHICULOS SL', detalle: 'Fra RT-2026-11 · furgoneta 1234-ABC', importe: -363, resaltar: true },
          { fecha: '03/11', concepto: 'TRANSFERENCIA A MATERIALES DEL TURIA SA', detalle: 'Fras 2026/551 y 2026/560', importe: -2480.6 },
        ],
      },
      cuentasDisponibles: ['621', '218', '524', '662', '472', '572', '410'],
      solucion: [{ cuenta: '621', debe: 300 }, { cuenta: '472', debe: 63 }, { cuenta: '572', haber: 363 }],
      pista: 'El renting es un alquiler: la furgoneta no es de la empresa. ¿La cuota es deuda o gasto?',
      explicacion: 'La cuota de renting es gasto de arrendamiento (621, 300 €) con su IVA deducible (472, 63 €): es una furgoneta de obra afecta a la actividad. La furgoneta no entra en el balance (no es 218) y no hay intereses (662).',
    },
    {
      id: 'b3-leasing',
      tipo: 'asiento',
      cliente: { nombre: 'Maquinaria Hostelera del Mediterráneo, S.A.', actividad: 'Venta de maquinaria para hostelería' },
      titulo: 'Cuota de leasing de una carretilla',
      enunciado: 'La empresa adquirió una carretilla elevadora mediante leasing (ya registrada como inmovilizado). El banco carga la cuota con el detalle de la financiación. Registra el movimiento resaltado.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Maquinaria Hostelera del Mediterráneo, S.A.',
        iban: 'ES00 9999 0001 1100 0091 2205',
        periodo: '05/11/2026 – 06/11/2026',
        saldoInicial: 48210.55,
        movimientos: [
          { fecha: '05/11', concepto: 'CUOTA LEASING 77-5501', detalle: 'Recuperación coste 450,00 · intereses 50,00 · IVA 105,00', importe: -605, resaltar: true },
          { fecha: '06/11', concepto: 'TRANSF. RECIBIDA HORNO SAN BLAS SL', detalle: 'Fra MHM-26-00912', importe: 5808 },
        ],
      },
      cuentasDisponibles: ['524', '174', '621', '662', '472', '213', '572'],
      solucion: [{ cuenta: '524', debe: 450 }, { cuenta: '662', debe: 50 }, { cuenta: '472', debe: 105 }, { cuenta: '572', haber: 605 }],
      pista: 'En el leasing, el bien ya está en el balance. La cuota devuelve deuda, paga intereses y lleva IVA.',
      explicacion: 'La recuperación del coste reduce la deuda del leasing a corto plazo (524, 450 €), los intereses son gasto (662, 50 €) y el IVA de la cuota completa se deduce (472, 105 €). No es 621: eso sería un renting.',
    },
    {
      id: 'b3-555',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Un ingreso que nadie reconoce',
      enunciado: 'En el extracto aparece un ingreso que no coincide con ninguna factura pendiente de la tienda. Has escrito a la clienta para preguntar, pero hoy cierras el mes. Registra el movimiento resaltado.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Moda Valentina, S.L.',
        iban: 'ES00 9999 0001 1100 0012 3456',
        periodo: '27/10/2026 – 29/10/2026',
        saldoInicial: 7015.3,
        movimientos: [
          { fecha: '27/10', concepto: 'LIQUIDACION TPV 26/10', detalle: 'Bruto 610,00 · comisión 3,05', importe: 606.95 },
          { fecha: '29/10', concepto: 'TRANSF. RECIBIDA', detalle: 'Ordenante: J. GARCIA L. · Concepto: PAGO', importe: 605, resaltar: true },
        ],
      },
      cuentasDisponibles: ['572', '555', '430', '700', '705', '477', '759'],
      solucion: [{ cuenta: '572', debe: 605 }, { cuenta: '555', haber: 605 }],
      pista: 'El dinero ha entrado, pero no sabes de qué. ¿Hay una cuenta para dejarlo «aparcado» sin inventar su origen?',
      explicacion: 'Entra el dinero (572 al Debe) y, hasta saber su origen, se registra en la 555 Partidas pendientes de aplicación. Registrarlo como venta (700) o abonarlo a un cliente al azar podría ser un error con efectos en el IVA.',
    },
    {
      id: 'b3-555-aplicar',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Aplicar la partida pendiente',
      enunciado: 'La clienta te ha respondido sobre el ingreso del caso anterior. Regulariza la cuenta 555.',
      documento: {
        tipo: 'resumen',
        titulo: 'Mayor de la cuenta 555 y respuesta de la clienta',
        subtitulo: '55500000 · Partidas pendientes de aplicación',
        emisor: { nombre: 'Moda Valentina, S.L.', nif: 'B98765432' },
        columnas: ['Fecha', 'Concepto', 'Haber', 'Saldo'],
        filas: [
          ['29/10/2026', 'Transf. recibida J. García L. · «PAGO»', '605,00', '605,00 H'],
        ],
        notas: [
          'Respuesta de la clienta: «Es Julia García, de la Boutique Julia (cliente nuestra). Nos ha pagado la factura 2026/112 del pedido de septiembre».',
          'La factura 2026/112 (605,00 €) figura pendiente de cobro en la 430 de Boutique Julia.',
        ],
      },
      cuentasDisponibles: ['555', '572', '430', '700', '477', '708', '759'],
      solucion: [{ cuenta: '555', debe: 605 }, { cuenta: '430', haber: 605 }],
      pista: 'El dinero ya está registrado en el banco. Solo falta llevar la partida desde la 555 a su cuenta definitiva.',
      explicacion: 'Se cancela la partida pendiente (555 al Debe) y la deuda de la Boutique Julia (430 al Haber). La 572 no se toca: el ingreso ya se registró. Y no es una venta nueva: la factura ya estaba contabilizada.',
    },
    {
      id: 'b3-conciliacion',
      tipo: 'clasificar',
      cliente: { nombre: 'Estudio Creativo Píxel, S.L.', actividad: 'Agencia de diseño' },
      titulo: 'Puntea el extracto con el mayor',
      enunciado: 'Es fin de mes. Compara el extracto de octubre con el mayor de la 572 e indica la situación de cada movimiento.',
      documentos: [
        {
          tipo: 'extracto',
          banco: BANCO_FICTICIO,
          titular: 'Estudio Creativo Píxel, S.L.',
          iban: 'ES00 9999 0001 1100 0067 9021',
          periodo: '01/10/2026 – 31/10/2026',
          saldoInicial: 8240,
          movimientos: [
            { fecha: '06/10', concepto: 'TRANSF. RECIBIDA ATELIER LUMIERE SARL', detalle: 'Invoice PX-2026/061', importe: 3000 },
            { fecha: '10/10', concepto: 'COMPRA TARJETA ADSTREAM IRELAND', detalle: 'Online ads', importe: -800 },
            { fecha: '15/10', concepto: 'RECIBO RENTING VEHICULOS SL', detalle: 'Fra RT-2026-10 · furgoneta', importe: -363 },
            { fecha: '31/10', concepto: 'COMISION MANTENIMIENTO', importe: -12 },
          ],
        },
        {
          tipo: 'resumen',
          titulo: 'Mayor de la cuenta 572 · octubre',
          subtitulo: '57200001 · Banco Turia',
          emisor: { nombre: 'Estudio Creativo Píxel, S.L.', nif: 'B98445566' },
          columnas: ['Fecha', 'Concepto', 'Debe', 'Haber'],
          filas: [
            ['01/10', 'Saldo inicial', '8.240,00', ''],
            ['06/10', 'Cobro Atelier Lumière', '3.000,00', ''],
            ['10/10', 'Pago AdStream (tarjeta)', '', '800,00'],
            ['30/10', 'Ingreso cheque Hotel Palmeras', '1.210,00', ''],
            ['31/10', 'Transf. a Imprenta Gráfica Sur', '', '450,00'],
          ],
          notas: ['Saldo de la 572 a 31/10: 11.200,00 € (deudor).'],
        },
      ],
      rejilla: 'grid-cols-3',
      opciones: [
        { valor: 'punteado', etiqueta: 'Punteado', detalle: 'en los dos' },
        { valor: 'contab', etiqueta: 'Solo banco', detalle: 'registrarlo' },
        { valor: 'transito', etiqueta: 'Solo 572', detalle: 'en tránsito' },
      ],
      cuentas: [
        { id: 'atelier', texto: 'Cobro de Atelier Lumière · 3.000,00 €', correcta: 'punteado', pista: 'Búscalo en el extracto y en el mayor.', explicacion: 'Aparece en los dos con el mismo importe.' },
        { id: 'adstream', texto: 'Pago con tarjeta a AdStream · 800,00 €', correcta: 'punteado', pista: '¿Está en el extracto? ¿Y en el mayor?', explicacion: 'Registrado y cargado: punteado.' },
        { id: 'renting', texto: 'Cuota de renting de la furgoneta · 363,00 €', correcta: 'contab', pista: 'El banco ya lo ha cargado. ¿Lo ves en el mayor?', explicacion: 'Falta registrarlo en la contabilidad.' },
        { id: 'comision', texto: 'Comisión de mantenimiento · 12,00 €', correcta: 'contab', pista: 'Los cargos del banco a fin de mes se olvidan con facilidad.', explicacion: 'Falta registrarla en la contabilidad.' },
        { id: 'cheque', texto: 'Ingreso del cheque del Hotel Palmeras · 1.210,00 €', correcta: 'transito', pista: 'Está en la contabilidad. ¿Lo ha abonado ya el banco?', explicacion: 'Cobro en tránsito: aparecerá en noviembre.' },
        { id: 'imprenta', texto: 'Transferencia a Imprenta Gráfica Sur · 450,00 €', correcta: 'transito', pista: 'Se ordenó el último día del mes.', explicacion: 'Pago en tránsito: el banco lo ejecutará en noviembre.' },
      ],
      resumenOk: 'Conciliación: extracto 10.065 € + cheque en tránsito 1.210 € − transferencia en tránsito 450 € = 10.825 €. Mayor 11.200 € − renting 363 € − comisión 12 € = 10.825 €. Cuadra. En el siguiente caso registras lo que faltaba.',
    },
    {
      id: 'b3-conciliacion-asiento',
      tipo: 'asiento',
      cliente: { nombre: 'Estudio Creativo Píxel, S.L.', actividad: 'Agencia de diseño' },
      titulo: 'Registrar lo que faltaba',
      enunciado: 'Tras el punteo del caso anterior, registra en un único asiento los dos cargos del banco que faltaban en la contabilidad. Tienes la factura del renting (300 € + IVA, furgoneta afecta a la actividad).',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Estudio Creativo Píxel, S.L.',
        iban: 'ES00 9999 0001 1100 0067 9021',
        periodo: '01/10/2026 – 31/10/2026',
        saldoInicial: 8240,
        movimientos: [
          { fecha: '06/10', concepto: 'TRANSF. RECIBIDA ATELIER LUMIERE SARL', detalle: 'Invoice PX-2026/061', importe: 3000 },
          { fecha: '10/10', concepto: 'COMPRA TARJETA ADSTREAM IRELAND', detalle: 'Online ads', importe: -800 },
          { fecha: '15/10', concepto: 'RECIBO RENTING VEHICULOS SL', detalle: 'Fra RT-2026-10 · furgoneta', importe: -363, resaltar: true },
          { fecha: '31/10', concepto: 'COMISION MANTENIMIENTO', importe: -12, resaltar: true },
        ],
      },
      cuentasDisponibles: ['621', '626', '662', '472', '572', '555', '410'],
      solucion: [{ cuenta: '621', debe: 300 }, { cuenta: '626', debe: 12 }, { cuenta: '472', debe: 63 }, { cuenta: '572', haber: 375 }],
      pista: 'Dos gastos distintos, uno con IVA y otro sin él. Del banco salieron 363 + 12 €.',
      explicacion: 'Renting a la 621 (300 €) con su IVA (472, 63 €) y comisión a la 626 (12 €), sin IVA. Salen del banco 375 €. Ahora la 572 queda en 10.825 €, igual que el saldo ajustado del banco.',
    },
  ],
};

const BLOQUES = [
  {
    id: 0,
    codigo: 'B0',
    titulo: 'Fundamentos y PGC',
    tituloLargo: 'Fundamentos, Partida Doble y Estructura del PGC',
    descripcion: 'La base de todo lo demás: cómo funcionan el Debe y el Haber, dónde vive cada cuenta dentro del cuadro del PGC y cómo se agrupan en las masas patrimoniales del balance.',
    distintivo: null,
    icono: ICONOS.balanza,
    temas: ['Partida doble', 'Cargar y abonar', 'Grupos 1 a 7 del PGC', 'Masas patrimoniales', 'Activo, Pasivo y Patrimonio Neto'],
    contenido: CONTENIDO_B0,
  },
  {
    id: 1,
    codigo: 'B1',
    titulo: 'Compras y Acreedores',
    tituloLargo: 'Gestión de Compras y Acreedores',
    descripcion: 'El núcleo del trabajo en una gestoría: validar cada factura o ticket que entrega el cliente, elegir la cuenta correcta, aplicar el IVA y las retenciones, y resolver los casos que más errores provocan, como los suplidos o la inversión del sujeto pasivo.',
    distintivo: 'Núcleo',
    icono: ICONOS.factura,
    temas: ['Validar facturas y tickets', '400 · 410 · 523', 'IVA soportado y no deducible', 'Retenciones 15 % y 19 %', 'Suplidos y rectificativas', 'Inversión del sujeto pasivo', 'Factura electrónica'],
    contenido: CONTENIDO_B1,
  },
  {
    id: 2,
    codigo: 'B2',
    titulo: 'Ventas y Clientes',
    tituloLargo: 'Ventas, Clientes y Cobros',
    descripcion: 'El otro lado del IVA: facturas emitidas, clientes, abonos y rectificativas emitidas, y qué hacer cuando un cliente no paga.',
    distintivo: null,
    icono: ICONOS.ventas,
    temas: ['Factura emitida (430 / 700 / 705 / 477)', 'Cobros de clientes', 'Abonos y rectificativas emitidas', 'Impagados (436)'],
    contenido: CONTENIDO_B2,
  },
  {
    id: 3,
    codigo: 'B3',
    titulo: 'Tesorería y Bancos',
    tituloLargo: 'Tesorería y Conciliación Bancaria',
    descripcion: 'El día a día con el banco: puntear el extracto, registrar cobros, pagos y comisiones, y contabilizar las cuotas de préstamos, leasing y renting.',
    distintivo: null,
    icono: ICONOS.banco,
    temas: ['Bancos (572)', 'Punteo y conciliación', 'Comisiones (626)', 'Préstamos (520 / 170 / 662)', 'Leasing y renting', 'Partidas pendientes (555)'],
    contenido: CONTENIDO_B3,
  },
  {
    id: 4,
    codigo: 'B4',
    titulo: 'Nóminas e Impuestos',
    tituloLargo: 'Nóminas, Impuestos y Calendario Fiscal',
    descripcion: 'Del asiento de la nómina a las declaraciones del cliente: de dónde sale cada cifra de los modelos trimestrales y anuales y cómo se contabiliza cada liquidación.',
    distintivo: null,
    icono: ICONOS.impuestos,
    temas: ['Asiento de nómina (640 / 642 / 476 / 4751)', 'Seguros sociales', 'Modelo 303 (IVA)', 'Modelos 111 y 115', 'Modelos 349 y 347', 'Resúmenes 390 / 190 / 180'],
    contenido: { teoria: [], test: [], casos: [] },
  },
  {
    id: 5,
    codigo: 'B5',
    titulo: 'Cierre y Periodificación',
    tituloLargo: 'Operaciones de Cierre y Periodificación',
    descripcion: 'El soporte al cierre: amortizar, imputar cada gasto e ingreso a su ejercicio, reconocer el riesgo de morosos, provisionar el Impuesto sobre Sociedades y regularizar el resultado.',
    distintivo: null,
    icono: ICONOS.cierre,
    temas: ['Amortizaciones (681 / 281)', 'Periodificaciones (480 / 485)', 'Variación de existencias', 'Deterioro de clientes', 'Largo a corto plazo', 'Impuesto sobre Sociedades'],
    contenido: { teoria: [], test: [], casos: [] },
  },
  {
    id: 6,
    codigo: 'B6',
    titulo: 'Revisión y Análisis',
    tituloLargo: 'Revisión, Cuadres y Análisis',
    descripcion: 'La visión senior: revisar tu propio trabajo antes de que lo haga otro, cuadrar la contabilidad con los impuestos y leer lo que cuentan el balance y la cuenta de resultados.',
    distintivo: null,
    icono: ICONOS.analisis,
    temas: ['Balance de sumas y saldos', 'Saldos anómalos', 'Cuadre de IVA y retenciones', 'Balance y PyG', 'Ratios básicos'],
    contenido: { teoria: [], test: [], casos: [] },
  },
];

const PESTANAS = [
  {
    id: 'teoria',
    nombre: 'Teoría',
    vacioTitulo: 'La teoría de este bloque está en preparación',
    vacioTexto: 'Aquí encontrarás explicaciones directas y prácticas, las cuentas del PGC implicadas y ejemplos reales de asientos.',
  },
  {
    id: 'test',
    nombre: 'Test',
    vacioTitulo: 'El test de este bloque está en preparación',
    vacioTexto: 'Preguntas de respuesta rápida con corrección inmediata y la explicación de cada respuesta.',
  },
  {
    id: 'casos',
    nombre: 'Casos Prácticos',
    vacioTitulo: 'Los casos prácticos de este bloque están en preparación',
    vacioTexto: 'Supuestos del día a día para practicar asientos en formato Debe / Haber con tus propias manos.',
  },
];

const IDS_PESTANAS = PESTANAS.map((p) => p.id);
const LETRAS = ['A', 'B', 'C', 'D'];
const CLAVE_RUTA = 'repasoPGC.ruta';
const CLAVE_PROGRESO = 'repasoPGC.progreso';
const PORCENTAJE_APROBADO = 0.8; // por defecto, si el bloque no define configTest

// Nº de preguntas por intento y aciertos necesarios para aprobar
function configTest(bloque) {
  const total = bloque.contenido.test.length;
  const cfg = bloque.contenido.configTest || {};
  const porIntento = Math.min(cfg.preguntasPorIntento || total, total);
  const aprobado = Math.min(cfg.aprobado || Math.ceil(porIntento * PORCENTAJE_APROBADO), porIntento);
  return { total, porIntento, aprobado };
}

/* =====================================================================
   4. ESTADO Y RUTAS
   ===================================================================== */
const estado = {
  bloque: 0,          // id del bloque activo (0–5)
  pestana: 'teoria',  // 'teoria' | 'test' | 'casos'
  menuAbierto: false, // solo relevante en móvil
};

// Estado de la interfaz que no se guarda (se pierde al recargar)
const ui = {
  teoria: {},   // por bloque: { grupo, paso }
  test: {},     // por bloque: { indice, respuestas: [], terminado }
  casos: {},    // por bloque: { activo }  ·  y por caso: ui.caso[id]
  caso: {},
  animar: false,      // anima el feedback recién generado
  sacudir: null,      // clave del elemento que debe «temblar» tras un error
};

// Progreso persistente por bloque:
// { 0: { mejorTest: 8, preguntasTest: 10, casosResueltos: ['b0-capital'], completado: false } }
let progreso = cargarJSON(CLAVE_PROGRESO, {});

function crearRuta(bloque, pestana) {
  return `#/bloque-${bloque}/${pestana}`;
}

function leerRuta(hash) {
  const m = /^#\/bloque-(\d+)\/([a-z]+)$/.exec(hash || '');
  if (!m) return null;
  const bloque = Number(m[1]);
  const pestana = m[2];
  if (!BLOQUES.some((b) => b.id === bloque) || !IDS_PESTANAS.includes(pestana)) return null;
  return { bloque, pestana };
}

function navegar(bloque, pestana) {
  const ruta = crearRuta(bloque, pestana);
  if (location.hash === ruta) aplicarRuta({ bloque, pestana });
  else location.hash = ruta; // dispara 'hashchange' → aplicarRuta
}

function aplicarRuta({ bloque, pestana }) {
  const cambiaBloque = bloque !== estado.bloque;
  estado.bloque = bloque;
  estado.pestana = pestana;
  guardarJSON(CLAVE_RUTA, { bloque, pestana });
  renderizar();
  if (cambiaBloque) window.scrollTo(0, 0);
}

const bloqueActivo = () => BLOQUES.find((b) => b.id === estado.bloque);

function progresoDe(idBloque) {
  if (!progreso[idBloque]) progreso[idBloque] = { mejorTest: 0, preguntasTest: 0, casosResueltos: [], completado: false };
  return progreso[idBloque];
}

// Recalcula si el bloque está completado: test aprobado + todos los casos resueltos
function evaluarProgreso(bloque, { avisar = true } = {}) {
  const p = progresoDe(bloque.id);
  const cfg = configTest(bloque);
  const nCasos = bloque.contenido.casos.length;
  if (cfg.total + nCasos === 0) return;
  const testOk = cfg.total === 0 || p.mejorTest >= cfg.aprobado;
  const casosOk = bloque.contenido.casos.every((c) => p.casosResueltos.includes(c.id));
  const antes = p.completado;
  p.completado = testOk && casosOk;
  guardarJSON(CLAVE_PROGRESO, progreso);
  if (!avisar) return;
  actualizarMenu();
  actualizarProgresoBloque(bloque);
  if (!antes && p.completado) mostrarAviso(`¡${bloque.codigo} completado! Test aprobado y los ${nCasos} casos resueltos.`);
}

/* =====================================================================
   5. RENDERIZADO GENERAL
   ===================================================================== */
const CLASES_ENLACE_ACTIVO = ['bg-white/10', 'text-white'];
const CLASES_ENLACE_INACTIVO = ['text-white/70'];
const CLASES_ICONO_ACTIVO = ['bg-acento-500', 'text-tinta-950'];
const CLASES_ICONO_INACTIVO = ['bg-white/5', 'text-white/60'];

function construirMenu() {
  $('#menu-bloques').innerHTML = BLOQUES.map((b) => `
    <li>
      <a href="${crearRuta(b.id, 'teoria')}" data-bloque="${b.id}"
         class="group flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5 hover:text-white active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
        <span data-icono class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition">
          ${svgIcono(b.icono)}
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="font-mono text-[10px] font-semibold uppercase tracking-wider text-white/40">Bloque ${b.id}</span>
            ${b.distintivo ? `<span class="rounded bg-acento-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-acento-100">${escaparHTML(b.distintivo)}</span>` : ''}
          </span>
          <span class="block truncate text-sm font-medium leading-snug">${escaparHTML(b.titulo)}</span>
        </span>
        <span data-completado class="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acento-500 text-tinta-950" title="Bloque completado">
          ${svgIcono(ICONO_OK, 'h-3 w-3', 3)}
        </span>
      </a>
    </li>`).join('');
}

function actualizarMenu() {
  $$('#menu-bloques a').forEach((enlace) => {
    const id = Number(enlace.dataset.bloque);
    const activo = id === estado.bloque;
    const icono = $('[data-icono]', enlace);

    if (activo) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');

    enlace.classList.remove(...CLASES_ENLACE_ACTIVO, ...CLASES_ENLACE_INACTIVO);
    enlace.classList.add(...(activo ? CLASES_ENLACE_ACTIVO : CLASES_ENLACE_INACTIVO));
    icono.classList.remove(...CLASES_ICONO_ACTIVO, ...CLASES_ICONO_INACTIVO);
    icono.classList.add(...(activo ? CLASES_ICONO_ACTIVO : CLASES_ICONO_INACTIVO));

    const marca = $('[data-completado]', enlace);
    const completado = Boolean(progreso[id] && progreso[id].completado);
    marca.classList.toggle('hidden', !completado);
    marca.classList.toggle('flex', completado);
  });

  const total = BLOQUES.length;
  const hechos = BLOQUES.filter((b) => progreso[b.id] && progreso[b.id].completado).length;
  $('#progreso-texto').textContent = `${hechos} / ${total}`;
  $('#progreso-barra').style.width = `${(hechos / total) * 100}%`;
}

function actualizarCabecera(bloque) {
  $('#bloque-etiqueta').textContent = `Bloque ${bloque.id}${bloque.distintivo ? ' · ' + bloque.distintivo + ' del puesto' : ''}`;
  $('#bloque-titulo').textContent = bloque.tituloLargo;
  $('#bloque-descripcion').textContent = bloque.descripcion;
  $('#bloque-temas').innerHTML = bloque.temas
    .map((t) => `<li class="rounded-full border border-tinta-900/10 bg-white px-3 py-1 text-xs font-medium text-tinta-700">${escaparHTML(t)}</li>`)
    .join('');
  $('#barra-titulo').textContent = bloque.titulo;
  $('#barra-codigo').textContent = bloque.codigo;
  actualizarProgresoBloque(bloque);
}

// Pequeño resumen del avance del bloque bajo la cabecera
function actualizarProgresoBloque(bloque) {
  const caja = $('#bloque-progreso');
  if (!caja) return;
  const nTest = bloque.contenido.test.length;
  const nCasos = bloque.contenido.casos.length;
  if (nTest + nCasos === 0) {
    caja.innerHTML = '';
    caja.classList.add('hidden');
    caja.classList.remove('flex');
    return;
  }
  const p = progresoDe(bloque.id);
  const cfg = configTest(bloque);
  const aprobado = p.mejorTest >= cfg.aprobado;
  const resueltos = bloque.contenido.casos.filter((c) => p.casosResueltos.includes(c.id)).length;
  const chip = (ok, texto) => `
    <span class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${ok ? 'bg-acento-50 text-acento-700' : 'bg-tinta-900/5 text-tinta-700/70'}">
      ${ok ? svgIcono(ICONO_OK, 'h-3.5 w-3.5', 2.5) : '<span class="h-1.5 w-1.5 rounded-full bg-current opacity-50"></span>'}${texto}
    </span>`;
  caja.classList.remove('hidden');
  caja.classList.add('flex');
  caja.innerHTML = `
    <span class="text-xs font-medium text-tinta-700/60">Tu avance:</span>
    ${chip(aprobado, `Test ${p.mejorTest}/${cfg.porIntento}`)}
    ${chip(resueltos === nCasos, `Casos ${resueltos}/${nCasos}`)}
    ${p.completado ? chip(true, 'Bloque completado') : ''}`;
}

function actualizarPestanas(bloque) {
  $$('[role="tab"]').forEach((tab) => {
    const id = tab.dataset.pestana;
    const activa = id === estado.pestana;
    tab.setAttribute('aria-selected', String(activa));
    tab.tabIndex = activa ? 0 : -1;
    const contador = $(`[data-contador="${id}"]`, tab);
    const n = id === 'test' ? configTest(bloque).porIntento : bloque.contenido[id].length;
    contador.textContent = n;
    contador.classList.toggle('hidden', n === 0);
  });

  IDS_PESTANAS.forEach((id) => {
    const panel = $(`#panel-${id}`);
    const activa = id === estado.pestana;
    panel.classList.toggle('hidden', !activa);
    panel.innerHTML = activa ? RENDERIZADORES[id](bloque) : '';
  });
  ui.animar = false;
  ui.sacudir = null;
}

// Vuelve a pintar solo el panel activo, conservando el foco del teclado
function repintarPanel() {
  const bloque = bloqueActivo();
  const panel = $(`#panel-${estado.pestana}`);
  const claveFoco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.foco : null;
  panel.innerHTML = RENDERIZADORES[estado.pestana](bloque);
  ui.animar = false;
  ui.sacudir = null;
  if (claveFoco) {
    const el = panel.querySelector(`[data-foco="${claveFoco}"]`);
    if (el) el.focus({ preventScroll: true });
  }
}

function actualizarNavegacionInferior() {
  const anterior = BLOQUES.find((b) => b.id === estado.bloque - 1);
  const siguiente = BLOQUES.find((b) => b.id === estado.bloque + 1);
  const btnAnt = $('#btn-anterior');
  const btnSig = $('#btn-siguiente');
  btnAnt.disabled = !anterior;
  btnSig.disabled = !siguiente;
  $('[data-nombre]', btnAnt).textContent = anterior ? `${anterior.codigo} · ${anterior.titulo}` : '—';
  $('[data-nombre]', btnSig).textContent = siguiente ? `${siguiente.codigo} · ${siguiente.titulo}` : '—';
}

function renderizar() {
  const bloque = bloqueActivo();
  const pestana = PESTANAS.find((p) => p.id === estado.pestana);
  actualizarMenu();
  actualizarCabecera(bloque);
  actualizarPestanas(bloque);
  actualizarNavegacionInferior();
  document.title = `${bloque.codigo} · ${pestana.nombre} — Repaso Contable PGC`;
}

function estadoVacio(bloque, pestanaId) {
  const p = PESTANAS.find((x) => x.id === pestanaId);
  return `
    <div class="rounded-2xl border border-dashed border-tinta-900/15 bg-white/60 px-6 py-12 text-center sm:px-10">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-acento-50 text-acento-700">
        ${svgIcono(bloque.icono, 'h-7 w-7')}
      </div>
      <p class="font-mono text-xs font-semibold uppercase tracking-wider text-tinta-700/50">${bloque.codigo} · ${escaparHTML(p.nombre)}</p>
      <h2 class="mt-2 text-lg font-semibold">${escaparHTML(p.vacioTitulo)}</h2>
      <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tinta-700/70">${escaparHTML(p.vacioTexto)}</p>
    </div>`;
}

// Mensaje flotante breve (p. ej. al completar un bloque)
let temporizadorAviso = null;
function mostrarAviso(texto) {
  const aviso = $('#aviso');
  if (!aviso) return;
  aviso.querySelector('[data-texto]').textContent = texto;
  aviso.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none'), 3500);
}

// Desplaza la página para que un elemento quede a la vista sin quedar
// tapado por las barras fijas (cabecera móvil + pestañas).
//  · 'arriba': alinea el inicio del elemento bajo las barras (tarjetas nuevas)
//  · 'abajo':  sube lo justo para ver su final, sin esconder su inicio (feedback)
function asegurarVisible(el, modo = 'arriba') {
  if (!el) return;
  const margenSuperior = (esMovil() ? 56 : 0) + 84;
  const r = el.getBoundingClientRect();
  let delta = 0;
  if (modo === 'arriba') {
    if (r.top < margenSuperior || r.top > window.innerHeight * 0.7) delta = r.top - margenSuperior;
  } else if (r.top < margenSuperior) {
    delta = r.top - margenSuperior;
  } else if (r.bottom > window.innerHeight - 16) {
    delta = Math.min(r.bottom - window.innerHeight + 16, r.top - margenSuperior);
  }
  if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: 'smooth' });
}

/* =====================================================================
   PIEZAS COMUNES: asiento (libro diario) y avisos
   ===================================================================== */
const COLUMNAS_ASIENTO = 'grid-cols-[minmax(0,1fr)_5.75rem_5.75rem] sm:grid-cols-[minmax(0,1fr)_8rem_8rem]';

function filaCuenta(codigo) {
  return `
    <span class="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
      <span class="shrink-0 font-mono text-[13px] font-semibold text-tinta-900">${escaparHTML(codigo)}</span>
      <span class="min-w-0 text-xs leading-snug text-tinta-700/80 sm:text-[13px]">${escaparHTML(nombreCuenta(codigo))}</span>
    </span>`;
}

function htmlAsiento(lineas, { compacto = false } = {}) {
  const totalDebe = lineas.reduce((s, l) => s + (l.debe || 0), 0);
  const totalHaber = lineas.reduce((s, l) => s + (l.haber || 0), 0);
  const py = compacto ? 'py-2' : 'py-2.5';
  return `
    <div class="overflow-hidden rounded-xl border border-tinta-900/10 bg-white">
      <div class="grid ${COLUMNAS_ASIENTO} gap-2 border-b border-tinta-900/10 bg-tinta-900/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/60">
        <span>Cuenta</span><span class="text-right">Debe</span><span class="text-right">Haber</span>
      </div>
      ${lineas.map((l) => `
        <div class="grid ${COLUMNAS_ASIENTO} items-center gap-2 border-b border-tinta-900/5 px-3 ${py} ${l.haber ? 'sm:pl-10' : ''}">
          ${filaCuenta(l.cuenta)}
          <span class="text-right text-[13px] tabular-nums">${l.debe ? formatoEuros(l.debe) : ''}</span>
          <span class="text-right text-[13px] tabular-nums">${l.haber ? formatoEuros(l.haber) : ''}</span>
        </div>`).join('')}
      <div class="grid ${COLUMNAS_ASIENTO} gap-2 bg-tinta-900/[0.03] px-3 py-2 text-[13px] font-semibold">
        <span class="text-tinta-700/70">Total</span>
        <span class="text-right tabular-nums">${formatoEuros(totalDebe)}</span>
        <span class="text-right tabular-nums">${formatoEuros(totalHaber)}</span>
      </div>
    </div>`;
}

function htmlConsejo(html) {
  return `
    <div class="my-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-950">
      <span class="mt-0.5 shrink-0 text-amber-600">${svgIcono(ICONO_BOMBILLA, 'h-5 w-5')}</span>
      <div>${html}</div>
    </div>`;
}

// Recuadro de corrección (verde si acierta, rojo si falla)
function htmlFeedback(correcto, titulo, cuerpo) {
  const estilo = correcto
    ? 'border-acento-500/30 bg-acento-50 text-acento-900'
    : 'border-rose-300 bg-rose-50 text-rose-950';
  const icono = correcto
    ? `<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acento-500 text-white">${svgIcono(ICONO_OK, 'h-4 w-4', 3)}</span>`
    : `<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">${svgIcono(ICONO_MAL, 'h-4 w-4', 3)}</span>`;
  return `
    <div role="status" class="${ui.animar ? 'animate-aparecer' : ''} flex gap-3 rounded-xl border p-4 ${estilo}">
      ${icono}
      <div class="min-w-0 text-sm leading-relaxed">
        <p class="font-semibold">${titulo}</p>
        ${cuerpo ? `<div class="mt-1">${cuerpo}</div>` : ''}
      </div>
    </div>`;
}

const claseBoton = {
  primario: 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-tinta-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tinta-800 active:scale-[0.98] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 focus-visible:ring-offset-2',
  acento: 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-acento-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-acento-700 active:scale-[0.98] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 focus-visible:ring-offset-2',
  secundario: 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-tinta-900/15 bg-white px-5 text-sm font-semibold text-tinta-900 transition hover:border-tinta-900/30 active:scale-[0.98] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 focus-visible:ring-offset-2',
};

/* =====================================================================
   DOCUMENTOS VISUALES: facturas y tickets maquetados
   ---------------------------------------------------------------------
   Los importes (base, cuotas, retención, total) se calculan a partir de
   las líneas, así el documento y la solución nunca se contradicen.
   ===================================================================== */
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Recargo de equivalencia según el tipo de IVA (vigente en 2026)
const RECARGO_EQUIVALENCIA = { 21: 5.2, 10: 1.4, 4: 0.5 };
const pctTexto = (n) => String(n).replace('.', ',');

function calcularDocumento(doc) {
  const lineas = doc.lineas.map((l) => ({ ...l, importe: r2(l.cantidad * l.precio) }));
  if (doc.tipo === 'ticket') {
    const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
    const base = r2(total / (1 + doc.ivaIncluido / 100));
    return { lineas, total, desglose: [{ pct: doc.ivaIncluido, base, cuota: r2(total - base) }] };
  }
  const porTipo = {};
  lineas.forEach((l) => { porTipo[l.iva] = r2((porTipo[l.iva] || 0) + l.importe); });
  const desglose = Object.keys(porTipo).map(Number).sort((a, b) => b - a)
    .map((pct) => {
      const re = doc.recargo ? (RECARGO_EQUIVALENCIA[pct] || 0) : 0;
      return { pct, base: porTipo[pct], cuota: r2(porTipo[pct] * pct / 100), re, cuotaRe: r2(porTipo[pct] * re / 100) };
    });
  const base = r2(desglose.reduce((s, d) => s + d.base, 0));
  const cuota = r2(desglose.reduce((s, d) => s + d.cuota, 0));
  const recargo = r2(desglose.reduce((s, d) => s + d.cuotaRe, 0));
  const retencion = doc.retencion ? r2(base * doc.retencion / 100) : 0;
  const suplidos = r2((doc.suplidos || []).reduce((s, x) => s + x.importe, 0));
  return { lineas, desglose, base, cuota, recargo, retencion, suplidos, total: r2(base + cuota + recargo - retencion + suplidos) };
}

const TEXTOS_DOC = {
  es: { factura: 'FACTURA', nif: 'NIF', numero: 'Nº', fecha: 'Fecha', cliente: 'Cliente', concepto: 'Concepto', importe: 'Importe', base: 'Base imponible', iva: 'IVA', retencion: 'Retención IRPF', suplidos: 'Suplidos', total: 'TOTAL', pago: 'Forma de pago', vence: 'Vencimiento', suplidosTit: 'Suplidos (pagados en nombre del cliente, sin IVA)' },
  en: { factura: 'INVOICE', nif: 'VAT No.', numero: 'No.', fecha: 'Date', cliente: 'Bill to', concepto: 'Description', importe: 'Amount', base: 'Subtotal', iva: 'VAT', retencion: 'Withholding', suplidos: 'Disbursements', total: 'TOTAL', pago: 'Payment', vence: 'Due date', suplidosTit: 'Disbursements' },
};

function formatoDoc(n, idioma) {
  if (idioma !== 'en') return formatoEuros(n);
  const [e, d] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '−' : ''}€${e.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`;
}

const formatoCantidad = (n) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ',')).replace('-', '−');

// data-campo + resaltado (para la «anatomía de la factura»)
function campoDoc(campo, resaltar) {
  const activo = resaltar === campo;
  return `data-campo="${campo}" class="rounded-md transition ${activo ? 'bg-amber-100 ring-2 ring-amber-400 ring-offset-2 ring-offset-white' : ''}"`;
}

function htmlDocumento(doc, { resaltar = null } = {}) {
  if (doc.tipo === 'ticket') return htmlTicket(doc);
  if (doc.tipo === 'resumen') return htmlResumen(doc);
  if (doc.tipo === 'extracto') return htmlExtracto(doc);
  return htmlFactura(doc, resaltar);
}

// Saldos del extracto calculados a partir del saldo inicial
function calcularExtracto(doc) {
  let saldo = doc.saldoInicial;
  const movimientos = doc.movimientos.map((m) => {
    saldo = r2(saldo + m.importe);
    return { ...m, saldo };
  });
  return { movimientos, saldoFinal: saldo };
}

const importeConSigno = (n) => `${n < 0 ? '−' : '+'}${formatoEuros(Math.abs(n))}`;

// Extracto bancario con aspecto de banca online (lista apta para móvil)
function htmlExtracto(doc) {
  const { movimientos, saldoFinal } = calcularExtracto(doc);
  return `
    <figure class="mx-auto w-full max-w-xl" aria-label="Extracto bancario de ${escaparHTML(doc.titular)}">
      <div class="overflow-hidden rounded-xl bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,27,45,.08),0_10px_30px_-12px_rgba(15,27,45,.35)] ring-1 ring-slate-900/10">
        <div class="bg-[#0b3b5c] px-4 py-3 text-white">
          <div class="flex items-center justify-between gap-3">
            <span class="flex items-center gap-2 text-[15px] font-bold tracking-tight">
              <span class="flex h-6 w-6 items-center justify-center rounded-md bg-white/15">${svgIcono(ICONOS.banco, 'h-4 w-4')}</span>${escaparHTML(doc.banco)}
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-white/60">Extracto</span>
          </div>
          <p class="mt-2 text-[12.5px] font-medium text-white/90">${escaparHTML(doc.titular)}</p>
          <p class="font-mono text-[11px] text-white/65">${escaparHTML(doc.iban)}</p>
        </div>
        <div class="flex flex-wrap justify-between gap-x-3 gap-y-0.5 bg-slate-50 px-4 py-2 text-[11.5px] text-slate-500">
          <span>${escaparHTML(doc.periodo)}</span>
          <span>Saldo inicial <span class="font-mono font-semibold text-slate-700">${formatoEuros(doc.saldoInicial)}</span></span>
        </div>
        <ul class="divide-y divide-slate-200">
          ${movimientos.map((m) => `
            <li class="px-4 py-2.5 ${m.resaltar ? 'border-l-4 border-amber-400 bg-amber-50 pl-3' : ''}">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-mono text-[10.5px] text-slate-400">${escaparHTML(m.fecha)}</p>
                  <p class="break-words text-[12.5px] font-semibold uppercase leading-snug tracking-tight text-slate-800">${escaparHTML(m.concepto)}</p>
                  ${m.detalle ? `<p class="text-[11.5px] leading-snug text-slate-500">${escaparHTML(m.detalle)}</p>` : ''}
                </div>
                <div class="shrink-0 text-right">
                  <p class="whitespace-nowrap font-mono text-[13px] font-bold ${m.importe < 0 ? 'text-rose-600' : 'text-emerald-700'}">${importeConSigno(m.importe)}</p>
                  <p class="whitespace-nowrap font-mono text-[10.5px] text-slate-400">${formatoEuros(m.saldo)}</p>
                </div>
              </div>
              ${m.resaltar ? '<p class="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-700">▲ Movimiento a registrar</p>' : ''}
            </li>`).join('')}
        </ul>
        <div class="flex justify-between border-t-2 border-slate-800 px-4 py-2.5 text-[12.5px] font-bold text-slate-900">
          <span>Saldo final</span><span class="font-mono">${formatoEuros(saldoFinal)}</span>
        </div>
        <p class="bg-slate-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wider text-slate-400">Documento ficticio · material de formación</p>
      </div>
    </figure>`;
}

// Informe o extracto sacado del programa del cliente (cierres de caja, mayor de una cuenta…)
function htmlResumen(doc) {
  const numerica = (i) => i > 0 && doc.columnas.length > 2 ? i >= doc.columnas.length - 2 : i > 0;
  return `
    <figure class="mx-auto w-full max-w-xl" aria-label="${escaparHTML(doc.titulo)}">
      <div class="overflow-hidden rounded-lg bg-white text-[12.5px] leading-snug text-slate-700 shadow-[0_1px_2px_rgba(15,27,45,.08),0_10px_30px_-12px_rgba(15,27,45,.35)] ring-1 ring-slate-900/10">
        <div class="flex items-center justify-between gap-3 bg-slate-800 px-4 py-2.5 text-white">
          <span class="min-w-0 truncate text-[12px] font-semibold">${escaparHTML(doc.emisor.nombre)}</span>
          <span class="shrink-0 font-mono text-[10.5px] text-white/60">${escaparHTML(doc.emisor.nif || '')}</span>
        </div>
        <div class="p-4 sm:p-5">
          <p class="text-[15px] font-bold leading-tight text-slate-900">${escaparHTML(doc.titulo)}</p>
          ${doc.subtitulo ? `<p class="mt-0.5 text-slate-500">${escaparHTML(doc.subtitulo)}</p>` : ''}
          <table class="mt-3 w-full border-collapse text-[12.5px]">
            <thead>
              <tr class="border-b-2 border-slate-800 text-[10.5px] uppercase tracking-wider text-slate-500">
                ${doc.columnas.map((c, i) => `<th class="pb-1.5 font-semibold ${numerica(i) ? 'text-right' : 'text-left'} ${i > 0 ? 'pl-2' : ''}">${escaparHTML(c)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${doc.filas.map((fila) => `
                <tr class="border-b border-slate-200 align-top">
                  ${fila.map((v, i) => `<td class="py-2 ${numerica(i) ? 'whitespace-nowrap text-right font-mono text-[12px] tabular-nums' : ''} ${i === 0 && doc.columnas.length > 2 ? 'whitespace-nowrap' : ''} ${i > 0 ? 'pl-2' : ''} ${i === fila.length - 1 && (doc.columnas.length === 2 || /saldo/i.test(doc.columnas[i])) ? 'font-semibold text-slate-900' : ''}">${escaparHTML(v)}</td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
          ${(doc.notas || []).length ? `
            <ul class="mt-3 space-y-1 rounded-md bg-amber-50 p-2.5 text-[12px] text-amber-950">
              ${doc.notas.map((n) => `<li class="flex gap-1.5"><span aria-hidden="true">•</span><span>${escaparHTML(n)}</span></li>`).join('')}
            </ul>` : ''}
        </div>
        <p class="bg-slate-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wider text-slate-400">Documento ficticio · material de formación</p>
      </div>
    </figure>`;
}

function htmlFactura(doc, resaltar) {
  const t = TEXTOS_DOC[doc.idioma === 'en' ? 'en' : 'es'];
  const f = (n) => formatoDoc(n, doc.idioma);
  const c = calcularDocumento(doc);
  const color = doc.color || '#17263d';
  const titulo = doc.titulo || t.factura;

  const filas = c.lineas.map((l) => `
    <tr class="border-b border-slate-200 align-top">
      <td class="py-2 pr-2">
        <span class="block font-medium text-slate-900">${escaparHTML(l.concepto)}</span>
        <span class="block text-[11px] text-slate-500">${formatoCantidad(l.cantidad)} × ${f(l.precio)}${c.desglose && c.desglose.length > 1 ? ` · ${t.iva} ${l.iva} %` : ''}</span>
      </td>
      <td class="whitespace-nowrap py-2 text-right font-medium tabular-nums text-slate-900">${f(l.importe)}</td>
    </tr>`).join('');

  const suplidos = (doc.suplidos || []).length ? `
    <div class="mt-3 rounded-md border border-dashed border-slate-300 p-2.5">
      <p class="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">${t.suplidosTit}</p>
      ${doc.suplidos.map((x) => `
        <div class="flex justify-between gap-3"><span>${escaparHTML(x.concepto)}</span><span class="whitespace-nowrap tabular-nums">${f(x.importe)}</span></div>`).join('')}
    </div>` : '';

  const filaTotal = (etiqueta, valor, extra = '') => `
    <div ${extra} class="flex justify-between gap-4 px-1 py-0.5"><span class="text-slate-600">${etiqueta}</span><span class="tabular-nums">${valor}</span></div>`;

  const totales = `
    <div class="mt-3 ml-auto w-full max-w-[17rem] space-y-0.5 text-[12.5px]">
      <div ${campoDoc('base', resaltar)}>
        ${c.desglose.map((d) => filaTotal(`${t.base}${c.desglose.length > 1 ? ` (${d.pct} %)` : ''}`, f(d.base))).join('')}
      </div>
      <div ${campoDoc('iva', resaltar)}>
        ${c.desglose.map((d) => filaTotal(`${t.iva} ${d.pct} %`, f(d.cuota))).join('')}
      </div>
      ${c.recargo ? c.desglose.filter((d) => d.re).map((d) => filaTotal(`Recargo equiv. ${pctTexto(d.re)} %`, f(d.cuotaRe))).join('') : ''}
      ${c.retencion ? filaTotal(`${t.retencion} ${doc.retencion} %`, `−${f(c.retencion)}`) : ''}
      ${c.suplidos ? filaTotal(t.suplidos, f(c.suplidos)) : ''}
      <div ${campoDoc('total', resaltar)}>
        <div class="mt-1 flex justify-between gap-4 rounded-md px-2 py-1.5 text-[14px] font-bold text-white" style="background:${color}">
          <span>${t.total}</span><span class="tabular-nums">${f(c.total)}</span>
        </div>
      </div>
    </div>`;

  return `
    <figure class="mx-auto w-full max-w-xl" aria-label="${escaparHTML(titulo)} ${escaparHTML(doc.numero)} de ${escaparHTML(doc.emisor.nombre)}">
      <div class="relative overflow-hidden rounded-lg bg-white font-sans text-[12.5px] leading-snug text-slate-700 shadow-[0_1px_2px_rgba(15,27,45,.08),0_10px_30px_-12px_rgba(15,27,45,.35)] ring-1 ring-slate-900/10">
        <div class="h-1.5" style="background:${color}"></div>
        <div class="p-4 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div ${campoDoc('emisor', resaltar)}>
              <p class="text-[15px] font-bold leading-tight text-slate-900">${escaparHTML(doc.emisor.nombre)}</p>
              <p>${t.nif}: ${escaparHTML(doc.emisor.nif)}</p>
              ${doc.emisor.direccion.map((d) => `<p class="text-slate-500">${escaparHTML(d)}</p>`).join('')}
            </div>
            <div class="flex w-full flex-wrap items-baseline gap-x-4 gap-y-0.5 border-t border-slate-200 pt-2.5 sm:block sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
              <p class="w-full font-mono text-[12px] font-bold uppercase tracking-[0.18em]" style="color:${color}">${escaparHTML(titulo)}</p>
              <p ${campoDoc('numero', resaltar)}>${t.numero} <span class="font-semibold text-slate-900">${escaparHTML(doc.numero)}</span></p>
              <p ${campoDoc('fecha', resaltar)}>${t.fecha}: <span class="font-semibold text-slate-900">${escaparHTML(doc.fecha)}</span></p>
            </div>
          </div>
          ${doc.rectifica ? `<p class="mt-3 rounded-md bg-orange-50 px-2.5 py-2 text-[12px] font-medium text-orange-900">${escaparHTML(doc.rectifica)}</p>` : ''}
          ${doc.receptor ? `
            <div ${campoDoc('receptor', resaltar)}>
              <div class="mt-3 rounded-md bg-slate-50 p-2.5">
                <p class="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">${t.cliente}</p>
                <p class="font-semibold text-slate-900">${escaparHTML(doc.receptor.nombre)}</p>
                <p>${t.nif}: ${escaparHTML(doc.receptor.nif)}</p>
                ${doc.receptor.direccion.map((d) => `<p class="text-slate-500">${escaparHTML(d)}</p>`).join('')}
              </div>
            </div>` : ''}
          <div ${campoDoc('descripcion', resaltar)}>
            <table class="mt-3 w-full border-collapse">
              <thead>
                <tr class="border-b-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500" style="border-color:${color}">
                  <th class="pb-1.5 text-left font-semibold">${t.concepto}</th><th class="pb-1.5 text-right font-semibold">${t.importe}</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
          ${suplidos}
          ${totales}
          ${(doc.menciones || []).map((m) => `<p class="mt-3 text-[11.5px] font-semibold italic text-slate-700">${escaparHTML(m)}</p>`).join('')}
          <div class="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-2.5 text-[11.5px] text-slate-500">
            ${doc.formaPago ? `<span>${t.pago}: <span class="text-slate-700">${escaparHTML(doc.formaPago)}</span></span>` : ''}
            ${doc.vencimiento ? `<span>${t.vence}: <span class="text-slate-700">${escaparHTML(doc.vencimiento)}</span></span>` : ''}
          </div>
        </div>
        <p class="bg-slate-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wider text-slate-400">Documento ficticio · material de formación</p>
      </div>
    </figure>`;
}

function htmlTicket(doc) {
  const c = calcularDocumento(doc);
  const d = c.desglose[0];
  return `
    <figure class="mx-auto w-full max-w-[18rem]" aria-label="Ticket ${escaparHTML(doc.numero)} de ${escaparHTML(doc.emisor.nombre)}">
      <div class="relative bg-[#fffdf6] px-4 pb-4 pt-5 font-mono text-[12px] leading-snug text-slate-800 shadow-[0_1px_2px_rgba(15,27,45,.08),0_10px_30px_-12px_rgba(15,27,45,.35)] ring-1 ring-slate-900/10"
           style="clip-path:polygon(0 6px,4% 0,8% 6px,12% 0,16% 6px,20% 0,24% 6px,28% 0,32% 6px,36% 0,40% 6px,44% 0,48% 6px,52% 0,56% 6px,60% 0,64% 6px,68% 0,72% 6px,76% 0,80% 6px,84% 0,88% 6px,92% 0,96% 6px,100% 0,100% calc(100% - 6px),96% 100%,92% calc(100% - 6px),88% 100%,84% calc(100% - 6px),80% 100%,76% calc(100% - 6px),72% 100%,68% calc(100% - 6px),64% 100%,60% calc(100% - 6px),56% 100%,52% calc(100% - 6px),48% 100%,44% calc(100% - 6px),40% 100%,36% calc(100% - 6px),32% 100%,28% calc(100% - 6px),24% 100%,20% calc(100% - 6px),16% 100%,12% calc(100% - 6px),8% 100%,4% calc(100% - 6px),0 100%)">
        <div class="text-center">
          <p class="text-[14px] font-bold">${escaparHTML(doc.emisor.nombre)}</p>
          <p>NIF ${escaparHTML(doc.emisor.nif)}</p>
          ${doc.emisor.direccion.map((x) => `<p>${escaparHTML(x)}</p>`).join('')}
        </div>
        <p class="my-2 border-y border-dashed border-slate-400 py-1 text-center font-bold">FACTURA SIMPLIFICADA</p>
        <div class="flex justify-between gap-2"><span>${escaparHTML(doc.numero)}</span><span>${escaparHTML(doc.fecha)}</span></div>
        <div class="my-2 border-t border-dashed border-slate-400"></div>
        ${c.lineas.map((l) => `
          <div class="flex justify-between gap-2"><span class="min-w-0">${escaparHTML(l.concepto.toUpperCase())}</span><span class="whitespace-nowrap">${formatoEuros(l.importe)}</span></div>
          ${l.cantidad !== 1 ? `<p class="pl-2 text-slate-500">${formatoCantidad(l.cantidad)} x ${formatoEuros(l.precio)}</p>` : ''}`).join('')}
        <div class="my-2 border-t border-dashed border-slate-400"></div>
        <div class="flex justify-between text-[14px] font-bold"><span>TOTAL</span><span>${formatoEuros(c.total)}</span></div>
        <p class="mt-1 text-[11px]">IVA ${d.pct} % INCLUIDO</p>
        <div class="mt-1 flex justify-between text-[11px]"><span>Base ${formatoEuros(d.base)}</span><span>Cuota ${formatoEuros(d.cuota)}</span></div>
        <p class="mt-2">PAGO: ${escaparHTML(doc.formaPago)}</p>
        <p class="mt-3 text-center">GRACIAS POR SU VISITA</p>
        <p class="mt-3 text-center text-[9.5px] uppercase tracking-wider text-slate-400">Documento ficticio · formación</p>
      </div>
    </figure>`;
}

/* =====================================================================
   6. TEORÍA
   ===================================================================== */
function estadoTeoria(idBloque) {
  if (!ui.teoria[idBloque]) {
    ui.teoria[idBloque] = { grupo: 1, paso: 0, campo: 'receptor', calc: { base: '1000', iva: 21, ret: 15 }, prestamo: { capital: '20000', tipo: '5', meses: '60' } };
  }
  return ui.teoria[idBloque];
}

function renderizarTeoria(bloque) {
  const secciones = bloque.contenido.teoria;
  if (secciones.length === 0) return estadoVacio(bloque, 'teoria');

  const indice = `
    <nav aria-label="Índice de la teoría" class="mb-8 rounded-2xl border border-tinta-900/10 bg-white p-4 sm:p-5">
      <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">En este bloque</p>
      <ol class="grid gap-2 sm:grid-cols-2">
        ${secciones.map((s, i) => `
          <li>
            <button type="button" data-accion="teoria-ir" data-destino="sec-${s.id}"
                    class="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-tinta-900/[0.04] active:bg-tinta-900/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tinta-900 font-mono text-sm font-semibold text-white">${i + 1}</span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold leading-snug">${escaparHTML(s.titulo)}</span>
                <span class="block text-xs text-tinta-700/60">${escaparHTML(s.resumen)}</span>
              </span>
            </button>
          </li>`).join('')}
      </ol>
    </nav>`;

  const cuerpo = secciones.map((s, i) => `
    <section id="sec-${s.id}" class="mb-12 scroll-mt-40 lg:scroll-mt-24" aria-labelledby="tit-${s.id}">
      <div class="mb-4 flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-acento-500 font-mono text-sm font-bold text-tinta-950">${i + 1}</span>
        <h2 id="tit-${s.id}" class="text-xl font-bold leading-tight tracking-tight">${escaparHTML(s.titulo)}</h2>
      </div>
      <div class="prosa space-y-4 text-[15px] leading-relaxed text-tinta-900/90">
        ${s.piezas.map((p) => renderizarPieza(p, bloque)).join('')}
      </div>
    </section>`).join('');

  return indice + cuerpo;
}

function renderizarPieza(pieza, bloque) {
  switch (pieza.tipo) {
    case 'html': return `<div class="space-y-3">${pieza.html}</div>`;
    case 'consejo': return htmlConsejo(pieza.html);
    case 'asiento': return piezaAsiento(pieza);
    case 'ecuacion': return piezaEcuacion();
    case 'masas': return piezaMasas();
    case 'reglas': return piezaReglas();
    case 'simulador-balance': return piezaSimulador(pieza, bloque);
    case 'explorador-pgc': return piezaExplorador(bloque);
    case 'codificacion': return piezaCodificacion();
    case 'pasos': return piezaPasos(pieza);
    case 'tabla': return piezaTabla(pieza);
    case 'gestoria': return piezaGestoria(pieza.html);
    case 'anatomia-factura': return piezaAnatomia(pieza, bloque);
    case 'calculadora': return piezaCalculadora(bloque, pieza);
    case 'prestamo': return piezaPrestamo(bloque);
    case 'documento': return `<div class="my-5">${htmlDocumento(pieza.documento)}</div>`;
    default: return '';
  }
}

function piezaAsiento(p) {
  return `
    <figure class="my-5">
      <figcaption class="mb-2">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-acento-700">Ejemplo de asiento</span>
        <span class="mt-0.5 block text-sm font-semibold">${escaparHTML(p.titulo)}</span>
        ${p.subtitulo ? `<span class="block text-xs text-tinta-700/60">${escaparHTML(p.subtitulo)}</span>` : ''}
      </figcaption>
      ${htmlAsiento(p.lineas)}
      ${p.nota ? `<p class="mt-2 text-sm text-tinta-700/80">${escaparHTML(p.nota)}</p>` : ''}
    </figure>`;
}

function piezaEcuacion() {
  const tarjeta = (color, titulo, texto) => `
    <div class="rounded-xl bg-white/[0.06] p-4">
      <p class="text-xs font-bold uppercase tracking-wider ${color}">${titulo}</p>
      <p class="mt-1.5 text-sm leading-relaxed text-white/80">${texto}</p>
    </div>`;
  return `
    <div class="my-5 rounded-2xl bg-tinta-900 p-5 text-white sm:p-6">
      <p class="text-center font-mono text-[15px] font-semibold tracking-tight sm:text-xl">
        <span class="text-acento-100">ACTIVO</span>
        <span class="text-white/50">=</span>
        <span class="text-amber-200">PASIVO</span>
        <span class="text-white/50">+</span>
        <span class="text-indigo-200">PATRIMONIO&nbsp;NETO</span>
      </p>
      <div class="mt-5 grid gap-3 sm:grid-cols-3">
        ${tarjeta('text-acento-100', 'Activo', 'Lo que la empresa <strong class="text-white">tiene</strong> y lo que le <strong class="text-white">deben</strong>: dinero en el banco, clientes pendientes de cobro, ordenadores, mercancía.')}
        ${tarjeta('text-amber-200', 'Pasivo', 'Lo que la empresa <strong class="text-white">debe a terceros</strong>: proveedores, Hacienda, Seguridad Social, préstamos del banco.')}
        ${tarjeta('text-indigo-200', 'Patrimonio neto', 'Lo que pertenece a los <strong class="text-white">socios</strong>: el capital aportado, los beneficios no repartidos (reservas) y el resultado del año.')}
      </div>
    </div>`;
}

function piezaMasas() {
  const caja = (estilo, titulo, explicacion, filas) => `
    <div class="rounded-xl border p-3.5 ${estilo}">
      <p class="text-sm font-bold">${titulo}</p>
      <p class="mb-2 text-xs opacity-70">${explicacion}</p>
      <ul class="space-y-1.5">
        ${filas.map(([grupo, texto]) => `
          <li class="flex items-start gap-2 text-[13px] leading-snug">
            <span class="mt-px shrink-0 rounded bg-white/80 px-1.5 font-mono text-[11px] font-bold">G${grupo}</span>
            <span>${texto}</span>
          </li>`).join('')}
      </ul>
    </div>`;
  return `
    <figure class="my-5">
      <figcaption class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-acento-700">Dónde cae cada grupo en el balance</figcaption>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-3">
          <p class="font-mono text-xs font-bold uppercase tracking-wider text-acento-700">Activo</p>
          ${caja('border-acento-500/25 bg-acento-50/60 text-acento-900', 'Activo no corriente', 'Se usa en la empresa más de un año', [[2, 'Inmovilizado: locales, vehículos, ordenadores, software']])}
          ${caja('border-acento-500/25 bg-acento-50/60 text-acento-900', 'Activo corriente', 'Se convierte en dinero en menos de un año', [[3, 'Existencias en almacén'], [4, 'Clientes (43) y créditos con Hacienda (47 deudoras)'], [5, 'Tesorería: caja y bancos (57)']])}
        </div>
        <div class="space-y-3">
          <p class="font-mono text-xs font-bold uppercase tracking-wider text-indigo-700">Patrimonio neto y pasivo</p>
          ${caja('border-indigo-300/50 bg-indigo-50/60 text-indigo-950', 'Patrimonio neto', 'Financiación propia, de los socios', [[1, 'Capital (10), reservas (11) y resultado (12)']])}
          ${caja('border-amber-300/60 bg-amber-50/60 text-amber-950', 'Pasivo no corriente', 'Deudas que vencen en más de un año', [[1, 'Préstamos a largo plazo (17)']])}
          ${caja('border-amber-300/60 bg-amber-50/60 text-amber-950', 'Pasivo corriente', 'Deudas que vencen en menos de un año', [[4, 'Proveedores (40), acreedores (41), Hacienda y Seguridad Social (47 acreedoras)'], [5, 'Préstamos a corto plazo (52)']])}
        </div>
      </div>
      <div class="mt-3 flex gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-[13px] leading-snug text-rose-950">
        <span class="mt-px shrink-0 rounded bg-white/80 px-1.5 font-mono text-[11px] font-bold">G6 · G7</span>
        <span>Los gastos y los ingresos <strong>no van al balance</strong>: forman la Cuenta de Pérdidas y Ganancias. Su diferencia es el resultado del ejercicio (129), que al cierre pasa a formar parte del patrimonio neto.</span>
      </div>
    </figure>`;
}

function piezaReglas() {
  const pastilla = (lado) => lado === 'Debe'
    ? '<span class="inline-flex min-w-[3.75rem] justify-center rounded-md bg-tinta-900 px-2 py-1 text-xs font-bold text-white">Debe</span>'
    : '<span class="inline-flex min-w-[3.75rem] justify-center rounded-md border border-tinta-900/20 bg-white px-2 py-1 text-xs font-bold text-tinta-900">Haber</span>';
  const filas = [
    ['Activo', 'Bancos, clientes, ordenadores', 'Debe', 'Haber', 'bg-acento-500'],
    ['Pasivo', 'Proveedores, Hacienda, préstamos', 'Haber', 'Debe', 'bg-amber-400'],
    ['Patrimonio neto', 'Capital, reservas', 'Haber', 'Debe', 'bg-indigo-400'],
    ['Gastos (grupo 6)', 'Alquiler, suministros, sueldos', 'Debe', 'Haber', 'bg-rose-400'],
    ['Ingresos (grupo 7)', 'Ventas, servicios prestados', 'Haber', 'Debe', 'bg-sky-400'],
  ];
  return `
    <figure class="my-5 overflow-hidden rounded-xl border border-tinta-900/10 bg-white">
      <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-tinta-900/10 bg-tinta-900/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/60 sm:px-4">
        <span>Tipo de cuenta</span><span class="min-w-[3.75rem] text-center">Aumenta</span><span class="min-w-[3.75rem] text-center">Disminuye</span>
      </div>
      ${filas.map(([tipo, ej, sube, baja, color]) => `
        <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-tinta-900/5 px-3 py-2.5 last:border-0 sm:px-4">
          <span class="flex min-w-0 items-start gap-2">
            <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}"></span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-snug">${tipo}</span>
              <span class="block text-xs text-tinta-700/60">${ej}</span>
            </span>
          </span>
          ${pastilla(sube)}${pastilla(baja)}
        </div>`).join('')}
      <figcaption class="border-t border-tinta-900/10 bg-tinta-900/[0.02] px-3 py-2.5 text-xs leading-relaxed text-tinta-700/70 sm:px-4">
        <strong>Saldo deudor:</strong> el Debe suma más que el Haber (activos y gastos). <strong>Saldo acreedor:</strong> el Haber suma más (pasivos, patrimonio neto e ingresos).
      </figcaption>
    </figure>`;
}

function piezaSimulador(pieza, bloque) {
  const st = estadoTeoria(bloque.id);
  const ops = pieza.operaciones;
  const paso = Math.min(st.paso, ops.length);

  // Saldos acumulados hasta el paso actual
  const saldos = {};
  const totales = { activo: 0, pasivo: 0, pn: 0 };
  ops.slice(0, paso).forEach((op) => op.lineas.forEach((l) => {
    const masa = pieza.masas[l.cuenta];
    const mov = masa === 'activo' ? (l.debe || 0) - (l.haber || 0) : (l.haber || 0) - (l.debe || 0);
    saldos[l.cuenta] = (saldos[l.cuenta] || 0) + mov;
    totales[masa] += mov;
  }));

  // Escala de las barras: el mayor total de todo el recorrido
  let maximo = 0;
  const acumulado = { activo: 0 };
  ops.forEach((op) => op.lineas.forEach((l) => {
    if (pieza.masas[l.cuenta] === 'activo') acumulado.activo += (l.debe || 0) - (l.haber || 0);
    maximo = Math.max(maximo, acumulado.activo);
  }));
  const pct = (v) => (maximo ? (v / maximo) * 100 : 0);

  const op = paso > 0 ? ops[paso - 1] : null;
  const colorMasa = { activo: 'bg-acento-500', pasivo: 'bg-amber-400', pn: 'bg-indigo-400' };
  const nombreMasa = { activo: 'Activo', pasivo: 'Pasivo', pn: 'Patrimonio neto' };

  return `
    <div class="my-6 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm" data-widget="simulador">
      <div class="flex items-center justify-between gap-3 border-b border-tinta-900/10 bg-tinta-900/[0.03] px-4 py-3">
        <p class="text-sm font-bold">${escaparHTML(pieza.titulo)}</p>
        <span class="shrink-0 font-mono text-xs font-semibold text-tinta-700/60">${paso} / ${ops.length}</span>
      </div>

      <div class="space-y-4 p-4">
        ${op ? `
          <div class="${ui.animar ? 'animate-aparecer' : ''}">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-acento-700">Operación ${paso}</p>
            <p class="text-sm font-semibold">${escaparHTML(op.titulo)}</p>
            <p class="mb-3 text-sm text-tinta-700/80">${escaparHTML(op.texto)}</p>
            ${htmlAsiento(op.lineas, { compacto: true })}
            <p class="mt-2 text-[13px] text-tinta-700/80">${escaparHTML(op.nota)}</p>
          </div>` : `
          <p class="rounded-xl bg-tinta-900/[0.03] p-3 text-sm text-tinta-700/80">La empresa aún no ha empezado: el balance está a cero. Pulsa <strong>Siguiente operación</strong> y observa cómo, pase lo que pase, los dos lados siempre suman lo mismo.</p>`}

        <div class="space-y-3 rounded-xl bg-tinta-900/[0.03] p-3.5">
          <div>
            <div class="mb-1 flex justify-between text-xs font-semibold"><span>Activo</span><span class="tabular-nums">${formatoEuros(totales.activo)}</span></div>
            <div class="flex h-4 overflow-hidden rounded-full bg-tinta-900/10">
              <div class="h-full bg-acento-500 transition-all duration-500" style="width:${pct(totales.activo)}%"></div>
            </div>
          </div>
          <div>
            <div class="mb-1 flex justify-between text-xs font-semibold"><span>Pasivo + Patrimonio neto</span><span class="tabular-nums">${formatoEuros(totales.pasivo + totales.pn)}</span></div>
            <div class="flex h-4 overflow-hidden rounded-full bg-tinta-900/10">
              <div class="h-full bg-indigo-400 transition-all duration-500" style="width:${pct(totales.pn)}%"></div>
              <div class="h-full bg-amber-400 transition-all duration-500" style="width:${pct(totales.pasivo)}%"></div>
            </div>
            <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tinta-700/70">
              <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-indigo-400"></span>PN ${formatoEuros(totales.pn)}</span>
              <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-amber-400"></span>Pasivo ${formatoEuros(totales.pasivo)}</span>
            </div>
          </div>
          <p class="inline-flex items-center gap-1.5 rounded-lg bg-acento-500/15 px-2.5 py-1 text-xs font-bold text-acento-700">
            ${svgIcono(ICONO_OK, 'h-3.5 w-3.5', 3)} Activo = Pasivo + PN · el balance cuadra
          </p>

          ${Object.keys(saldos).length ? `
            <div class="border-t border-tinta-900/10 pt-3">
              <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Saldos de las cuentas</p>
              <ul class="space-y-1">
                ${Object.entries(saldos).map(([c, s]) => `
                  <li class="flex items-center justify-between gap-3 text-[13px]">
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="h-2 w-2 shrink-0 rounded-full ${colorMasa[pieza.masas[c]]}" title="${nombreMasa[pieza.masas[c]]}"></span>
                      <span class="font-mono font-semibold">${c}</span>
                      <span class="truncate text-tinta-700/70">${escaparHTML(nombreCuenta(c))}</span>
                    </span>
                    <span class="shrink-0 tabular-nums">${formatoEuros(s)}</span>
                  </li>`).join('')}
              </ul>
            </div>` : ''}
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button type="button" data-accion="sim-anterior" data-foco="sim-ant" class="${claseBoton.secundario}" ${paso === 0 ? 'disabled' : ''}>Anterior</button>
          ${paso < ops.length
            ? `<button type="button" data-accion="sim-siguiente" data-foco="sim-sig" class="${claseBoton.acento}">Siguiente operación</button>`
            : `<button type="button" data-accion="sim-reiniciar" data-foco="sim-sig" class="${claseBoton.primario}">Volver a empezar</button>`}
        </div>
      </div>
    </div>`;
}

function piezaExplorador(bloque) {
  const st = estadoTeoria(bloque.id);
  const g = grupoPGC(st.grupo);
  const estiloDest = ESTILO_DESTINO[g.destino];

  const botones = CUADRO_PGC.map((x) => {
    const activo = x.grupo === g.grupo;
    return `
      <button type="button" data-accion="pgc-grupo" data-grupo="${x.grupo}" data-foco="pgc-${x.grupo}"
              aria-pressed="${activo}" aria-label="Grupo ${x.grupo}: ${escaparHTML(x.nombre)}"
              class="relative flex min-h-[84px] flex-col items-start justify-between rounded-xl border p-2.5 text-left transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${activo ? 'border-tinta-900 bg-tinta-900 text-white shadow-md' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'}">
        <span class="flex w-full items-center justify-between">
          <span class="font-mono text-2xl font-bold leading-none">${x.grupo}</span>
          <span class="h-2 w-2 rounded-full ${ESTILO_DESTINO[x.destino].punto}"></span>
        </span>
        <span class="text-[11px] font-medium leading-tight ${activo ? 'text-white/80' : 'text-tinta-700/70'}">${escaparHTML(x.nombreCorto)}</span>
      </button>`;
  }).join('');

  return `
    <div class="my-6" data-widget="explorador">
      <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-700/70">
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-acento-500"></span>Balance (grupos 1–5)</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-rose-500"></span>Pérdidas y Ganancias (grupos 6–7)</span>
      </div>
      <div class="grid grid-cols-4 gap-2 sm:grid-cols-7">${botones}</div>

      <article class="${ui.animar ? 'animate-aparecer' : ''} mt-4 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm" aria-live="polite">
        <header class="border-b border-tinta-900/10 p-4 sm:p-5">
          <p class="font-mono text-xs font-bold uppercase tracking-wider text-tinta-700/50">Grupo ${g.grupo}</p>
          <h3 class="text-lg font-bold leading-snug">${escaparHTML(g.nombre)}</h3>
          <div class="mt-2 flex flex-wrap gap-2">
            <span class="rounded-md px-2 py-1 text-xs font-semibold ring-1 ${estiloDest.chip}">${estiloDest.etiqueta}</span>
            <span class="rounded-md bg-tinta-900/5 px-2 py-1 text-xs font-medium text-tinta-700">${escaparHTML(g.masa)}</span>
            <span class="rounded-md bg-tinta-900/5 px-2 py-1 text-xs font-medium text-tinta-700">Saldo habitual: ${escaparHTML(g.saldo)}</span>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-tinta-700/90">${escaparHTML(g.resumen)}</p>
          <p class="mt-3 flex gap-2 rounded-lg bg-acento-50 p-3 text-[13px] leading-relaxed text-acento-900">
            <span class="mt-px shrink-0 text-acento-600">${svgIcono(ICONO_INFO, 'h-4 w-4')}</span>
            <span><strong>En tu día a día:</strong> ${escaparHTML(g.enOficina)}</span>
          </p>
        </header>
        <ul class="divide-y divide-tinta-900/5">
          ${g.subgrupos.map((s) => `
            <li class="p-4 sm:px-5 ${s.clave ? 'bg-acento-50/40' : ''}">
              <div class="flex items-start gap-3">
                <span class="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-base font-bold ${s.clave ? 'bg-acento-500 text-tinta-950' : 'bg-tinta-900/[0.06] text-tinta-900'}">${s.codigo}</span>
                <div class="min-w-0 flex-1">
                  <p class="flex flex-wrap items-center gap-2 text-sm font-semibold leading-snug">
                    ${escaparHTML(s.nombre)}
                    ${s.clave ? '<span class="rounded bg-acento-600 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">Clave en tu puesto</span>' : ''}
                  </p>
                  <ul class="mt-1.5 space-y-1">
                    ${s.cuentas.map(([c, n]) => `
                      <li class="flex items-baseline gap-2 text-[13px] leading-snug">
                        <span class="w-10 shrink-0 font-mono font-semibold text-tinta-900">${c}</span>
                        <span class="text-tinta-700/80">${escaparHTML(n)}</span>
                      </li>`).join('')}
                  </ul>
                </div>
              </div>
            </li>`).join('')}
        </ul>
      </article>
    </div>`;
}

const ICONO_MALETIN = 'M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 7h16a1 1 0 011 1v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1zM3 13h18';

function piezaGestoria(html) {
  return `
    <div class="my-5 flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm leading-relaxed text-indigo-950">
      <span class="mt-0.5 shrink-0 text-indigo-600">${svgIcono(ICONO_MALETIN, 'h-5 w-5')}</span>
      <div><p class="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">En la gestoría</p>${html}</div>
    </div>`;
}

function piezaPasos(pieza) {
  return `
    <ol class="my-5 space-y-0">
      ${pieza.pasos.map((p, i) => `
        <li class="relative flex gap-3 pb-4 last:pb-0">
          ${i < pieza.pasos.length - 1 ? '<span class="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-acento-500/25" aria-hidden="true"></span>' : ''}
          <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acento-500 font-mono text-sm font-bold text-tinta-950">${i + 1}</span>
          <div class="min-w-0 pt-1">
            <p class="text-sm font-bold leading-snug">${p.titulo}</p>
            <p class="mt-0.5 text-sm leading-relaxed text-tinta-700/90">${p.texto}</p>
          </div>
        </li>`).join('')}
    </ol>`;
}

// Tabla adaptable: 2 columnas en rejilla; 3 columnas como tarjetas en móvil
function piezaTabla(pieza) {
  const [c0, ...resto] = pieza.columnas;
  const cabecera = pieza.titulo ? `<figcaption class="border-b border-tinta-900/10 bg-tinta-900/[0.03] px-3 py-2.5 text-[13px] font-bold sm:px-4">${pieza.titulo}</figcaption>` : '';
  if (resto.length === 1) {
    return `
      <figure class="my-5 overflow-hidden rounded-xl border border-tinta-900/10 bg-white">
        ${cabecera}
        <dl class="divide-y divide-tinta-900/5">
          ${pieza.filas.map(([a, b]) => `
            <div class="grid gap-x-4 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:px-4">
              <dt class="text-[13px] font-semibold leading-snug">${a}</dt>
              <dd class="text-[13px] leading-snug text-tinta-700/85">${b}</dd>
            </div>`).join('')}
        </dl>
      </figure>`;
  }
  return `
    <figure class="my-5 overflow-hidden rounded-xl border border-tinta-900/10 bg-white">
      ${cabecera}
      <div class="hidden grid-cols-[minmax(0,10rem)_repeat(${resto.length},minmax(0,1fr))] gap-x-4 border-b border-tinta-900/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/60 sm:grid">
        <span>${c0}</span>${resto.map((c) => `<span>${c}</span>`).join('')}
      </div>
      <div class="divide-y divide-tinta-900/5">
        ${pieza.filas.map(([a, ...vals]) => `
          <div class="px-3 py-2.5 sm:grid sm:grid-cols-[minmax(0,10rem)_repeat(${resto.length},minmax(0,1fr))] sm:gap-x-4 sm:px-4">
            <p class="mb-1.5 text-[13px] font-semibold leading-snug sm:mb-0">${a}</p>
            <div class="grid grid-cols-${resto.length} gap-2 sm:contents">
              ${vals.map((v, i) => `
                <div class="rounded-lg bg-tinta-900/[0.03] p-2 sm:rounded-none sm:bg-transparent sm:p-0">
                  <p class="text-[10.5px] font-semibold uppercase tracking-wider text-tinta-700/50 sm:hidden">${resto[i]}</p>
                  <p class="text-[13px] leading-snug text-tinta-700/85">${v}</p>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </figure>`;
}

function piezaAnatomia(pieza, bloque) {
  const st = estadoTeoria(bloque.id);
  const req = pieza.requisitos.find((r) => r.campo === st.campo) || pieza.requisitos[0];
  return `
    <div class="my-6" data-widget="anatomia">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-acento-700">Toca un requisito</p>
      <div class="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        ${pieza.requisitos.map((r, i) => {
          const activo = r.campo === req.campo;
          return `
            <button type="button" data-accion="anatomia-campo" data-campo="${r.campo}" data-foco="anat-${r.campo}" aria-pressed="${activo}"
                    class="flex min-h-[44px] items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 text-left text-[13px] font-semibold leading-tight transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${activo ? 'border-amber-400 bg-amber-50 text-amber-950' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'}">
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${activo ? 'bg-amber-400 text-amber-950' : 'bg-tinta-900/[0.06]'}">${i + 1}</span>
              <span class="min-w-0">${escaparHTML(r.titulo)}</span>
            </button>`;
        }).join('')}
      </div>
      <div class="${ui.animar ? 'animate-aparecer' : ''} mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-950" aria-live="polite">
        <span class="mt-0.5 shrink-0 text-amber-600">${svgIcono(ICONO_INFO, 'h-5 w-5')}</span>
        <p><strong>${escaparHTML(req.titulo)}.</strong> ${escaparHTML(req.texto)}</p>
      </div>
      ${htmlDocumento(pieza.documento, { resaltar: req.campo })}
    </div>`;
}

// Calculadora de factura con IVA y retención
function htmlCalcResultado(calc) {
  const venta = calc.modo === 'venta';
  const base = leerImporte(calc.base);
  if (!(base > 0)) {
    return '<p class="rounded-lg bg-tinta-900/[0.03] p-3 text-sm text-tinta-700/70">Escribe una base imponible para ver el cálculo.</p>';
  }
  const cuota = r2(base * calc.iva / 100);
  const ret = r2(base * calc.ret / 100);
  const total = r2(base + cuota - ret);
  let lineas;
  if (venta) {
    lineas = [{ cuenta: '430', debe: total }];
    if (ret) lineas.push({ cuenta: '473', debe: ret });
    lineas.push({ cuenta: '7xx', haber: base });
    if (cuota) lineas.push({ cuenta: '477', haber: cuota });
  } else {
    lineas = [{ cuenta: '6xx', debe: base }];
    if (cuota) lineas.push({ cuenta: '472', debe: cuota });
    if (ret) lineas.push({ cuenta: '4751', haber: ret });
    lineas.push({ cuenta: '410', haber: total });
  }
  const fila = (a, b, fuerte = false) => `<div class="flex justify-between gap-3 ${fuerte ? 'border-t border-tinta-900/10 pt-1.5 text-[15px] font-bold' : ''}"><span>${a}</span><span class="tabular-nums">${b}</span></div>`;
  return `
    <div class="space-y-1 rounded-lg bg-tinta-900/[0.03] p-3 text-sm">
      ${fila('Base imponible', formatoEuros(base))}
      ${fila(`IVA ${calc.iva} %`, `+ ${formatoEuros(cuota)}`)}
      ${fila(`Retención ${calc.ret} %`, ret ? `− ${formatoEuros(ret)}` : formatoEuros(0))}
      ${fila(venta ? 'Total a cobrar del cliente' : 'Total a pagar al proveedor', formatoEuros(total), true)}
    </div>
    <p class="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Asiento resultante</p>
    ${htmlAsiento(lineas, { compacto: true })}`;
}

// Préstamo de cuota constante (sistema francés)
function cuadroPrestamo(capital, tipoAnual, meses) {
  const i = tipoAnual / 1200;
  const cuota = i ? r2(capital * i / (1 - Math.pow(1 + i, -meses))) : r2(capital / meses);
  const filas = [];
  let pendiente = capital;
  for (let n = 1; n <= meses; n += 1) {
    const interes = r2(pendiente * i);
    const amort = n === meses ? r2(pendiente) : r2(cuota - interes);
    pendiente = r2(pendiente - amort);
    filas.push({ n, cuota: r2(interes + amort), interes, amort, pendiente });
  }
  return { cuota, filas, totalIntereses: r2(filas.reduce((s, f) => s + f.interes, 0)) };
}

function htmlPrestamoResultado(p) {
  const capital = leerImporte(p.capital);
  const tipo = leerImporte(p.tipo);
  const meses = Number(String(p.meses).trim());
  if (!(capital > 0) || !(tipo >= 0) || !Number.isInteger(meses) || meses < 1 || meses > 480) {
    return '<p class="rounded-lg bg-tinta-900/[0.03] p-3 text-sm text-tinta-700/70">Introduce un capital, un tipo de interés anual y un plazo en meses (1 a 480).</p>';
  }
  const { cuota, filas, totalIntereses } = cuadroPrestamo(capital, tipo, meses);
  const visibles = filas.slice(0, Math.min(6, filas.length));
  const ultima = filas[filas.length - 1];
  const fila = (f, extra = '') => `
    <div class="grid grid-cols-[2.25rem_repeat(3,minmax(0,1fr))] gap-2 px-3 py-1.5 text-[12.5px] tabular-nums ${extra}">
      <span class="font-mono text-tinta-700/60">${f.n}</span>
      <span class="text-right text-rose-700">${formatoEuros(f.interes)}</span>
      <span class="text-right text-acento-700">${formatoEuros(f.amort)}</span>
      <span class="text-right">${formatoEuros(f.pendiente)}</span>
    </div>`;
  return `
    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg bg-tinta-900 p-3 text-white">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-white/60">Cuota mensual</p>
        <p class="font-mono text-lg font-bold">${formatoEuros(cuota)}</p>
      </div>
      <div class="rounded-lg bg-rose-50 p-3 text-rose-900">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-rose-700/70">Intereses totales</p>
        <p class="font-mono text-lg font-bold">${formatoEuros(totalIntereses)}</p>
      </div>
    </div>
    <div class="mt-3 overflow-hidden rounded-lg border border-tinta-900/10">
      <div class="grid grid-cols-[2.25rem_repeat(3,minmax(0,1fr))] gap-2 bg-tinta-900/[0.04] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-tinta-700/60">
        <span>Mes</span><span class="text-right">Intereses</span><span class="text-right">Capital</span><span class="text-right">Pendiente</span>
      </div>
      ${visibles.map((f) => fila(f)).join('')}
      ${filas.length > 7 ? '<p class="px-3 py-1 text-center text-xs text-tinta-700/50">⋯</p>' : ''}
      ${filas.length > 6 ? fila(ultima, 'border-t border-tinta-900/10 bg-tinta-900/[0.02]') : ''}
    </div>
    <p class="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Asiento de la cuota 1</p>
    ${htmlAsiento([{ cuenta: '520', debe: filas[0].amort }, { cuenta: '662', debe: filas[0].interes }, { cuenta: '572', haber: filas[0].cuota }], { compacto: true })}
    <p class="mt-2 text-[12.5px] text-tinta-700/70">Fíjate en cómo los intereses de cada cuota bajan y el capital sube, aunque la cuota no cambia.</p>`;
}

function piezaPrestamo(bloque) {
  const { prestamo } = estadoTeoria(bloque.id);
  const campo = (id, etiqueta, sufijo, modo) => `
    <div>
      <label for="prest-${id}" class="mb-1 block text-xs font-semibold text-tinta-700/70">${etiqueta}</label>
      <div class="relative">
        <input id="prest-${id}" type="text" inputmode="${modo}" enterkeyhint="done" autocomplete="off" data-entrada="prest-${id}" data-foco="prest-${id}"
               value="${escaparHTML(prestamo[id])}"
               class="h-12 w-full rounded-xl border-2 border-tinta-900/15 bg-white pl-3 pr-9 text-base font-semibold tabular-nums outline-none transition focus:border-acento-500" />
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-tinta-700/50">${sufijo}</span>
      </div>
    </div>`;
  return `
    <div class="my-6 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm" data-widget="prestamo">
      <div class="border-b border-tinta-900/10 bg-tinta-900/[0.03] px-4 py-3">
        <p class="text-sm font-bold">Simulador de préstamo (cuota constante)</p>
        <p class="text-xs text-tinta-700/70">Cambia los datos y mira cómo se reparte cada cuota entre intereses y capital.</p>
      </div>
      <div class="space-y-4 p-4">
        <div class="grid grid-cols-3 gap-2">
          ${campo('capital', 'Capital', '€', 'decimal')}
          ${campo('tipo', 'Interés anual', '%', 'decimal')}
          ${campo('meses', 'Plazo', 'm', 'numeric')}
        </div>
        <div id="prestamo-resultado" aria-live="polite">${htmlPrestamoResultado(prestamo)}</div>
      </div>
    </div>`;
}

function piezaCalculadora(bloque, pieza = {}) {
  const { calc } = estadoTeoria(bloque.id);
  if (!calc.iniciada) {
    Object.assign(calc, pieza.inicial || {}, { modo: pieza.modo || 'compra', iniciada: true });
  }
  const chips = (accion, valores, actual, sufijo) => valores.map((v) => `
    <button type="button" data-accion="${accion}" data-valor="${v}" data-foco="${accion}-${v}" aria-pressed="${v === actual}"
            class="min-h-[44px] rounded-lg border-2 text-sm font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${v === actual ? 'border-tinta-900 bg-tinta-900 text-white' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'}">
      ${v}${sufijo}
    </button>`).join('');
  return `
    <div class="my-6 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm" data-widget="calculadora">
      <div class="border-b border-tinta-900/10 bg-tinta-900/[0.03] px-4 py-3">
        <p class="text-sm font-bold">${calc.modo === 'venta' ? 'Calculadora de factura emitida' : 'Calculadora de factura recibida'}</p>
        <p class="text-xs text-tinta-700/70">Cambia los datos y mira cómo queda el total y el asiento.</p>
      </div>
      <div class="space-y-4 p-4">
        <div>
          <label for="calc-base" class="mb-1.5 block text-xs font-semibold text-tinta-700/70">Base imponible</label>
          <div class="relative">
            <input id="calc-base" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-entrada="calc-base" data-foco="calc-base"
                   value="${escaparHTML(calc.base)}" placeholder="0,00"
                   class="h-[52px] w-full rounded-xl border-2 border-tinta-900/15 bg-white pl-4 pr-10 text-lg font-semibold tabular-nums outline-none transition focus:border-acento-500" />
            <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-tinta-700/50">€</span>
          </div>
        </div>
        <div>
          <p class="mb-1.5 text-xs font-semibold text-tinta-700/70">Tipo de IVA</p>
          <div class="grid grid-cols-4 gap-1.5">${chips('calc-iva', [21, 10, 4, 0], calc.iva, ' %')}</div>
        </div>
        <div>
          <p class="mb-1.5 text-xs font-semibold text-tinta-700/70">Retención de IRPF</p>
          <div class="grid grid-cols-4 gap-1.5">${chips('calc-ret', [0, 7, 15, 19], calc.ret, ' %')}</div>
        </div>
        <div id="calc-resultado" aria-live="polite">${htmlCalcResultado(calc)}</div>
      </div>
    </div>`;
}

function piezaCodificacion() {
  const niveles = [
    ['4', 'Grupo', 'Acreedores y deudores por operaciones comerciales', 1],
    ['40', 'Subgrupo', 'Proveedores', 2],
    ['400', 'Cuenta', 'Proveedores', 3],
    ['40000012', 'Subcuenta', 'Papelería Martínez, S.L. (un proveedor concreto)', 3],
  ];
  return `
    <figure class="my-6 rounded-2xl border border-tinta-900/10 bg-white p-4 sm:p-5">
      <figcaption class="mb-3">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-acento-700">Cómo se lee un código de cuenta</span>
        <span class="mt-0.5 block text-sm text-tinta-700/80">Cada dígito concreta un poco más. Los programas contables trabajan con <strong>subcuentas</strong> de 8 o más dígitos: los 3 primeros son la cuenta del PGC y el resto identifica al proveedor, cliente o banco concreto.</span>
      </figcaption>
      <ol class="space-y-2">
        ${niveles.map(([codigo, nivel, nombre, resaltados], i) => `
          <li class="flex items-center gap-3" style="padding-left:${i * 0.75}rem">
            <span class="w-[6.5rem] shrink-0 rounded-lg bg-tinta-900/[0.04] px-2 py-1.5 text-center font-mono text-sm font-bold tracking-wider">
              <span class="text-acento-700">${codigo.slice(0, resaltados)}</span><span class="text-tinta-700/40">${codigo.slice(resaltados)}</span>
            </span>
            <span class="min-w-0 text-[13px] leading-snug">
              <span class="font-semibold">${nivel}:</span> <span class="text-tinta-700/80">${escaparHTML(nombre)}</span>
            </span>
          </li>`).join('')}
      </ol>
    </figure>`;
}

/* =====================================================================
   7. TEST
   ===================================================================== */
// Convierte una pregunta del banco al formato de pantalla con las opciones barajadas
function prepararPregunta(q) {
  const opciones = Array.isArray(q.incorrectas)
    ? [{ texto: q.correcta, ok: true }, ...q.incorrectas.map((t) => ({ texto: t, ok: false }))]
    : q.opciones.map((t, i) => ({ texto: t, ok: i === q.correcta }));
  const barajadas = barajar(opciones);
  return {
    id: q.id,
    pregunta: q.pregunta,
    explicacion: q.explicacion,
    opciones: barajadas.map((o) => o.texto),
    correcta: barajadas.findIndex((o) => o.ok),
  };
}

// Sortea un intento nuevo. Da prioridad a las preguntas que no salieron en
// el intento anterior, para que repetir el test no sea repetir preguntas.
function nuevoIntento(bloque, anterior = null) {
  const cfg = configTest(bloque);
  const usadas = new Set(anterior ? anterior.preguntas.map((q) => q.id) : []);
  const banco = bloque.contenido.test;
  const orden = [...barajar(banco.filter((q) => !usadas.has(q.id))), ...barajar(banco.filter((q) => usadas.has(q.id)))];
  return {
    preguntas: orden.slice(0, cfg.porIntento).map(prepararPregunta),
    indice: 0,
    respuestas: [],
    terminado: false,
    intento: anterior ? anterior.intento + 1 : 1,
  };
}

function estadoTest(idBloque) {
  if (!ui.test[idBloque]) ui.test[idBloque] = nuevoIntento(BLOQUES.find((b) => b.id === idBloque));
  return ui.test[idBloque];
}

const contarAciertos = (st) => st.respuestas.filter((r, i) => r === st.preguntas[i].correcta).length;

function renderizarTest(bloque) {
  if (bloque.contenido.test.length === 0) return estadoVacio(bloque, 'test');
  const st = estadoTest(bloque.id);
  const cfg = configTest(bloque);
  return st.terminado ? htmlResultadoTest(bloque, st, cfg) : htmlPreguntaTest(st, cfg);
}

function puntosProgresoTest(st) {
  return st.preguntas.map((q, i) => {
    const r = st.respuestas[i];
    let color = 'bg-tinta-900/10';
    if (r !== undefined) color = r === q.correcta ? 'bg-acento-500' : 'bg-rose-500';
    else if (i === st.indice) color = 'bg-tinta-900';
    return `<span class="h-1.5 flex-1 rounded-full ${color} transition-colors"></span>`;
  }).join('');
}

function htmlPreguntaTest(st, cfg) {
  const q = st.preguntas[st.indice];
  const respuesta = st.respuestas[st.indice];
  const respondida = respuesta !== undefined;
  const acierto = respuesta === q.correcta;
  const ultima = st.indice === st.preguntas.length - 1;
  const aciertos = contarAciertos(st);
  const fallos = st.respuestas.length - aciertos;
  const margen = st.preguntas.length - cfg.aprobado; // fallos permitidos

  const opciones = q.opciones.map((texto, i) => {
    let estilo = 'border-tinta-900/15 bg-white hover:border-tinta-900/35 active:bg-tinta-900/[0.03]';
    let letra = 'bg-tinta-900/[0.06] text-tinta-900';
    let icono = '';
    if (respondida) {
      if (i === q.correcta) {
        estilo = 'border-acento-500 bg-acento-50 text-acento-900';
        letra = 'bg-acento-500 text-white';
        icono = `<span class="shrink-0 text-acento-600">${svgIcono(ICONO_OK, 'h-5 w-5', 2.5)}</span>`;
      } else if (i === respuesta) {
        estilo = `border-rose-400 bg-rose-50 text-rose-900 ${ui.sacudir === 'test' ? 'animate-sacudir' : ''}`;
        letra = 'bg-rose-500 text-white';
        icono = `<span class="shrink-0 text-rose-500">${svgIcono(ICONO_MAL, 'h-5 w-5', 2.5)}</span>`;
      } else {
        estilo = 'border-tinta-900/10 bg-white opacity-50';
      }
    }
    return `
      <li>
        <button type="button" data-accion="test-responder" data-opcion="${i}" data-foco="test-op-${i}"
                ${respondida ? 'disabled aria-disabled="true"' : ''}
                class="flex min-h-[60px] w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left text-[15px] font-medium leading-snug transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${estilo}">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${letra}">${LETRAS[i]}</span>
          <span class="min-w-0 flex-1">${escaparHTML(texto)}</span>
          ${icono}
        </button>
      </li>`;
  }).join('');

  const feedback = respondida
    ? htmlFeedback(acierto,
        acierto ? '¡Correcto!' : `No es correcto. La respuesta es la ${LETRAS[q.correcta]}: «${escaparHTML(q.opciones[q.correcta])}».`,
        escaparHTML(q.explicacion))
    : '';

  const aviso = fallos > margen
    ? `<span class="text-amber-700">Este intento ya no llega a ${cfg.aprobado}: termínalo y repite</span>`
    : `Apruebas con ${cfg.aprobado} de ${st.preguntas.length}`;

  return `
    <div id="tarjeta-test" class="scroll-mt-40 lg:scroll-mt-24 rounded-2xl border border-tinta-900/10 bg-white p-4 shadow-sm sm:p-6">
      ${st.indice === 0 && !respondida ? `
        <p class="mb-4 flex gap-2 rounded-xl bg-tinta-900/[0.03] p-3 text-[13px] leading-snug text-tinta-700/90">
          <span class="mt-px shrink-0 text-acento-600">${svgIcono(ICONO_INFO, 'h-4 w-4')}</span>
          <span>Intento ${st.intento}: <strong>${st.preguntas.length} preguntas al azar</strong> de un banco de ${cfg.total}, con las opciones desordenadas. Necesitas <strong>${cfg.aprobado} aciertos</strong> para aprobar.</span>
        </p>` : ''}
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="font-mono text-xs font-semibold uppercase tracking-wider text-tinta-700/60">Pregunta ${st.indice + 1} de ${st.preguntas.length}</p>
        <p class="text-xs font-semibold text-tinta-700/60"><span class="text-acento-700">${aciertos} ✓</span> · <span class="${fallos ? 'text-rose-600' : ''}">${fallos} ✗</span></p>
      </div>
      <div class="mb-2 flex gap-1" aria-hidden="true">${puntosProgresoTest(st)}</div>
      <p class="mb-5 text-[11px] font-medium text-tinta-700/50">${aviso}</p>
      <h2 class="mb-5 text-lg font-semibold leading-snug">${escaparHTML(q.pregunta)}</h2>
      <ol class="space-y-2.5" aria-label="Opciones de respuesta">${opciones}</ol>
      <div id="feedback-test" class="mt-5 space-y-4" aria-live="polite">
        ${feedback}
        ${respondida ? `
          <button type="button" data-accion="test-siguiente" data-foco="test-sig" class="${claseBoton.primario} w-full sm:w-auto">
            ${ultima ? 'Ver resultado' : 'Siguiente pregunta'} ${svgIcono('M9 6l6 6-6 6', 'h-4 w-4', 2.5)}
          </button>` : ''}
      </div>
    </div>`;
}

function htmlResultadoTest(bloque, st, cfg) {
  const preguntas = st.preguntas;
  const aciertos = contarAciertos(st);
  const total = preguntas.length;
  const aprobado = aciertos >= cfg.aprobado;
  const mejor = progresoDe(bloque.id).mejorTest;
  const casosPendientes = bloque.contenido.casos.filter((c) => !progresoDe(bloque.id).casosResueltos.includes(c.id)).length;
  const mensaje = aciertos === total
    ? '¡Pleno! Tienes los fundamentos muy claros.'
    : aprobado
      ? `Aprobado. Repasa abajo las preguntas falladas${casosPendientes ? ' y sigue con los casos prácticos' : ''}.`
      : `Necesitas ${cfg.aprobado} aciertos para aprobar. Revisa las explicaciones de abajo y prueba otro intento: saldrán preguntas distintas.`;

  const botonRepetir = `<button type="button" data-accion="test-repetir" data-foco="test-rep" class="${aprobado ? claseBoton.secundario : claseBoton.primario}">${svgIcono('M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3M19 9A7 7 0 007 6', 'h-4 w-4', 2.2)} Nuevo intento (otras ${total} preguntas)</button>`;
  const botonSeguir = aprobado
    ? `<button type="button" data-accion="ir-pestana" data-pestana="casos" class="${claseBoton.acento}">Ir a los casos prácticos ${svgIcono('M9 6l6 6-6 6', 'h-4 w-4', 2.5)}</button>`
    : `<button type="button" data-accion="ir-pestana" data-pestana="teoria" class="${claseBoton.secundario}">Repasar la teoría</button>`;

  return `
    <div id="tarjeta-test" class="${ui.animar ? 'animate-aparecer' : ''} scroll-mt-40 lg:scroll-mt-24 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm">
      <div class="p-6 text-center ${aprobado ? 'bg-acento-50' : 'bg-amber-50'}">
        <p class="font-mono text-xs font-semibold uppercase tracking-wider text-tinta-700/60">Resultado · intento ${st.intento}</p>
        <p class="mt-2 font-mono text-5xl font-bold ${aprobado ? 'text-acento-700' : 'text-amber-700'}">${aciertos}<span class="text-2xl text-tinta-700/40">/${total}</span></p>
        <p class="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${aprobado ? 'bg-acento-500 text-white' : 'bg-amber-200 text-amber-900'}">
          ${aprobado ? `${svgIcono(ICONO_OK, 'h-3.5 w-3.5', 3)} Aprobado` : `No aprobado · mínimo ${cfg.aprobado}`}
        </p>
        <p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed">${mensaje}</p>
        ${mejor > 0 ? `<p class="mt-2 text-xs text-tinta-700/60">Tu mejor resultado: ${mejor}/${total}</p>` : ''}
      </div>
      <ol class="divide-y divide-tinta-900/5">
        ${preguntas.map((q, i) => {
          const ok = st.respuestas[i] === q.correcta;
          return `
            <li class="flex gap-3 p-4">
              <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-acento-500' : 'bg-rose-500'} text-white">${svgIcono(ok ? ICONO_OK : ICONO_MAL, 'h-3.5 w-3.5', 3)}</span>
              <div class="min-w-0 text-sm leading-relaxed">
                <p class="font-semibold">${i + 1}. ${escaparHTML(q.pregunta)}</p>
                <p class="mt-1 text-acento-800"><span class="font-semibold">Correcta:</span> ${escaparHTML(q.opciones[q.correcta])}</p>
                ${ok ? '' : `
                  <p class="text-rose-700"><span class="font-semibold">Tu respuesta:</span> ${escaparHTML(q.opciones[st.respuestas[i]])}</p>
                  <p class="mt-1 text-tinta-700/70">${escaparHTML(q.explicacion)}</p>`}
              </div>
            </li>`;
        }).join('')}
      </ol>
      <div class="flex flex-col gap-2 border-t border-tinta-900/10 p-4 sm:flex-row">
        ${aprobado ? botonSeguir + botonRepetir : botonRepetir + botonSeguir}
      </div>
    </div>`;
}

/* =====================================================================
   8. CASOS PRÁCTICOS
   ===================================================================== */
function estadoCasos(idBloque) {
  if (!ui.casos[idBloque]) ui.casos[idBloque] = { activo: 0 };
  return ui.casos[idBloque];
}

function estadoCaso(caso) {
  if (!ui.caso[caso.id]) {
    ui.caso[caso.id] = caso.tipo === 'asiento'
      ? { lineas: [], borrador: { cuenta: null, lado: null, importe: '' }, error: '', resultado: null, intentos: 0, verSolucion: false }
      : { respuestas: {}, fallos: {}, errores: 0 };
  }
  return ui.caso[caso.id];
}

function renderizarCasos(bloque) {
  const casos = bloque.contenido.casos;
  if (casos.length === 0) return estadoVacio(bloque, 'casos');
  const sc = estadoCasos(bloque.id);
  const caso = casos[sc.activo];
  const resueltos = progresoDe(bloque.id).casosResueltos;
  const nResueltos = casos.filter((c) => resueltos.includes(c.id)).length;
  const completo = nResueltos === casos.length;

  // Circuito: una casilla por caso (resuelto ✓, activo, pendiente)
  const pasos = casos.map((c, i) => {
    const activo = i === sc.activo;
    const hecho = resueltos.includes(c.id);
    let estilo = 'border-tinta-900/15 bg-white text-tinta-900 hover:border-tinta-900/35';
    if (hecho) estilo = 'border-acento-500 bg-acento-500 text-white';
    if (activo) estilo = hecho
      ? 'border-tinta-900 bg-acento-500 text-white ring-2 ring-tinta-900 ring-offset-2 ring-offset-papel'
      : 'border-tinta-900 bg-tinta-900 text-white ring-2 ring-tinta-900/20 ring-offset-2 ring-offset-papel';
    return `
      <li>
        <button type="button" data-accion="caso-elegir" data-caso="${i}" data-foco="caso-${i}"
                aria-current="${activo ? 'step' : 'false'}"
                aria-label="Caso ${i + 1}: ${escaparHTML(c.titulo)}${hecho ? ' (resuelto)' : ''}"
                class="flex h-12 w-full items-center justify-center rounded-xl border-2 font-mono text-base font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${estilo}">
          ${hecho && !activo ? svgIcono(ICONO_OK, 'h-5 w-5', 3) : i + 1}
        </button>
      </li>`;
  }).join('');

  const circuito = `
    <nav aria-label="Circuito de casos prácticos" class="mb-5">
      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="font-mono text-[11px] font-bold uppercase tracking-wider text-tinta-700/60">Circuito de ${casos.length} casos</p>
        <p class="text-xs font-semibold ${completo ? 'text-acento-700' : 'text-tinta-700/70'}">${completo ? '✓ Circuito completado' : `${nResueltos} de ${casos.length} resueltos`}</p>
      </div>
      <ol class="grid gap-1.5" style="grid-template-columns:repeat(${casos.length <= 7 ? casos.length : Math.ceil(casos.length / 2)},minmax(0,1fr))">${pasos}</ol>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-tinta-900/10">
        <div class="h-full rounded-full bg-acento-500 transition-all duration-500" style="width:${(nResueltos / casos.length) * 100}%"></div>
      </div>
    </nav>`;

  const cuerpo = caso.tipo === 'asiento' ? htmlCasoAsiento(caso, bloque) : htmlCasoClasificar(caso, bloque);
  const anterior = casos[sc.activo - 1];
  const siguiente = casos[sc.activo + 1];
  const resuelto = resueltos.includes(caso.id);

  const navegacion = `
    <div class="mt-4 grid grid-cols-2 gap-2">
      <button type="button" data-accion="caso-elegir" data-caso="${sc.activo - 1}" data-foco="caso-ant" class="${claseBoton.secundario}" ${anterior ? '' : 'disabled'}>
        ${svgIcono('M15 18l-6-6 6-6', 'h-4 w-4', 2.5)} Anterior
      </button>
      <button type="button" data-accion="caso-elegir" data-caso="${sc.activo + 1}" data-foco="caso-sig" class="${resuelto ? claseBoton.primario : claseBoton.secundario}" ${siguiente ? '' : 'disabled'}>
        Siguiente caso ${svgIcono('M9 6l6 6-6 6', 'h-4 w-4', 2.5)}
      </button>
    </div>`;

  return `
    ${circuito}
    <div id="tarjeta-caso" class="scroll-mt-40 lg:scroll-mt-24">${cuerpo}</div>
    ${navegacion}`;
}

function cabeceraCaso(caso, numero, total) {
  return `
    <header class="border-b border-tinta-900/10 p-4 sm:p-5">
      ${caso.cliente ? `
        <p class="mb-2.5 flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[12.5px] leading-tight text-indigo-950">
          <span class="shrink-0 text-indigo-600">${svgIcono(ICONO_MALETIN, 'h-4 w-4')}</span>
          <span class="min-w-0"><span class="font-semibold">Cliente: ${escaparHTML(caso.cliente.nombre)}</span> <span class="text-indigo-800/70">· ${escaparHTML(caso.cliente.actividad)}</span></span>
        </p>` : ''}
      <p class="font-mono text-[11px] font-bold uppercase tracking-wider text-acento-700">Caso ${numero} de ${total} · ${caso.tipo === 'asiento' ? 'Registra el asiento' : 'Clasifica'}</p>
      <h2 class="mt-0.5 text-lg font-bold leading-snug">${escaparHTML(caso.titulo)}</h2>
      <p class="mt-2 text-[15px] leading-relaxed text-tinta-900/85">${caso.enunciado}</p>
    </header>`;
}

/* ---------- Caso tipo «asiento» (Debe / Haber) ---------- */

// Suma importes por cuenta y lado: { '572|debe': 600000 } (en céntimos)
function agruparLineas(lineas) {
  const mapa = {};
  lineas.forEach((l) => {
    const lado = l.debe ? 'debe' : 'haber';
    const clave = `${l.cuenta}|${lado}`;
    mapa[clave] = (mapa[clave] || 0) + centimos(l.debe || l.haber);
  });
  return mapa;
}

// Corrige frente a la solución principal y las alternativas válidas;
// si ninguna coincide, devuelve el diagnóstico más cercano.
function corregirAsiento(caso, lineas) {
  const soluciones = [caso.solucion, ...(caso.alternativas || [])];
  const resultados = soluciones.map((sol) => corregirContra(sol, lineas));
  const correcto = resultados.find((r) => r.correcto);
  if (correcto) return correcto;
  return resultados.reduce((mejor, r) => (r.mensajes.length < mejor.mensajes.length ? r : mejor));
}

function corregirContra(lineasSolucion, lineas) {
  const usuario = agruparLineas(lineas);
  const solucion = agruparLineas(lineasSolucion);
  const mensajes = [];
  const estadoLinea = {}; // clave cuenta|lado → true/false

  const totalD = lineas.reduce((s, l) => s + centimos(l.debe || 0), 0);
  const totalH = lineas.reduce((s, l) => s + centimos(l.haber || 0), 0);
  if (totalD !== totalH) mensajes.push(`El asiento no cuadra: el Debe suma ${formatoEuros(totalD / 100)} y el Haber ${formatoEuros(totalH / 100)}.`);

  const cuentasSolucion = new Set(lineasSolucion.map((l) => l.cuenta));
  Object.keys(usuario).forEach((clave) => {
    const [cuenta, lado] = clave.split('|');
    if (!cuentasSolucion.has(cuenta)) {
      estadoLinea[clave] = false;
      mensajes.push(`La cuenta ${cuenta} (${nombreCuenta(cuenta)}) no interviene en esta operación.`);
    } else if (solucion[clave] === undefined) {
      estadoLinea[clave] = false;
      mensajes.push(`La cuenta ${cuenta} está en el lado equivocado: revisa si aumenta o disminuye.`);
    } else if (solucion[clave] !== usuario[clave]) {
      estadoLinea[clave] = false;
      mensajes.push(`El importe de la cuenta ${cuenta} no es correcto.`);
    } else {
      estadoLinea[clave] = true;
    }
  });

  Object.keys(solucion).forEach((clave) => {
    const [cuenta, lado] = clave.split('|');
    const otroLado = `${cuenta}|${lado === 'debe' ? 'haber' : 'debe'}`;
    if (usuario[clave] === undefined && usuario[otroLado] === undefined) {
      mensajes.push(`Falta una cuenta en el ${lado === 'debe' ? 'Debe' : 'Haber'}.`);
    }
  });

  const correcto = mensajes.length === 0;
  return { correcto, mensajes: [...new Set(mensajes)], estadoLinea };
}

const documentosDe = (caso) => caso.documentos || (caso.documento ? [caso.documento] : []);

function htmlBloqueDocumento(caso, st) {
  const oculto = Boolean(st.docOculto);
  const docs = documentosDe(caso);
  const etiqueta = docs.length > 1
    ? 'los documentos'
    : ({ ticket: 'el ticket', resumen: 'el informe', extracto: 'el extracto' }[docs[0].tipo] || 'la factura');
  return `
    <section id="documento-${caso.id}" class="scroll-mt-40 rounded-2xl bg-gradient-to-b from-tinta-900/[0.06] to-tinta-900/[0.02] p-3 sm:p-5 lg:scroll-mt-24">
      <div class="mb-3 flex items-center justify-between gap-2">
        <p class="flex items-center gap-2 text-sm font-bold">${svgIcono(ICONO_DOCUMENTO, 'h-4 w-4')} ${docs.length > 1 ? 'Documentos del cliente' : 'Documento del cliente'}</p>
        <button type="button" data-accion="doc-toggle" data-foco="doc-toggle" aria-expanded="${!oculto}"
                class="inline-flex min-h-[40px] items-center rounded-lg px-2.5 text-xs font-semibold text-tinta-700 hover:bg-white active:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
          ${oculto ? `Mostrar ${etiqueta}` : `Ocultar ${etiqueta}`}
        </button>
      </div>
      ${oculto ? '' : `<div class="space-y-4">${docs.map((d) => htmlDocumento(d)).join('')}</div>`}
    </section>`;
}

function htmlCasoAsiento(caso, bloque) {
  const st = estadoCaso(caso);
  const numero = bloque.contenido.casos.indexOf(caso) + 1;
  const resuelto = st.resultado && st.resultado.correcto;
  const b = st.borrador;

  const totalD = st.lineas.reduce((s, l) => s + (l.debe || 0), 0);
  const totalH = st.lineas.reduce((s, l) => s + (l.haber || 0), 0);
  const cuadra = st.lineas.length > 0 && centimos(totalD) === centimos(totalH);
  const columnas = 'grid-cols-[minmax(0,1fr)_5.25rem_5.25rem_2.75rem] sm:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_3rem]';

  // --- Libro diario del usuario ---
  const filas = st.lineas.map((l, i) => {
    const clave = `${l.cuenta}|${l.debe ? 'debe' : 'haber'}`;
    let marca = '';
    let fondo = '';
    if (st.resultado) {
      const ok = st.resultado.estadoLinea[clave];
      fondo = ok ? 'bg-acento-50' : 'bg-rose-50';
      marca = ok
        ? `<span class="text-acento-600">${svgIcono(ICONO_OK, 'h-4 w-4', 3)}</span>`
        : `<span class="text-rose-500">${svgIcono(ICONO_MAL, 'h-4 w-4', 3)}</span>`;
    }
    return `
      <div class="grid ${columnas} items-center gap-1.5 border-b border-tinta-900/5 py-1.5 pl-3 pr-1 ${fondo}">
        <span class="flex min-w-0 items-center gap-1.5">${marca}${filaCuenta(l.cuenta)}</span>
        <span class="text-right text-[13px] tabular-nums">${l.debe ? formatoEuros(l.debe) : ''}</span>
        <span class="text-right text-[13px] tabular-nums">${l.haber ? formatoEuros(l.haber) : ''}</span>
        ${resuelto ? '<span></span>' : `
          <button type="button" data-accion="asiento-borrar" data-linea="${i}" aria-label="Borrar la línea de la cuenta ${l.cuenta}"
                  class="flex h-11 w-11 items-center justify-center rounded-lg text-tinta-700/50 transition hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
            ${svgIcono(ICONO_PAPELERA, 'h-[18px] w-[18px]')}
          </button>`}
      </div>`;
  }).join('');

  const diario = `
    <div class="overflow-hidden rounded-xl border border-tinta-900/10 bg-white">
      <div class="grid ${columnas} gap-1.5 border-b border-tinta-900/10 bg-tinta-900/[0.03] py-2 pl-3 pr-1 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/60">
        <span>Cuenta</span><span class="text-right">Debe</span><span class="text-right">Haber</span><span></span>
      </div>
      ${filas || '<p class="px-3 py-6 text-center text-sm text-tinta-700/60">Todavía no hay líneas. Añade la primera con el formulario de abajo.</p>'}
      <div class="grid ${columnas} items-center gap-1.5 bg-tinta-900/[0.03] py-2 pl-3 pr-1 text-[13px] font-semibold">
        <span class="flex items-center gap-2">Total
          ${st.lineas.length ? (cuadra
            ? '<span class="rounded bg-acento-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-acento-700">Cuadra</span>'
            : '<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">Descuadre</span>') : ''}
        </span>
        <span class="text-right tabular-nums">${formatoEuros(totalD)}</span>
        <span class="text-right tabular-nums">${formatoEuros(totalH)}</span>
        <span></span>
      </div>
    </div>`;

  // --- Formulario para añadir una línea ---
  const chipsCuentas = caso.cuentasDisponibles.map((c) => {
    const sel = b.cuenta === c;
    return `
      <button type="button" data-accion="asiento-cuenta" data-cuenta="${c}" data-foco="cta-${c}" aria-pressed="${sel}"
              class="flex min-h-[52px] items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${sel ? 'border-acento-500 bg-acento-50' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'}">
        <span class="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-sm font-bold ${sel ? 'bg-acento-500 text-white' : 'bg-tinta-900/[0.06]'}">${c}</span>
        <span class="min-w-0 text-[13px] font-medium leading-tight">${escaparHTML(nombreCuenta(c))}</span>
      </button>`;
  }).join('');

  const botonLado = (lado, texto) => {
    const sel = b.lado === lado;
    return `
      <button type="button" data-accion="asiento-lado" data-lado="${lado}" data-foco="lado-${lado}" aria-pressed="${sel}"
              class="min-h-[52px] rounded-xl border-2 text-[15px] font-bold transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${sel ? 'border-tinta-900 bg-tinta-900 text-white' : 'border-tinta-900/10 bg-white text-tinta-900 hover:border-tinta-900/25'}">
        ${texto}
      </button>`;
  };

  const formulario = resuelto ? '' : `
    <div class="rounded-xl border border-tinta-900/10 bg-tinta-900/[0.02] p-3.5 sm:p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <p class="text-sm font-bold">Añadir una línea al asiento</p>
        ${documentosDe(caso).length ? `<button type="button" data-accion="ver-documento" class="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-acento-700 hover:bg-acento-50 active:bg-acento-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">${svgIcono('M12 19V5M5 12l7-7 7 7', 'h-4 w-4', 2.2)} Ver documento</button>` : ''}
      </div>
      <p class="mb-2 text-xs font-semibold text-tinta-700/70"><span class="mr-1 font-mono">1</span> Elige la cuenta</p>
      <div class="grid gap-2 sm:grid-cols-2">${chipsCuentas}</div>
      <p class="mb-2 mt-4 text-xs font-semibold text-tinta-700/70"><span class="mr-1 font-mono">2</span> ¿Debe o Haber?</p>
      <div class="grid grid-cols-2 gap-2">${botonLado('debe', 'Debe')}${botonLado('haber', 'Haber')}</div>
      <label for="importe-${caso.id}" class="mb-2 mt-4 block text-xs font-semibold text-tinta-700/70"><span class="mr-1 font-mono">3</span> Importe en euros</label>
      <div class="relative">
        <input id="importe-${caso.id}" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off"
               data-entrada="importe" data-foco="importe" value="${escaparHTML(b.importe)}" placeholder="0,00"
               class="h-[52px] w-full rounded-xl border-2 border-tinta-900/15 bg-white pl-4 pr-10 text-lg font-semibold tabular-nums outline-none transition placeholder:font-normal placeholder:text-tinta-700/30 focus:border-acento-500" />
        <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-tinta-700/50">€</span>
      </div>
      ${st.error ? `<p role="alert" class="${ui.sacudir === 'form' ? 'animate-sacudir' : ''} mt-2 text-sm font-medium text-rose-600">${escaparHTML(st.error)}</p>` : ''}
      <button type="button" data-accion="asiento-anadir" data-foco="anadir" class="${claseBoton.acento} mt-4 w-full">
        ${svgIcono('M12 5v14M5 12h14', 'h-4 w-4', 2.5)} Añadir línea
      </button>
    </div>`;

  // --- Corrección ---
  let correccion = '';
  if (st.resultado) {
    correccion = st.resultado.correcto
      ? htmlFeedback(true, '¡Asiento correcto!', escaparHTML(caso.explicacion))
      : htmlFeedback(false, 'El asiento todavía no es correcto',
          `<ul class="list-disc space-y-0.5 pl-4">${st.resultado.mensajes.map((m) => `<li>${escaparHTML(m)}</li>`).join('')}</ul>
           <p class="mt-2 text-rose-900/70">Corrige las líneas marcadas y vuelve a comprobar.</p>`);
  }

  const solucion = st.verSolucion && !resuelto ? `
    <div class="${ui.animar ? 'animate-aparecer' : ''} rounded-xl border border-tinta-900/10 bg-white p-4">
      <p class="mb-2 text-sm font-bold">Solución</p>
      ${htmlAsiento(caso.solucion, { compacto: true })}
      <p class="mt-3 text-sm leading-relaxed text-tinta-700/90">${escaparHTML(caso.explicacion)}</p>
      <p class="mt-2 text-xs text-tinta-700/60">Prueba a introducirla tú para marcar el caso como resuelto.</p>
    </div>` : '';

  const acciones = resuelto
    ? `<button type="button" data-accion="asiento-reiniciar" class="${claseBoton.secundario} w-full sm:w-auto">Repetir el caso</button>`
    : `
      <div class="grid gap-2 sm:flex">
        <button type="button" data-accion="asiento-comprobar" data-foco="comprobar" class="${claseBoton.primario} sm:flex-1" ${st.lineas.length === 0 ? 'disabled' : ''}>
          ${svgIcono(ICONO_OK, 'h-4 w-4', 2.5)} Comprobar asiento
        </button>
        <div class="grid grid-cols-2 gap-2 sm:flex">
          ${st.intentos > 0 && !st.verSolucion ? `<button type="button" data-accion="asiento-solucion" class="${claseBoton.secundario}">Ver solución</button>` : ''}
          <button type="button" data-accion="asiento-reiniciar" class="${claseBoton.secundario} ${st.intentos > 0 && !st.verSolucion ? '' : 'col-span-2'}">Empezar de nuevo</button>
        </div>
      </div>`;

  return `
    <article class="overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm">
      ${cabeceraCaso(caso, numero, bloque.contenido.casos.length)}
      <div class="space-y-4 p-4 sm:p-5">
        ${documentosDe(caso).length ? htmlBloqueDocumento(caso, st) : ''}
        <div class="rounded-xl bg-amber-50/70 text-sm text-amber-950">
          <button type="button" data-accion="pista-toggle" data-foco="pista" aria-expanded="${Boolean(st.pista)}"
                  class="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3.5 text-left font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
            <span class="text-amber-600">${svgIcono(ICONO_BOMBILLA, 'h-4 w-4')}</span> ¿Necesitas una pista?
            <span class="ml-auto text-amber-600 transition ${st.pista ? 'rotate-180' : ''}">${svgIcono('M6 9l6 6 6-6', 'h-4 w-4', 2.5)}</span>
          </button>
          ${st.pista ? `<p class="px-3.5 pb-3.5 leading-relaxed">${escaparHTML(caso.pista)}</p>` : ''}
        </div>
        <div>
          <p class="mb-2 text-sm font-bold">Tu asiento</p>
          ${diario}
        </div>
        ${formulario}
        <div id="correccion-${caso.id}" class="space-y-4" aria-live="polite">${correccion}${solucion}</div>
        ${acciones}
      </div>
    </article>`;
}

/* ---------- Caso tipo «clasificar» (tocar el grupo) ---------- */
const TONO_OPCION = {
  activo: 'border-acento-500/35 text-acento-800',
  pn: 'border-indigo-300 text-indigo-900',
  pasivo: 'border-amber-300 text-amber-900',
};

const claveItem = (c) => c.codigo || c.id;

function htmlCasoClasificar(caso, bloque) {
  const st = estadoCaso(caso);
  const numero = bloque.contenido.casos.indexOf(caso) + 1;
  const hechas = caso.cuentas.filter((c) => st.respuestas[claveItem(c)]).length;
  const total = caso.cuentas.length;
  const terminado = hechas === total;
  const opcionPorValor = (v) => caso.opciones.find((o) => o.valor === v);

  const tarjetas = caso.cuentas.map((c) => {
    const clave = claveItem(c);
    const acertada = st.respuestas[clave];
    const fallos = st.fallos[clave] || [];
    const titulo = c.codigo
      ? `<span class="font-mono">${c.codigo}</span> · ${escaparHTML(nombreCuenta(c.codigo))}`
      : escaparHTML(c.texto);
    if (acertada) {
      return `
        <li class="${ui.sacudir === 'ok-' + clave ? 'animate-aparecer' : ''} rounded-xl border-2 border-acento-500/40 bg-acento-50 p-3">
          <div class="flex items-center gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acento-500 text-white">${svgIcono(ICONO_OK, 'h-4 w-4', 3)}</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold leading-snug">${titulo}</span>
              <span class="block text-[13px] leading-snug text-acento-800"><strong>${escaparHTML(opcionPorValor(acertada).etiqueta)}${opcionPorValor(acertada).detalle ? ' · ' + escaparHTML(opcionPorValor(acertada).detalle) : ''}</strong> — ${escaparHTML(c.explicacion)}</span>
            </span>
          </div>
        </li>`;
    }
    const botones = caso.opciones.map((o) => {
      const fallado = fallos.includes(o.valor);
      const sacude = ui.sacudir === `${clave}-${o.valor}`;
      const estilo = fallado
        ? 'border-rose-300 bg-rose-50 text-rose-400 line-through'
        : `bg-white hover:bg-tinta-900/[0.03] active:bg-tinta-900/5 ${TONO_OPCION[o.tono] || 'border-tinta-900/15 text-tinta-900'}`;
      return `
        <button type="button" data-accion="clasif-elegir" data-cuenta="${clave}" data-valor="${o.valor}" data-foco="cl-${clave}-${o.valor}"
                ${fallado ? 'disabled aria-disabled="true"' : ''}
                class="flex min-h-[48px] flex-col items-center justify-center rounded-lg border-2 px-2 py-1.5 text-[13px] font-semibold leading-tight transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${o.ancho ? 'col-span-2 sm:col-span-1' : ''} ${estilo} ${sacude ? 'animate-sacudir' : ''}">
          <span class="${o.detalle ? 'font-mono text-[15px]' : ''}">${escaparHTML(o.etiqueta)}</span>
          ${o.detalle ? `<span class="mt-0.5 text-[10.5px] font-medium opacity-75">${escaparHTML(o.detalle)}</span>` : ''}
        </button>`;
    }).join('');
    return `
      <li class="rounded-xl border-2 ${fallos.length ? 'border-rose-200' : 'border-tinta-900/10'} bg-white p-3">
        <p class="text-sm font-semibold leading-snug">${c.codigo
          ? `<span class="mr-1 rounded-md bg-tinta-900/[0.06] px-1.5 py-0.5 font-mono">${c.codigo}</span> ${escaparHTML(nombreCuenta(c.codigo))}`
          : escaparHTML(c.texto)}</p>
        <div class="mt-3 grid gap-1.5 ${caso.rejilla || 'grid-cols-2'}" role="group" aria-label="Respuesta para: ${escaparHTML(c.codigo || c.texto)}">${botones}</div>
        ${fallos.length ? `<p class="${ui.animar ? 'animate-aparecer' : ''} mt-2 flex gap-1.5 text-[13px] leading-snug text-rose-700"><span class="mt-px shrink-0">${svgIcono(ICONO_BOMBILLA, 'h-4 w-4')}</span><span><strong>Pista:</strong> ${escaparHTML(c.pista)}</span></p>` : ''}
      </li>`;
  }).join('');

  const resumen = terminado
    ? htmlFeedback(st.errores === 0,
        st.errores === 0 ? '¡Perfecto! Todas a la primera.' : `Caso completado con ${st.errores} ${st.errores === 1 ? 'fallo' : 'fallos'}`,
        escaparHTML(caso.resumenOk || '') + (st.errores ? ' Si quieres afianzarlo, pulsa «Empezar de nuevo».' : ''))
    : '';

  return `
    <article class="overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm">
      ${cabeceraCaso(caso, numero, bloque.contenido.casos.length)}
      <div class="space-y-4 p-4 sm:p-5">
        ${documentosDe(caso).length ? htmlBloqueDocumento(caso, st) : ''}
        <div>
          <div class="mb-1.5 flex justify-between text-xs font-semibold text-tinta-700/70">
            <span>${hechas} de ${total} acertadas</span><span class="${st.errores ? 'text-rose-600' : ''}">${st.errores} ${st.errores === 1 ? 'fallo' : 'fallos'}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-tinta-900/10">
            <div class="h-full rounded-full bg-acento-500 transition-all duration-500" style="width:${(hechas / total) * 100}%"></div>
          </div>
        </div>
        <ol class="space-y-2.5">${tarjetas}</ol>
        <div id="correccion-${caso.id}" aria-live="polite">${resumen}</div>
        ${hechas > 0 || st.errores > 0 ? `<button type="button" data-accion="clasif-reiniciar" class="${claseBoton.secundario} w-full sm:w-auto">Empezar de nuevo</button>` : ''}
      </div>
    </article>`;
}

const RENDERIZADORES = {
  teoria: renderizarTeoria,
  test: renderizarTest,
  casos: renderizarCasos,
};

/* =====================================================================
   9. ACCIONES (clics y toques dentro de los paneles)
   Cada botón interactivo lleva data-accion="nombre"; aquí se resuelve.
   ===================================================================== */
function casoActual() {
  const bloque = bloqueActivo();
  return bloque.contenido.casos[estadoCasos(bloque.id).activo];
}

function marcarCasoResuelto(caso) {
  const bloque = bloqueActivo();
  const p = progresoDe(bloque.id);
  if (!p.casosResueltos.includes(caso.id)) p.casosResueltos.push(caso.id);
  evaluarProgreso(bloque);
}

const ACCIONES = {
  /* --- Teoría --- */
  'teoria-ir': (el) => {
    const destino = document.getElementById(el.dataset.destino);
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return false; // no hace falta repintar
  },
  'pgc-grupo': (el) => {
    estadoTeoria(estado.bloque).grupo = Number(el.dataset.grupo);
    ui.animar = true;
  },
  'sim-siguiente': () => { estadoTeoria(estado.bloque).paso += 1; ui.animar = true; },
  'sim-anterior': () => { const st = estadoTeoria(estado.bloque); st.paso = Math.max(0, st.paso - 1); },
  'sim-reiniciar': () => { estadoTeoria(estado.bloque).paso = 0; },

  'anatomia-campo': (el) => {
    estadoTeoria(estado.bloque).campo = el.dataset.campo;
    ui.animar = true;
  },
  'calc-iva': (el) => { estadoTeoria(estado.bloque).calc.iva = Number(el.dataset.valor); },
  'calc-ret': (el) => { estadoTeoria(estado.bloque).calc.ret = Number(el.dataset.valor); },

  /* --- Test --- */
  'test-responder': (el) => {
    const bloque = bloqueActivo();
    const st = estadoTest(bloque.id);
    if (st.respuestas[st.indice] !== undefined) return false;
    const opcion = Number(el.dataset.opcion);
    st.respuestas[st.indice] = opcion;
    ui.animar = true;
    if (opcion !== st.preguntas[st.indice].correcta) {
      ui.sacudir = 'test';
      vibrar([40, 60, 40]);
    } else {
      vibrar(25);
    }
    return () => asegurarVisible($('#feedback-test'), 'abajo');
  },
  'test-siguiente': () => {
    const bloque = bloqueActivo();
    const st = estadoTest(bloque.id);
    if (st.respuestas[st.indice] === undefined) return false;
    if (st.indice < st.preguntas.length - 1) {
      st.indice += 1;
    } else {
      st.terminado = true;
      ui.animar = true;
      const p = progresoDe(bloque.id);
      p.mejorTest = Math.max(p.mejorTest, contarAciertos(st));
      p.preguntasTest = st.preguntas.length;
      evaluarProgreso(bloque);
    }
    return () => {
      asegurarVisible($('#tarjeta-test'));
      const primera = $('[data-accion="test-responder"]');
      if (primera) primera.focus({ preventScroll: true }); // útil con teclado; sin efecto visual al tocar
    };
  },
  'test-repetir': () => {
    const bloque = bloqueActivo();
    ui.test[bloque.id] = nuevoIntento(bloque, ui.test[bloque.id]);
    return () => asegurarVisible($('#tarjeta-test'));
  },
  'ir-pestana': (el) => { navegar(estado.bloque, el.dataset.pestana); return false; },

  /* --- Casos: selector --- */
  'caso-elegir': (el) => {
    const indice = Number(el.dataset.caso);
    if (!bloqueActivo().contenido.casos[indice]) return false;
    estadoCasos(estado.bloque).activo = indice;
    return () => asegurarVisible($('#tarjeta-caso'));
  },

  /* --- Casos: documento y pista --- */
  'doc-toggle': () => {
    const st = estadoCaso(casoActual());
    st.docOculto = !st.docOculto;
  },
  'ver-documento': () => {
    const caso = casoActual();
    const st = estadoCaso(caso);
    const yaVisible = !st.docOculto;
    st.docOculto = false;
    const ir = () => asegurarVisible(document.getElementById(`documento-${caso.id}`));
    if (yaVisible) { ir(); return false; }
    return ir;
  },
  'pista-toggle': () => {
    const st = estadoCaso(casoActual());
    st.pista = !st.pista;
  },

  /* --- Casos: asiento --- */
  'asiento-cuenta': (el) => {
    const st = estadoCaso(casoActual());
    st.borrador.cuenta = el.dataset.cuenta;
    st.error = '';
  },
  'asiento-lado': (el) => {
    const st = estadoCaso(casoActual());
    st.borrador.lado = el.dataset.lado;
    st.error = '';
  },
  'asiento-anadir': () => {
    const caso = casoActual();
    const st = estadoCaso(caso);
    const b = st.borrador;
    const importe = leerImporte(b.importe);
    if (!b.cuenta) st.error = 'Elige primero una cuenta.';
    else if (!b.lado) st.error = 'Indica si la línea va al Debe o al Haber.';
    else if (!(importe > 0)) st.error = 'Escribe un importe válido, por ejemplo 6000 o 6.000,00.';
    else st.error = '';

    if (st.error) {
      ui.sacudir = 'form';
      vibrar([40, 60, 40]);
      return;
    }
    st.lineas.push({ cuenta: b.cuenta, [b.lado]: importe });
    st.borrador = { cuenta: null, lado: null, importe: '' };
    st.resultado = null;
  },
  'asiento-borrar': (el) => {
    const st = estadoCaso(casoActual());
    st.lineas.splice(Number(el.dataset.linea), 1);
    st.resultado = null;
  },
  'asiento-comprobar': () => {
    const caso = casoActual();
    const st = estadoCaso(caso);
    if (st.lineas.length === 0) return false;
    st.intentos += 1;
    st.resultado = corregirAsiento(caso, st.lineas);
    ui.animar = true;
    if (st.resultado.correcto) {
      vibrar(30);
      st.verSolucion = false;
      marcarCasoResuelto(caso);
    } else {
      vibrar([40, 60, 40]);
    }
    return () => asegurarVisible(document.getElementById(`correccion-${caso.id}`), 'abajo');
  },
  'asiento-solucion': () => {
    const caso = casoActual();
    estadoCaso(caso).verSolucion = true;
    ui.animar = true;
    return () => asegurarVisible(document.getElementById(`correccion-${caso.id}`), 'abajo');
  },
  'asiento-reiniciar': () => {
    const caso = casoActual();
    const anterior = ui.caso[caso.id] || {};
    delete ui.caso[caso.id];
    const nuevo = estadoCaso(caso);
    nuevo.docOculto = anterior.docOculto;
    return () => asegurarVisible($('#tarjeta-caso'));
  },

  /* --- Casos: clasificar --- */
  'clasif-elegir': (el) => {
    const caso = casoActual();
    const st = estadoCaso(caso);
    const codigo = el.dataset.cuenta;
    const elegido = el.dataset.valor;
    const cuenta = caso.cuentas.find((c) => claveItem(c) === codigo);
    if (!cuenta || st.respuestas[codigo]) return false;

    if (elegido === cuenta.correcta) {
      st.respuestas[codigo] = elegido;
      ui.sacudir = `ok-${codigo}`;
      vibrar(25);
      if (caso.cuentas.every((c) => st.respuestas[claveItem(c)])) {
        ui.animar = true;
        marcarCasoResuelto(caso);
        return () => asegurarVisible(document.getElementById(`correccion-${caso.id}`), 'abajo');
      }
    } else {
      st.fallos[codigo] = [...(st.fallos[codigo] || []), elegido];
      st.errores += 1;
      ui.sacudir = `${codigo}-${elegido}`;
      ui.animar = true;
      vibrar([40, 60, 40]);
    }
    return undefined;
  },
  'clasif-reiniciar': () => {
    delete ui.caso[casoActual().id];
    return () => asegurarVisible($('#tarjeta-caso'));
  },
};

function gestionarAccion(e) {
  const el = e.target.closest('[data-accion]');
  if (!el || el.disabled || !$('#contenido').contains(el)) return;
  const accion = ACCIONES[el.dataset.accion];
  if (!accion) return;
  e.preventDefault();
  const resultado = accion(el, e);
  if (resultado === false) return;
  repintarPanel();
  if (typeof resultado === 'function') requestAnimationFrame(resultado);
}

/* =====================================================================
   10. MENÚ MÓVIL (hamburguesa)
   ===================================================================== */
const mqEscritorio = window.matchMedia('(min-width: 1024px)');
let elementoPrevioAlMenu = null;

function esMovil() {
  return !mqEscritorio.matches;
}

function abrirMenu() {
  if (!esMovil() || estado.menuAbierto) return;
  estado.menuAbierto = true;
  elementoPrevioAlMenu = document.activeElement;
  const sidebar = $('#sidebar');
  const capa = $('#capa-menu');
  sidebar.removeAttribute('inert');
  sidebar.classList.remove('-translate-x-full');
  capa.classList.remove('opacity-0', 'pointer-events-none');
  capa.classList.add('opacity-100');
  document.body.classList.add('menu-abierto');
  $('#btn-abrir-menu').setAttribute('aria-expanded', 'true');
  const activo = $('#menu-bloques a[aria-current="page"]') || $('#btn-cerrar-menu');
  setTimeout(() => activo.focus({ preventScroll: true }), 50);
}

function cerrarMenu({ devolverFoco = true } = {}) {
  if (!estado.menuAbierto) return;
  estado.menuAbierto = false;
  const sidebar = $('#sidebar');
  const capa = $('#capa-menu');
  sidebar.classList.add('-translate-x-full');
  capa.classList.add('opacity-0', 'pointer-events-none');
  capa.classList.remove('opacity-100');
  document.body.classList.remove('menu-abierto');
  $('#btn-abrir-menu').setAttribute('aria-expanded', 'false');
  if (esMovil()) sidebar.setAttribute('inert', '');
  if (devolverFoco && elementoPrevioAlMenu && document.contains(elementoPrevioAlMenu)) {
    elementoPrevioAlMenu.focus({ preventScroll: true });
  }
}

function ajustarSegunPantalla() {
  const sidebar = $('#sidebar');
  if (esMovil()) {
    if (!estado.menuAbierto) sidebar.setAttribute('inert', '');
  } else {
    cerrarMenu({ devolverFoco: false });
    sidebar.removeAttribute('inert');
  }
}

function atraparFoco(evento) {
  if (!estado.menuAbierto || evento.key !== 'Tab') return;
  const focoables = $$('#sidebar a[href], #sidebar button:not([disabled])');
  if (focoables.length === 0) return;
  const primero = focoables[0];
  const ultimo = focoables[focoables.length - 1];
  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}

function activarGestoCerrar() {
  const sidebar = $('#sidebar');
  let inicioX = 0;
  let inicioY = 0;
  let siguiendo = false;
  sidebar.addEventListener('touchstart', (e) => {
    if (!estado.menuAbierto) return;
    inicioX = e.touches[0].clientX;
    inicioY = e.touches[0].clientY;
    siguiendo = true;
  }, { passive: true });
  sidebar.addEventListener('touchend', (e) => {
    if (!siguiendo) return;
    siguiendo = false;
    const dx = e.changedTouches[0].clientX - inicioX;
    const dy = e.changedTouches[0].clientY - inicioY;
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) cerrarMenu();
  }, { passive: true });
}

/* =====================================================================
   EVENTOS
   ===================================================================== */
function registrarEventos() {
  // Menú lateral: el enlace cambia el hash; aquí solo cerramos el menú en móvil
  $('#menu-bloques').addEventListener('click', (e) => {
    const enlace = e.target.closest('a[data-bloque]');
    if (!enlace) return;
    const id = Number(enlace.dataset.bloque);
    if (id === estado.bloque) {
      e.preventDefault(); // ya estamos en el bloque: no ensuciar el historial
      if (estado.pestana !== 'teoria') navegar(id, 'teoria');
    }
    cerrarMenu({ devolverFoco: false });
    $('#contenido').focus({ preventScroll: true });
  });

  // Pestañas: clic / toque
  $('#pestanas').addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab || tab.dataset.pestana === estado.pestana) return;
    navegar(estado.bloque, tab.dataset.pestana);
  });

  // Pestañas: teclado (flechas, Inicio, Fin)
  $('#pestanas').addEventListener('keydown', (e) => {
    const indice = IDS_PESTANAS.indexOf(estado.pestana);
    let nuevo = null;
    if (e.key === 'ArrowRight') nuevo = (indice + 1) % IDS_PESTANAS.length;
    else if (e.key === 'ArrowLeft') nuevo = (indice - 1 + IDS_PESTANAS.length) % IDS_PESTANAS.length;
    else if (e.key === 'Home') nuevo = 0;
    else if (e.key === 'End') nuevo = IDS_PESTANAS.length - 1;
    if (nuevo === null) return;
    e.preventDefault();
    navegar(estado.bloque, IDS_PESTANAS[nuevo]);
    $(`#tab-${IDS_PESTANAS[nuevo]}`).focus();
  });

  // Contenido interactivo de los paneles (teoría, test y casos)
  $('#contenido').addEventListener('click', gestionarAccion);

  // Importe del asiento: se guarda mientras se escribe (sin repintar)
  $('#contenido').addEventListener('input', (e) => {
    const tipo = e.target.dataset.entrada;
    if (tipo === 'importe') {
      const caso = casoActual();
      if (caso) estadoCaso(caso).borrador.importe = e.target.value;
    } else if (tipo && tipo.startsWith('prest-')) {
      const st = estadoTeoria(estado.bloque);
      st.prestamo[tipo.slice(6)] = e.target.value;
      const destino = $('#prestamo-resultado');
      if (destino) destino.innerHTML = htmlPrestamoResultado(st.prestamo);
    } else if (tipo === 'calc-base') {
      const st = estadoTeoria(estado.bloque);
      st.calc.base = e.target.value;
      const destino = $('#calc-resultado');
      if (destino) destino.innerHTML = htmlCalcResultado(st.calc); // sin repintar: el teclado no se cierra
    }
  });
  $('#contenido').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && /^(calc-base|prest-)/.test(e.target.dataset.entrada || '')) {
      e.preventDefault();
      e.target.blur();
      return;
    }
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.entrada === 'importe') {
      e.preventDefault();
      const boton = $('[data-accion="asiento-anadir"]');
      if (boton) boton.click();
    }
  });

  // Bloque anterior / siguiente
  $('#btn-anterior').addEventListener('click', () => {
    if (estado.bloque > 0) navegar(estado.bloque - 1, 'teoria');
  });
  $('#btn-siguiente').addEventListener('click', () => {
    if (estado.bloque < BLOQUES.length - 1) navegar(estado.bloque + 1, 'teoria');
  });

  // Menú móvil
  $('#btn-abrir-menu').addEventListener('click', abrirMenu);
  $('#btn-cerrar-menu').addEventListener('click', () => cerrarMenu());
  $('#capa-menu').addEventListener('click', () => cerrarMenu());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarMenu();
    atraparFoco(e);
  });
  activarGestoCerrar();

  if (mqEscritorio.addEventListener) mqEscritorio.addEventListener('change', ajustarSegunPantalla);
  else mqEscritorio.addListener(ajustarSegunPantalla); // navegadores antiguos

  // Cambios de ruta (incluido el botón «Atrás» del navegador o de Android)
  window.addEventListener('hashchange', () => {
    const ruta = leerRuta(location.hash);
    if (ruta) {
      cerrarMenu({ devolverFoco: false });
      aplicarRuta(ruta);
    }
  });
}

/* =====================================================================
   11. ARRANQUE
   ===================================================================== */
function marcarBloqueCompletado(idBloque, completado = true) {
  progresoDe(idBloque).completado = completado;
  guardarJSON(CLAVE_PROGRESO, progreso);
  actualizarMenu();
  actualizarProgresoBloque(bloqueActivo());
}

function reiniciarProgreso() {
  progreso = {};
  guardarJSON(CLAVE_PROGRESO, progreso);
  renderizar();
}

// Adapta el progreso guardado por versiones anteriores de la app:
// · un mejor resultado obtenido con otro nº de preguntas no cuenta;
// · los casos que ya no existen se descartan;
// · «completado» se recalcula con los criterios actuales.
function migrarProgreso() {
  Object.keys(progreso).forEach((k) => {
    const p = progreso[k] || {};
    const bloque = BLOQUES.find((b) => String(b.id) === String(k));
    if (!bloque) { delete progreso[k]; return; }
    const cfg = configTest(bloque);
    const idsCasos = bloque.contenido.casos.map((c) => c.id);
    progreso[k] = {
      mejorTest: p.preguntasTest === cfg.porIntento ? (p.mejorTest || 0) : 0,
      preguntasTest: cfg.porIntento,
      casosResueltos: (Array.isArray(p.casosResueltos) ? p.casosResueltos : []).filter((id) => idsCasos.includes(id)),
      completado: false,
    };
    evaluarProgreso(bloque, { avisar: false });
  });
  guardarJSON(CLAVE_PROGRESO, progreso);
}

function crearRutaGuardada() {
  const guardada = cargarJSON(CLAVE_RUTA, null);
  return guardada ? crearRuta(guardada.bloque, guardada.pestana) : '';
}

function iniciar() {
  migrarProgreso();

  construirMenu();
  registrarEventos();
  ajustarSegunPantalla();

  // Prioridad: enlace de la URL → última posición guardada → Bloque 0 / Teoría
  const inicial = leerRuta(location.hash) || leerRuta(crearRutaGuardada()) || { bloque: 0, pestana: 'teoria' };
  estado.bloque = inicial.bloque;
  estado.pestana = inicial.pestana;
  history.replaceState(null, '', crearRuta(inicial.bloque, inicial.pestana));
  renderizar();
}

document.addEventListener('DOMContentLoaded', iniciar);

// Acceso desde la consola del navegador para depurar
window.RepasoPGC = { BLOQUES, CUADRO_PGC, PESTANAS, estado, ui, navegar, marcarBloqueCompletado, reiniciarProgreso, leerImporte, formatoEuros };
