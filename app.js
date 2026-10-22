/* =====================================================================
   REPASO CONTABLE PGC — app.js
   1. Utilidades
   2. Cuadro de cuentas del PGC (reutilizable en todos los bloques)
   3. Contenido de los bloques
   4. Estado y rutas
   5. Renderizado general (menú, cabecera, pestañas)
   6. Teoría · 7. Test · 8. Casos prácticos
   9. Acciones (clics y toques) · 10. Menú móvil · 12. Certificado final
   11. Arranque
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
      { codigo: '12', nombre: 'Resultados pendientes de aplicación', cuentas: [['121', 'Resultados negativos de ejercicios anteriores'], ['129', 'Resultado del ejercicio']] },
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
      { codigo: '41', nombre: 'Acreedores varios', clave: true, cuentas: [['410', 'Acreedores por prestaciones de servicios'], ['4109', 'Acreedores por prestaciones de servicios, facturas pendientes de recibir o de formalizar']] },
      { codigo: '43', nombre: 'Clientes', clave: true, cuentas: [['430', 'Clientes'], ['431', 'Clientes, efectos comerciales a cobrar'], ['4311', 'Efectos comerciales descontados'], ['436', 'Clientes de dudoso cobro'], ['438', 'Anticipos de clientes']] },
      { codigo: '46', nombre: 'Personal', cuentas: [['460', 'Anticipos de remuneraciones'], ['465', 'Remuneraciones pendientes de pago']] },
      { codigo: '47', nombre: 'Administraciones Públicas', clave: true, cuentas: [['4700', 'Hacienda Pública, deudora por IVA'], ['472', 'Hacienda Pública, IVA soportado'], ['473', 'Hacienda Pública, retenciones y pagos a cuenta'], ['4750', 'Hacienda Pública, acreedora por IVA'], ['477', 'Hacienda Pública, IVA repercutido'], ['4751', 'Hacienda Pública, acreedora por retenciones practicadas'], ['4752', 'Hacienda Pública, acreedora por impuesto sobre sociedades'], ['476', 'Organismos de la Seguridad Social, acreedores']] },
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
      { codigo: '52', nombre: 'Deudas a corto plazo por préstamos recibidos y otros conceptos', cuentas: [['520', 'Deudas a corto plazo con entidades de crédito'], ['5208', 'Deudas por efectos descontados'], ['523', 'Proveedores de inmovilizado a corto plazo'], ['524', 'Acreedores por arrendamiento financiero a corto plazo'], ['526', 'Dividendo activo a pagar'], ['527', 'Intereses a corto plazo de deudas con entidades de crédito']] },
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
      { codigo: '61', nombre: 'Variación de existencias', cuentas: [['610', 'Variación de existencias de mercaderías']] },
      { codigo: '62', nombre: 'Servicios exteriores', clave: true, cuentas: [['621', 'Arrendamientos y cánones'], ['622', 'Reparaciones y conservación'], ['623', 'Servicios de profesionales independientes'], ['624', 'Transportes'], ['625', 'Primas de seguros'], ['626', 'Servicios bancarios y similares'], ['627', 'Publicidad, propaganda y relaciones públicas'], ['628', 'Suministros'], ['629', 'Otros servicios']] },
      { codigo: '63', nombre: 'Tributos', cuentas: [['6300', 'Impuesto corriente'], ['631', 'Otros tributos']] },
      { codigo: '64', nombre: 'Gastos de personal', cuentas: [['640', 'Sueldos y salarios'], ['641', 'Indemnizaciones'], ['642', 'Seguridad Social a cargo de la empresa']] },
      { codigo: '65', nombre: 'Otros gastos de gestión', cuentas: [['650', 'Pérdidas de créditos comerciales incobrables']] },
      { codigo: '66', nombre: 'Gastos financieros', cuentas: [['662', 'Intereses de deudas'], ['665', 'Intereses por descuento de efectos y operaciones de factoring']] },
      { codigo: '68', nombre: 'Dotaciones para amortizaciones', cuentas: [['680', 'Amortización del inmovilizado intangible'], ['681', 'Amortización del inmovilizado material']] },
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
CUENTAS['6xx'] = 'Cuentas de gasto (grupo 6)';
CUENTAS['7xx'] = 'Cuentas de ingreso (grupo 7)';

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
            { titulo: 'Octubre 2026 · arranca el plazo', texto: 'La Orden HAC/1028/2026 (BOE de 5/10/2026, en vigor el 6/10/2026) regula la solución pública de facturación electrónica e inicia el cómputo de los plazos.' },
            { titulo: 'Octubre 2027', texto: 'Obligatoria para empresas con más de 8 millones de euros de volumen de operaciones (un año después).' },
            { titulo: 'Octubre 2028', texto: 'Obligatoria para el resto de empresas y autónomos (dos años después).' },
          ],
        },
        {
          tipo: 'html',
          html: '<p><strong>VeriFactu</strong> es otra cosa: afecta al <strong>software con el que se emiten</strong> las facturas, que debe garantizar que no se alteran y poder enviarlas a Hacienda. Las fechas legales vigentes son las del Real Decreto-ley 15/2025: el 1/1/2027 para sociedades y el 1/7/2027 para el resto. Hacienda anunció el 5/10/2026 su intención de aplazarlo a octubre de 2028, pero a mediados de octubre seguía sin publicarse en el BOE. En el Bloque 4 tienes el detalle actualizado.</p>',
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
      correcta: 'Hacia octubre de 2028: dos años después de la orden técnica',
      incorrectas: ['Ya es obligatoria desde enero de 2026', 'Nunca: solo afecta a empresas de más de 8 millones'],
      explicacion: 'La Orden HAC/1028/2026 (en vigor desde el 6/10/2026) inició el cómputo: un año para las empresas de más de 8 millones (octubre de 2027) y dos años para el resto (octubre de 2028).',
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

/* ---------- Bloque 4: Nóminas e Impuestos (gestoría) ---------- */

const HOJA_NOMINAS_MESON = {
  tipo: 'nominas',
  empresa: 'Mesón La Encina, S.L.',
  nif: 'B98556677',
  periodo: 'Octubre 2026',
  trabajadores: [
    { nombre: 'Andrés Molina Vidal', puesto: 'Cocinero', bruto: 2400, ssTrab: 156, irpf: 336, ssEmp: 768 },
    { nombre: 'Lucía Serrano Gil', puesto: 'Camarera', bruto: 1900, ssTrab: 123.5, irpf: 228, ssEmp: 608 },
    { nombre: 'Pablo Ruiz Catalá', puesto: 'Ayudante de cocina', bruto: 1700, ssTrab: 110.5, irpf: 156, ssEmp: 544 },
  ],
  notas: ['Seguridad Social a cargo de la empresa: 32 % (incluye accidentes de trabajo de hostelería).', 'Pago de las nóminas: por transferencia el último día del mes.'],
};

const CONTENIDO_B4 = {
  teoria: [
    {
      id: 'calendario',
      titulo: 'El calendario fiscal de la gestoría',
      resumen: 'Cuándo se presenta cada modelo.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>En una gestoría el año se organiza alrededor de los <strong>plazos de presentación</strong>. Cada trimestre se presentan las liquidaciones de todos los clientes, y en enero y febrero, además, los resúmenes anuales. Saber qué toca y cuándo es tan importante como saber hacerlo.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Modelos trimestrales',
          columnas: ['Modelo', 'Plazo'],
          filas: [
            ['303 · IVA', 'Del 1 al 20 de abril, julio y octubre. El 4.º trimestre, hasta el 30 de enero'],
            ['111 · Retenciones de trabajo y profesionales', 'Del 1 al 20 de abril, julio, octubre y enero'],
            ['115 · Retenciones de alquileres', 'Del 1 al 20 de abril, julio, octubre y enero'],
            ['349 · Operaciones intracomunitarias', 'Del 1 al 20 del mes siguiente; el 4.º trimestre, hasta el 30 de enero'],
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Declaraciones anuales',
          columnas: ['Modelo', 'Plazo'],
          filas: [
            ['390 · Resumen anual del IVA', 'Del 1 al 30 de enero'],
            ['190 · Resumen anual de retenciones del 111', 'Del 1 al 31 de enero'],
            ['180 · Resumen anual de retenciones del 115', 'Del 1 al 31 de enero'],
            ['347 · Operaciones con terceros', 'Durante el mes de febrero'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Si un plazo acaba en sábado, domingo o festivo, se traslada al siguiente día hábil: consulta cada año el <strong>calendario del contribuyente</strong> de la AEAT. Y si el cliente paga por <strong>domiciliación</strong>, el plazo para presentarla termina unos días antes que el general (en los trimestres ordinarios, el día 15).',
        },
      ],
    },
    {
      id: 'nomina',
      titulo: 'Nóminas: el asiento resumen',
      resumen: 'De la hoja del departamento laboral al diario.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Las nóminas las calcula el departamento laboral (o una asesoría externa). A contabilidad llega una <strong>hoja resumen</strong> con, para cada trabajador, el salario bruto, lo que se le descuenta (Seguridad Social e IRPF), lo que cobra (líquido) y lo que cuesta a la empresa la Seguridad Social. Con ella se hace <strong>un asiento por mes</strong>, no uno por trabajador.</p>',
        },
        { tipo: 'documento', documento: HOJA_NOMINAS_MESON },
        {
          tipo: 'asiento',
          titulo: 'Asiento de las nóminas de octubre',
          lineas: [
            { cuenta: '640', debe: 6000 },
            { cuenta: '642', debe: 1920 },
            { cuenta: '476', haber: 2310 },
            { cuenta: '4751', haber: 720 },
            { cuenta: '465', haber: 4890 },
          ],
          nota: '640: el bruto. 642: la Seguridad Social a cargo de la empresa. 476: toda la Seguridad Social que se ingresará (empresa 1.920 + trabajadores 390). 4751: el IRPF retenido. 465: lo que se paga a los trabajadores.',
        },
        {
          tipo: 'tabla',
          titulo: 'Tipos de cotización 2026 (contrato indefinido, régimen general)',
          columnas: ['Concepto', 'Empresa', 'Trabajador'],
          filas: [
            ['Contingencias comunes', '23,60 %', '4,70 %'],
            ['Desempleo', '5,50 %', '1,55 %'],
            ['FOGASA y formación profesional', '0,80 %', '0,10 %'],
            ['Mecanismo de Equidad Intergeneracional (MEI)', '0,75 %', '0,15 %'],
            ['Accidentes de trabajo', 'Según la actividad', '—'],
            ['Total aproximado', 'Más del 30 %', '6,50 %'],
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>Comprobación rápida:</strong> el asiento cuadra si bruto + Seguridad Social de la empresa = Seguridad Social total + IRPF + líquido. Si no cuadra, revisa la hoja antes de tocar nada.',
        },
      ],
    },
    {
      id: 'pagos-nomina',
      titulo: 'Pago de nóminas, seguros sociales y otros conceptos',
      resumen: 'Cancelar la 465 y la 476.',
      piezas: [
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Pago de las nóminas', texto: 'Normalmente a final de mes, por transferencia: 465 al Debe, 572 al Haber.' },
            { titulo: 'Pago de los seguros sociales', texto: 'La Seguridad Social del mes se paga el mes siguiente, por domiciliación el último día hábil: 476 al Debe, 572 al Haber.' },
            { titulo: 'Ingreso del IRPF retenido', texto: 'Se acumula en la 4751 y se paga con el modelo 111 del trimestre.' },
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Otros conceptos de nómina',
          columnas: ['Situación', 'Cuenta'],
          filas: [
            ['Anticipo pagado a un trabajador a mitad de mes', '460 Anticipos de remuneraciones (al Debe); en la nómina se descuenta abonando la 460'],
            ['Indemnización por despido', '641 Indemnizaciones'],
            ['Nómina calculada y no pagada a fin de mes', '465 Remuneraciones pendientes de pago (queda con saldo)'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Cuadra cada mes la <strong>476</strong> con el recibo de liquidación de cotizaciones (RLC) y la <strong>465</strong> con las transferencias del banco. Si a final de trimestre la 465 tiene saldo, hay una nómina sin pagar o un pago sin registrar.',
        },
      ],
    },
    {
      id: 'modelo-303',
      titulo: 'Modelo 303: liquidar el IVA del trimestre',
      resumen: 'Compensar 477 y 472: ¿a ingresar o a compensar?',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Al final de cada trimestre, el IVA repercutido (477) se compensa con el IVA soportado deducible (472). Las dos cuentas quedan a cero y la diferencia es el resultado del 303:</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['Resultado', 'Cuenta', 'Qué pasa después'],
          filas: [
            ['477 mayor que 472: a ingresar', '4750 Hacienda Pública, acreedora por IVA (Haber)', 'Se paga en el plazo: 4750 a 572'],
            ['472 mayor que 477: a compensar', '4700 Hacienda Pública, deudora por IVA (Debe)', 'Se aplica en las siguientes liquidaciones; en el último periodo del año se puede pedir la devolución'],
          ],
        },
        { tipo: 'liquidador-iva' },
        {
          tipo: 'consejo',
          html: '<strong>Antes de presentar</strong>, comprueba que las cuotas del borrador coinciden con los saldos de la 477 y la 472 y con los libros registro. Si hay diferencias, suele ser una factura con fecha de otro trimestre o un IVA no deducible registrado en la 472.',
        },
        {
          tipo: 'gestoria',
          html: 'Si el 303 sale a ingresar y el cliente no puede pagarlo, <strong>preséntalo en plazo igualmente</strong> con solicitud de aplazamiento o fraccionamiento. No presentarlo genera recargos y sanciones mucho mayores.',
        },
      ],
    },
    {
      id: 'modelos-111-115',
      titulo: 'Modelos 111 y 115: ingresar las retenciones',
      resumen: 'La 4751 vuelve a cero cada trimestre.',
      piezas: [
        {
          tipo: 'tabla',
          columnas: ['', 'Modelo 111', 'Modelo 115'],
          filas: [
            ['Qué recoge', 'Retenciones de trabajadores (nóminas) y de profesionales', 'Retenciones de alquileres de inmuebles urbanos'],
            ['De dónde salen', 'Hojas de nóminas y facturas de profesionales', 'Facturas del arrendador'],
            ['Resumen anual', 'Modelo 190', 'Modelo 180'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Pago del 111 del trimestre: 2.227,50 €',
          lineas: [{ cuenta: '4751', debe: 2227.5 }, { cuenta: '572', haber: 2227.5 }],
          nota: 'No es un gasto: las retenciones ya se registraron como deuda en cada nómina o factura. El pago solo la cancela.',
        },
        {
          tipo: 'gestoria',
          html: 'Separa la 4751 en <strong>subcuentas</strong>: por ejemplo, 47510001 para trabajo y profesionales (111) y 47510002 para alquileres (115). Así cada una cuadra con su modelo y detectas al momento una retención mal clasificada.',
        },
      ],
    },
    {
      id: 'informativas',
      titulo: 'Las declaraciones informativas anuales',
      resumen: '390, 190, 180 y el temido 347.',
      piezas: [
        {
          tipo: 'tabla',
          columnas: ['Modelo', 'Qué es', 'Con qué cuadra'],
          filas: [
            ['390', 'Resumen anual del IVA', 'La suma de los cuatro 303 del año'],
            ['190', 'Retenciones de trabajo y profesionales, detalladas por perceptor', 'La suma de los cuatro 111 y los certificados de retenciones'],
            ['180', 'Retenciones de alquileres, detalladas por arrendador', 'La suma de los cuatro 115'],
            ['347', 'Operaciones con cada tercero que superen 3.005,06 € al año (IVA incluido)', 'Los saldos de clientes y proveedores, y el 347 de cada tercero'],
          ],
        },
        {
          tipo: 'html',
          html: '<p><strong>El modelo 347.</strong> Recoge, por cada cliente y proveedor, el total anual de operaciones con él cuando supera 3.005,06 € IVA incluido, desglosado por trimestres. <strong>No se incluyen</strong> las operaciones que ya se declaran en otros modelos: las que llevan retención (190 y 180) y las intracomunitarias (349). Los cobros en efectivo de más de 6.000 € de un mismo tercero se declaran además por separado.</p>',
        },
        {
          tipo: 'gestoria',
          html: 'Las empresas que llevan los libros por el Suministro Inmediato de Información (SII) no presentan el 347: Hacienda ya tiene los datos factura a factura.',
        },
      ],
    },
    {
      id: 'enero',
      titulo: 'Enero en la gestoría: cuadrar y puntear',
      resumen: 'La tarea de junior que más se repite.',
      piezas: [
        {
          tipo: 'pasos',
          pasos: [
            { titulo: '390 contra los 303', texto: 'Suma los cuatro 303 presentados. Si el 390 no coincide, hay una complementaria olvidada o un error en algún trimestre.' },
            { titulo: '190 y 180 contra los 111 y 115', texto: 'La suma de retenciones por perceptor debe coincidir con lo ingresado en el año. Emite a cada perceptor su certificado de retenciones.' },
            { titulo: 'Listado de terceros para el 347', texto: 'Saca del programa los clientes y proveedores que superan 3.005,06 € y quita los que llevan retención o son intracomunitarios.' },
            { titulo: 'Cartas de 347', texto: 'Envía a cada tercero el importe que vas a declarar. Si su cifra no coincide, busca la diferencia antes de presentar: una factura que falta, otra de un ejercicio distinto o un abono.' },
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>Hacienda cruza los 347.</strong> Si tu cliente declara 11.900 € con un proveedor y el proveedor declara 12.400 € con tu cliente, la diferencia aparecerá en una comprobación. Por eso las diferencias se resuelven en febrero, no después.',
        },
      ],
    },
    {
      id: 'normativa',
      titulo: 'Actualización normativa: factura electrónica y VeriFactu',
      resumen: 'Lo que ya es oficial y lo que está solo anunciado.',
      piezas: [
        {
          tipo: 'tabla',
          titulo: 'Factura electrónica obligatoria entre empresas',
          columnas: ['Hito', 'Situación'],
          filas: [
            ['Real Decreto 238/2026, de 25 de marzo', 'Aprobado y publicado (BOE de 31/03/2026)'],
            ['Orden HAC/1028/2026, de 2 de octubre', 'Publicada en el BOE el 5/10/2026 y en vigor desde el 6/10/2026: inicia el cómputo de los plazos'],
            ['Empresas con más de 8 millones de volumen de operaciones', 'Obligatoria un año después: hacia octubre de 2027'],
            ['Resto de empresas y autónomos', 'Obligatoria dos años después: hacia octubre de 2028'],
            ['Comunicación del estado de las facturas (rechazo, pago)', 'La hace el destinatario. Para autónomos y entidades de hasta 8 millones, es voluntaria durante los primeros 12 meses'],
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'VeriFactu (software de facturación)',
          columnas: ['Hito', 'Situación'],
          filas: [
            ['Real Decreto-ley 15/2025 (BOE de 3/12/2025)', 'Fechas legales vigentes: 1/1/2027 para sociedades y 1/7/2027 para el resto'],
            ['Anuncio de Hacienda (5/10/2026)', 'Intención de aplazarlo a octubre de 2028 para alinearlo con la factura electrónica'],
            ['Estado del aplazamiento a mediados de octubre de 2026', 'Pendiente de aprobación: sin norma publicada en el BOE'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Mientras el aplazamiento de VeriFactu no se publique en el BOE, <strong>las fechas que obligan son las de 2027</strong>. Aconseja a los clientes que facturan con su propio programa que confirmen con su proveedor de software que está adaptado, y revisa la web de la AEAT antes de cada fecha.',
        },
        {
          tipo: 'consejo',
          html: '<strong>Datos comprobados el 22 de octubre de 2026.</strong> Es normativa en movimiento: vuelve a comprobarla antes de asesorar a un cliente.',
        },
      ],
    },
  ],

  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  test: [
    /* --- Calendario --- */
    {
      id: 'b4-q01',
      pregunta: '¿Cuál es el plazo general para presentar el 303 del tercer trimestre?',
      correcta: 'Del 1 al 20 de octubre',
      incorrectas: ['Del 1 al 30 de septiembre', 'Hasta el 31 de diciembre'],
      explicacion: 'El 303 trimestral se presenta del 1 al 20 del mes siguiente al trimestre. Solo el cuarto trimestre tiene plazo hasta el 30 de enero.',
    },
    {
      id: 'b4-q02',
      pregunta: '¿Hasta cuándo se presentan los modelos 111 y 115 del cuarto trimestre?',
      correcta: 'Hasta el 20 de enero',
      incorrectas: ['Hasta el 30 de enero, como el 303', 'Hasta el 28 de febrero'],
      explicacion: 'El 111 y el 115 del cuarto trimestre siguen el plazo general (del 1 al 20 de enero). El 303 del cuarto trimestre se amplía hasta el 30 de enero.',
    },
    {
      id: 'b4-q03',
      pregunta: '¿Cuándo se presenta el modelo 390?',
      correcta: 'Del 1 al 30 de enero',
      incorrectas: ['Durante el mes de febrero', 'Junto con el impuesto sobre sociedades, en julio'],
      explicacion: 'El 390 es el resumen anual del IVA y se presenta en enero, a la vez que el 303 del cuarto trimestre.',
    },
    {
      id: 'b4-q04',
      pregunta: '¿Cuándo se presenta el modelo 347?',
      correcta: 'Durante el mes de febrero',
      incorrectas: ['Del 1 al 20 de enero', 'Cada trimestre, con el 303'],
      explicacion: 'El 347 se presenta en febrero, después de los resúmenes de enero. Así hay tiempo para cuadrar las cifras con clientes y proveedores.',
    },
    {
      id: 'b4-q05',
      pregunta: 'Un cliente quiere pagar el 303 del segundo trimestre por domiciliación. ¿Hasta cuándo puede presentarlo?',
      correcta: 'Hasta el 15 de julio, antes que el plazo general',
      incorrectas: ['Hasta el 20 de julio, como cualquier otro', 'Hasta el 31 de julio'],
      explicacion: 'La domiciliación tiene un plazo más corto que el general: en los trimestres ordinarios termina el día 15. El cargo en cuenta se hace el último día del plazo.',
    },

    /* --- Nóminas --- */
    {
      id: 'b4-q06',
      pregunta: 'En el asiento de nóminas, ¿qué importe va a la cuenta 640 Sueldos y salarios?',
      correcta: 'El salario bruto',
      incorrectas: ['El líquido que cobra el trabajador', 'El bruto más la Seguridad Social de la empresa'],
      explicacion: 'La 640 recoge el salario bruto devengado. Las retenciones y la Seguridad Social del trabajador se descuentan después, en las cuentas de pasivo.',
    },
    {
      id: 'b4-q07',
      pregunta: '¿Dónde registras la Seguridad Social que paga la empresa por sus trabajadores?',
      correcta: '642 Seguridad Social a cargo de la empresa',
      incorrectas: ['640 Sueldos y salarios', '476 Organismos de la Seguridad Social, acreedores'],
      explicacion: 'Es un gasto adicional al salario: 642, al Debe. La 476 es la deuda que se paga a la Seguridad Social, no el gasto.',
    },
    {
      id: 'b4-q08',
      pregunta: '¿Qué importe se abona a la 476 en el asiento de nóminas?',
      correcta: 'La cuota de la empresa más la cuota de los trabajadores',
      incorrectas: ['Solo la cuota de la empresa', 'Solo la cuota descontada a los trabajadores'],
      explicacion: 'La empresa ingresa a la Seguridad Social las dos partes: la suya y la que ha descontado a los trabajadores. Por eso la 476 recoge el total.',
    },
    {
      id: 'b4-q09',
      pregunta: '¿Qué cuenta recoge el IRPF retenido en las nóminas?',
      correcta: '4751 Hacienda Pública, acreedora por retenciones practicadas',
      incorrectas: ['473 Hacienda Pública, retenciones y pagos a cuenta', '476 Organismos de la Seguridad Social, acreedores'],
      explicacion: 'Es una deuda con Hacienda que se ingresa con el modelo 111, igual que las retenciones de los profesionales.',
    },
    {
      id: 'b4-q10',
      pregunta: 'Nómina: bruto 2.000 €, Seguridad Social del trabajador 130 €, IRPF 240 € y Seguridad Social de la empresa 640 €. ¿Cómo queda el asiento?',
      correcta: '640 por 2.000 y 642 por 640 al Debe; 476 por 770, 4751 por 240 y 465 por 1.630 al Haber',
      incorrectas: ['640 por 1.630 al Debe; 465 por 1.630 al Haber', '640 por 2.000 al Debe; 476 por 130, 4751 por 240 y 465 por 1.630 al Haber'],
      explicacion: 'La 476 suma las dos cuotas (640 + 130 = 770 €) y el líquido es 2.000 − 130 − 240 = 1.630 €. Debe 2.640 = Haber 2.640.',
    },
    {
      id: 'b4-q11',
      pregunta: 'Pagas por transferencia las nóminas del mes. ¿Qué asiento haces?',
      correcta: '465 Remuneraciones pendientes de pago al Debe; 572 al Haber',
      incorrectas: ['640 Sueldos y salarios al Debe; 572 al Haber', '476 al Debe; 572 al Haber'],
      explicacion: 'El gasto ya se registró con la nómina. El pago cancela lo que se debe a los trabajadores (465).',
    },
    {
      id: 'b4-q12',
      pregunta: '¿Cuándo se pagan, en general, los seguros sociales de las nóminas de octubre?',
      correcta: 'En noviembre, con cargo el último día hábil del mes',
      incorrectas: ['El mismo día que las nóminas de octubre', 'En enero, con el 111'],
      explicacion: 'Las cotizaciones de un mes se ingresan durante el mes siguiente. Mientras tanto, la deuda está en la 476.',
    },
    {
      id: 'b4-q13',
      pregunta: 'Una trabajadora pidió un anticipo de 300 € a mitad de mes. ¿Qué asiento haces al pagárselo?',
      correcta: '460 Anticipos de remuneraciones al Debe; 572 al Haber',
      incorrectas: ['640 Sueldos y salarios al Debe; 572 al Haber', '465 al Debe; 572 al Haber'],
      explicacion: 'El anticipo es un derecho frente a la trabajadora hasta que se descuente de su nómina. En el asiento de la nómina se abona la 460 y se reduce el líquido.',
    },
    {
      id: 'b4-q14',
      pregunta: '¿Qué porcentaje aproximado de su base de cotización paga a la Seguridad Social un trabajador con contrato indefinido en 2026?',
      correcta: 'En torno al 6,5 %',
      incorrectas: ['Alrededor del 30 %', 'Nada: todo lo paga la empresa'],
      explicacion: 'Contingencias comunes 4,70 %, desempleo 1,55 %, formación profesional 0,10 % y MEI 0,15 %. La empresa paga bastante más: por encima del 30 %.',
    },
    {
      id: 'b4-q15',
      pregunta: 'La empresa paga una indemnización por despido. ¿En qué cuenta la registras?',
      correcta: '641 Indemnizaciones',
      incorrectas: ['640 Sueldos y salarios', '678 Gastos excepcionales'],
      explicacion: 'El PGC tiene una cuenta propia para las indemnizaciones al personal: 641. Así no se mezclan con los salarios ordinarios.',
    },
    {
      id: 'b4-q16',
      pregunta: 'Revisando el trimestre, la cuenta 465 tiene saldo acreedor. ¿Qué puede significar?',
      correcta: 'Que hay una nómina sin pagar o un pago sin registrar',
      incorrectas: ['Que todo está correcto: siempre tiene saldo', 'Que hay que ingresar más IRPF'],
      explicacion: 'Si las nóminas se pagan cada mes, la 465 debe quedar a cero tras cada pago. Un saldo indica algo pendiente de revisar con el banco.',
    },

    /* --- Modelo 303 --- */
    {
      id: 'b4-q17',
      pregunta: 'Al final del trimestre, la 477 tiene 8.000 € y la 472, 5.000 €. ¿Qué asiento de liquidación haces?',
      correcta: '477 por 8.000 al Debe; 472 por 5.000 y 4750 por 3.000 al Haber',
      incorrectas: ['472 por 5.000 al Debe; 477 por 8.000 al Haber', '477 por 8.000 al Debe; 572 por 8.000 al Haber'],
      explicacion: 'Las dos cuentas de IVA se cancelan y la diferencia, a ingresar, es una deuda con Hacienda: 4750.',
    },
    {
      id: 'b4-q18',
      pregunta: 'Al final del trimestre, la 477 tiene 2.000 € y la 472, 3.500 €. ¿Qué asiento haces?',
      correcta: '477 por 2.000 y 4700 por 1.500 al Debe; 472 por 3.500 al Haber',
      incorrectas: ['477 por 2.000 al Debe; 472 por 2.000 al Haber, y se pierde el resto', '477 por 2.000 y 4750 por 1.500 al Debe; 472 por 3.500 al Haber'],
      explicacion: 'Sale a compensar: el exceso de IVA soportado es un derecho frente a Hacienda (4700 Hacienda Pública, deudora por IVA).',
    },
    {
      id: 'b4-q19',
      pregunta: '¿Qué representa el saldo de la cuenta 4700 tras un 303 a compensar?',
      correcta: 'Un derecho frente a Hacienda que se aplicará en próximas liquidaciones',
      incorrectas: ['Una deuda con Hacienda pendiente de pago', 'Un gasto del trimestre'],
      explicacion: 'La 4700 es un activo: IVA que Hacienda «debe» al cliente. Se descuenta en los siguientes 303 o se pide su devolución al final del año.',
    },
    {
      id: 'b4-q20',
      pregunta: 'Con carácter general, ¿cuándo puede una pyme pedir la devolución del IVA a compensar?',
      correcta: 'En la declaración del último periodo del año',
      incorrectas: ['En cualquier trimestre', 'Nunca: solo se puede compensar'],
      explicacion: 'Lo habitual es compensar trimestre a trimestre y, si en el último periodo sigue saliendo a favor, pedir la devolución. Las empresas inscritas en el registro de devolución mensual (REDEME) pueden pedirla cada mes.',
    },
    {
      id: 'b4-q21',
      pregunta: 'En el 303 siguiente aplicas 1.260 € que tenías a compensar. ¿Qué pasa con la 4700 en el asiento de liquidación?',
      correcta: 'Se abona (Haber) por 1.260 €',
      incorrectas: ['Se carga (Debe) por 1.260 €', 'No aparece: solo se usan la 477 y la 472'],
      explicacion: 'Aplicar la compensación cancela ese derecho frente a Hacienda: la 4700 se abona y reduce lo que hay que ingresar.',
    },
    {
      id: 'b4-q22',
      pregunta: 'El 303 sale a ingresar y el cliente no tiene liquidez. ¿Qué le aconsejas?',
      correcta: 'Presentarlo en plazo con solicitud de aplazamiento o fraccionamiento',
      incorrectas: ['No presentarlo hasta tener el dinero', 'Presentarlo en blanco y regularizarlo al año siguiente'],
      explicacion: 'Presentar fuera de plazo o no presentar genera recargos y sanciones. Pedir aplazamiento en plazo es la vía correcta.',
    },
    {
      id: 'b4-q23',
      pregunta: 'Un cliente con derecho a deducir todo el IVA tiene una factura intracomunitaria con autorrepercusión. ¿Cómo afecta al resultado del 303?',
      correcta: 'No lo cambia: la cuota aparece como devengada y como deducible',
      incorrectas: ['Aumenta lo que hay que ingresar', 'Reduce lo que hay que ingresar'],
      explicacion: 'La inversión del sujeto pasivo suma la misma cuota en el IVA devengado y en el deducible, así que el efecto neto es cero.',
    },
    {
      id: 'b4-q24',
      pregunta: 'Tu cliente mayorista ha cobrado recargo de equivalencia a varias tiendas. ¿Cómo lo trata en su 303?',
      correcta: 'Lo declara como IVA devengado, en las casillas de recargo de equivalencia',
      incorrectas: ['No lo declara: es un ingreso suyo', 'Lo resta del IVA soportado'],
      explicacion: 'El recargo cobrado no es un ingreso: el mayorista lo ingresa a Hacienda. Por eso está en la 477 y en el IVA devengado del 303.',
    },
    {
      id: 'b4-q25',
      pregunta: 'Antes de presentar un 303, ¿qué cuadre conviene hacer?',
      correcta: 'Que las cuotas del borrador coincidan con los saldos de 477 y 472 y con los libros registro',
      incorrectas: ['Ninguno: el programa lo calcula todo', 'Que el resultado coincida con el del trimestre anterior'],
      explicacion: 'Si el borrador no coincide con la contabilidad, hay una factura mal fechada, un IVA no deducible en la 472 u otro error que conviene encontrar antes de presentar.',
    },

    /* --- Modelos 111 y 115 --- */
    {
      id: 'b4-q26',
      pregunta: '¿Qué retenciones se ingresan con el modelo 111?',
      correcta: 'Las de trabajadores y las de profesionales',
      incorrectas: ['Solo las de profesionales', 'Las de alquileres de locales'],
      explicacion: 'El 111 recoge las retenciones de rendimientos del trabajo y de actividades profesionales. Las de alquileres van al 115.',
    },
    {
      id: 'b4-q27',
      pregunta: '¿Qué retenciones se ingresan con el modelo 115?',
      correcta: 'Las de alquileres de inmuebles urbanos',
      incorrectas: ['Las de nóminas', 'Las de intereses bancarios'],
      explicacion: 'El 115 es específico de los arrendamientos de inmuebles urbanos, como el alquiler de un local.',
    },
    {
      id: 'b4-q28',
      pregunta: 'Se domicilia el pago del 111 del trimestre. ¿Qué asiento haces?',
      correcta: '4751 al Debe; 572 al Haber',
      incorrectas: ['640 Sueldos y salarios al Debe; 572 al Haber', '4751 al Haber; 572 al Debe'],
      explicacion: 'Las retenciones ya están como deuda en la 4751. El pago la cancela: no es un gasto nuevo.',
    },
    {
      id: 'b4-q29',
      pregunta: '¿Con qué debe coincidir el importe del 111 del trimestre?',
      correcta: 'Con las retenciones de nóminas y profesionales registradas en la 4751 del trimestre',
      incorrectas: ['Con el saldo de la 476', 'Con el resultado del 303'],
      explicacion: 'El 111 se cuadra con la subcuenta de la 4751 de trabajo y profesionales y con las hojas de nóminas y facturas del trimestre.',
    },
    {
      id: 'b4-q30',
      pregunta: '¿Por qué conviene dividir la 4751 en subcuentas?',
      correcta: 'Para cuadrar por separado lo que va al 111 y lo que va al 115',
      incorrectas: ['Porque el PGC lo prohíbe en una sola cuenta', 'Para pagar menos retenciones'],
      explicacion: 'Con una subcuenta para trabajo y profesionales y otra para alquileres, cada una coincide con su modelo y los errores saltan a la vista.',
    },
    {
      id: 'b4-q31',
      pregunta: 'Tu cliente paga el alquiler del local con una retención del 19 %. ¿Qué resumen anual recoge esas retenciones?',
      correcta: 'El modelo 180',
      incorrectas: ['El modelo 190', 'El modelo 347'],
      explicacion: 'El 180 es el resumen anual del 115, con el detalle por arrendador. El 190 es el resumen anual del 111.',
    },

    /* --- Informativas --- */
    {
      id: 'b4-q32',
      pregunta: '¿Con qué debe cuadrar el modelo 390 de un cliente?',
      correcta: 'Con la suma de los cuatro 303 del año',
      incorrectas: ['Con el modelo 347', 'Con el impuesto sobre sociedades'],
      explicacion: 'El 390 resume el IVA del año. Si no coincide con la suma de los 303, falta una complementaria o hay un error en algún trimestre.',
    },
    {
      id: 'b4-q33',
      pregunta: '¿Qué detalla el modelo 190?',
      correcta: 'Las retenciones de trabajo y profesionales de todo el año, perceptor por perceptor',
      incorrectas: ['Las operaciones con proveedores de más de 3.005,06 €', 'El IVA de todo el año'],
      explicacion: 'El 190 desglosa por cada trabajador o profesional lo pagado y lo retenido. Por eso debe coincidir con los certificados de retenciones que se les entregan.',
    },
    {
      id: 'b4-q34',
      pregunta: '¿Qué operaciones se declaran en el modelo 347?',
      correcta: 'Las realizadas con un mismo tercero que superan 3.005,06 € al año, IVA incluido',
      incorrectas: ['Todas las facturas del año, sea cual sea su importe', 'Las que superan 3.005,06 € sin contar el IVA'],
      explicacion: 'El umbral es de 3.005,06 € anuales por tercero e incluye el IVA. Se declaran desglosadas por trimestres.',
    },
    {
      id: 'b4-q35',
      pregunta: '¿Cuál de estas operaciones NO se incluye en el 347?',
      correcta: 'Los honorarios de un abogado con retención, porque ya van en el 190',
      incorrectas: ['Compras de 4.000 € a un proveedor nacional', 'Ventas de 5.000 € a un cliente nacional'],
      explicacion: 'Se excluyen las operaciones ya declaradas en otros modelos: las que llevan retención (190 y 180) y las intracomunitarias (349).',
    },
    {
      id: 'b4-q36',
      pregunta: 'Un cliente cobra en efectivo 6.500 € de una misma persona durante el año. ¿Qué particularidad tiene en el 347?',
      correcta: 'Además de la operación, se declaran por separado los cobros en metálico de más de 6.000 €',
      incorrectas: ['Ninguna: el efectivo no se declara', 'Debe declararse en el 349'],
      explicacion: 'El 347 tiene un apartado específico para los cobros en metálico superiores a 6.000 € de un mismo tercero.',
    },
    {
      id: 'b4-q37',
      pregunta: 'Un proveedor avisa de que en su 347 declara 12.400 € con tu cliente, y vosotros 11.900 €. ¿Qué haces?',
      correcta: 'Buscar la diferencia: una factura que falta, otra de otro ejercicio o un abono',
      incorrectas: ['Cambiar la cifra para que coincida con la suya', 'Nada: cada uno declara lo suyo'],
      explicacion: 'Hacienda cruza los 347 de ambas partes. La diferencia debe explicarse y, si falta una factura, registrarse en el periodo correcto.',
    },
    {
      id: 'b4-q38',
      pregunta: 'Una empresa lleva sus libros de IVA por el SII (Suministro Inmediato de Información). ¿Presenta el 347?',
      correcta: 'No: Hacienda ya tiene la información factura a factura',
      incorrectas: ['Sí, como cualquier otra empresa', 'Sí, pero solo de las ventas'],
      explicacion: 'Los obligados al SII están exonerados del 347 porque envían cada factura a la AEAT en pocos días.',
    },

    /* --- Normativa --- */
    {
      id: 'b4-q39',
      pregunta: 'A mediados de octubre de 2026, ¿qué fecha de VeriFactu obliga legalmente a las sociedades?',
      correcta: 'El 1 de enero de 2027, mientras no se publique en el BOE el aplazamiento anunciado',
      incorrectas: ['Octubre de 2028, porque Hacienda lo ha anunciado', 'Ninguna: VeriFactu se ha suprimido'],
      explicacion: 'Las fechas vigentes son las del Real Decreto-ley 15/2025: 1/1/2027 para sociedades y 1/7/2027 para el resto. El aplazamiento a octubre de 2028 está anunciado, pero aún no aprobado.',
    },
    {
      id: 'b4-q40',
      pregunta: '¿Qué norma, publicada en el BOE el 5 de octubre de 2026, inicia los plazos de la factura electrónica obligatoria entre empresas?',
      correcta: 'La Orden HAC/1028/2026, que regula la solución pública de facturación electrónica',
      incorrectas: ['El Real Decreto-ley 15/2025', 'La Ley 31/2022 de Presupuestos'],
      explicacion: 'Con su entrada en vigor (6/10/2026) empiezan a contar los plazos: un año para las empresas de más de 8 millones y dos años para el resto.',
    },
  ],

  casos: [
    {
      id: 'b4-nominas',
      tipo: 'asiento',
      cliente: { nombre: 'Mesón La Encina, S.L.', actividad: 'Restaurante' },
      titulo: 'Asiento de las nóminas del mes',
      enunciado: 'El departamento laboral te pasa la hoja resumen de las nóminas de octubre del restaurante. Registra el asiento resumen del mes.',
      documento: HOJA_NOMINAS_MESON,
      cuentasDisponibles: ['640', '642', '476', '4751', '465', '460', '572', '473'],
      solucion: [
        { cuenta: '640', debe: 6000 },
        { cuenta: '642', debe: 1920 },
        { cuenta: '476', haber: 2310 },
        { cuenta: '4751', haber: 720 },
        { cuenta: '465', haber: 4890 },
      ],
      pista: 'Usa los totales. En la 476 va toda la Seguridad Social que se ingresará: la de la empresa y la de los trabajadores.',
      explicacion: 'Bruto a la 640 (6.000 €) y Seguridad Social de la empresa a la 642 (1.920 €). Al Haber: Seguridad Social total en la 476 (1.920 + 390 = 2.310 €), IRPF en la 4751 (720 €) y líquido a pagar en la 465 (4.890 €).',
    },
    {
      id: 'b4-anticipo',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Nómina con anticipo',
      enunciado: 'La dependienta pidió un anticipo de 300 € a mitad de mes, que ya se registró al pagárselo. Registra el asiento de su nómina de octubre.',
      documento: {
        tipo: 'nominas',
        empresa: 'Moda Valentina, S.L.',
        nif: 'B98765432',
        periodo: 'Octubre 2026',
        trabajadores: [
          { nombre: 'Carla Vidal Soler', puesto: 'Dependienta', bruto: 1800, ssTrab: 117, irpf: 162, anticipo: 300, ssEmp: 576 },
        ],
        notas: ['El anticipo de 300 € se pagó el 15/10/2026 y se descuenta en esta nómina.'],
      },
      cuentasDisponibles: ['640', '642', '476', '4751', '460', '465', '572', '407'],
      solucion: [
        { cuenta: '640', debe: 1800 },
        { cuenta: '642', debe: 576 },
        { cuenta: '476', haber: 693 },
        { cuenta: '4751', haber: 162 },
        { cuenta: '460', haber: 300 },
        { cuenta: '465', haber: 1221 },
      ],
      pista: 'Seis líneas. El anticipo ya se pagó: ahora se descuenta de la nómina cancelando el derecho que tenía la empresa.',
      explicacion: 'Igual que una nómina normal, pero el anticipo se descuenta: se abona la 460 por 300 € y el líquido baja a 1.221 € (1.800 − 117 − 162 − 300). La 476 recoge 576 + 117 = 693 €.',
    },
    {
      id: 'b4-pago-nominas',
      tipo: 'asiento',
      cliente: { nombre: 'Mesón La Encina, S.L.', actividad: 'Restaurante' },
      titulo: 'Pago de las nóminas',
      enunciado: 'El último día de octubre el restaurante ha pagado las nóminas del primer caso. Registra en un único asiento las tres transferencias resaltadas.',
      documento: {
        tipo: 'extracto',
        banco: BANCO_FICTICIO,
        titular: 'Mesón La Encina, S.L.',
        iban: 'ES00 9999 0001 1100 0023 8845',
        periodo: '30/10/2026 – 31/10/2026',
        saldoInicial: 12406.3,
        movimientos: [
          { fecha: '30/10', concepto: 'LIQUIDACION TPV 29/10', detalle: 'Bruto 1.120,00 · comisión 5,60', importe: 1114.4 },
          { fecha: '31/10', concepto: 'TRANSF. NOMINA OCTUBRE', detalle: 'Beneficiario: ANDRES MOLINA VIDAL', importe: -1908, resaltar: true },
          { fecha: '31/10', concepto: 'TRANSF. NOMINA OCTUBRE', detalle: 'Beneficiario: LUCIA SERRANO GIL', importe: -1548.5, resaltar: true },
          { fecha: '31/10', concepto: 'TRANSF. NOMINA OCTUBRE', detalle: 'Beneficiario: PABLO RUIZ CATALA', importe: -1433.5, resaltar: true },
        ],
      },
      cuentasDisponibles: ['465', '640', '476', '4751', '460', '572', '555'],
      solucion: [{ cuenta: '465', debe: 4890 }, { cuenta: '572', haber: 4890 }],
      pista: 'El gasto ya está registrado. ¿Qué cuenta recogía lo que se debía a los trabajadores?',
      explicacion: 'Se cancela la deuda con los trabajadores (465 al Debe, 4.890 €) y sale el dinero del banco. Registrar el pago en la 640 duplicaría el gasto.',
    },
    {
      id: 'b4-seguros-sociales',
      tipo: 'asiento',
      cliente: { nombre: 'Mesón La Encina, S.L.', actividad: 'Restaurante' },
      titulo: 'Pago de los seguros sociales',
      enunciado: 'A final de noviembre se cargan los seguros sociales de octubre. Tienes el recibo de liquidación de cotizaciones y el extracto. Registra el pago.',
      documentos: [
        {
          tipo: 'resumen',
          titulo: 'Recibo de liquidación de cotizaciones (RLC)',
          subtitulo: 'Periodo de liquidación: octubre 2026 · régimen general',
          emisor: { nombre: 'Mesón La Encina, S.L.', nif: 'B98556677' },
          columnas: ['Concepto', 'Importe'],
          filas: [
            ['Trabajadores en alta', '3'],
            ['Aportación de la empresa', '1.920,00 €'],
            ['Aportación de los trabajadores', '390,00 €'],
            ['Total a ingresar', '2.310,00 €'],
          ],
          notas: ['Modalidad de pago: cargo en cuenta el 30/11/2026.'],
        },
        {
          tipo: 'extracto',
          banco: BANCO_FICTICIO,
          titular: 'Mesón La Encina, S.L.',
          iban: 'ES00 9999 0001 1100 0023 8845',
          periodo: '30/11/2026',
          saldoInicial: 9874.15,
          movimientos: [
            { fecha: '30/11', concepto: 'TGSS COTIZACION 10/2026', detalle: 'Recibo de liquidación de cotizaciones', importe: -2310, resaltar: true },
          ],
        },
      ],
      cuentasDisponibles: ['476', '642', '640', '4751', '465', '572', '626'],
      solucion: [{ cuenta: '476', debe: 2310 }, { cuenta: '572', haber: 2310 }],
      pista: 'Tanto la parte de la empresa como la de los trabajadores ya se registraron con la nómina. ¿Dónde quedó la deuda?',
      explicacion: 'Se cancela la deuda con la Seguridad Social (476 al Debe, 2.310 €). No es un gasto nuevo: el gasto de la empresa (642) se registró en octubre con la nómina.',
    },
    {
      id: 'b4-303-ingresar',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Liquidación del IVA a ingresar',
      enunciado: 'Has preparado el borrador del 303 del tercer trimestre y cuadra con la contabilidad. Registra el asiento de liquidación del IVA.',
      documento: {
        tipo: 'modelo',
        modelo: '303',
        titulo: 'Autoliquidación del IVA · borrador',
        nombre: 'Distribuciones Levante, S.L.',
        nif: 'B98102030',
        periodo: 'Ejercicio 2026 · 3T',
        secciones: [
          {
            titulo: 'IVA devengado',
            filas: [
              { etiqueta: 'Régimen general 21 % · base 41.200,00', valor: 8652 },
              { etiqueta: 'Recargo de equivalencia 5,2 % · base 3.200,00', valor: 166.4 },
              { etiqueta: 'Total cuota devengada', valor: 8818.4, total: true },
            ],
          },
          {
            titulo: 'IVA deducible',
            filas: [
              { etiqueta: 'Operaciones interiores corrientes · base 30.000,00', valor: 6300 },
              { etiqueta: 'Bienes de inversión · base 1.200,00', valor: 252 },
              { etiqueta: 'Total a deducir', valor: 6552, total: true },
            ],
          },
        ],
        resultado: { etiqueta: 'Resultado: a ingresar', valor: 2266.4 },
      },
      cuentasDisponibles: ['477', '472', '4750', '4700', '572', '700', '600'],
      solucion: [{ cuenta: '477', debe: 8818.4 }, { cuenta: '472', haber: 6552 }, { cuenta: '4750', haber: 2266.4 }],
      pista: 'Las dos cuentas de IVA quedan a cero. El recargo de equivalencia cobrado también está en la 477. ¿Quién debe la diferencia?',
      explicacion: 'Se carga la 477 por todo el IVA devengado, incluido el recargo (8.818,40 €), y se abona la 472 por el deducible (6.552 €). La diferencia, 2.266,40 €, es una deuda con Hacienda: 4750, que se cancelará al pagar.',
    },
    {
      id: 'b4-303-compensar',
      tipo: 'asiento',
      cliente: { nombre: 'Estudio Creativo Píxel, S.L.', actividad: 'Agencia de diseño' },
      titulo: 'Un 303 a compensar',
      enunciado: 'En el segundo trimestre la agencia equipó su nuevo estudio. Este es el borrador de su 303. Registra la liquidación.',
      documento: {
        tipo: 'modelo',
        modelo: '303',
        titulo: 'Autoliquidación del IVA · borrador',
        nombre: 'Estudio Creativo Píxel, S.L.',
        nif: 'B98445566',
        periodo: 'Ejercicio 2026 · 2T',
        secciones: [
          {
            titulo: 'IVA devengado',
            filas: [
              { etiqueta: 'Régimen general 21 % · base 9.000,00', valor: 1890 },
              { etiqueta: 'Adquisiciones intracomunitarias de servicios · base 2.400,00', valor: 504 },
              { etiqueta: 'Total cuota devengada', valor: 2394, total: true },
            ],
          },
          {
            titulo: 'IVA deducible',
            filas: [
              { etiqueta: 'Operaciones interiores corrientes · base 3.000,00', valor: 630 },
              { etiqueta: 'Bienes de inversión · base 12.000,00', valor: 2520 },
              { etiqueta: 'Adquisiciones intracomunitarias · base 2.400,00', valor: 504 },
              { etiqueta: 'Total a deducir', valor: 3654, total: true },
            ],
          },
        ],
        resultado: { etiqueta: 'Resultado: a compensar', valor: -1260 },
      },
      cuentasDisponibles: ['477', '472', '4750', '4700', '572', '217', '627'],
      solucion: [{ cuenta: '477', debe: 2394 }, { cuenta: '4700', debe: 1260 }, { cuenta: '472', haber: 3654 }],
      pista: 'Esta vez el IVA soportado es mayor que el repercutido. La diferencia no se pierde: ¿es una deuda o un derecho?',
      explicacion: 'Se cargan la 477 (2.394 €) y la 4700 por la diferencia a favor del cliente (1.260 €), y se abona la 472 (3.654 €). La 4700 Hacienda Pública, deudora por IVA se aplicará en el siguiente 303.',
    },
    {
      id: 'b4-303-aplicar',
      tipo: 'asiento',
      cliente: { nombre: 'Estudio Creativo Píxel, S.L.', actividad: 'Agencia de diseño' },
      titulo: 'Aplicar la compensación en el trimestre siguiente',
      enunciado: 'Llega el 303 del tercer trimestre de la agencia, en el que se aplica lo que quedó a compensar en el segundo. Registra la liquidación.',
      documento: {
        tipo: 'modelo',
        modelo: '303',
        titulo: 'Autoliquidación del IVA · borrador',
        nombre: 'Estudio Creativo Píxel, S.L.',
        nif: 'B98445566',
        periodo: 'Ejercicio 2026 · 3T',
        secciones: [
          {
            titulo: 'IVA devengado',
            filas: [
              { etiqueta: 'Régimen general 21 % · base 15.000,00', valor: 3150 },
              { etiqueta: 'Adquisiciones intracomunitarias de servicios · base 1.000,00', valor: 210 },
              { etiqueta: 'Total cuota devengada', valor: 3360, total: true },
            ],
          },
          {
            titulo: 'IVA deducible',
            filas: [
              { etiqueta: 'Operaciones interiores corrientes · base 4.000,00', valor: 840 },
              { etiqueta: 'Adquisiciones intracomunitarias · base 1.000,00', valor: 210 },
              { etiqueta: 'Total a deducir', valor: 1050, total: true },
            ],
          },
          {
            titulo: 'Liquidación',
            filas: [
              { etiqueta: 'Diferencia (devengado − deducible)', valor: 2310 },
              { etiqueta: 'Cuotas a compensar de periodos anteriores aplicadas', valor: -1260 },
            ],
          },
        ],
        resultado: { etiqueta: 'Resultado: a ingresar', valor: 1050 },
      },
      cuentasDisponibles: ['477', '472', '4750', '4700', '572', '555', '627'],
      solucion: [{ cuenta: '477', debe: 3360 }, { cuenta: '472', haber: 1050 }, { cuenta: '4700', haber: 1260 }, { cuenta: '4750', haber: 1050 }],
      pista: 'Cuatro líneas. La compensación aplicada cancela el derecho que se registró en el trimestre anterior.',
      explicacion: 'Se cancelan la 477 (3.360 €) y la 472 (1.050 €). La compensación aplicada cancela la 4700 (1.260 € al Haber) y queda a ingresar 3.360 − 1.050 − 1.260 = 1.050 € (4750).',
    },
    {
      id: 'b4-111',
      tipo: 'asiento',
      cliente: { nombre: 'Mesón La Encina, S.L.', actividad: 'Restaurante' },
      titulo: 'Pago del modelo 111',
      enunciado: 'Has presentado el 111 del tercer trimestre del restaurante con domiciliación. El banco ha hecho el cargo. Registra el asiento.',
      documentos: [
        {
          tipo: 'modelo',
          modelo: '111',
          titulo: 'Retenciones del trabajo y actividades económicas · borrador',
          nombre: 'Mesón La Encina, S.L.',
          nif: 'B98556677',
          periodo: 'Ejercicio 2026 · 3T',
          secciones: [
            {
              titulo: 'Rendimientos del trabajo',
              filas: [
                { etiqueta: 'Perceptores: 3 · percepciones 18.000,00', valor: 2160 },
              ],
            },
            {
              titulo: 'Actividades económicas (profesionales)',
              filas: [
                { etiqueta: 'Perceptores: 1 · percepciones 450,00', valor: 67.5 },
              ],
            },
          ],
          resultado: { etiqueta: 'Resultado: a ingresar', valor: 2227.5 },
        },
        {
          tipo: 'extracto',
          banco: BANCO_FICTICIO,
          titular: 'Mesón La Encina, S.L.',
          iban: 'ES00 9999 0001 1100 0023 8845',
          periodo: '20/10/2026',
          saldoInicial: 11780.4,
          movimientos: [
            { fecha: '20/10', concepto: 'AEAT MODELO 111 3T 2026', detalle: 'Domiciliación', importe: -2227.5, resaltar: true },
            { fecha: '20/10', concepto: 'AEAT MODELO 303 3T 2026', detalle: 'Domiciliación', importe: -1843.2 },
          ],
        },
      ],
      cuentasDisponibles: ['4751', '473', '640', '476', '4750', '572', '623'],
      solucion: [{ cuenta: '4751', debe: 2227.5 }, { cuenta: '572', haber: 2227.5 }],
      pista: 'Las retenciones de nóminas y profesionales se fueron acumulando como deuda durante el trimestre. ¿En qué cuenta?',
      explicacion: 'El pago cancela la deuda acumulada en la 4751 (2.160 € de nóminas + 67,50 € de profesionales). No es un gasto: el gasto (640, 623) ya se registró. El otro cargo del extracto, el del 303, cancelaría la 4750.',
    },
    {
      id: 'b4-115',
      tipo: 'asiento',
      cliente: { nombre: 'Bicicletas Ruedas del Turia, S.L.', actividad: 'Tienda y taller de bicicletas' },
      titulo: 'Pago del modelo 115',
      enunciado: 'La tienda retiene cada mes el 19 % del alquiler del local (1.000 € de base). Este es el 115 del tercer trimestre, pagado por domiciliación. Registra el pago.',
      documento: {
        tipo: 'modelo',
        modelo: '115',
        titulo: 'Retenciones de arrendamientos de inmuebles urbanos · borrador',
        nombre: 'Bicicletas Ruedas del Turia, S.L.',
        nif: 'B98112299',
        periodo: 'Ejercicio 2026 · 3T',
        secciones: [
          {
            titulo: 'Retenciones e ingresos a cuenta',
            filas: [
              { etiqueta: 'Arrendadores: 1 · base de las retenciones 3.000,00', valor: 570 },
            ],
          },
        ],
        resultado: { etiqueta: 'Resultado: a ingresar (domiciliado)', valor: 570 },
      },
      cuentasDisponibles: ['4751', '621', '473', '410', '4750', '572', '555'],
      solucion: [{ cuenta: '4751', debe: 570 }, { cuenta: '572', haber: 570 }],
      pista: 'Tres meses de 190 € retenidos al arrendador. ¿Dónde se registraron?',
      explicacion: 'Se cancela la deuda de las retenciones de alquiler (4751, normalmente en su subcuenta propia de alquileres) por 3 × 190 = 570 €. No se toca la 621: el gasto se registró con cada factura del alquiler.',
    },
    {
      id: 'b4-modelos',
      tipo: 'clasificar',
      titulo: '¿Qué modelo presentas?',
      enunciado: 'Preparas la agenda de presentaciones de la gestoría. Indica qué modelo corresponde a cada obligación.',
      rejilla: 'grid-cols-4',
      opciones: [
        { valor: '303', etiqueta: '303' },
        { valor: '111', etiqueta: '111' },
        { valor: '115', etiqueta: '115' },
        { valor: '349', etiqueta: '349' },
        { valor: '390', etiqueta: '390' },
        { valor: '190', etiqueta: '190' },
        { valor: '180', etiqueta: '180' },
        { valor: '347', etiqueta: '347' },
      ],
      cuentas: [
        { id: 'iva-trim', texto: 'Liquidación del IVA del trimestre', correcta: '303', pista: 'Es la autoliquidación trimestral más habitual.', explicacion: 'Autoliquidación trimestral del IVA.' },
        { id: 'ret-trab', texto: 'Retenciones de las nóminas y de la gestoría (persona física) del trimestre', correcta: '111', pista: 'Trabajo y actividades profesionales.', explicacion: 'Retenciones de trabajo y profesionales.' },
        { id: 'ret-alq', texto: 'Retenciones del alquiler del local del trimestre', correcta: '115', pista: 'Arrendamientos de inmuebles urbanos.', explicacion: 'Retenciones de alquileres.' },
        { id: 'intracom', texto: 'Compras de publicidad a una empresa irlandesa (declaración recapitulativa)', correcta: '349', pista: 'Operaciones con otros países de la UE.', explicacion: 'Operaciones intracomunitarias.' },
        { id: 'iva-anual', texto: 'Resumen anual del IVA', correcta: '390', pista: 'Se presenta en enero y suma los cuatro trimestres del IVA.', explicacion: 'Resumen anual del IVA.' },
        { id: 'ret-anual', texto: 'Resumen anual de retenciones de trabajadores y profesionales, por perceptor', correcta: '190', pista: 'Es el resumen anual del 111.', explicacion: 'Resumen anual del 111.' },
        { id: 'alq-anual', texto: 'Resumen anual de retenciones de alquileres, por arrendador', correcta: '180', pista: 'Es el resumen anual del 115.', explicacion: 'Resumen anual del 115.' },
        { id: 'terceros', texto: 'Operaciones con un proveedor nacional que superan 3.005,06 € en el año', correcta: '347', pista: 'Declaración anual de operaciones con terceros, en febrero.', explicacion: 'Operaciones con terceros.' },
      ],
      resumenOk: 'Esta es la agenda fiscal básica de cualquier cliente con empleados y local alquilado: cuatro modelos cada trimestre y cuatro resúmenes anuales entre enero y febrero.',
    },
    {
      id: 'b4-347',
      tipo: 'clasificar',
      cliente: { nombre: 'Floristería Azahar, S.L.', actividad: 'Floristería' },
      titulo: 'Prepara el 347 de la floristería',
      enunciado: 'En febrero sacas del programa los terceros de la floristería. Indica cuáles hay que incluir en su 347 (importes anuales, IVA incluido).',
      rejilla: 'grid-cols-2',
      opciones: [
        { valor: 'si', etiqueta: 'Va al 347' },
        { valor: 'no', etiqueta: 'No va' },
      ],
      cuentas: [
        { id: 'viveros', texto: 'Viveros del Turia, S.L. (proveedor de flores): compras de 14.520,00 €', correcta: 'si', pista: 'Proveedor nacional, sin retención y por encima del umbral.', explicacion: 'Supera 3.005,06 € y no va en otro modelo.' },
        { id: 'gestor', texto: 'Javier Ortiz Lago, gestor (persona física, con retención): 3.630,00 €', correcta: 'no', pista: 'Supera el umbral, pero sus facturas llevan retención.', explicacion: 'Ya se declara en el 190.' },
        { id: 'local', texto: 'Inmuebles Ribera, S.L. (alquiler del local, con retención): 14.520,00 €', correcta: 'no', pista: 'El alquiler lleva retención del 19 %.', explicacion: 'Ya se declara en el 180.' },
        { id: 'embalajes', texto: 'Embalajes Levante, S.L.: compras de 2.950,00 €', correcta: 'no', pista: 'Compara el importe con el umbral.', explicacion: 'No supera 3.005,06 €.' },
        { id: 'holanda', texto: 'Bloemen BV (proveedor de Países Bajos): compras intracomunitarias de 6.000,00 €', correcta: 'no', pista: 'Es una operación con otro país de la UE.', explicacion: 'Ya se declara en el 349.' },
        { id: 'hotel', texto: 'Hotel Palmeras, S.A. (cliente): decoración floral por 3.630,00 €', correcta: 'si', pista: 'Las ventas también cuentan, no solo las compras.', explicacion: 'Cliente nacional por encima del umbral.' },
        { id: 'boda', texto: 'Particular que pagó en efectivo 6.500,00 € por la decoración de su boda (factura completa a su nombre)', correcta: 'si', pista: 'Supera el umbral y hay un apartado especial para el efectivo.', explicacion: 'Se incluye y, además, se declara el cobro en metálico de más de 6.000 €.' },
        { id: 'luz', texto: 'Compañía eléctrica: suministros por 3.400,00 €', correcta: 'si', pista: 'Proveedor nacional sin retención por encima del umbral.', explicacion: 'Supera 3.005,06 € y no va en otro modelo.' },
      ],
      resumenOk: 'Ahora tocaría enviar a cada tercero incluido su importe (las «cartas de 347») y resolver cualquier diferencia antes de presentar en febrero.',
    },
  ],
};

/* ---------- Bloque 5: Cierre y Periodificación (gestoría) ---------- */

const FICHA_INMOVILIZADO_HORNO = {
  tipo: 'resumen',
  titulo: 'Ficha de inmovilizado a 31/12/2026',
  subtitulo: 'Elementos en uso · amortización lineal',
  emisor: { nombre: 'Horno San Blas, S.L.', nif: 'B98221133' },
  columnas: ['Elemento', 'En uso desde', 'Coef.', 'Coste'],
  filas: [
    ['Amasadora industrial (213)', '01/01/2024', '12 %', '6.000,00'],
    ['Horno de convección (213)', '01/11/2026', '12 %', '4.800,00'],
  ],
  notas: ['Sin valor residual. El horno se compró el 12/10/2026 y se puso en funcionamiento el 01/11/2026.', 'La gestoría calcula por meses completos de uso.'],
};

const PYG_LEVANTE_2026 = {
  tipo: 'resumen',
  titulo: 'Cuenta de pérdidas y ganancias provisional 2026',
  subtitulo: 'Antes del impuesto sobre sociedades',
  emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030' },
  columnas: ['Concepto', 'Importe'],
  filas: [
    ['Ventas (cifra de negocios)', '412.000,00 €'],
    ['Total de gastos del ejercicio', '−371.000,00 €'],
    ['Resultado contable antes de impuestos', '41.000,00 €'],
  ],
  notas: [
    'Entre los gastos hay una multa de tráfico de 600,00 € (sanción no deducible fiscalmente).',
    'Cifra de negocios de 2025: 398.500,00 € (microempresa: menos de 1 millón).',
    'Retenciones y pagos fraccionados del ejercicio (cuenta 473): 2.500,00 €.',
  ],
};

const CONTENIDO_B5 = {
  teoria: [
    {
      id: 'checklist',
      titulo: 'El cierre en la gestoría: la lista de comprobación',
      resumen: 'Qué se hace, en qué orden y con qué plazos.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Al cerrar el ejercicio de un cliente se busca que la contabilidad refleje <strong>todo lo que corresponde al año y solo lo que corresponde al año</strong>. Para no olvidar nada, en la gestoría se trabaja con una lista fija, cliente por cliente:</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Revisar y cuadrar', texto: 'Bancos conciliados, 555 aplicada, 303/111/115 del 4T, nóminas y facturas del año completas (Bloque 6).' },
            { titulo: 'Amortizar', texto: 'Dotación del año de cada elemento del inmovilizado: 681 a 281 (o 680 a 280).' },
            { titulo: 'Periodificar', texto: 'Llevar al año siguiente lo pagado o cobrado por adelantado y reconocer lo devengado sin factura.' },
            { titulo: 'Existencias', texto: 'Sustituir el inventario inicial por el final: cuenta 610.' },
            { titulo: 'Deterioros y reclasificaciones', texto: 'Clientes de dudoso cobro (694/490) y deudas que vencen en el año siguiente (170 → 520).' },
            { titulo: 'Impuesto sobre Sociedades', texto: 'Calcular la cuota y registrar el gasto por impuesto: 6300.' },
            { titulo: 'Regularizar', texto: 'Llevar los saldos de los grupos 6 y 7 a la 129 para obtener el resultado.' },
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Plazos después del 31 de diciembre (ejercicio natural)',
          columnas: ['Trámite', 'Plazo'],
          filas: [
            ['Formular las cuentas anuales (administradores)', '3 meses: hasta el 31 de marzo'],
            ['Aprobarlas en junta y aplicar el resultado', '6 meses: hasta el 30 de junio'],
            ['Depositarlas en el Registro Mercantil', '1 mes desde la aprobación'],
            ['Modelo 200 (Impuesto sobre Sociedades)', '25 días naturales tras esos 6 meses: en julio'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Pide a cada cliente en diciembre lo que solo él puede darte: el <strong>inventario</strong> a 31/12, las <strong>facturas pendientes de recibir</strong>, las altas y bajas de inmovilizado y cualquier préstamo nuevo. Sin eso, el cierre se retrasa y se acumula todo en marzo.',
        },
      ],
    },
    {
      id: 'amortizacion',
      titulo: 'Amortización del inmovilizado',
      resumen: 'Repartir el coste de los bienes entre los años de uso.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Un ordenador o una máquina no son gasto el día que se compran: se usan varios años, así que su coste se reparte entre ellos. La parte de cada año es la <strong>dotación a la amortización</strong>: <strong>681</strong> (material) o <strong>680</strong> (intangible) al Debe, y <strong>281</strong> o <strong>280</strong> al Haber. La amortización acumulada resta del valor del bien en el balance.</p><p>Se empieza a amortizar cuando el bien <strong>está en condiciones de funcionamiento</strong>, no cuando se paga, y el primer año solo por los meses de uso.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Coeficientes máximos de la tabla oficial (Impuesto sobre Sociedades)',
          columnas: ['Elemento', 'Coeficiente lineal máximo'],
          filas: [
            ['Edificios comerciales y de oficinas', '2 %'],
            ['Mobiliario', '10 %'],
            ['Maquinaria', '12 %'],
            ['Elementos de transporte (turismos, furgonetas)', '16 %'],
            ['Equipos para procesos de información', '25 %'],
            ['Programas informáticos', '33 %'],
            ['Terrenos', 'No se amortizan'],
          ],
        },
        { tipo: 'amortizacion' },
        {
          tipo: 'consejo',
          html: '<strong>Ventajas fiscales habituales:</strong> los elementos nuevos de hasta 300 € pueden amortizarse libremente (con un límite de 25.000 € al año), y las empresas de reducida dimensión pueden aplicar el doble del coeficiente de la tabla. Consulta el criterio del despacho antes de aplicarlas.',
        },
      ],
    },
    {
      id: 'periodificacion',
      titulo: 'Periodificaciones: cada gasto en su año',
      resumen: 'Gastos e ingresos anticipados y lo devengado sin factura.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>El <strong>principio de devengo</strong> dice que los gastos e ingresos se imputan al año al que corresponden, con independencia de cuándo se pagan o se cobran. Al cierre hay que corregir tres situaciones típicas:</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['Situación', 'Asiento a 31/12', 'Al año siguiente'],
          filas: [
            ['Gasto pagado que corresponde en parte al año siguiente (seguro, alquiler, licencias)', '480 Gastos anticipados a la cuenta de gasto', 'Se revierte el 1/1: gasto a 480'],
            ['Ingreso cobrado que corresponde al año siguiente', 'Cuenta de ingreso a 485 Ingresos anticipados', 'Se revierte el 1/1: 485 a ingreso'],
            ['Gasto del año cuya factura aún no ha llegado (luz de diciembre)', 'Cuenta de gasto a 4109 Facturas pendientes de recibir', 'Al llegar la factura se cancela la 4109'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Seguro anual de 1.200 € pagado el 1/10/2026: 9 meses son de 2027',
          lineas: [{ cuenta: '480', debe: 900 }, { cuenta: '625', haber: 900 }],
          nota: 'Queda en el gasto de 2026 solo lo que corresponde a octubre, noviembre y diciembre: 300 €. El 1/1/2027 se hace el asiento inverso (625 a 480).',
        },
        {
          tipo: 'gestoria',
          html: 'Fija un <strong>umbral de importancia</strong> con cada cliente: periodificar una suscripción de 30 € no cambia nada, pero un seguro anual de varios miles o un alquiler pagado por adelantado sí.',
        },
      ],
    },
    {
      id: 'existencias',
      titulo: 'Variación de existencias',
      resumen: 'Del inventario inicial al final: la cuenta 610.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Durante el año, las compras de mercaderías van a la 600 y la cuenta 300 se queda con el inventario del cierre anterior. Al cierre, se sustituye el inventario inicial por el final. La diferencia pasa por la <strong>610 Variación de existencias de mercaderías</strong>, que corrige el coste de las compras: lo que queda en el almacén no es gasto del año.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Existencias iniciales 8.500 € y finales 11.200 €',
          subtitulo: 'Forma completa: se da de baja el inicial y se registra el final.',
          lineas: [
            { cuenta: '610', debe: 8500 },
            { cuenta: '300', haber: 8500 },
            { cuenta: '300', debe: 11200 },
            { cuenta: '610', haber: 11200 },
          ],
          nota: 'En neto: 300 al Debe y 610 al Haber por 2.700 €. Si las existencias aumentan, el resultado mejora; si disminuyen, empeora.',
        },
        {
          tipo: 'gestoria',
          html: 'El inventario lo hace y lo firma el cliente, <strong>valorado a precio de coste</strong> (no al de venta). Si un comercio te da un inventario «a ojo» o a precio de venta, el resultado del año sale inflado.',
        },
      ],
    },
    {
      id: 'reclasificacion',
      titulo: 'Deterioros y reclasificaciones',
      resumen: 'Clientes dudosos y deudas que vencen el año que viene.',
      piezas: [
        {
          tipo: 'html',
          html: '<p><strong>Deterioro de clientes.</strong> Las deudas de dudoso cobro (436) se deterioran al cierre: 694 a 490 (lo viste en el Bloque 2). Fiscalmente, en general, deben haber pasado 6 meses desde el vencimiento.</p><p><strong>Reclasificación.</strong> El balance separa lo que vence en los 12 meses siguientes (corto plazo) de lo que vence después (largo plazo). Al cierre, la parte de las deudas a largo plazo que vence el año siguiente se traspasa a corto:</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['Deuda', 'Largo plazo', 'Corto plazo'],
          filas: [
            ['Préstamo bancario', '170', '520'],
            ['Proveedor de inmovilizado', '173', '523'],
            ['Leasing', '174', '524'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Préstamo: 5.140,43 € de capital vencen en 2027',
          lineas: [{ cuenta: '170', debe: 5140.43 }, { cuenta: '520', haber: 5140.43 }],
          nota: 'El importe sale del cuadro de amortización: la suma del capital de las cuotas del año siguiente.',
        },
      ],
    },
    {
      id: 'sociedades',
      titulo: 'El Impuesto sobre Sociedades',
      resumen: 'Del resultado contable a la cuota a pagar.',
      piezas: [
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Resultado contable antes de impuestos', texto: 'Ingresos − gastos del año, una vez hechos todos los ajustes de cierre.' },
            { titulo: 'Ajustes fiscales', texto: 'Se suman los gastos no deducibles: multas y sanciones, recargos, donativos, el propio gasto por impuesto. Hay otros ajustes, pero estos son los más habituales.' },
            { titulo: 'Base imponible', texto: 'Si hay bases negativas de años anteriores, se pueden compensar.' },
            { titulo: 'Cuota íntegra', texto: 'Base imponible × tipo de gravamen. Menos deducciones y bonificaciones, si las hay.' },
            { titulo: 'Cuota diferencial', texto: 'Se restan las retenciones y los pagos fraccionados (modelo 202) del año: es lo que queda por pagar (o por devolver).' },
          ],
        },
        {
          tipo: 'tabla',
          titulo: 'Tipos de gravamen para periodos iniciados en 2026',
          columnas: ['Entidad', 'Tipo'],
          filas: [
            ['Tipo general', '25 %'],
            ['Microempresa (cifra de negocios del año anterior inferior a 1 millón)', '19 % los primeros 50.000 € de base; 21 % el resto'],
            ['Empresa de reducida dimensión (inferior a 10 millones)', '23 %'],
            ['Entidad de nueva creación (dos primeros años con base positiva)', '15 %'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Cuota de 7.904 €, con 2.500 € de retenciones y pagos fraccionados',
          lineas: [{ cuenta: '6300', debe: 7904 }, { cuenta: '473', haber: 2500 }, { cuenta: '4752', haber: 5404 }],
          nota: '6300 Impuesto corriente es el gasto del año. Se cancelan los pagos a cuenta (473) y lo que queda es la deuda con Hacienda (4752), que se paga con el modelo 200 en julio.',
        },
        {
          tipo: 'gestoria',
          html: 'Las sociedades patrimoniales (más de la mitad del activo sin afectar a una actividad) <strong>no aplican los tipos reducidos</strong> de micro y pequeña empresa. Comprueba cada año la cifra de negocios y la actividad real del cliente antes de elegir el tipo.',
        },
      ],
    },
    {
      id: 'regularizacion',
      titulo: 'Regularización y aplicación del resultado',
      resumen: 'De los grupos 6 y 7 a la 129, y de la 129 a reservas o dividendos.',
      piezas: [
        {
          tipo: 'html',
          html: '<p><strong>Regularización.</strong> Ya registrado el impuesto, se cancelan todas las cuentas de gastos (grupo 6) e ingresos (grupo 7) contra la <strong>129 Resultado del ejercicio</strong>. Su saldo acreedor es el beneficio; el deudor, la pérdida. Los programas contables lo hacen con un botón, pero tienes que saber leerlo.</p>',
        },
        {
          tipo: 'asiento',
          titulo: 'Regularización con 412.000 € de ingresos y 378.904 € de gastos',
          lineas: [{ cuenta: '7xx', debe: 412000 }, { cuenta: '6xx', haber: 378904 }, { cuenta: '129', haber: 33096 }],
          nota: 'En la práctica hay una línea por cada cuenta de gasto e ingreso. El beneficio, 33.096 €, queda en la 129.',
        },
        {
          tipo: 'html',
          html: '<p><strong>Aplicación del resultado.</strong> Al año siguiente, la junta decide el destino del beneficio. Antes de repartir dividendos, la sociedad debe dotar la <strong>reserva legal</strong> con el 10 % del beneficio hasta que alcance el 20 % del capital. Las pérdidas se llevan a la 121 Resultados negativos de ejercicios anteriores.</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['Destino', 'Cuenta (al Haber)'],
          filas: [
            ['Reserva legal', '112 Reserva legal'],
            ['Reservas voluntarias', '113 Reservas voluntarias'],
            ['Dividendos acordados pendientes de pago', '526 Dividendo activo a pagar'],
            ['Pérdidas (se cargan, no se abonan)', '121 Resultados negativos de ejercicios anteriores'],
          ],
        },
      ],
    },
  ],

  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  test: [
    /* --- Plazos --- */
    {
      id: 'b5-q01',
      pregunta: 'En una sociedad con ejercicio natural, ¿hasta cuándo tienen los administradores para formular las cuentas anuales?',
      correcta: 'Hasta el 31 de marzo: 3 meses desde el cierre',
      incorrectas: ['Hasta el 30 de junio', 'Hasta el 25 de julio'],
      explicacion: 'Los administradores formulan las cuentas en los 3 meses siguientes al cierre. La junta las aprueba en los 6 meses siguientes.',
    },
    {
      id: 'b5-q02',
      pregunta: '¿Hasta cuándo debe la junta aprobar las cuentas del ejercicio 2026?',
      correcta: 'Hasta el 30 de junio de 2027',
      incorrectas: ['Hasta el 31 de enero de 2027', 'No hay plazo'],
      explicacion: 'La junta ordinaria se celebra en los 6 primeros meses del ejercicio siguiente para aprobar las cuentas y la aplicación del resultado.',
    },
    {
      id: 'b5-q03',
      pregunta: 'Una vez aprobadas, ¿en qué plazo se depositan las cuentas en el Registro Mercantil?',
      correcta: 'En el mes siguiente a su aprobación',
      incorrectas: ['En el mismo día de la junta', 'En los 6 meses siguientes a la aprobación'],
      explicacion: 'El depósito se hace en el mes siguiente a la aprobación. No depositarlas puede suponer el cierre registral y sanciones.',
    },
    {
      id: 'b5-q04',
      pregunta: '¿Cuándo se presenta el modelo 200 de una sociedad con ejercicio natural?',
      correcta: 'En julio: en los 25 días naturales siguientes a los 6 meses posteriores al cierre',
      incorrectas: ['En enero, con los resúmenes anuales', 'En abril, con el primer pago fraccionado'],
      explicacion: 'Para un ejercicio que acaba el 31 de diciembre, el plazo va del 1 al 25 de julio (o el siguiente día hábil).',
    },

    /* --- Amortización --- */
    {
      id: 'b5-q05',
      pregunta: '¿Qué asiento registra la amortización anual de una máquina?',
      correcta: '681 Amortización del inmovilizado material al Debe; 281 al Haber',
      incorrectas: ['213 Maquinaria al Debe; 681 al Haber', '681 al Debe; 213 Maquinaria al Haber'],
      explicacion: 'La dotación es un gasto (681) y se acumula en la 281, que resta del valor del bien en el balance. La cuenta 213 no se toca: sigue reflejando el coste.',
    },
    {
      id: 'b5-q06',
      pregunta: 'Un ordenador de 1.200 € se usa todo el año y se amortiza al 25 %. ¿Cuál es la dotación anual?',
      correcta: '300 €',
      incorrectas: ['120 €', '1.200 €'],
      explicacion: '1.200 × 25 % = 300 € al año. Tardará 4 años en quedar totalmente amortizado.',
    },
    {
      id: 'b5-q07',
      pregunta: 'Una furgoneta de 24.000 €, amortizada al 16 %, empieza a usarse el 1 de abril. ¿Cuánto se amortiza ese primer año?',
      correcta: '2.880 €',
      incorrectas: ['3.840 €', '960 €'],
      explicacion: 'El primer año solo cuentan los meses de uso: 24.000 × 16 % × 9/12 = 2.880 €.',
    },
    {
      id: 'b5-q08',
      pregunta: '¿Cuál es el coeficiente máximo de la tabla oficial para los equipos informáticos?',
      correcta: '25 %',
      incorrectas: ['10 %', '50 %'],
      explicacion: 'Los equipos para procesos de información tienen un coeficiente máximo del 25 % (periodo máximo de 8 años). Los programas informáticos, el 33 %.',
    },
    {
      id: 'b5-q09',
      pregunta: '¿Cuál es el coeficiente máximo de la tabla oficial para el mobiliario de oficina?',
      correcta: '10 %',
      incorrectas: ['25 %', '2 %'],
      explicacion: 'El mobiliario se amortiza como máximo al 10 % anual. El 2 % es el de los edificios comerciales.',
    },
    {
      id: 'b5-q10',
      pregunta: '¿Qué saldo tiene la cuenta 281 y cómo aparece en el balance?',
      correcta: 'Acreedor, restando del inmovilizado material en el activo',
      incorrectas: ['Deudor, sumando al inmovilizado', 'Acreedor, como una deuda en el pasivo'],
      explicacion: 'La amortización acumulada es una corrección de valor del activo: el balance muestra el coste menos lo ya amortizado.',
    },
    {
      id: 'b5-q11',
      pregunta: 'Una máquina se compra en octubre y empieza a funcionar en noviembre. ¿Desde cuándo se amortiza?',
      correcta: 'Desde noviembre, cuando está en condiciones de funcionamiento',
      incorrectas: ['Desde octubre, cuando se compra', 'Desde el año siguiente'],
      explicacion: 'La amortización empieza cuando el bien está listo para usarse, no cuando se compra ni cuando se paga.',
    },
    {
      id: 'b5-q12',
      pregunta: 'Un cliente compra un local con su terreno. ¿Qué parte no se amortiza?',
      correcta: 'El valor del terreno',
      incorrectas: ['El valor de la construcción', 'Ninguna: se amortiza todo'],
      explicacion: 'Los terrenos no se deprecian por el uso, así que no se amortizan. Hay que separar en la escritura (o con el valor catastral) qué parte es suelo y qué parte es construcción.',
    },
    {
      id: 'b5-q13',
      pregunta: '¿Qué permite la ley con los elementos nuevos del inmovilizado de hasta 300 €?',
      correcta: 'Amortizarlos libremente, con un límite de 25.000 € al año',
      incorrectas: ['Llevarlos siempre a existencias', 'Nada especial: se amortizan como los demás'],
      explicacion: 'Los elementos nuevos de escaso valor (hasta 300 € por unidad) pueden amortizarse en el mismo año, hasta 25.000 € anuales.',
    },

    /* --- Periodificaciones --- */
    {
      id: 'b5-q14',
      pregunta: 'El 1 de octubre se paga un seguro anual de 1.200 €. ¿Cuánto hay que periodificar a 31 de diciembre?',
      correcta: '900 €, los 9 meses del año siguiente',
      incorrectas: ['300 €, los 3 meses del año actual', 'Nada: el seguro ya está pagado'],
      explicacion: 'De octubre a diciembre corresponden 300 € a este año. Los 900 € restantes son gasto del año siguiente.',
    },
    {
      id: 'b5-q15',
      pregunta: '¿Qué asiento haces a 31/12 para periodificar esos 900 € de seguro?',
      correcta: '480 Gastos anticipados al Debe; 625 Primas de seguros al Haber',
      incorrectas: ['625 al Debe; 480 al Haber', '485 Ingresos anticipados al Debe; 625 al Haber'],
      explicacion: 'Se quita del gasto del año la parte que no le corresponde (625, Haber) y queda como activo en la 480 hasta el año siguiente.',
    },
    {
      id: 'b5-q16',
      pregunta: '¿Qué pasa con esa periodificación el 1 de enero siguiente?',
      correcta: 'Se revierte: 625 al Debe y 480 al Haber',
      incorrectas: ['Se deja en la 480 hasta que venza la póliza', 'Se lleva a la 129'],
      explicacion: 'El 1 de enero esos 900 € pasan a ser gasto del nuevo año, que es al que corresponden.',
    },
    {
      id: 'b5-q17',
      pregunta: 'Un cliente cobró en diciembre el alquiler de enero de un local que tiene arrendado. ¿Qué haces al cierre?',
      correcta: 'Llevar ese ingreso a la 485 Ingresos anticipados',
      incorrectas: ['Dejarlo como ingreso del año', 'Llevarlo a la 480 Gastos anticipados'],
      explicacion: 'El ingreso corresponde a enero: se quita del año (752, Debe) y queda como 485 hasta el 1 de enero.',
    },
    {
      id: 'b5-q18',
      pregunta: 'A 31/12 aún no ha llegado la factura de la luz de diciembre, estimada en 350 €. ¿Qué haces?',
      correcta: 'Registrar el gasto: 628 al Debe y 4109 Facturas pendientes de recibir al Haber',
      incorrectas: ['Nada: se registrará cuando llegue la factura', 'Registrarlo con IVA en la 472'],
      explicacion: 'El gasto es de diciembre aunque la factura llegue en enero. El IVA no se registra hasta tener la factura.',
    },
    {
      id: 'b5-q19',
      pregunta: 'Al cierre, hay intereses de un préstamo devengados en diciembre que se pagarán con la cuota de enero. ¿Qué cuenta recoge esa deuda?',
      correcta: '527 Intereses a corto plazo de deudas con entidades de crédito',
      incorrectas: ['170 Deudas a largo plazo con entidades de crédito', '480 Gastos anticipados'],
      explicacion: 'Se registra el gasto (662) contra la 527. Así diciembre soporta sus intereses aunque se paguen en enero.',
    },
    {
      id: 'b5-q20',
      pregunta: '¿Qué dice el principio de devengo?',
      correcta: 'Que gastos e ingresos se imputan al año al que corresponden, se paguen o cobren cuando sea',
      incorrectas: ['Que solo se registran los gastos ya pagados', 'Que los gastos se registran cuando llega la factura'],
      explicacion: 'Es la base de todas las periodificaciones: lo que importa es cuándo se produce el gasto o el ingreso, no cuándo se mueve el dinero.',
    },

    /* --- Existencias --- */
    {
      id: 'b5-q21',
      pregunta: '¿Qué cuenta recoge la diferencia entre el inventario inicial y el final de mercaderías?',
      correcta: '610 Variación de existencias de mercaderías',
      incorrectas: ['600 Compras de mercaderías', '708 Devoluciones de ventas'],
      explicacion: 'La 610 corrige el coste de las compras del año según cómo haya cambiado el almacén.',
    },
    {
      id: 'b5-q22',
      pregunta: 'Existencias iniciales 8.500 € y finales 11.200 €. ¿Qué asiento neto haces?',
      correcta: '300 Mercaderías al Debe y 610 al Haber por 2.700 €',
      incorrectas: ['610 al Debe y 300 al Haber por 2.700 €', '300 al Debe y 600 al Haber por 11.200 €'],
      explicacion: 'Las existencias aumentan 2.700 €: sube la 300 y la 610 queda con saldo acreedor, reduciendo el coste de las ventas del año.',
    },
    {
      id: 'b5-q23',
      pregunta: 'Si las existencias finales son mayores que las iniciales, ¿qué efecto tiene en el resultado del año?',
      correcta: 'Lo mejora: parte de lo comprado sigue en el almacén y no es gasto',
      incorrectas: ['Lo empeora', 'No le afecta'],
      explicacion: 'Lo que queda en el almacén se traslada al año siguiente. Por eso un inventario inflado infla el beneficio.',
    },
    {
      id: 'b5-q24',
      pregunta: '¿Cómo se valora el inventario final de un comercio?',
      correcta: 'A precio de coste (de compra), no de venta',
      incorrectas: ['A precio de venta al público', 'A lo que el cliente estime'],
      explicacion: 'Las existencias se valoran a coste. Valorarlas a precio de venta adelantaría un beneficio que aún no se ha producido.',
    },

    /* --- Deterioros y reclasificaciones --- */
    {
      id: 'b5-q25',
      pregunta: 'Del préstamo a largo plazo de un cliente vencen 5.140,43 € de capital el año que viene. ¿Qué asiento haces al cierre?',
      correcta: '170 al Debe; 520 al Haber por 5.140,43 €',
      incorrectas: ['520 al Debe; 170 al Haber', '662 al Debe; 520 al Haber'],
      explicacion: 'La parte que vence en los 12 meses siguientes pasa de largo plazo (170) a corto plazo (520).',
    },
    {
      id: 'b5-q26',
      pregunta: 'Una deuda con un proveedor de inmovilizado que estaba a largo plazo vencerá el año próximo. ¿Qué asiento haces?',
      correcta: '173 al Debe; 523 al Haber',
      incorrectas: ['523 al Debe; 173 al Haber', '400 al Debe; 173 al Haber'],
      explicacion: 'Igual que con los préstamos: la deuda pasa de la 173 (largo plazo) a la 523 (corto plazo).',
    },
    {
      id: 'b5-q27',
      pregunta: 'En general, ¿cuánto tiempo debe haber pasado desde el vencimiento para que el deterioro de un cliente sea deducible?',
      correcta: '6 meses',
      incorrectas: ['1 mes', '3 años'],
      explicacion: 'La ley del Impuesto sobre Sociedades exige, entre otras causas, que hayan pasado 6 meses desde el vencimiento de la deuda.',
    },
    {
      id: 'b5-q28',
      pregunta: 'Las cuotas de leasing que vencen el año próximo, ¿cómo se reclasifican?',
      correcta: 'De la 174 a la 524',
      incorrectas: ['De la 524 a la 174', 'De la 621 a la 524'],
      explicacion: 'La 174 recoge la deuda del leasing a largo plazo y la 524 la de corto plazo.',
    },

    /* --- Impuesto sobre Sociedades --- */
    {
      id: 'b5-q29',
      pregunta: '¿Cuál es el tipo general del Impuesto sobre Sociedades en 2026?',
      correcta: '25 %',
      incorrectas: ['21 %', '30 %'],
      explicacion: 'El tipo general es el 25 %. Las micro, pequeñas y nuevas empresas pueden tener tipos reducidos.',
    },
    {
      id: 'b5-q30',
      pregunta: 'Una microempresa (cifra de negocios del año anterior inferior a 1 millón), ¿qué tipos aplica en 2026?',
      correcta: '19 % los primeros 50.000 € de base y 21 % el resto',
      incorrectas: ['15 % sobre toda la base', '25 % sobre toda la base'],
      explicacion: 'La reforma de la Ley 7/2024 establece para 2026 una escala del 19 % y el 21 % para las microempresas, que seguirá bajando en los años siguientes.',
    },
    {
      id: 'b5-q31',
      pregunta: '¿Qué tipo aplica en 2026 una empresa de reducida dimensión con 4 millones de cifra de negocios?',
      correcta: '23 %',
      incorrectas: ['25 %', '19 %'],
      explicacion: 'Las empresas de reducida dimensión (menos de 10 millones) que no son microempresas tributan al 23 % en 2026.',
    },
    {
      id: 'b5-q32',
      pregunta: 'Entre los gastos del año hay una multa de tráfico de 600 €. ¿Qué haces al calcular el impuesto?',
      correcta: 'Sumarla al resultado contable: no es un gasto deducible',
      incorrectas: ['Restarla del resultado contable', 'Nada: ya está en los gastos'],
      explicacion: 'Las multas y sanciones no son deducibles. Se registran como gasto en contabilidad, pero se suman al calcular la base imponible.',
    },
    {
      id: 'b5-q33',
      pregunta: '¿Qué es la cuota diferencial del Impuesto sobre Sociedades?',
      correcta: 'La cuota menos las retenciones y los pagos fraccionados del año',
      incorrectas: ['La base imponible menos el resultado contable', 'La diferencia entre el tipo general y el reducido'],
      explicacion: 'Es lo que queda por pagar (o por devolver) en el modelo 200 después de descontar lo adelantado durante el año.',
    },
    {
      id: 'b5-q34',
      pregunta: 'Cuota de 7.904 € y 2.500 € de retenciones y pagos fraccionados. ¿Qué asiento haces?',
      correcta: '6300 por 7.904 al Debe; 473 por 2.500 y 4752 por 5.404 al Haber',
      incorrectas: ['6300 por 5.404 al Debe; 4752 por 5.404 al Haber', '4752 por 7.904 al Debe; 6300 por 7.904 al Haber'],
      explicacion: 'El gasto por impuesto es la cuota completa (6300). Se cancelan los pagos a cuenta (473) y la diferencia es la deuda con Hacienda (4752).',
    },
    {
      id: 'b5-q35',
      pregunta: '¿Con qué modelo se hacen los pagos fraccionados del Impuesto sobre Sociedades y cuándo?',
      correcta: 'Con el modelo 202, en abril, octubre y diciembre',
      incorrectas: ['Con el modelo 200, cada trimestre', 'Con el modelo 303, junto al IVA'],
      explicacion: 'Los pagos fraccionados (modelo 202) se presentan del 1 al 20 de abril, octubre y diciembre, y se descuentan en el modelo 200.',
    },
    {
      id: 'b5-q36',
      pregunta: 'Una sociedad recién creada obtiene beneficio por primera vez. ¿Qué tipo puede aplicar?',
      correcta: '15 % en el primer año con base positiva y en el siguiente',
      incorrectas: ['25 % desde el primer año', '0 % los dos primeros años'],
      explicacion: 'Las entidades de nueva creación que realizan una actividad económica tributan al 15 % en el primer periodo con base imponible positiva y en el siguiente.',
    },

    /* --- Regularización y aplicación del resultado --- */
    {
      id: 'b5-q37',
      pregunta: '¿Qué hace el asiento de regularización?',
      correcta: 'Cancela los grupos 6 y 7 contra la 129 para obtener el resultado',
      incorrectas: ['Cancela todas las cuentas del balance', 'Reparte el beneficio entre los socios'],
      explicacion: 'Tras la regularización, la 129 muestra el beneficio (saldo acreedor) o la pérdida (saldo deudor) del año.',
    },
    {
      id: 'b5-q38',
      pregunta: '¿Cuánto debe destinar una sociedad a reserva legal?',
      correcta: 'El 10 % del beneficio, hasta que la reserva alcance el 20 % del capital',
      incorrectas: ['El 20 % del beneficio, siempre', 'Lo que decida la junta, sin mínimo'],
      explicacion: 'Mientras la reserva legal no llegue al 20 % del capital social, hay que destinarle al menos el 10 % del beneficio.',
    },
    {
      id: 'b5-q39',
      pregunta: 'La junta acuerda repartir 15.000 € de dividendos que se pagarán más adelante. ¿Qué cuenta se abona?',
      correcta: '526 Dividendo activo a pagar',
      incorrectas: ['113 Reservas voluntarias', '551 Cuenta corriente con socios y administradores'],
      explicacion: 'El dividendo acordado es una deuda con los socios hasta que se paga. Además, al pagarlo hay que practicar la retención correspondiente.',
    },
    {
      id: 'b5-q40',
      pregunta: 'El ejercicio se cierra con pérdidas. ¿Adónde se llevan al aplicar el resultado?',
      correcta: '121 Resultados negativos de ejercicios anteriores',
      incorrectas: ['113 Reservas voluntarias, como un abono', '650 Pérdidas de créditos comerciales incobrables'],
      explicacion: 'Las pérdidas se cargan a la 121 y se compensarán con beneficios futuros. Fiscalmente, son bases imponibles negativas que podrán compensarse.',
    },
  ],

  casos: [
    {
      id: 'b5-amort-calculo',
      tipo: 'calculo',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Calcula la amortización del año',
      enunciado: 'Prepara la dotación a la amortización de 2026 a partir de la ficha de inmovilizado de la panadería.',
      documento: FICHA_INMOVILIZADO_HORNO,
      preguntas: [
        { id: 'amasadora', texto: 'Amortización de 2026 de la amasadora', respuesta: 720, unidad: '€', pista: 'Lleva todo el año en uso: coste × coeficiente.', explicacion: '6.000 × 12 % = 720 €.' },
        { id: 'horno', texto: 'Amortización de 2026 del horno', respuesta: 96, unidad: '€', pista: 'Solo cuentan los meses en uso desde noviembre.', explicacion: '4.800 × 12 % × 2/12 = 96 €.' },
        { id: 'total', texto: 'Dotación total del ejercicio', respuesta: 816, unidad: '€', pista: 'Suma las dos.', explicacion: '720 + 96 = 816 €.' },
      ],
      resumenOk: 'Con la dotación calculada, el siguiente paso es registrarla. El horno solo se amortiza desde que funciona, aunque se comprara en octubre.',
    },
    {
      id: 'b5-amort-asiento',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Registra la amortización',
      enunciado: 'Registra la dotación a la amortización de 2026 que calculaste en el caso anterior.',
      documento: FICHA_INMOVILIZADO_HORNO,
      cuentasDisponibles: ['681', '680', '281', '280', '213', '622', '129'],
      solucion: [{ cuenta: '681', debe: 816 }, { cuenta: '281', haber: 816 }],
      pista: 'Las máquinas son inmovilizado material. La cuenta 213 no se toca.',
      explicacion: 'Gasto por amortización del inmovilizado material (681, 816 €) contra la amortización acumulada (281). La 213 sigue mostrando el coste; el balance restará la 281.',
    },
    {
      id: 'b5-seguro',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Periodificar el seguro',
      enunciado: 'El 1 de octubre la tienda pagó el seguro anual y se registró entero en la 625. Haz el ajuste de periodificación a 31/12/2026.',
      documento: {
        tipo: 'factura',
        titulo: 'RECIBO DE PRIMA',
        color: '#0e7490',
        exento: true,
        emisor: { nombre: 'Seguros Mediterráneo Mutua', nif: 'V46000111', direccion: ['Av. de Francia, 10 · 46023 Valencia'] },
        receptor: { nombre: 'Moda Valentina, S.L.', nif: 'B98765432', direccion: ['Av. del Puerto, 112 · 46023 Valencia'] },
        numero: 'P-778812/26',
        fecha: '01/10/2026',
        formaPago: 'Domiciliado el 01/10/2026',
        menciones: ['Póliza multirriesgo comercio. Periodo de cobertura: 01/10/2026 a 30/09/2027.', 'Operación exenta de IVA.'],
        lineas: [
          { concepto: 'Prima anual (impuestos sobre primas incluidos)', cantidad: 1, precio: 1200, iva: 0 },
        ],
      },
      cuentasDisponibles: ['480', '485', '625', '572', '129', '4109'],
      solucion: [{ cuenta: '480', debe: 900 }, { cuenta: '625', haber: 900 }],
      pista: 'Cuenta cuántos meses de cobertura caen en 2027 y quita esa parte del gasto de 2026.',
      explicacion: 'De la cobertura, 9 meses (enero a septiembre) son de 2027: 1.200 × 9/12 = 900 €. Se quitan del gasto (625 al Haber) y quedan como gasto anticipado (480). El 1/1/2027 se revierte.',
    },
    {
      id: 'b5-existencias',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Variación de existencias',
      enunciado: 'La clienta te ha enviado el inventario firmado a 31/12/2026. Registra la variación de existencias (puedes hacerlo en forma completa o neta).',
      documento: {
        tipo: 'resumen',
        titulo: 'Recuento de existencias a 31/12/2026',
        subtitulo: 'Valorado a precio de coste · firmado por la administradora',
        emisor: { nombre: 'Moda Valentina, S.L.', nif: 'B98765432' },
        columnas: ['Familia', 'Uds.', 'Coste', 'Importe'],
        filas: [
          ['Pantalones', '120', '35,00', '4.200,00'],
          ['Camisetas', '200', '12,00', '2.400,00'],
          ['Abrigos', '40', '70,00', '2.800,00'],
          ['Complementos (varios)', '—', '—', '1.800,00'],
          ['Total final', '', '', '11.200,00'],
        ],
        notas: ['Existencias iniciales según el balance de 31/12/2025 (cuenta 300): 8.500,00 €.'],
      },
      cuentasDisponibles: ['300', '600', '610', '700', '129', '572'],
      solucion: [{ cuenta: '300', debe: 2700 }, { cuenta: '610', haber: 2700 }],
      alternativas: [[{ cuenta: '610', debe: 8500 }, { cuenta: '300', haber: 8500 }, { cuenta: '300', debe: 11200 }, { cuenta: '610', haber: 11200 }]],
      pista: 'Sustituye el inventario inicial (8.500 €) por el final. ¿Aumentan o disminuyen las existencias?',
      explicacion: 'Las existencias aumentan de 8.500 € a 11.200 €: la 300 sube 2.700 € (Debe) y la 610 queda con saldo acreedor, reduciendo el coste de las compras. En forma completa: 610 a 300 por 8.500 € y 300 a 610 por 11.200 €.',
    },
    {
      id: 'b5-reclasificacion',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Reclasificar el préstamo',
      enunciado: 'El préstamo del horno (el del Bloque 3) está todo en la 170 salvo las cuotas de 2026, ya pagadas. Con el resumen del cuadro de amortización, haz la reclasificación a 31/12/2026.',
      documento: {
        tipo: 'resumen',
        titulo: 'Préstamo 0099-123456 · situación a 31/12/2026',
        subtitulo: 'Según el cuadro de amortización del banco · cuota mensual de 500 €',
        emisor: { nombre: 'Horno San Blas, S.L.', nif: 'B98221133' },
        columnas: ['Concepto', 'Importe'],
        filas: [
          ['Capital inicial (60 cuotas)', '25.797,58 €'],
          ['Capital pendiente a 31/12/2026', '16.409,83 €'],
          ['Capital de las cuotas de 2027 (25 a 36)', '5.140,43 €'],
          ['Capital de las cuotas posteriores a 2027', '11.269,40 €'],
          ['Saldo actual de la cuenta 520', '0,00 €'],
        ],
      },
      cuentasDisponibles: ['170', '520', '662', '572', '524', '174'],
      solucion: [{ cuenta: '170', debe: 5140.43 }, { cuenta: '520', haber: 5140.43 }],
      pista: 'Solo se reclasifica lo que vence en los 12 meses siguientes. Los intereses futuros no son deuda todavía.',
      explicacion: 'Se pasa a corto plazo el capital que vence en 2027: 170 al Debe y 520 al Haber por 5.140,43 €. En la 170 quedan 11.269,40 €, lo que vence después. Los intereses de 2027 se registrarán cuando se devenguen.',
    },
    {
      id: 'b5-is-calculo',
      tipo: 'calculo',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Calcula el Impuesto sobre Sociedades',
      enunciado: 'Con todos los ajustes de cierre hechos, calcula el impuesto de 2026 del distribuidor. Es una microempresa y no tiene bases negativas pendientes.',
      documento: PYG_LEVANTE_2026,
      preguntas: [
        { id: 'base', texto: 'Base imponible', respuesta: 41600, unidad: '€', pista: 'Al resultado contable hay que sumarle los gastos que no son deducibles.', explicacion: '41.000 + 600 de la multa = 41.600 €.' },
        { id: 'cuota', texto: 'Cuota íntegra', respuesta: 7904, unidad: '€', pista: 'Microempresa: la base no supera 50.000 €, así que toda va al primer tramo.', explicacion: '41.600 × 19 % = 7.904 €.' },
        { id: 'pagar', texto: 'Cuota diferencial (a pagar en el modelo 200)', respuesta: 5404, unidad: '€', pista: 'Descuenta lo que ya se adelantó durante el año.', explicacion: '7.904 − 2.500 = 5.404 €.' },
      ],
      resumenOk: 'Fíjate en el orden: resultado contable, ajustes, base, tipo y pagos a cuenta. En el siguiente caso registras el asiento.',
    },
    {
      id: 'b5-is-asiento',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Registra el impuesto',
      enunciado: 'Registra el gasto por Impuesto sobre Sociedades de 2026 que calculaste en el caso anterior.',
      documento: PYG_LEVANTE_2026,
      cuentasDisponibles: ['6300', '473', '4752', '4751', '129', '572', '4750'],
      solucion: [{ cuenta: '6300', debe: 7904 }, { cuenta: '473', haber: 2500 }, { cuenta: '4752', haber: 5404 }],
      pista: 'El gasto es la cuota completa. Lo adelantado durante el año se cancela y el resto es una deuda con Hacienda.',
      explicacion: 'Gasto por impuesto corriente (6300) por la cuota de 7.904 €. Se cancelan las retenciones y pagos fraccionados (473, 2.500 €) y queda una deuda de 5.404 € con Hacienda (4752), que se pagará en julio con el modelo 200.',
    },
    {
      id: 'b5-regularizacion',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Regulariza el ejercicio',
      enunciado: 'Ya registrado el impuesto, haz el asiento de regularización de 2026 de forma resumida: una línea para el total de ingresos (7xx), otra para el total de gastos (6xx) y el resultado.',
      documento: {
        tipo: 'resumen',
        titulo: 'Saldos de los grupos 6 y 7 a 31/12/2026',
        subtitulo: 'Después del asiento del impuesto',
        emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030' },
        columnas: ['Concepto', 'Importe'],
        filas: [
          ['Total ingresos (grupo 7) · saldo acreedor', '412.000,00 €'],
          ['Gastos de explotación y financieros · saldo deudor', '371.000,00 €'],
          ['Impuesto corriente (6300) · saldo deudor', '7.904,00 €'],
        ],
      },
      cuentasDisponibles: ['7xx', '6xx', '129', '112', '113', '121'],
      solucion: [{ cuenta: '7xx', debe: 412000 }, { cuenta: '6xx', haber: 378904 }, { cuenta: '129', haber: 33096 }],
      pista: 'Para dejar a cero los ingresos (saldo acreedor) se cargan; los gastos (saldo deudor) se abonan. La diferencia va a la 129.',
      explicacion: 'Se cargan los ingresos (412.000 €) y se abonan todos los gastos, impuesto incluido (371.000 + 7.904 = 378.904 €). La diferencia, 33.096 €, es el beneficio: queda con saldo acreedor en la 129.',
    },
    {
      id: 'b5-aplicacion',
      tipo: 'asiento',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Aplica el resultado',
      enunciado: 'En junio de 2027, la junta aprueba las cuentas y el destino del beneficio de 2026. Registra la aplicación del resultado.',
      documento: {
        tipo: 'resumen',
        titulo: 'Acuerdo de la junta general · aplicación del resultado de 2026',
        subtitulo: 'Junta ordinaria de 15/06/2027',
        emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030' },
        columnas: ['Dato', 'Importe'],
        filas: [
          ['Beneficio del ejercicio 2026 (cuenta 129)', '33.096,00 €'],
          ['Capital social', '6.000,00 €'],
          ['Reserva legal dotada hasta ahora', '800,00 €'],
        ],
        notas: [
          'Acuerdo 1: dotar a reserva legal el importe necesario según la ley (10 % del beneficio, sin superar el 20 % del capital).',
          'Acuerdo 2: repartir un dividendo de 15.000,00 €, que se pagará en julio.',
          'Acuerdo 3: destinar el resto a reservas voluntarias.',
        ],
      },
      cuentasDisponibles: ['129', '112', '113', '121', '526', '572', '551'],
      solucion: [{ cuenta: '129', debe: 33096 }, { cuenta: '112', haber: 400 }, { cuenta: '526', haber: 15000 }, { cuenta: '113', haber: 17696 }],
      pista: 'El 10 % del beneficio sería 3.309,60 €, pero la reserva legal solo tiene que llegar al 20 % del capital. ¿Cuánto le falta?',
      explicacion: 'El 20 % del capital son 1.200 € y ya hay 800 €: a reserva legal solo van 400 €. Dividendo pendiente de pago, 15.000 € (526). El resto, 33.096 − 400 − 15.000 = 17.696 €, a reservas voluntarias (113). La 129 queda a cero.',
    },
    {
      id: 'b5-ajustes',
      tipo: 'clasificar',
      titulo: '¿Qué ajuste de cierre corresponde?',
      enunciado: 'Repasas la lista de cierre de varios clientes. Indica qué tipo de ajuste necesita cada situación.',
      rejilla: 'grid-cols-2 sm:grid-cols-3',
      opciones: [
        { valor: 'amortizar', etiqueta: 'Amortizar' },
        { valor: 'periodificar', etiqueta: 'Periodificar' },
        { valor: 'existencias', etiqueta: 'Existencias' },
        { valor: 'reclasificar', etiqueta: 'Reclasificar' },
        { valor: 'deterioro', etiqueta: 'Deterioro', ancho: true },
      ],
      cuentas: [
        { id: 'ordenador', texto: 'Un ordenador comprado en marzo que se usa desde entonces', correcta: 'amortizar', pista: 'Bien de inversión en uso.', explicacion: 'Dotación por los meses de uso (681/281).' },
        { id: 'seguro', texto: 'Una póliza anual pagada en noviembre', correcta: 'periodificar', pista: 'Una parte del gasto es del año siguiente.', explicacion: 'Gasto anticipado (480).' },
        { id: 'alquiler', texto: 'El alquiler de enero de un local arrendado a un tercero, cobrado en diciembre', correcta: 'periodificar', pista: 'Es un ingreso del año siguiente.', explicacion: 'Ingreso anticipado (485).' },
        { id: 'luz', texto: 'La factura de la luz de diciembre, que llegará en enero', correcta: 'periodificar', pista: 'Gasto de este año sin factura todavía.', explicacion: 'Gasto devengado pendiente de factura (4109).' },
        { id: 'inventario', texto: 'El inventario a 31/12 de una tienda', correcta: 'existencias', pista: 'Sustituye el inventario inicial.', explicacion: 'Variación de existencias (610).' },
        { id: 'prestamo', texto: 'Las cuotas del préstamo que se pagarán el año que viene', correcta: 'reclasificar', pista: 'Deuda que pasa a vencer en menos de un año.', explicacion: 'De la 170 a la 520.' },
        { id: 'moroso', texto: 'Una factura de un cliente vencida hace 8 meses y sin cobrar', correcta: 'deterioro', pista: 'Riesgo serio de no cobrar.', explicacion: 'Deterioro de créditos (694/490).' },
      ],
      resumenOk: 'Esta es la lista de comprobación del cierre de cualquier cliente. Repasarla siempre en el mismo orden evita olvidos.',
    },
  ],
};

/* ---------- Bloque 6: Revisión, Cuadres y Análisis (gestoría) ---------- */

const SUMAS_SALDOS_FLORISTERIA = {
  tipo: 'resumen',
  titulo: 'Balance de sumas y saldos (extracto) a 30/09/2026',
  subtitulo: 'Tras liquidar el 303 del 3T · revisión antes de cerrar el trimestre',
  emisor: { nombre: 'Floristería Azahar, S.L.', nif: 'B98334411' },
  columnas: ['Cuenta', 'Saldo'],
  filas: [
    ['100 Capital social', '6.000,00 A'],
    ['281 Amort. acum. inmovilizado material', '320,00 D'],
    ['40000012 Viveros del Turia, S.L. (proveedor)', '1.210,00 D'],
    ['43000007 Hotel Palmeras, S.A. (cliente)', '300,00 A'],
    ['472 IVA soportado', '1.845,60 D'],
    ['4751 Retenciones practicadas', '712,50 A'],
    ['476 Seguridad Social acreedora', '1.540,00 A'],
    ['555 Partidas pendientes de aplicación', '605,00 A'],
    ['570 Caja, euros', '85,00 A'],
    ['572 Bancos', '12.430,25 D'],
  ],
  notas: ['D = saldo deudor · A = saldo acreedor.', 'El 303 del 3T ya se ha liquidado: la 477 está a cero.', 'Las retenciones y los seguros sociales de septiembre se pagan en octubre.'],
};

const BALANCE_LEVANTE_2026 = {
  tipo: 'resumen',
  titulo: 'Balance de situación resumido a 31/12/2026',
  subtitulo: 'Después de la regularización',
  emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030' },
  columnas: ['Masa patrimonial', 'Importe'],
  filas: [
    ['Activo no corriente', '45.000,00 €'],
    ['Existencias', '25.000,00 €'],
    ['Clientes y otros deudores', '35.000,00 €'],
    ['Tesorería', '20.000,00 €'],
    ['TOTAL ACTIVO', '125.000,00 €'],
    ['Patrimonio neto', '52.000,00 €'],
    ['Pasivo no corriente', '28.000,00 €'],
    ['Pasivo corriente', '45.000,00 €'],
    ['TOTAL PATRIMONIO NETO Y PASIVO', '125.000,00 €'],
  ],
};

const PYG_LEVANTE_ANALISIS = {
  tipo: 'resumen',
  titulo: 'Cuenta de pérdidas y ganancias 2026',
  subtitulo: 'Formato resumido para el cliente',
  emisor: { nombre: 'Distribuciones Levante, S.L.', nif: 'B98102030' },
  columnas: ['Concepto', 'Importe'],
  filas: [
    ['Importe neto de la cifra de negocios', '412.000,00 €'],
    ['Aprovisionamientos', '−280.000,00 €'],
    ['Gastos de personal', '−52.000,00 €'],
    ['Otros gastos de explotación', '−26.500,00 €'],
    ['Amortización del inmovilizado', '−9.000,00 €'],
    ['Gastos financieros', '−3.500,00 €'],
    ['Impuesto sobre beneficios', '−7.904,00 €'],
  ],
};

const CONTENIDO_B6 = {
  teoria: [
    {
      id: 'autorrevision',
      titulo: 'Revisar tu trabajo antes que nadie',
      resumen: 'La rutina que te hace fiable.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>En una gestoría, el junior que más rápido crece no es el que nunca se equivoca, sino el que <strong>encuentra sus errores antes que su responsable o que Hacienda</strong>. Para eso no hace falta repasar asiento por asiento: basta con mirar los <strong>saldos</strong> con ojo crítico y cuadrarlos con los documentos externos.</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Sumas y saldos', texto: 'Recorre el balance de sumas y saldos buscando saldos imposibles o extraños.' },
            { titulo: 'Cuadres', texto: 'Comprueba cada cuenta clave contra su documento: banco, Seguridad Social, modelos, inventario.' },
            { titulo: 'Corregir', texto: 'Los errores se corrigen con asientos de rectificación, nunca borrando lo que ya se declaró.' },
            { titulo: 'Leer los números', texto: 'Antes de entregar, mira el balance y la cuenta de resultados como lo haría el cliente: ¿tiene sentido?' },
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Dedica <strong>diez minutos por cliente</strong> a esta revisión antes de presentar cada trimestre. Es el hábito que más errores evita y el que más confianza genera en tu responsable.',
        },
      ],
    },
    {
      id: 'sumas-saldos',
      titulo: 'El balance de sumas y saldos',
      resumen: 'Saldos que delatan un error.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>El balance de sumas y saldos lista todas las cuentas con lo acumulado en el Debe y el Haber y su saldo. Que <strong>cuadre</strong> (total Debe = total Haber) solo prueba que cada asiento está equilibrado: un gasto en la cuenta equivocada o una factura duplicada también cuadran. Lo que delata los errores es el <strong>sentido de los saldos</strong>.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Saldos que siempre hay que revisar',
          columnas: ['Saldo', 'Causa probable'],
          filas: [
            ['570 Caja con saldo acreedor', 'Imposible: pagos en efectivo registrados sin entrada de caja o cobros sin registrar'],
            ['572 Bancos con saldo acreedor', 'Error o descubierto: compáralo con el extracto (salvo póliza de crédito)'],
            ['Proveedor o acreedor (400/410) con saldo deudor', 'Pago duplicado, factura sin registrar o anticipo sin aplicar'],
            ['Cliente (430) con saldo acreedor', 'Cobro duplicado, abono sin aplicar o anticipo mal registrado'],
            ['281 Amortización acumulada con saldo deudor', 'Error: debe ser acreedor'],
            ['555 Partidas pendientes con saldo', 'Movimientos sin aplicar: aclarar antes del cierre del trimestre'],
            ['472 / 477 con saldo después de liquidar el 303', 'Liquidación sin registrar o factura fuera de su trimestre'],
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>Saldos normales que asustan:</strong> la 4751 y la 476 tienen saldo acreedor a fin de mes porque se pagan el mes siguiente. Lo raro sería que tuvieran saldo deudor, o que el saldo no coincidiera con el siguiente 111 o con el RLC.',
        },
      ],
    },
    {
      id: 'cuadres',
      titulo: 'Cuadres: cada cuenta con su documento',
      resumen: 'La contabilidad contrastada con el exterior.',
      piezas: [
        {
          tipo: 'tabla',
          columnas: ['Cuenta', 'Se cuadra con', 'Cuándo'],
          filas: [
            ['572 Bancos', 'El extracto bancario (conciliación)', 'Cada mes'],
            ['476 Seguridad Social', 'El recibo de liquidación de cotizaciones (RLC)', 'Cada mes'],
            ['465 Remuneraciones pendientes', 'Las transferencias de nóminas', 'Cada mes'],
            ['4751 Retenciones', 'Los modelos 111 y 115', 'Cada trimestre'],
            ['477 y 472', 'El modelo 303 y los libros registro', 'Cada trimestre'],
            ['430 y 400/410', 'Confirmaciones de saldos y modelo 347', 'Al cierre y en febrero'],
            ['281 y 21x', 'La ficha o cuadro de inmovilizado', 'Al cierre'],
            ['300 Mercaderías', 'El inventario firmado por el cliente', 'Al cierre'],
          ],
        },
        {
          tipo: 'gestoria',
          html: 'Guarda en la carpeta de cada cliente el <strong>justificante de cada cuadre</strong> (la conciliación, el RLC, el borrador del 303 con los saldos). Si un año después alguien pregunta, tendrás la respuesta en dos minutos.',
        },
      ],
    },
    {
      id: 'correcciones',
      titulo: 'Asientos de corrección',
      resumen: 'Corregir sin borrar.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Si el error está en un periodo <strong>ya declarado o cerrado</strong>, no se borra ni se modifica el asiento original: se hace un <strong>asiento de rectificación</strong> que lleva el importe a la cuenta correcta. Así queda rastro de qué pasó y cuándo. Si el error afectó al IVA o a las retenciones ya declarados, además hay que rectificar la autoliquidación del periodo.</p>',
        },
        {
          tipo: 'tabla',
          titulo: 'Errores típicos y su corrección',
          columnas: ['Error', 'Asiento de corrección'],
          filas: [
            ['Reparación registrada como inmovilizado (213)', '622 al Debe; 213 al Haber'],
            ['IVA no deducible registrado en la 472', 'Cuenta de gasto al Debe; 472 al Haber'],
            ['Factura registrada dos veces', 'Asiento inverso de la duplicada (contraasiento)'],
            ['Pago a un proveedor registrado contra la 430', '400 al Debe; 430 al Haber'],
          ],
        },
        {
          tipo: 'asiento',
          titulo: 'Reparación de 450 € registrada por error en la 213',
          lineas: [{ cuenta: '622', debe: 450 }, { cuenta: '213', haber: 450 }],
          nota: 'Si además se había amortizado ese importe, también habría que deshacer esa amortización.',
        },
      ],
    },
    {
      id: 'balance',
      titulo: 'Leer el balance',
      resumen: 'Qué tiene la empresa y cómo lo financia.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>El balance es una <strong>foto a una fecha</strong>: a la izquierda, lo que la empresa tiene (activo); a la derecha, cómo lo financia (patrimonio neto y pasivo). La primera pregunta de un cliente suele ser: <em>«¿voy bien de dinero?»</em>. Para contestarla, se compara el activo corriente (lo que se convertirá en dinero en menos de un año) con el pasivo corriente (lo que hay que pagar en menos de un año).</p>',
        },
        { tipo: 'documento', documento: BALANCE_LEVANTE_2026 },
        {
          tipo: 'tabla',
          titulo: 'Indicadores básicos',
          columnas: ['Indicador', 'Cálculo', 'Lectura orientativa'],
          filas: [
            ['Fondo de maniobra', 'Activo corriente − pasivo corriente', 'Positivo: margen para pagar a corto plazo'],
            ['Liquidez', 'Activo corriente / pasivo corriente', 'Por encima de 1, cómodo; por debajo, tensión'],
            ['Tesorería inmediata', 'Tesorería / pasivo corriente', 'Capacidad de pagar ya, sin cobrar a nadie'],
            ['Endeudamiento', 'Pasivo total / (patrimonio neto + pasivo)', 'Cuanto más alto, más depende de terceros'],
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>Cada sector es distinto.</strong> Un supermercado o un bar cobran al contado y pagan a 60 días: pueden funcionar bien con fondo de maniobra negativo. Una distribuidora que cobra a 90 días, no. Compara siempre con la propia empresa en años anteriores.',
        },
      ],
    },
    {
      id: 'pyg',
      titulo: 'Leer la cuenta de pérdidas y ganancias',
      resumen: 'De las ventas al beneficio, por escalones.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>La cuenta de pérdidas y ganancias es una <strong>película del año</strong>: ingresos y gastos ordenados en escalones. Cada escalón responde a una pregunta del cliente:</p>',
        },
        {
          tipo: 'tabla',
          columnas: ['Escalón', 'Qué responde'],
          filas: [
            ['Resultado de explotación', '¿Gana dinero el negocio en sí, antes de intereses e impuestos?'],
            ['Resultado financiero', '¿Cuánto le cuesta la financiación (intereses)?'],
            ['Resultado antes de impuestos', '¿Cuánto gana antes de pagar el Impuesto sobre Sociedades?'],
            ['Resultado del ejercicio', '¿Cuánto gana de verdad, después de todo?'],
          ],
        },
        { tipo: 'documento', documento: PYG_LEVANTE_ANALISIS },
        {
          tipo: 'tabla',
          titulo: 'Márgenes útiles',
          columnas: ['Indicador', 'Cálculo'],
          filas: [
            ['Margen bruto', '(Ventas − aprovisionamientos) / ventas'],
            ['EBITDA', 'Resultado de explotación + amortizaciones'],
            ['Margen neto', 'Resultado del ejercicio / ventas'],
            ['Periodo medio de cobro', 'Clientes / ventas × 365 días'],
          ],
        },
      ],
    },
    {
      id: 'explicar',
      titulo: 'Explicar los números a un cliente',
      resumen: 'Tres frases y una advertencia.',
      piezas: [
        {
          tipo: 'html',
          html: '<p>Un cliente no quiere oír «el ratio de liquidez es 1,78». Quiere saber si va bien, qué le preocupa y qué puede hacer. Prueba con esta estructura:</p>',
        },
        {
          tipo: 'pasos',
          pasos: [
            { titulo: 'Una frase sobre el resultado', texto: '«Este año has ganado 33.000 €, un 8 % de lo que has vendido».' },
            { titulo: 'Una frase sobre el dinero', texto: '«Lo que tienes y vas a cobrar este año cubre casi dos veces lo que debes pagar en ese plazo».' },
            { titulo: 'Una frase sobre lo que vigilar', texto: '«Tus clientes tardan más de un mes en pagarte: si eso crece, te faltará caja aunque ganes dinero».' },
          ],
        },
        {
          tipo: 'consejo',
          html: '<strong>Beneficio no es tesorería.</strong> Una empresa puede ganar dinero y no tener liquidez: ventas sin cobrar, existencias que se acumulan, inversiones pagadas o cuotas de préstamo (que no son gasto). Es una de las cosas que más cuesta entender a los clientes.',
        },
        {
          tipo: 'gestoria',
          html: '<strong>Alerta legal:</strong> si las pérdidas dejan el patrimonio neto por debajo de la mitad del capital social, la sociedad está en causa de disolución (salvo que se aumente o reduzca el capital, o se solicite el concurso). Si lo ves al revisar un balance, avisa a tu responsable de inmediato.',
        },
      ],
    },
  ],

  configTest: { preguntasPorIntento: 10, aprobado: 8 },

  test: [
    /* --- Sumas y saldos --- */
    {
      id: 'b6-q01',
      pregunta: '¿Qué garantiza que un balance de sumas y saldos cuadre (total Debe igual a total Haber)?',
      correcta: 'Solo que cada asiento está equilibrado; puede haber errores de cuenta o importes duplicados',
      incorrectas: ['Que la contabilidad no tiene ningún error', 'Que el saldo de bancos coincide con el extracto'],
      explicacion: 'Por la partida doble, el balance siempre cuadra aunque un gasto esté en la cuenta equivocada o una factura esté duplicada. Hay que revisar el sentido y la lógica de los saldos.',
    },
    {
      id: 'b6-q02',
      pregunta: 'En el balance de sumas y saldos, la cuenta 570 Caja tiene saldo acreedor. ¿Qué significa?',
      correcta: 'Que hay un error: no puede salir más efectivo del que ha entrado',
      incorrectas: ['Que la caja tiene mucho dinero', 'Que la empresa tiene un descubierto en la caja'],
      explicacion: 'Una caja física no puede tener saldo negativo. Suele deberse a pagos en efectivo registrados sin la entrada correspondiente o a cobros en efectivo sin registrar.',
    },
    {
      id: 'b6-q03',
      pregunta: 'Un proveedor (400) aparece con saldo deudor. ¿Qué compruebas?',
      correcta: 'Si hay un pago duplicado, una factura sin registrar o un anticipo sin aplicar',
      incorrectas: ['Nada: es lo normal en un proveedor', 'Si hay que darle de baja como proveedor'],
      explicacion: 'Lo normal es que los proveedores tengan saldo acreedor (se les debe). Un saldo deudor indica que se ha pagado más de lo registrado.',
    },
    {
      id: 'b6-q04',
      pregunta: 'Un cliente (430) aparece con saldo acreedor. ¿Cuál es la causa más probable?',
      correcta: 'Un cobro duplicado, un abono sin aplicar o un anticipo mal registrado',
      incorrectas: ['Que el cliente debe mucho dinero', 'Que la factura está exenta de IVA'],
      explicacion: 'Un cliente debería tener saldo deudor (nos debe). Si es acreedor, se ha registrado más cobrado que facturado.',
    },
    {
      id: 'b6-q05',
      pregunta: 'La 572 tiene saldo acreedor y el cliente no tiene póliza de crédito. ¿Qué haces?',
      correcta: 'Compararla con el extracto: puede ser un error de registro o un descubierto real',
      incorrectas: ['Nada: es normal a final de mes', 'Pasar el saldo a la 555'],
      explicacion: 'Una cuenta corriente normal no debería quedar en negativo. La conciliación dirá si es un error contable o si el banco realmente está en descubierto.',
    },
    {
      id: 'b6-q06',
      pregunta: 'La cuenta 281 Amortización acumulada aparece con saldo deudor. ¿Qué significa?',
      correcta: 'Que hay un error: la amortización acumulada siempre tiene saldo acreedor',
      incorrectas: ['Que el inmovilizado está totalmente amortizado', 'Nada: depende del año'],
      explicacion: 'La 281 solo crece por el Haber con cada dotación. Un saldo deudor indica un asiento con el lado invertido o una baja mal registrada.',
    },
    {
      id: 'b6-q07',
      pregunta: 'Después de liquidar el 303 del trimestre, la 472 sigue teniendo saldo. ¿Qué puede pasar?',
      correcta: 'Que falta el asiento de liquidación o hay una factura registrada fuera de su trimestre',
      incorrectas: ['Nada: la 472 siempre tiene saldo', 'Que hay que pagar más IVA'],
      explicacion: 'Tras la liquidación, la 472 y la 477 quedan a cero. Cualquier saldo es IVA de una factura que no entró en ese 303 o una liquidación pendiente.',
    },
    {
      id: 'b6-q08',
      pregunta: 'Al revisar el trimestre, la 555 tiene un saldo de 605 €. ¿Qué haces antes de presentar?',
      correcta: 'Aclarar con el cliente esa partida y aplicarla a su cuenta definitiva',
      incorrectas: ['Dejarla para el cierre del ejercicio', 'Llevarla a un ingreso para que desaparezca'],
      explicacion: 'Un cobro sin aplicar puede ser una venta sin facturar (IVA sin declarar). Se aclara antes de presentar el trimestre.',
    },
    {
      id: 'b6-q09',
      pregunta: 'La 4751 tiene saldo acreedor de 712,50 € a 30 de septiembre. ¿Es normal?',
      correcta: 'Sí, si coincide con las retenciones del trimestre que se ingresan en octubre',
      incorrectas: ['No: la 4751 siempre debe estar a cero', 'No: debería tener saldo deudor'],
      explicacion: 'Las retenciones se acumulan durante el trimestre y se pagan con el 111 y el 115 en el mes siguiente. El saldo debe coincidir con esos modelos.',
    },
    {
      id: 'b6-q10',
      pregunta: 'Antes de regularizar, ¿con qué debe coincidir el resultado que sale de los grupos 6 y 7 del balance de sumas y saldos?',
      correcta: 'Con el resultado de la cuenta de pérdidas y ganancias',
      incorrectas: ['Con el saldo de bancos', 'Con el resultado del 303'],
      explicacion: 'La cuenta de pérdidas y ganancias se construye con esos mismos saldos. Si no coinciden, falta algún ajuste o una cuenta está mal clasificada.',
    },

    /* --- Cuadres --- */
    {
      id: 'b6-q11',
      pregunta: '¿Con qué documento se cuadra la cuenta 572?',
      correcta: 'Con el extracto bancario, mediante la conciliación',
      incorrectas: ['Con el modelo 303', 'Con el inventario'],
      explicacion: 'El saldo de cada subcuenta de bancos debe coincidir con su extracto o explicarse con partidas en tránsito.',
    },
    {
      id: 'b6-q12',
      pregunta: '¿Con qué documento se cuadra la cuenta 476?',
      correcta: 'Con el recibo de liquidación de cotizaciones (RLC)',
      incorrectas: ['Con el modelo 111', 'Con las nóminas pagadas'],
      explicacion: 'El saldo de la 476 a fin de mes debe ser exactamente lo que se cargará como seguros sociales el mes siguiente.',
    },
    {
      id: 'b6-q13',
      pregunta: '¿Con qué se cuadra la cuenta 4751 al final del trimestre?',
      correcta: 'Con la suma de los modelos 111 y 115 del trimestre',
      incorrectas: ['Con el modelo 303', 'Con el modelo 347'],
      explicacion: 'La 4751 recoge las retenciones de trabajo y profesionales (111) y de alquileres (115). Con subcuentas separadas, cada una cuadra con su modelo.',
    },
    {
      id: 'b6-q14',
      pregunta: '¿Con qué se cuadran las cuentas 477 y 472 cada trimestre?',
      correcta: 'Con el modelo 303 y los libros registro de IVA',
      incorrectas: ['Con el modelo 390 del año anterior', 'Con el extracto bancario'],
      explicacion: 'Las cuotas del 303 deben coincidir con los saldos de 477 y 472 antes de liquidar, y con los libros de facturas expedidas y recibidas.',
    },
    {
      id: 'b6-q15',
      pregunta: '¿Cómo compruebas que la 465 está bien a final de mes?',
      correcta: 'Viendo que las transferencias de nóminas la dejan a cero',
      incorrectas: ['Comparándola con el modelo 190', 'Comparándola con el RLC'],
      explicacion: 'La 465 recoge el líquido de las nóminas. Si a fin de mes tiene saldo, hay una nómina sin pagar o un pago sin registrar.',
    },
    {
      id: 'b6-q16',
      pregunta: '¿Con qué se cuadra la amortización acumulada (281) al cierre?',
      correcta: 'Con la ficha o el cuadro de inmovilizado',
      incorrectas: ['Con el extracto bancario', 'Con el modelo 200 del año anterior'],
      explicacion: 'La ficha de inmovilizado detalla el coste y la amortización de cada elemento. Su total debe coincidir con las cuentas 21x y 281.',
    },
    {
      id: 'b6-q17',
      pregunta: '¿Cómo se comprueban los saldos de clientes y proveedores al cierre?',
      correcta: 'Con confirmaciones de saldos y cruzándolos con el 347',
      incorrectas: ['Con el modelo 111', 'No se pueden comprobar'],
      explicacion: 'Pedir a terceros que confirmen su saldo (o comparar con su 347) detecta facturas que faltan o duplicadas.',
    },
    {
      id: 'b6-q18',
      pregunta: '¿Con qué se cuadra la cuenta 300 Mercaderías al cierre?',
      correcta: 'Con el inventario valorado y firmado por el cliente',
      incorrectas: ['Con las compras del año', 'Con las ventas del año'],
      explicacion: 'Tras el asiento de variación de existencias, la 300 debe coincidir exactamente con el inventario final.',
    },

    /* --- Correcciones --- */
    {
      id: 'b6-q19',
      pregunta: 'Encuentras un error en un trimestre ya declarado. ¿Cómo lo corriges?',
      correcta: 'Con un asiento de rectificación, y rectificando la declaración si afecta a lo declarado',
      incorrectas: ['Borrando el asiento original y rehaciéndolo', 'No se corrige: el trimestre ya está presentado'],
      explicacion: 'No se borra lo declarado: se registra la corrección (para que quede rastro) y, si cambia el IVA o las retenciones, se rectifica la autoliquidación.',
    },
    {
      id: 'b6-q20',
      pregunta: 'Una reparación de 450 € se registró por error en la 213 Maquinaria. ¿Qué asiento de corrección haces?',
      correcta: '622 Reparaciones al Debe; 213 al Haber',
      incorrectas: ['213 al Debe; 622 al Haber', '681 al Debe; 281 al Haber'],
      explicacion: 'Se saca el importe del inmovilizado y se lleva al gasto correcto. Si se hubiera amortizado, habría que deshacer también esa amortización.',
    },
    {
      id: 'b6-q21',
      pregunta: 'El IVA de una comida con clientes se registró en la 472. ¿Cómo lo corriges?',
      correcta: '627 al Debe; 472 al Haber por el IVA',
      incorrectas: ['472 al Debe; 627 al Haber', 'No hace falta: el IVA es el mismo'],
      explicacion: 'Ese IVA no es deducible: se saca de la 472 y se suma al gasto. Si ya se había deducido en un 303 presentado, hay que regularizarlo.',
    },
    {
      id: 'b6-q22',
      pregunta: 'Una factura de compra se registró dos veces. ¿Qué haces?',
      correcta: 'Un asiento inverso de la duplicada, que deja una sola',
      incorrectas: ['Registrarla una tercera vez en negativo en la 700', 'Nada: el proveedor lo arreglará'],
      explicacion: 'El contraasiento (los mismos importes en los lados contrarios) anula la factura duplicada: gasto, IVA y deuda.',
    },
    {
      id: 'b6-q23',
      pregunta: 'Un pago a un proveedor se registró por error como 430 al Debe y 572 al Haber. ¿Qué asiento lo corrige?',
      correcta: '400 al Debe; 430 al Haber',
      incorrectas: ['430 al Debe; 400 al Haber', '572 al Debe; 430 al Haber'],
      explicacion: 'El banco está bien. Lo que hay que corregir es la cuenta del tercero: se cancela lo cargado al cliente y se carga al proveedor.',
    },
    {
      id: 'b6-q24',
      pregunta: '¿Por qué no se borran los asientos de periodos ya cerrados?',
      correcta: 'Para que quede rastro de qué se corrigió y cuándo, y no alterar lo ya declarado',
      incorrectas: ['Porque el programa no deja hacerlo nunca', 'Porque los asientos no se pueden corregir'],
      explicacion: 'La trazabilidad es clave en una revisión o inspección: el asiento original y su corrección explican la historia completa.',
    },

    /* --- Balance --- */
    {
      id: 'b6-q25',
      pregunta: '¿Cómo se calcula el fondo de maniobra?',
      correcta: 'Activo corriente − pasivo corriente',
      incorrectas: ['Activo total − pasivo total', 'Patrimonio neto − activo no corriente − pasivo'],
      explicacion: 'Mide el margen entre lo que se convertirá en dinero en menos de un año y lo que hay que pagar en ese plazo.',
    },
    {
      id: 'b6-q26',
      pregunta: 'Una distribuidora que cobra a 90 días tiene fondo de maniobra negativo. ¿Qué le dices?',
      correcta: 'Que puede tener tensiones de tesorería para pagar sus deudas a corto plazo',
      incorrectas: ['Que es una situación ideal', 'Que no tiene ningún significado'],
      explicacion: 'Si lo que debe pagar pronto supera lo que va a cobrar pronto, necesitará financiación o renegociar plazos. En negocios que cobran al contado puede ser normal, pero no en una distribuidora.',
    },
    {
      id: 'b6-q27',
      pregunta: '¿Cómo se calcula el ratio de liquidez?',
      correcta: 'Activo corriente / pasivo corriente',
      incorrectas: ['Tesorería / activo total', 'Pasivo corriente / activo corriente'],
      explicacion: 'Un valor por encima de 1 indica que el activo corriente cubre las deudas a corto plazo.',
    },
    {
      id: 'b6-q28',
      pregunta: '¿Cómo se calcula el ratio de endeudamiento más habitual?',
      correcta: 'Pasivo total / (patrimonio neto + pasivo)',
      incorrectas: ['Patrimonio neto / activo no corriente', 'Ventas / pasivo total'],
      explicacion: 'Indica qué parte de la financiación procede de terceros. Cuanto más alto, más depende la empresa de bancos y proveedores.',
    },
    {
      id: 'b6-q29',
      pregunta: 'Las pérdidas han dejado el patrimonio neto de una S.L. por debajo de la mitad de su capital. ¿Qué implica?',
      correcta: 'Que está en causa de disolución, salvo que se restablezca el equilibrio patrimonial',
      incorrectas: ['Nada, mientras pague sus deudas', 'Que debe cambiar de forma jurídica'],
      explicacion: 'La Ley de Sociedades de Capital obliga a actuar (aumentar o reducir capital, o disolver) cuando el patrimonio neto cae por debajo de la mitad del capital. Hay que avisar de inmediato.',
    },
    {
      id: 'b6-q30',
      pregunta: 'En una empresa equilibrada, ¿con qué se debería financiar el activo no corriente?',
      correcta: 'Con financiación a largo plazo: patrimonio neto y pasivo no corriente',
      incorrectas: ['Con deudas a corto plazo con proveedores', 'Con el saldo de clientes'],
      explicacion: 'Lo que se usa durante muchos años debe financiarse con recursos que no haya que devolver pronto. Si no, aparecen tensiones de liquidez.',
    },
    {
      id: 'b6-q31',
      pregunta: '¿Qué mide el ratio de tesorería inmediata?',
      correcta: 'La capacidad de pagar el pasivo corriente solo con el dinero disponible',
      incorrectas: ['El beneficio sobre las ventas', 'La parte del activo financiada con deuda'],
      explicacion: 'Se calcula como tesorería / pasivo corriente. No cuenta con cobrar a clientes ni con vender existencias.',
    },
    {
      id: 'b6-q32',
      pregunta: '¿Cuál es la diferencia básica entre el balance y la cuenta de pérdidas y ganancias?',
      correcta: 'El balance es una foto a una fecha; la cuenta de resultados resume todo el año',
      incorrectas: ['El balance solo recoge gastos', 'Son el mismo documento con otro nombre'],
      explicacion: 'El balance muestra saldos a un día concreto. La cuenta de pérdidas y ganancias acumula ingresos y gastos de todo el periodo.',
    },
    {
      id: 'b6-q33',
      pregunta: 'Clientes 35.000 € y ventas anuales 412.000 €. ¿Cuál es aproximadamente el periodo medio de cobro?',
      correcta: 'Unos 31 días',
      incorrectas: ['Unos 12 días', 'Unos 85 días'],
      explicacion: '35.000 / 412.000 × 365 ≈ 31 días. Es lo que tardan de media los clientes en pagar.',
    },
    {
      id: 'b6-q34',
      pregunta: '¿Qué diferencia hay entre el resultado antes de impuestos y el resultado del ejercicio?',
      correcta: 'El gasto por Impuesto sobre Sociedades',
      incorrectas: ['Las amortizaciones', 'El IVA del año'],
      explicacion: 'Al resultado antes de impuestos se le resta el impuesto sobre beneficios para llegar al resultado del ejercicio. El IVA no es gasto ni ingreso.',
    },

    /* --- Cuenta de resultados --- */
    {
      id: 'b6-q35',
      pregunta: '¿Qué mide el resultado de explotación?',
      correcta: 'Lo que gana el negocio con su actividad, antes de intereses e impuestos',
      incorrectas: ['Lo que queda tras pagar impuestos', 'El dinero que hay en el banco'],
      explicacion: 'Recoge ingresos y gastos de la actividad (ventas, compras, personal, amortizaciones…), sin los financieros ni el impuesto.',
    },
    {
      id: 'b6-q36',
      pregunta: '¿Cómo se calcula el margen neto?',
      correcta: 'Resultado del ejercicio / ventas',
      incorrectas: ['Ventas / resultado del ejercicio', 'Resultado de explotación / activo total'],
      explicacion: 'Indica cuántos euros de beneficio final quedan de cada 100 € vendidos.',
    },
    {
      id: 'b6-q37',
      pregunta: '¿Qué es el EBITDA, en términos sencillos?',
      correcta: 'El resultado de explotación antes de amortizaciones',
      incorrectas: ['El beneficio después de impuestos', 'La suma de las ventas y el IVA'],
      explicacion: 'Se suele calcular como resultado de explotación + amortizaciones. Aproxima lo que genera la actividad antes de intereses, impuestos y amortizaciones.',
    },
    {
      id: 'b6-q38',
      pregunta: 'Un cliente ha tenido beneficio, pero no tiene dinero en el banco. ¿Cómo se lo explicas?',
      correcta: 'Beneficio no es tesorería: puede haber ventas sin cobrar, existencias, inversiones o cuotas de préstamo',
      incorrectas: ['Es imposible: si hay beneficio, hay dinero', 'Seguro que hay un error en la contabilidad'],
      explicacion: 'El resultado sigue el devengo; la tesorería, los cobros y pagos. Las cuotas de capital de un préstamo o la compra de una máquina sacan dinero sin ser gasto del año.',
    },
    {
      id: 'b6-q39',
      pregunta: 'El resultado financiero de un cliente es muy negativo. ¿Qué indica?',
      correcta: 'Que los intereses de su deuda pesan mucho en el resultado',
      incorrectas: ['Que vende con pérdidas', 'Que ha cobrado intereses de sus inversiones'],
      explicacion: 'El resultado financiero compara ingresos y gastos financieros. Si es muy negativo, la financiación es cara o excesiva.',
    },
    {
      id: 'b6-q40',
      pregunta: 'Las ventas de un cliente suben un 15 %, pero su margen neto baja. ¿Qué le explicas?',
      correcta: 'Que sus costes han crecido más que sus ventas',
      incorrectas: ['Que está vendiendo menos', 'Que el IVA ha subido'],
      explicacion: 'Vender más no garantiza ganar más: si compras, personal u otros gastos crecen más deprisa, el margen se estrecha.',
    },
  ],

  casos: [
    {
      id: 'b6-sumas-saldos',
      tipo: 'clasificar',
      cliente: { nombre: 'Floristería Azahar, S.L.', actividad: 'Floristería' },
      titulo: 'Revisa el balance de sumas y saldos',
      enunciado: 'Antes de cerrar el tercer trimestre, revisa estos saldos de la floristería. Indica cuáles son normales y cuáles delatan un error que hay que revisar.',
      documento: SUMAS_SALDOS_FLORISTERIA,
      rejilla: 'grid-cols-2',
      opciones: [
        { valor: 'ok', etiqueta: 'Normal' },
        { valor: 'revisar', etiqueta: 'Revisar' },
      ],
      cuentas: [
        { id: 'capital', texto: '100 Capital social · acreedor 6.000,00', correcta: 'ok', pista: 'El capital es patrimonio neto.', explicacion: 'Saldo acreedor: correcto.' },
        { id: 'amort', texto: '281 Amortización acumulada · deudor 320,00', correcta: 'revisar', pista: '¿Por qué lado crece la amortización acumulada?', explicacion: 'Debe ser acreedor: hay un asiento invertido.' },
        { id: 'viveros', texto: 'Proveedor Viveros del Turia · deudor 1.210,00', correcta: 'revisar', pista: 'A un proveedor normalmente se le debe dinero.', explicacion: 'Pago duplicado o factura sin registrar.' },
        { id: 'hotel', texto: 'Cliente Hotel Palmeras · acreedor 300,00', correcta: 'revisar', pista: 'Un cliente normalmente nos debe dinero.', explicacion: 'Cobro duplicado o abono sin aplicar.' },
        { id: 'iva', texto: '472 IVA soportado · deudor 1.845,60 (con el 303 ya liquidado)', correcta: 'revisar', pista: 'Tras liquidar el 303, ¿qué saldo deberían tener 472 y 477?', explicacion: 'Facturas fuera del trimestre o liquidación incompleta.' },
        { id: 'ret', texto: '4751 Retenciones practicadas · acreedor 712,50', correcta: 'ok', pista: 'Las retenciones del trimestre se pagan en el mes siguiente.', explicacion: 'Pendiente del 111 y 115 de octubre: normal si cuadra con ellos.' },
        { id: 'ss', texto: '476 Seguridad Social · acreedor 1.540,00', correcta: 'ok', pista: 'Los seguros sociales de septiembre se pagan en octubre.', explicacion: 'Normal si coincide con el RLC.' },
        { id: 'pendiente', texto: '555 Partidas pendientes · acreedor 605,00', correcta: 'revisar', pista: 'Esta cuenta no debería quedar con saldo al cerrar el trimestre.', explicacion: 'Ingreso sin aplicar: aclararlo antes del 303.' },
        { id: 'caja', texto: '570 Caja · acreedor 85,00', correcta: 'revisar', pista: '¿Puede una caja física tener dinero negativo?', explicacion: 'Imposible: falta registrar una entrada de efectivo.' },
        { id: 'banco', texto: '572 Bancos · deudor 12.430,25', correcta: 'ok', pista: 'El dinero en el banco es un activo.', explicacion: 'Normal (y conciliado con el extracto).' },
      ],
      resumenOk: 'Seis saldos para revisar en diez minutos de lectura: esta revisión, hecha cada trimestre, evita la mayoría de los errores que llegan a una declaración.',
    },
    {
      id: 'b6-reparacion',
      tipo: 'asiento',
      cliente: { nombre: 'Horno San Blas, S.L.', actividad: 'Panadería y bollería' },
      titulo: 'Una reparación activada por error',
      enunciado: 'Al cuadrar la cuenta 213 con la ficha de inmovilizado, el mayor tiene 450 € de más: una factura de un servicio técnico que no es una máquina nueva. Registra el asiento de corrección.',
      documento: {
        tipo: 'resumen',
        titulo: 'Mayor de la cuenta 213 Maquinaria · 2026',
        subtitulo: '21300000 · Maquinaria',
        emisor: { nombre: 'Horno San Blas, S.L.', nif: 'B98221133' },
        columnas: ['Fecha', 'Concepto', 'Debe', 'Saldo'],
        filas: [
          ['01/01', 'Saldo inicial (amasadora)', '6.000,00', '6.000,00'],
          ['12/10', 'Horno de convección · Maquinaria Hostelera', '4.800,00', '10.800,00'],
          ['18/11', 'Servicio Técnico Turia · reparación de la cámara de frío', '450,00', '11.250,00'],
        ],
        notas: ['La ficha de inmovilizado suma 10.800,00 €: el mayor no cuadra con ella.', 'La factura de Servicio Técnico Turia es una reparación: sustituye una pieza averiada y no amplía la vida ni la capacidad de la cámara.'],
      },
      cuentasDisponibles: ['622', '213', '681', '281', '472', '410', '629'],
      solucion: [{ cuenta: '622', debe: 450 }, { cuenta: '213', haber: 450 }],
      pista: 'Saca el importe de la cuenta de inmovilizado y llévalo al gasto que le corresponde. El IVA y la deuda con el proveedor estaban bien.',
      explicacion: 'Una reparación que conserva el bien es gasto del año: 622 al Debe. Se saca de la 213 (Haber). El IVA (472) y el acreedor (410) ya eran correctos, así que no se tocan.',
    },
    {
      id: 'b6-iva-no-deducible',
      tipo: 'asiento',
      cliente: { nombre: 'Reformas Integrales Turia, S.L.', actividad: 'Empresa de reformas' },
      titulo: 'IVA no deducible en la 472',
      enunciado: 'Al preparar el 303, ves que esta factura de restaurante se registró como 627 por 180 €, 472 por 18 € y 410 por 198 €. Era una comida con un cliente. Registra la corrección antes de presentar.',
      documento: {
        tipo: 'factura',
        color: '#9a3412',
        emisor: { nombre: 'Restaurante El Racó del Port, S.L.', nif: 'B98551177', direccion: ['C/ de la Reina, 70 · 46011 Valencia'] },
        receptor: { nombre: 'Reformas Integrales Turia, S.L.', nif: 'B98443322', direccion: ['C/ Músico Ginés, 31 · 46022 Valencia'] },
        numero: 'RP-2026/3381',
        fecha: '24/09/2026',
        formaPago: 'Tarjeta',
        menciones: ['Comida de trabajo con un cliente (4 comensales).'],
        lineas: [
          { concepto: 'Menú degustación', cantidad: 4, precio: 45, iva: 10 },
        ],
      },
      cuentasDisponibles: ['627', '472', '477', '410', '629', '6xx'],
      solucion: [{ cuenta: '627', debe: 18 }, { cuenta: '472', haber: 18 }],
      pista: 'El IVA de las atenciones a clientes no se deduce. ¿Dónde tiene que acabar esa cuota?',
      explicacion: 'Se saca el IVA de la 472 (Haber, 18 €) y se suma al gasto de relaciones públicas (627, Debe). Así no se deduce en el 303. La deuda con el restaurante (198 €) estaba bien.',
    },
    {
      id: 'b6-duplicada',
      tipo: 'asiento',
      cliente: { nombre: 'Moda Valentina, S.L.', actividad: 'Tienda de ropa' },
      titulo: 'Una factura registrada dos veces',
      enunciado: 'El proveedor reclama un saldo menor del que tenéis en contabilidad. Revisas su mayor y encuentras el problema. Anula la factura duplicada.',
      documento: {
        tipo: 'resumen',
        titulo: 'Mayor de la cuenta 400 · Textiles Albufera, S.L.',
        subtitulo: '40000003 · octubre 2026',
        emisor: { nombre: 'Moda Valentina, S.L.', nif: 'B98765432' },
        columnas: ['Fecha', 'Concepto', 'Haber', 'Saldo'],
        filas: [
          ['06/10', 'Fra. FV-2026/1184 (600: 1.250,00 + 472: 262,50)', '1.512,50', '1.512,50'],
          ['09/10', 'Fra. FV-2026/1184 (600: 1.250,00 + 472: 262,50)', '1.512,50', '3.025,00'],
        ],
        notas: ['Es la factura del Bloque 1: el cliente la reenvió y se registró otra vez.'],
      },
      cuentasDisponibles: ['400', '600', '472', '477', '608', '572'],
      solucion: [{ cuenta: '400', debe: 1512.5 }, { cuenta: '600', haber: 1250 }, { cuenta: '472', haber: 262.5 }],
      pista: 'Haz el asiento inverso de la factura duplicada: las mismas cuentas e importes, en los lados contrarios.',
      explicacion: 'El contraasiento anula la factura repetida: baja la deuda con el proveedor (400 al Debe, 1.512,50 €), la compra (600 al Haber, 1.250 €) y el IVA (472 al Haber, 262,50 €). No se usa la 608: no hay ninguna devolución de mercancía, solo un error de registro.',
    },
    {
      id: 'b6-pago-mal',
      tipo: 'asiento',
      cliente: { nombre: 'Floristería Azahar, S.L.', actividad: 'Floristería' },
      titulo: 'Un pago contra la cuenta equivocada',
      enunciado: 'Un cliente que ya pagó todo aparece con 300 € pendientes de cobro, y un proveedor os reclama una factura que ya se transfirió. Revisa el mayor del cliente y corrige el asiento.',
      documento: {
        tipo: 'resumen',
        titulo: 'Mayor de la cuenta 430 · Restaurante La Bahía, S.L.',
        subtitulo: '43000011 · septiembre 2026',
        emisor: { nombre: 'Floristería Azahar, S.L.', nif: 'B98334411' },
        columnas: ['Fecha', 'Concepto', 'Debe', 'Haber'],
        filas: [
          ['05/09', 'Fra. 2026/091 · centros de mesa', '726,00', ''],
          ['22/09', 'Transferencia a Embalajes Levante, S.L. (fra. EL-552)', '300,00', ''],
          ['30/09', 'Cobro fra. 2026/091', '', '726,00'],
        ],
        notas: ['Embalajes Levante, S.L. es un proveedor (cuenta 400). En su mayor, la factura EL-552 de 300,00 € sigue pendiente aunque el banco ya la pagó.'],
      },
      cuentasDisponibles: ['400', '430', '572', '555', '600', '700'],
      solucion: [{ cuenta: '400', debe: 300 }, { cuenta: '430', haber: 300 }],
      pista: 'La salida del banco estaba bien. Solo hay que llevar el cargo del cliente a la cuenta del proveedor al que se pagó.',
      explicacion: 'Se cancela el cargo indebido en el cliente (430 al Haber, 300 €) y se carga al proveedor pagado (400 al Debe), que queda saldado. El banco (572) no se toca: el dinero sí salió.',
    },
    {
      id: 'b6-cuadres',
      tipo: 'clasificar',
      titulo: '¿Con qué se cuadra cada cuenta?',
      enunciado: 'Preparas la carpeta de cierre del trimestre. Asigna a cada cuenta el documento con el que se cuadra.',
      rejilla: 'grid-cols-2 sm:grid-cols-3',
      opciones: [
        { valor: 'extracto', etiqueta: 'Extracto' },
        { valor: 'rlc', etiqueta: 'RLC' },
        { valor: 'retenciones', etiqueta: '111 y 115' },
        { valor: 'iva', etiqueta: '303' },
        { valor: 'inmovilizado', etiqueta: 'Ficha inmov.' },
        { valor: 'inventario', etiqueta: 'Inventario' },
      ],
      cuentas: [
        { codigo: '572', correcta: 'extracto', pista: 'Es el dinero de la cuenta corriente.', explicacion: 'Conciliación bancaria.' },
        { codigo: '476', correcta: 'rlc', pista: 'Deuda con la Seguridad Social.', explicacion: 'Recibo de liquidación de cotizaciones.' },
        { codigo: '4751', correcta: 'retenciones', pista: 'Retenciones practicadas.', explicacion: 'Modelos 111 y 115.' },
        { codigo: '477', correcta: 'iva', pista: 'IVA repercutido.', explicacion: 'Modelo 303 y libro de facturas expedidas.' },
        { codigo: '472', correcta: 'iva', pista: 'IVA soportado.', explicacion: 'Modelo 303 y libro de facturas recibidas.' },
        { codigo: '281', correcta: 'inmovilizado', pista: 'Amortización acumulada.', explicacion: 'Ficha o cuadro de inmovilizado.' },
        { codigo: '300', correcta: 'inventario', pista: 'Mercancía en el almacén.', explicacion: 'Inventario firmado y valorado a coste.' },
      ],
      resumenOk: 'Con estos siete cuadres documentados, cualquier revisión del trimestre se resuelve en minutos.',
    },
    {
      id: 'b6-balance',
      tipo: 'calculo',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Analiza el balance',
      enunciado: 'El administrador quiere saber si la empresa va bien de dinero. Calcula los indicadores básicos con el balance de 2026.',
      documento: BALANCE_LEVANTE_2026,
      preguntas: [
        { id: 'fm', texto: 'Fondo de maniobra', respuesta: 35000, unidad: '€', pista: 'Activo corriente (existencias + clientes + tesorería) − pasivo corriente.', explicacion: '(25.000 + 35.000 + 20.000) − 45.000 = 35.000 €.' },
        { id: 'liquidez', texto: 'Ratio de liquidez (dos decimales)', respuesta: 1.78, unidad: '', tolerancia: 0.01, pista: 'Activo corriente / pasivo corriente.', explicacion: '80.000 / 45.000 = 1,78.' },
        { id: 'endeudamiento', texto: 'Endeudamiento (porcentaje, un decimal)', respuesta: 58.4, unidad: '%', tolerancia: 0.1, pista: 'Pasivo total (no corriente + corriente) / total patrimonio neto y pasivo.', explicacion: '(28.000 + 45.000) / 125.000 = 58,4 %.' },
      ],
      resumenOk: 'Lectura para el cliente: «Lo que vas a cobrar y lo que tienes en el banco cubre casi dos veces lo que debes pagar este año. Algo más de la mitad de tu empresa se financia con deuda: es razonable, pero no conviene que suba».',
    },
    {
      id: 'b6-pyg',
      tipo: 'calculo',
      cliente: { nombre: 'Distribuciones Levante, S.L.', actividad: 'Distribuidor de menaje' },
      titulo: 'Analiza la cuenta de resultados',
      enunciado: 'Con la cuenta de pérdidas y ganancias de 2026 (la misma del cierre del Bloque 5), calcula los escalones y el margen para explicárselos al cliente.',
      documento: PYG_LEVANTE_ANALISIS,
      preguntas: [
        { id: 'explotacion', texto: 'Resultado de explotación', respuesta: 44500, unidad: '€', pista: 'Ventas menos los gastos de la actividad, sin los financieros ni el impuesto.', explicacion: '412.000 − 280.000 − 52.000 − 26.500 − 9.000 = 44.500 €.' },
        { id: 'ejercicio', texto: 'Resultado del ejercicio', respuesta: 33096, unidad: '€', pista: 'Al resultado de explotación réstale los gastos financieros y el impuesto.', explicacion: '44.500 − 3.500 − 7.904 = 33.096 €, el mismo beneficio que regularizaste en el Bloque 5.' },
        { id: 'margen', texto: 'Margen neto (porcentaje, un decimal)', respuesta: 8, unidad: '%', tolerancia: 0.1, pista: 'Resultado del ejercicio / ventas × 100.', explicacion: '33.096 / 412.000 = 8,0 %.' },
      ],
      resumenOk: 'Lectura para el cliente: «El negocio gana 44.500 € con su actividad; tras pagar intereses e impuestos te quedan 33.096 €, unos 8 € de cada 100 que vendes».',
    },
    {
      id: 'b6-explicar',
      tipo: 'clasificar',
      titulo: '¿Buena señal o alerta?',
      enunciado: 'Repasas los números de varios clientes antes de reunirte con ellos. Indica qué situaciones son una buena señal y cuáles una alerta que debes comentarles.',
      rejilla: 'grid-cols-2',
      opciones: [
        { valor: 'bien', etiqueta: 'Buena señal' },
        { valor: 'alerta', etiqueta: 'Alerta' },
      ],
      cuentas: [
        { id: 'fm-neg', texto: 'Una distribuidora que cobra a 90 días tiene fondo de maniobra negativo', correcta: 'alerta', pista: '¿Podrá pagar lo que vence pronto?', explicacion: 'Riesgo de tensiones de tesorería.' },
        { id: 'liquidez', texto: 'Ratio de liquidez de 1,8', correcta: 'bien', pista: 'Compáralo con 1.', explicacion: 'El activo corriente cubre holgadamente las deudas a corto plazo.' },
        { id: 'pn', texto: 'Las pérdidas dejan el patrimonio neto por debajo de la mitad del capital', correcta: 'alerta', pista: 'Recuerda lo que dice la Ley de Sociedades de Capital.', explicacion: 'Causa de disolución: hay que actuar.' },
        { id: 'margen', texto: 'Las ventas suben un 10 % y el margen neto también mejora', correcta: 'bien', pista: '¿Crecen los costes más que las ventas?', explicacion: 'Crece y es más rentable.' },
        { id: 'pmc', texto: 'El periodo medio de cobro pasa de 30 a 95 días', correcta: 'alerta', pista: '¿Qué pasa con la caja si los clientes tardan más en pagar?', explicacion: 'Los clientes financian menos y la empresa necesita más caja.' },
        { id: 'financiero', texto: 'El resultado de explotación es positivo, pero los intereses se llevan casi todo el beneficio', correcta: 'alerta', pista: 'Fíjate en el resultado financiero.', explicacion: 'Financiación cara o excesiva.' },
        { id: 'endeud', texto: 'El endeudamiento baja del 70 % al 55 % tras dos años de beneficios', correcta: 'bien', pista: '¿Depende más o menos de terceros?', explicacion: 'Más financiación propia y menos riesgo.' },
      ],
      resumenOk: 'Explicar los números es la parte más valorada del trabajo con clientes: ellos no ven asientos, ven si su empresa va bien o no.',
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
    contenido: CONTENIDO_B4,
  },
  {
    id: 5,
    codigo: 'B5',
    titulo: 'Cierre y Periodificación',
    tituloLargo: 'Operaciones de Cierre y Periodificación',
    descripcion: 'El soporte al cierre del ejercicio: amortizar, imputar cada gasto a su año, ajustar las existencias, pasar a corto plazo lo que vence, calcular el Impuesto sobre Sociedades y regularizar el resultado.',
    distintivo: null,
    icono: ICONOS.cierre,
    temas: ['Amortizaciones (681 / 281)', 'Periodificaciones (480 / 485)', 'Variación de existencias (610)', 'Largo a corto plazo (170 → 520)', 'Impuesto sobre Sociedades (6300)', 'Regularización (129)'],
    contenido: CONTENIDO_B5,
  },
  {
    id: 6,
    codigo: 'B6',
    titulo: 'Revisión y Análisis',
    tituloLargo: 'Revisión, Cuadres y Análisis',
    descripcion: 'La visión senior: revisar tu propio trabajo antes de que lo haga otro, cuadrar la contabilidad con los impuestos y leer lo que cuentan el balance y la cuenta de resultados.',
    distintivo: null,
    icono: ICONOS.analisis,
    temas: ['Balance de sumas y saldos', 'Saldos anómalos', 'Cuadres con documentos', 'Asientos de corrección', 'Leer el balance y la PyG', 'Explicar los números al cliente'],
    contenido: CONTENIDO_B6,
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
const CLAVE_NOMBRE = 'repasoPGC.nombre';
const CLAVE_CERTIFICADO = 'repasoPGC.certificado';
const RUTA_CERTIFICADO = '#/certificado';
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
  vista: 'bloque',    // 'bloque' | 'certificado'
  bloque: 0,          // id del bloque activo (0–6)
  pestana: 'teoria',  // 'teoria' | 'test' | 'casos'
  menuAbierto: false, // solo relevante en móvil
};

// Estado de la interfaz que no se guarda (se pierde al recargar)
const ui = {
  teoria: {},   // por bloque: { grupo, paso }
  test: {},     // por bloque: { indice, respuestas: [], terminado }
  casos: {},    // por bloque: { activo }  ·  y por caso: ui.caso[id]
  caso: {},
  celebrar: false,    // lanza el confeti al abrir el certificado recién desbloqueado
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
  if (hash === RUTA_CERTIFICADO) return { certificado: true };
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

function aplicarRuta(ruta) {
  if (ruta.certificado) {
    const cambia = estado.vista !== 'certificado';
    estado.vista = 'certificado';
    renderizar();
    if (cambia) window.scrollTo(0, 0);
    return;
  }
  const { bloque, pestana } = ruta;
  const cambiaBloque = bloque !== estado.bloque || estado.vista !== 'bloque';
  estado.vista = 'bloque';
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
  if (!antes && p.completado) {
    if (certificadoDesbloqueado()) {
      registrarFechaCertificado();
      mostrarAviso('¡Has completado los 7 bloques! Abriendo tu certificado…');
      vibrar([30, 50, 30, 50, 80]);
      ui.celebrar = true;
      setTimeout(() => { location.hash = RUTA_CERTIFICADO; }, 1800);
    } else {
      mostrarAviso(`¡${bloque.codigo} completado! Test aprobado y los ${nCasos} casos resueltos.`);
    }
  }
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
    const activo = estado.vista === 'bloque' && id === estado.bloque;
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
  actualizarEnlaceCertificado(hechos, total);
}

function actualizarEnlaceCertificado(hechos, total) {
  const enlace = $('#enlace-certificado');
  if (!enlace) return;
  const activo = estado.vista === 'certificado';
  const abierto = hechos === total;
  if (activo) enlace.setAttribute('aria-current', 'page');
  else enlace.removeAttribute('aria-current');
  enlace.classList.remove(...CLASES_ENLACE_ACTIVO, ...CLASES_ENLACE_INACTIVO);
  enlace.classList.add(...(activo ? CLASES_ENLACE_ACTIVO : CLASES_ENLACE_INACTIVO));
  const icono = $('[data-icono]', enlace);
  icono.className = `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${abierto ? 'bg-amber-400 text-tinta-950' : (activo ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60')}`;
  icono.innerHTML = svgIcono(abierto ? ICONO_MEDALLA : ICONO_CANDADO);
  const marca = $('[data-estado]', enlace);
  marca.textContent = abierto ? '¡Listo!' : `${hechos}/${total}`;
  marca.className = `shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${abierto ? 'bg-amber-400/20 text-amber-200' : 'bg-white/5 text-white/50'}`;
  enlace.setAttribute('aria-label', abierto ? 'Certificado final: desbloqueado' : `Certificado final: bloqueado, ${hechos} de ${total} bloques completados`);
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
  btnSig.disabled = false;
  $('[data-nombre]', btnAnt).textContent = anterior ? `${anterior.codigo} · ${anterior.titulo}` : '—';
  $('[data-nombre]', btnSig).textContent = siguiente ? `${siguiente.codigo} · ${siguiente.titulo}` : 'Certificado final';
}

function renderizar() {
  const enCertificado = estado.vista === 'certificado';
  $('#vista-bloque').classList.toggle('hidden', enCertificado);
  $('#vista-certificado').classList.toggle('hidden', !enCertificado);
  if (enCertificado) {
    actualizarMenu();
    renderizarCertificado();
    return;
  }
  $('#vista-certificado').innerHTML = '';
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
  if (doc.tipo === 'nominas') return htmlNominas(doc);
  if (doc.tipo === 'modelo') return htmlModelo(doc);
  return htmlFactura(doc, resaltar);
}

// Hoja resumen de nóminas: líquidos y totales calculados
function calcularNominas(doc) {
  const trabajadores = doc.trabajadores.map((t) => ({
    ...t,
    anticipo: t.anticipo || 0,
    liquido: r2(t.bruto - t.ssTrab - t.irpf - (t.anticipo || 0)),
  }));
  const suma = (k) => r2(trabajadores.reduce((s, t) => s + t[k], 0));
  return {
    trabajadores,
    totales: { bruto: suma('bruto'), ssTrab: suma('ssTrab'), irpf: suma('irpf'), anticipo: suma('anticipo'), liquido: suma('liquido'), ssEmp: suma('ssEmp') },
  };
}

function htmlNominas(doc) {
  const { trabajadores, totales } = calcularNominas(doc);
  const fila = (etiqueta, valor, clase = '') => `<div class="flex justify-between gap-3 ${clase}"><span>${etiqueta}</span><span class="font-mono tabular-nums">${valor}</span></div>`;
  const pctIrpf = (t) => (t.bruto ? ` (${pctTexto(r2(t.irpf / t.bruto * 100))} %)` : '');
  return `
    <figure class="mx-auto w-full max-w-xl" aria-label="Resumen de nóminas de ${escaparHTML(doc.empresa)}">
      <div class="overflow-hidden rounded-xl bg-white text-[12.5px] leading-snug text-slate-700 shadow-[0_1px_2px_rgba(15,27,45,.08),0_10px_30px_-12px_rgba(15,27,45,.35)] ring-1 ring-slate-900/10">
        <div class="bg-indigo-900 px-4 py-3 text-white">
          <p class="text-[10.5px] font-semibold uppercase tracking-wider text-white/60">Departamento laboral · resumen de nóminas</p>
          <p class="mt-0.5 text-[15px] font-bold">${escaparHTML(doc.empresa)}</p>
          <p class="text-[12px] text-white/75">NIF ${escaparHTML(doc.nif)} · ${escaparHTML(doc.periodo)}</p>
        </div>
        <ul class="divide-y divide-slate-200">
          ${trabajadores.map((t) => `
            <li class="px-4 py-2.5">
              <p class="font-semibold text-slate-900">${escaparHTML(t.nombre)} <span class="font-normal text-slate-500">· ${escaparHTML(t.puesto)}</span></p>
              <div class="mt-1 space-y-0.5">
                ${fila('Salario bruto', formatoEuros(t.bruto))}
                ${fila('Seguridad Social trabajador', `−${formatoEuros(t.ssTrab)}`)}
                ${fila(`Retención IRPF${pctIrpf(t)}`, `−${formatoEuros(t.irpf)}`)}
                ${t.anticipo ? fila('Anticipo ya pagado', `−${formatoEuros(t.anticipo)}`) : ''}
                ${fila('Líquido a percibir', formatoEuros(t.liquido), 'font-semibold text-slate-900')}
                ${fila('Seguridad Social empresa', formatoEuros(t.ssEmp), 'text-indigo-700')}
              </div>
            </li>`).join('')}
        </ul>
        ${trabajadores.length > 1 ? `
          <div class="space-y-0.5 border-t-2 border-indigo-900 bg-indigo-50/60 px-4 py-3">
            <p class="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-indigo-900">Totales del mes</p>
            ${fila('Salario bruto', formatoEuros(totales.bruto), 'font-semibold')}
            ${fila('Seguridad Social trabajadores', formatoEuros(totales.ssTrab))}
            ${fila('Retenciones IRPF', formatoEuros(totales.irpf))}
            ${totales.anticipo ? fila('Anticipos descontados', formatoEuros(totales.anticipo)) : ''}
            ${fila('Líquido total a pagar', formatoEuros(totales.liquido), 'font-semibold text-slate-900')}
            ${fila('Seguridad Social empresa', formatoEuros(totales.ssEmp), 'font-semibold text-indigo-800')}
          </div>` : ''}
        ${(doc.notas || []).length ? `<ul class="space-y-1 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-950">${doc.notas.map((n) => `<li class="flex gap-1.5"><span aria-hidden="true">•</span><span>${escaparHTML(n)}</span></li>`).join('')}</ul>` : ''}
        <p class="bg-slate-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wider text-slate-400">Documento ficticio · material de formación</p>
      </div>
    </figure>`;
}

// Borrador simplificado de un modelo tributario (303, 111, 115…)
function htmlModelo(doc) {
  const res = doc.resultado;
  const aFavor = res.valor < 0;
  return `
    <figure class="mx-auto w-full max-w-xl" aria-label="Borrador del modelo ${escaparHTML(doc.modelo)} de ${escaparHTML(doc.nombre)}">
      <div class="overflow-hidden rounded-xl bg-white text-[12.5px] leading-snug text-slate-700 shadow-[0_1px_2px_rgba(15,27,45,.08),0_10px_30px_-12px_rgba(15,27,45,.35)] ring-1 ring-slate-900/10">
        <div class="flex items-stretch">
          <div class="flex w-16 shrink-0 flex-col items-center justify-center bg-rose-800 py-3 text-white">
            <span class="text-[9.5px] font-semibold uppercase tracking-wider text-white/70">Modelo</span>
            <span class="font-mono text-xl font-bold leading-none">${escaparHTML(doc.modelo)}</span>
          </div>
          <div class="min-w-0 flex-1 border-b border-slate-200 px-3 py-2.5">
            <p class="font-semibold leading-tight text-slate-900">${escaparHTML(doc.titulo)}</p>
            <p class="text-[12px] text-slate-500">${escaparHTML(doc.nombre)} · NIF ${escaparHTML(doc.nif)}</p>
            <p class="text-[12px] font-semibold text-rose-800">${escaparHTML(doc.periodo)}</p>
          </div>
        </div>
        <div class="space-y-3 p-4">
          ${doc.secciones.map((sec) => `
            <section>
              <p class="mb-1 border-b border-slate-300 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">${escaparHTML(sec.titulo)}</p>
              ${sec.filas.map((f) => `
                <div class="flex items-baseline justify-between gap-3 py-1 ${f.total ? 'border-t border-dashed border-slate-300 font-semibold text-slate-900' : ''}">
                  <span class="min-w-0">${escaparHTML(f.etiqueta)}</span>
                  <span class="shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono tabular-nums ${f.total ? 'bg-slate-200' : ''}">${formatoEuros(f.valor)}</span>
                </div>`).join('')}
            </section>`).join('')}
          <div class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[14px] font-bold ${aFavor ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-900 ring-1 ring-rose-200'}">
            <span>${escaparHTML(res.etiqueta)}</span><span class="font-mono tabular-nums">${formatoEuros(res.valor)}</span>
          </div>
        </div>
        <p class="bg-slate-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wider text-slate-400">Borrador simplificado · documento ficticio de formación</p>
      </div>
    </figure>`;
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
                  ${fila.map((v, i) => `<td class="py-2 ${numerica(i) ? 'whitespace-nowrap text-right font-mono text-[12px] tabular-nums' : ''} ${i === 0 && doc.columnas.length > 2 && String(v).length <= 10 ? 'whitespace-nowrap' : ''} ${i > 0 ? 'pl-2' : ''} ${i === fila.length - 1 && (doc.columnas.length === 2 || /saldo/i.test(doc.columnas[i])) ? 'font-semibold text-slate-900' : ''}">${escaparHTML(v)}</td>`).join('')}
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
      ${doc.exento ? filaTotal(doc.idioma === 'en' ? 'VAT exempt' : 'Exento de IVA', f(c.total)) : `
      <div ${campoDoc('base', resaltar)}>
        ${c.desglose.map((d) => filaTotal(`${t.base}${c.desglose.length > 1 ? ` (${d.pct} %)` : ''}`, f(d.base))).join('')}
      </div>
      <div ${campoDoc('iva', resaltar)}>
        ${c.desglose.map((d) => filaTotal(`${t.iva} ${d.pct} %`, f(d.cuota))).join('')}
      </div>`}
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
    ui.teoria[idBloque] = { grupo: 1, paso: 0, campo: 'receptor', calc: { base: '1000', iva: 21, ret: 15 }, amort: { valor: '4800', coef: 12, meses: '2' }, prestamo: { capital: '20000', tipo: '5', meses: '60' }, iva: { repercutido: '8000', soportado: '5000', compensar: '0' } };
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
    case 'liquidador-iva': return piezaLiquidador(bloque);
    case 'amortizacion': return piezaAmortizacion(bloque);
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

// Liquidación del 303: 477 contra 472, con cuotas a compensar de periodos anteriores
function liquidarIva(repercutido, soportado, compensar) {
  const diferencia = r2(repercutido - soportado);
  const aplicado = diferencia > 0 ? r2(Math.min(compensar, diferencia)) : 0;
  const resultado = r2(diferencia - aplicado);
  const lineas = [];
  if (repercutido) lineas.push({ cuenta: '477', debe: repercutido });
  if (resultado < 0) lineas.push({ cuenta: '4700', debe: -resultado });
  if (soportado) lineas.push({ cuenta: '472', haber: soportado });
  if (aplicado) lineas.push({ cuenta: '4700', haber: aplicado });
  if (resultado > 0) lineas.push({ cuenta: '4750', haber: resultado });
  return { diferencia, aplicado, resultado, pendiente: r2(compensar - aplicado), lineas };
}

function htmlLiquidadorResultado(v) {
  const rep = leerImporte(v.repercutido);
  const sop = leerImporte(v.soportado);
  const comp = String(v.compensar).trim() === '' ? 0 : leerImporte(v.compensar);
  if (!(rep >= 0) || !(sop >= 0) || !(comp >= 0) || rep + sop === 0) {
    return '<p class="rounded-lg bg-tinta-900/[0.03] p-3 text-sm text-tinta-700/70">Escribe los saldos de la 477 y la 472 (y, si hay, lo pendiente de compensar).</p>';
  }
  const l = liquidarIva(rep, sop, comp);
  const signo = l.resultado > 0 ? 'A ingresar' : l.resultado < 0 ? 'A compensar' : 'Resultado cero';
  const estilo = l.resultado > 0 ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-emerald-50 text-emerald-900 ring-emerald-200';
  return `
    <div class="space-y-1 rounded-lg bg-tinta-900/[0.03] p-3 text-sm">
      <div class="flex justify-between"><span>IVA devengado (477) − deducible (472)</span><span class="tabular-nums">${formatoEuros(l.diferencia)}</span></div>
      ${l.aplicado ? `<div class="flex justify-between"><span>Compensación aplicada</span><span class="tabular-nums">−${formatoEuros(l.aplicado)}</span></div>` : ''}
    </div>
    <div class="mt-2 flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-bold ring-1 ${estilo}">
      <span>${signo}</span><span class="tabular-nums">${formatoEuros(Math.abs(l.resultado))}</span>
    </div>
    ${l.pendiente > 0 ? `<p class="mt-2 text-[12.5px] text-tinta-700/70">Quedan ${formatoEuros(l.pendiente)} a compensar en próximos periodos (siguen en la 4700).</p>` : ''}
    <p class="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Asiento de liquidación</p>
    ${htmlAsiento(l.lineas, { compacto: true })}`;
}

function piezaLiquidador(bloque) {
  const { iva } = estadoTeoria(bloque.id);
  const campo = (id, etiqueta) => `
    <div>
      <label for="liq-${id}" class="mb-1 block text-xs font-semibold text-tinta-700/70">${etiqueta}</label>
      <div class="relative">
        <input id="liq-${id}" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-entrada="liq-${id}" data-foco="liq-${id}"
               value="${escaparHTML(iva[id])}"
               class="h-12 w-full rounded-xl border-2 border-tinta-900/15 bg-white pl-3 pr-8 text-base font-semibold tabular-nums outline-none transition focus:border-acento-500" />
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-tinta-700/50">€</span>
      </div>
    </div>`;
  return `
    <div class="my-6 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm" data-widget="liquidador">
      <div class="border-b border-tinta-900/10 bg-tinta-900/[0.03] px-4 py-3">
        <p class="text-sm font-bold">Liquidador del 303</p>
        <p class="text-xs text-tinta-700/70">Prueba con distintos saldos y mira cómo cambia el asiento: a ingresar, a compensar o aplicando una compensación anterior.</p>
      </div>
      <div class="space-y-4 p-4">
        <div class="grid grid-cols-3 gap-2">
          ${campo('repercutido', 'Saldo 477')}
          ${campo('soportado', 'Saldo 472')}
          ${campo('compensar', 'A compensar')}
        </div>
        <div id="liquidador-resultado" aria-live="polite">${htmlLiquidadorResultado(iva)}</div>
      </div>
    </div>`;
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

// Calculadora de amortización lineal (coeficientes de la tabla oficial)
const COEFICIENTES_AMORT = [
  { coef: 2, ejemplo: 'Edificios' },
  { coef: 10, ejemplo: 'Mobiliario' },
  { coef: 12, ejemplo: 'Maquinaria' },
  { coef: 16, ejemplo: 'Vehículos' },
  { coef: 25, ejemplo: 'Ordenadores' },
  { coef: 33, ejemplo: 'Software' },
];

function htmlAmortResultado(a) {
  const aviso = (t) => `<p class="rounded-lg bg-tinta-900/[0.03] p-3 text-sm text-tinta-700/70">${t}</p>`;
  const valor = leerImporte(a.valor);
  const meses = Number(String(a.meses).trim());
  if (!(valor > 0)) return aviso('Escribe el precio de adquisición del bien para ver el cálculo.');
  if (!Number.isInteger(meses) || meses < 1 || meses > 12) return aviso('Los meses en uso dentro del año deben ser un número entre 1 y 12.');
  const anual = r2(valor * a.coef / 100);
  const dotacion = r2(anual * meses / 12);
  const intangible = a.coef === 33;
  const anios = Math.round((100 / a.coef) * 10) / 10;
  const lineas = [{ cuenta: intangible ? '680' : '681', debe: dotacion }, { cuenta: intangible ? '280' : '281', haber: dotacion }];
  const fila = (x, y, fuerte = false) => `<div class="flex justify-between gap-3 ${fuerte ? 'border-t border-tinta-900/10 pt-1.5 text-[15px] font-bold' : ''}"><span>${x}</span><span class="tabular-nums">${y}</span></div>`;
  return `
    <div class="space-y-1 rounded-lg bg-tinta-900/[0.03] p-3 text-sm">
      ${fila(`Amortización de un año completo (${a.coef} %)`, formatoEuros(anual))}
      ${fila('Meses en uso este año', `${meses} de 12`)}
      ${fila('Dotación del ejercicio', formatoEuros(dotacion), true)}
      ${fila('Valor neto al cierre del primer año', formatoEuros(r2(valor - dotacion)))}
      ${fila('Vida útil mínima con este coeficiente', `${String(anios).replace('.', ',')} años`)}
    </div>
    <p class="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Asiento a 31 de diciembre${intangible ? ' · inmovilizado intangible' : ''}</p>
    ${htmlAsiento(lineas, { compacto: true })}`;
}

function piezaAmortizacion(bloque) {
  const { amort } = estadoTeoria(bloque.id);
  const chips = COEFICIENTES_AMORT.map(({ coef, ejemplo }) => {
    const sel = coef === amort.coef;
    return `
      <button type="button" data-accion="amort-coef" data-valor="${coef}" data-foco="amort-coef-${coef}" aria-pressed="${sel}"
              class="flex min-h-[52px] flex-col items-center justify-center rounded-lg border-2 px-1 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${sel ? 'border-tinta-900 bg-tinta-900 text-white' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'}">
        <span class="text-sm font-bold">${coef} %</span>
        <span class="text-[10.5px] font-medium ${sel ? 'text-white/70' : 'text-tinta-700/60'}">${ejemplo}</span>
      </button>`;
  }).join('');
  const campo = (id, etiqueta, sufijo, modo, valor) => `
    <div>
      <label for="amort-${id}" class="mb-1.5 block text-xs font-semibold text-tinta-700/70">${etiqueta}</label>
      <div class="relative">
        <input id="amort-${id}" type="text" inputmode="${modo}" enterkeyhint="done" autocomplete="off" data-entrada="amort-${id}" data-foco="amort-${id}"
               value="${escaparHTML(valor)}" placeholder="0"
               class="h-[52px] w-full rounded-xl border-2 border-tinta-900/15 bg-white pl-4 pr-12 text-lg font-semibold tabular-nums outline-none transition focus:border-acento-500" />
        <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-tinta-700/50">${sufijo}</span>
      </div>
    </div>`;
  return `
    <div class="my-6 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm" data-widget="amortizacion">
      <div class="border-b border-tinta-900/10 bg-tinta-900/[0.03] px-4 py-3">
        <p class="text-sm font-bold">Calculadora de amortización</p>
        <p class="text-xs text-tinta-700/70">Elige el tipo de bien y los meses que ha estado en uso este año.</p>
      </div>
      <div class="space-y-4 p-4">
        <div class="grid grid-cols-2 gap-3">
          ${campo('valor', 'Precio de adquisición', '€', 'decimal', amort.valor)}
          ${campo('meses', 'Meses en uso este año', 'meses', 'numeric', amort.meses)}
        </div>
        <div>
          <p class="mb-1.5 text-xs font-semibold text-tinta-700/70">Coeficiente máximo de la tabla</p>
          <div class="grid grid-cols-3 gap-1.5 sm:grid-cols-6">${chips}</div>
        </div>
        <div id="amort-resultado" aria-live="polite">${htmlAmortResultado(amort)}</div>
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
    if (caso.tipo === 'asiento') ui.caso[caso.id] = { lineas: [], borrador: { cuenta: null, lado: null, importe: '' }, error: '', resultado: null, intentos: 0, verSolucion: false };
    else if (caso.tipo === 'calculo') ui.caso[caso.id] = { valores: {}, estados: {}, intentos: 0, verSolucion: false };
    else ui.caso[caso.id] = { respuestas: {}, fallos: {}, errores: 0 };
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

  const cuerpo = { asiento: htmlCasoAsiento, calculo: htmlCasoCalculo }[caso.tipo] || htmlCasoClasificar;
  const html = cuerpo(caso, bloque);
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
    <div id="tarjeta-caso" class="scroll-mt-40 lg:scroll-mt-24">${html}</div>
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
      <p class="font-mono text-[11px] font-bold uppercase tracking-wider text-acento-700">Caso ${numero} de ${total} · ${{ asiento: 'Registra el asiento', calculo: 'Calcula' }[caso.tipo] || 'Clasifica'}</p>
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
const ETIQUETA_DOCUMENTO = { ticket: 'el ticket', resumen: 'el informe', extracto: 'el extracto', nominas: 'la hoja', modelo: 'el borrador' };

function htmlBloqueDocumento(caso, st) {
  const oculto = Boolean(st.docOculto);
  const docs = documentosDe(caso);
  const etiqueta = docs.length > 1
    ? 'los documentos'
    : (ETIQUETA_DOCUMENTO[docs[0].tipo] || 'la factura');
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

/* ---------- Caso tipo «calculo» (escribir el resultado) ---------- */

// Acepta "35000", "35.000", "1,78", "58,4 %" → número (o NaN)
function leerNumero(texto) {
  let t = String(texto).replace(/[\s€%]/g, '').replace('−', '-');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return parseFloat(t);
}

const toleranciaDe = (p) => (p.tolerancia !== undefined ? p.tolerancia : 0.005);

function evaluarRespuesta(p, texto) {
  const v = leerNumero(texto || '');
  if (Number.isNaN(v)) return 'vacio';
  return Math.abs(v - p.respuesta) <= toleranciaDe(p) + 1e-9 ? 'ok' : 'mal';
}

function formatoRespuesta(p) {
  if (p.unidad === '€') return formatoEuros(p.respuesta);
  const decimales = String(p.respuesta).includes('.') ? String(p.respuesta).split('.')[1].length : (p.unidad === '%' ? 1 : 0);
  return `${p.respuesta.toFixed(decimales).replace('.', ',')}${p.unidad ? ` ${p.unidad}` : ''}`;
}

function htmlCasoCalculo(caso, bloque) {
  const st = estadoCaso(caso);
  const numero = bloque.contenido.casos.indexOf(caso) + 1;
  const total = caso.preguntas.length;
  const aciertos = caso.preguntas.filter((p) => st.estados[p.id] === 'ok').length;
  const resuelto = aciertos === total;

  const campos = caso.preguntas.map((p, i) => {
    const e = st.estados[p.id];
    const borde = e === 'ok' ? 'border-acento-500 bg-acento-50' : (e === 'mal' || e === 'vacio') ? 'border-rose-300 bg-rose-50' : 'border-tinta-900/15 bg-white';
    const ultima = i === total - 1;
    let nota = '';
    if (e === 'ok') nota = `<p class="mt-2 flex gap-1.5 text-[13px] leading-snug text-acento-800"><span class="mt-px shrink-0">${svgIcono(ICONO_OK, 'h-4 w-4', 3)}</span><span><strong>Correcto.</strong> ${escaparHTML(p.explicacion)}</span></p>`;
    if (e === 'mal') nota = `<p class="mt-2 flex gap-1.5 text-[13px] leading-snug text-rose-700"><span class="mt-px shrink-0">${svgIcono(ICONO_BOMBILLA, 'h-4 w-4')}</span><span><strong>Revisa este dato.</strong> ${escaparHTML(p.pista)}</span></p>`;
    if (e === 'vacio') nota = `<p class="mt-2 text-[13px] font-medium text-rose-700">Escribe un número, por ejemplo 1.234,56.</p>`;
    return `
      <li class="${e === 'ok' && ui.animar ? 'animate-aparecer' : ''} rounded-xl border border-tinta-900/10 bg-white p-3.5">
        <label for="calc-${caso.id}-${p.id}" class="flex items-start gap-2 text-sm font-semibold leading-snug">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${e === 'ok' ? 'bg-acento-500 text-white' : 'bg-tinta-900/[0.06]'} font-mono text-xs font-bold">${e === 'ok' ? svgIcono(ICONO_OK, 'h-3.5 w-3.5', 3) : i + 1}</span>
          <span class="pt-0.5">${escaparHTML(p.texto)}</span>
        </label>
        <div class="relative mt-2.5">
          <input id="calc-${caso.id}-${p.id}" type="text" inputmode="decimal" enterkeyhint="${ultima ? 'done' : 'next'}" autocomplete="off"
                 data-entrada="calc-resp" data-pregunta="${p.id}" data-foco="calc-${p.id}"
                 value="${escaparHTML(st.valores[p.id] || '')}" placeholder="${p.unidad === '€' ? '0,00' : '0'}" ${resuelto ? 'readonly' : ''}
                 aria-invalid="${e === 'mal' || e === 'vacio'}"
                 class="${ui.sacudir === 'calc' && (e === 'mal' || e === 'vacio') ? 'animate-sacudir' : ''} h-[52px] w-full rounded-xl border-2 ${borde} pl-4 pr-12 text-lg font-semibold tabular-nums outline-none transition placeholder:font-normal placeholder:text-tinta-700/30 focus:border-acento-500" />
          ${p.unidad ? `<span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-tinta-700/50">${p.unidad}</span>` : ''}
        </div>
        ${nota}
      </li>`;
  }).join('');

  let correccion = '';
  if (resuelto) {
    correccion = htmlFeedback(true, '¡Todos los cálculos son correctos!', escaparHTML(caso.resumenOk || ''));
  } else if (st.intentos > 0) {
    correccion = htmlFeedback(false, `${aciertos} de ${total} ${total === 1 ? 'dato correcto' : 'datos correctos'}`,
      'Corrige los datos marcados en rojo (cada uno tiene su pista) y vuelve a comprobar.');
  }

  const solucion = st.verSolucion && !resuelto ? `
    <div class="${ui.animar ? 'animate-aparecer' : ''} rounded-xl border border-tinta-900/10 bg-white p-4">
      <p class="mb-2 text-sm font-bold">Solución</p>
      <dl class="divide-y divide-tinta-900/5 text-sm">
        ${caso.preguntas.map((p) => `
          <div class="py-2">
            <div class="flex justify-between gap-3"><dt class="font-medium">${escaparHTML(p.texto)}</dt><dd class="shrink-0 font-bold tabular-nums">${formatoRespuesta(p)}</dd></div>
            <p class="mt-0.5 text-[13px] text-tinta-700/80">${escaparHTML(p.explicacion)}</p>
          </div>`).join('')}
      </dl>
      <p class="mt-2 text-xs text-tinta-700/60">Escribe tú los resultados para marcar el caso como resuelto.</p>
    </div>` : '';

  const hayDatos = caso.preguntas.some((p) => String(st.valores[p.id] || '').trim());
  const acciones = resuelto
    ? `<button type="button" data-accion="asiento-reiniciar" class="${claseBoton.secundario} w-full sm:w-auto">Repetir el caso</button>`
    : `
      <div class="grid gap-2 sm:flex">
        <button type="button" data-accion="calc-comprobar" data-foco="comprobar" class="${claseBoton.primario} sm:flex-1">
          ${svgIcono(ICONO_OK, 'h-4 w-4', 2.5)} Comprobar resultados
        </button>
        <div class="grid grid-cols-2 gap-2 sm:flex">
          ${st.intentos > 0 && !st.verSolucion ? `<button type="button" data-accion="calc-solucion" class="${claseBoton.secundario}">Ver solución</button>` : ''}
          <button type="button" data-accion="asiento-reiniciar" class="${claseBoton.secundario} ${st.intentos > 0 && !st.verSolucion ? '' : 'col-span-2'}" ${hayDatos || st.intentos ? '' : 'disabled'}>Empezar de nuevo</button>
        </div>
      </div>`;

  return `
    <article class="overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm">
      ${cabeceraCaso(caso, numero, bloque.contenido.casos.length)}
      <div class="space-y-4 p-4 sm:p-5">
        ${documentosDe(caso).length ? htmlBloqueDocumento(caso, st) : ''}
        <div>
          <p class="mb-2 text-sm font-bold">Tus cálculos</p>
          <ol class="space-y-2.5">${campos}</ol>
        </div>
        <div id="correccion-${caso.id}" class="space-y-4" aria-live="polite">${correccion}${solucion}</div>
        ${acciones}
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
  'amort-coef': (el) => { estadoTeoria(estado.bloque).amort.coef = Number(el.dataset.valor); },

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

  /* --- Casos: cálculo --- */
  'calc-comprobar': () => {
    const caso = casoActual();
    const st = estadoCaso(caso);
    st.intentos += 1;
    caso.preguntas.forEach((p) => { st.estados[p.id] = evaluarRespuesta(p, st.valores[p.id]); });
    ui.animar = true;
    if (caso.preguntas.every((p) => st.estados[p.id] === 'ok')) {
      vibrar(30);
      st.verSolucion = false;
      marcarCasoResuelto(caso);
    } else {
      ui.sacudir = 'calc';
      vibrar([40, 60, 40]);
    }
    return () => asegurarVisible(document.getElementById(`correccion-${caso.id}`), 'abajo');
  },
  'calc-solucion': () => {
    const caso = casoActual();
    estadoCaso(caso).verSolucion = true;
    ui.animar = true;
    return () => asegurarVisible(document.getElementById(`correccion-${caso.id}`), 'abajo');
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
    } else if (tipo && tipo.startsWith('liq-')) {
      const st = estadoTeoria(estado.bloque);
      st.iva[tipo.slice(4)] = e.target.value;
      const destino = $('#liquidador-resultado');
      if (destino) destino.innerHTML = htmlLiquidadorResultado(st.iva);
    } else if (tipo && tipo.startsWith('prest-')) {
      const st = estadoTeoria(estado.bloque);
      st.prestamo[tipo.slice(6)] = e.target.value;
      const destino = $('#prestamo-resultado');
      if (destino) destino.innerHTML = htmlPrestamoResultado(st.prestamo);
    } else if (tipo === 'calc-resp') {
      const caso = casoActual();
      if (caso) estadoCaso(caso).valores[e.target.dataset.pregunta] = e.target.value;
    } else if (tipo && tipo.startsWith('amort-')) {
      const st = estadoTeoria(estado.bloque);
      st.amort[tipo.slice(6)] = e.target.value;
      const destino = $('#amort-resultado');
      if (destino) destino.innerHTML = htmlAmortResultado(st.amort);
    } else if (tipo === 'calc-base') {
      const st = estadoTeoria(estado.bloque);
      st.calc.base = e.target.value;
      const destino = $('#calc-resultado');
      if (destino) destino.innerHTML = htmlCalcResultado(st.calc); // sin repintar: el teclado no se cierra
    }
  });
  $('#contenido').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.entrada === 'calc-resp') {
      e.preventDefault();
      const campos = $$('[data-entrada="calc-resp"]');
      const siguiente = campos[campos.indexOf(e.target) + 1];
      if (siguiente) siguiente.focus();
      else { const boton = $('[data-accion="calc-comprobar"]'); if (boton) boton.click(); }
      return;
    }
    if (e.key === 'Enter' && e.target.dataset && /^(calc-base|prest-|liq-|amort-)/.test(e.target.dataset.entrada || '')) {
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
    else location.hash = RUTA_CERTIFICADO;
  });

  // Enlace al certificado (menú lateral)
  $('#enlace-certificado').addEventListener('click', (e) => {
    if (estado.vista === 'certificado') e.preventDefault();
    cerrarMenu({ devolverFoco: false });
    $('#contenido').focus({ preventScroll: true });
  });

  // Certificado: nombre, impresión y confeti (fuera del sistema de paneles)
  $('#vista-certificado').addEventListener('input', (e) => {
    if (e.target.dataset.cert === 'nombre') guardarJSON(CLAVE_NOMBRE, e.target.value.slice(0, 60));
  });
  $('#vista-certificado').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset.cert === 'nombre') { e.preventDefault(); e.target.blur(); }
  });
  $('#vista-certificado').addEventListener('click', (e) => {
    const el = e.target.closest('[data-cert]');
    if (!el) return;
    if (el.dataset.cert === 'imprimir') { e.preventDefault(); window.print(); }
    if (el.dataset.cert === 'confeti') { e.preventDefault(); lanzarConfeti(); }
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
   12. CERTIFICADO FINAL
   Se desbloquea con los 7 bloques completados (test aprobado + casos).
   ===================================================================== */
const ICONO_CANDADO = 'M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1zM12 15v2';
const ICONO_MEDALLA = 'M8 3h8l-2 6h-4zM12 9a6 6 0 110 12 6 6 0 010-12zM12 12.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z';

const bloquesCompletados = () => BLOQUES.filter((b) => progreso[b.id] && progreso[b.id].completado);
const certificadoDesbloqueado = () => bloquesCompletados().length === BLOQUES.length;

function registrarFechaCertificado() {
  const guardado = cargarJSON(CLAVE_CERTIFICADO, null);
  if (!guardado || !guardado.fecha) guardarJSON(CLAVE_CERTIFICADO, { fecha: new Date().toISOString() });
}

function fechaCertificado() {
  const guardado = cargarJSON(CLAVE_CERTIFICADO, null);
  const fecha = guardado && guardado.fecha ? new Date(guardado.fecha) : new Date();
  return (Number.isNaN(fecha.getTime()) ? new Date() : fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderizarCertificado() {
  const hechos = bloquesCompletados().length;
  const abierto = hechos === BLOQUES.length;
  if (abierto) registrarFechaCertificado();
  $('#barra-titulo').textContent = 'Certificado final';
  $('#barra-codigo').textContent = abierto ? '★' : `${hechos}/${BLOQUES.length}`;
  document.title = 'Certificado — Repaso Contable PGC';
  $('#vista-certificado').innerHTML = abierto ? htmlCertificado() : htmlCertificadoBloqueado(hechos);
  if (abierto && ui.celebrar) {
    ui.celebrar = false;
    requestAnimationFrame(lanzarConfeti);
  }
}

function htmlCertificadoBloqueado(hechos) {
  const total = BLOQUES.length;
  const filas = BLOQUES.map((b) => {
    const p = progresoDe(b.id);
    const cfg = configTest(b);
    const testOk = p.mejorTest >= cfg.aprobado;
    const nCasos = b.contenido.casos.length;
    const resueltos = b.contenido.casos.filter((c) => p.casosResueltos.includes(c.id)).length;
    const destino = p.completado ? 'teoria' : (testOk ? 'casos' : 'test');
    const chip = (ok, texto) => `<span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${ok ? 'bg-acento-50 text-acento-700' : 'bg-tinta-900/5 text-tinta-700/70'}">${ok ? svgIcono(ICONO_OK, 'h-3 w-3', 3) : ''}${texto}</span>`;
    return `
      <li>
        <a href="${crearRuta(b.id, destino)}"
           class="flex min-h-[64px] items-center gap-3 rounded-xl border-2 ${p.completado ? 'border-acento-500/40 bg-acento-50/60' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'} px-3 py-2.5 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${p.completado ? 'bg-acento-500 text-white' : 'bg-tinta-900/[0.06] text-tinta-700'}">
            ${p.completado ? svgIcono(ICONO_OK, 'h-5 w-5', 3) : svgIcono(b.icono)}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-mono text-[10px] font-bold uppercase tracking-wider text-tinta-700/50">Bloque ${b.id}</span>
            <span class="block truncate text-sm font-semibold">${escaparHTML(b.titulo)}</span>
            <span class="mt-1 flex flex-wrap gap-1">${chip(testOk, `Test ${p.mejorTest}/${cfg.porIntento}`)}${chip(resueltos === nCasos, `Casos ${resueltos}/${nCasos}`)}</span>
          </span>
          <span class="shrink-0 text-tinta-700/40">${svgIcono('M9 6l6 6-6 6', 'h-4 w-4', 2.5)}</span>
        </a>
      </li>`;
  }).join('');
  return `
    <section class="space-y-6">
      <header>
        <p class="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-acento-700">Meta final del itinerario</p>
        <h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Certificado Contable Junior de Gestoría</h1>
        <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-tinta-700/80">Se desbloquea cuando completas los ${total} bloques: test aprobado (8 de 10) y todos los casos prácticos resueltos. Toca un bloque pendiente para seguir justo donde lo dejaste.</p>
      </header>
      <div class="flex items-center gap-4 rounded-2xl border border-dashed border-tinta-900/20 bg-white/70 p-4 sm:p-5">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tinta-900 text-amber-300">${svgIcono(ICONO_CANDADO, 'h-7 w-7')}</span>
        <div class="min-w-0 flex-1">
          <p class="flex items-baseline justify-between gap-2 text-sm font-bold"><span>Certificado bloqueado</span><span class="font-mono text-acento-700">${hechos} / ${total}</span></p>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-tinta-900/10"><div class="h-full rounded-full bg-acento-500 transition-all duration-500" style="width:${(hechos / total) * 100}%"></div></div>
          <p class="mt-1.5 text-xs text-tinta-700/70">${hechos === total - 1 ? '¡Solo te queda un bloque!' : `Te faltan ${total - hechos} bloques.`}</p>
        </div>
      </div>
      <ol class="grid gap-2 sm:grid-cols-2" aria-label="Estado de los bloques">${filas}</ol>
    </section>`;
}

function htmlCertificado() {
  const nombre = cargarJSON(CLAVE_NOMBRE, '');
  const totalPreguntas = BLOQUES.reduce((s, b) => s + b.contenido.test.length, 0);
  const totalCasos = BLOQUES.reduce((s, b) => s + b.contenido.casos.length, 0);
  const notas = BLOQUES.map((b) => progresoDe(b.id).mejorTest);
  const media = notas.reduce((s, n) => s + n, 0) / notas.length;
  const bloques = BLOQUES.map((b) => {
    const cfg = configTest(b);
    return `
      <li class="flex items-center gap-2.5 rounded-lg bg-white/80 px-2.5 py-2 text-left ring-1 ring-tinta-900/5">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-acento-500 text-white">${svgIcono(ICONO_OK, 'h-3.5 w-3.5', 3)}</span>
        <span class="min-w-0 flex-1 truncate text-[13px] font-semibold"><span class="font-mono text-[11px] text-tinta-700/50">${b.codigo}</span> ${escaparHTML(b.titulo)}</span>
        <span class="shrink-0 font-mono text-[11px] font-semibold text-acento-700">${progresoDe(b.id).mejorTest}/${cfg.porIntento}</span>
      </li>`;
  }).join('');
  const sello = `
    <svg viewBox="0 0 120 120" class="h-full w-full" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#10a37f"/>
      <circle cx="60" cy="60" r="49" fill="none" stroke="#d1faec" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="60" cy="60" r="38" fill="#0b6f57"/>
      <path d="M44 61l11 11 22-24" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const siguientes = [
    { bloque: 6, pestana: 'teoria', titulo: 'Antes de cada trimestre', texto: 'La revisión de sumas y saldos y los cuadres del Bloque 6.' },
    { bloque: 4, pestana: 'teoria', titulo: 'Calendario fiscal', texto: 'Modelos 303, 111, 115 y resúmenes anuales del Bloque 4.' },
    { bloque: 5, pestana: 'teoria', titulo: 'Cierre del ejercicio', texto: 'La lista de comprobación del cierre del Bloque 5.' },
  ].map((x) => `
    <a href="${crearRuta(x.bloque, x.pestana)}" class="block rounded-xl border border-tinta-900/10 bg-white p-3.5 transition hover:border-acento-500/50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500">
      <span class="block text-sm font-bold">${x.titulo}</span>
      <span class="mt-0.5 block text-[13px] leading-snug text-tinta-700/75">${x.texto}</span>
    </a>`).join('');

  return `
    <section class="space-y-6">
      <header class="no-imprimir animate-aparecer text-center sm:text-left">
        <p class="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-acento-700">Itinerario completado · 7 / 7</p>
        <h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">¡Lo has conseguido!</h1>
        <p class="mt-2 max-w-2xl text-[15px] leading-relaxed text-tinta-700/80">Has repasado de principio a fin el trabajo contable de una gestoría. Escribe tu nombre en el certificado y guárdalo o imprímelo.</p>
      </header>

      <article id="certificado-tarjeta" aria-label="Certificado Contable Junior de Gestoría"
               class="animate-aparecer relative overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_2px_4px_rgba(15,27,45,.06),0_24px_48px_-20px_rgba(15,27,45,.45)] ring-1 ring-tinta-900/10 sm:p-2.5">
        <div class="rounded-xl border-2 border-acento-600/70 p-1 sm:p-1.5">
          <div class="relative overflow-hidden rounded-lg border border-acento-600/30 px-4 pb-6 pt-8 text-center sm:px-10 sm:pb-8 sm:pt-10"
               style="background: radial-gradient(120% 80% at 50% 0%, #ecfdf7 0%, #ffffff 55%), #fff;">
            <div class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/30"></div>
            <div class="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-acento-100/50"></div>
            <div class="relative">
              <p class="font-mono text-[10.5px] font-bold uppercase tracking-[0.28em] text-acento-700">Repaso Contable · PGC</p>
              <h2 class="mt-3 text-[30px] font-bold leading-none tracking-tight text-tinta-900 sm:text-[44px]">Enhorabuena</h2>
              <p class="mx-auto mt-2 max-w-md text-[15px] font-semibold uppercase tracking-[0.12em] text-tinta-700 sm:text-base">Certificado Contable Junior de Gestoría</p>
              <div class="mx-auto mt-5 flex max-w-[12rem] items-center gap-2 text-acento-600/60" aria-hidden="true"><span class="h-px flex-1 bg-current"></span><span class="h-1.5 w-1.5 rotate-45 bg-current"></span><span class="h-px flex-1 bg-current"></span></div>
              <p class="mt-5 text-sm text-tinta-700/70">Se otorga a</p>
              <label for="cert-nombre" class="sr-only">Tu nombre para el certificado</label>
              <input id="cert-nombre" data-cert="nombre" type="text" maxlength="60" autocomplete="name" enterkeyhint="done"
                     value="${escaparHTML(nombre)}" placeholder="Toca aquí y escribe tu nombre"
                     class="mx-auto mt-1 block w-full max-w-md rounded-none border-0 border-b-2 border-dashed border-tinta-900/25 bg-transparent px-2 pb-1.5 pt-1 text-center text-[22px] font-bold text-tinta-900 outline-none transition placeholder:text-[16px] placeholder:font-medium placeholder:text-tinta-700/35 focus:border-acento-500 sm:text-[28px]" />
              <p class="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-tinta-900/85">por completar el itinerario práctico de contabilidad financiera española según el Plan General de Contabilidad, aplicado al día a día de una gestoría: los <strong>${BLOQUES.length} bloques</strong>, con su test aprobado y los <strong>${totalCasos} casos prácticos</strong> resueltos sobre documentos de clientes.</p>
              <ol class="mx-auto mt-6 grid max-w-2xl gap-1.5 sm:grid-cols-2">${bloques}</ol>
              <div class="mx-auto mt-7 flex max-w-2xl items-end justify-between gap-4 text-left">
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Fecha</p>
                  <p class="border-t border-tinta-900/20 pt-1 text-sm font-semibold">${fechaCertificado()}</p>
                </div>
                <div class="h-20 w-20 shrink-0 sm:h-24 sm:w-24">${sello}</div>
                <div class="min-w-0 text-right">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-tinta-700/50">Nota media del test</p>
                  <p class="border-t border-tinta-900/20 pt-1 text-sm font-semibold">${String(Math.round(media * 10) / 10).replace('.', ',')} / 10</p>
                </div>
              </div>
              <p class="mx-auto mt-6 max-w-lg text-[11px] leading-snug text-tinta-700/55">Certificado de autoformación sin validez académica ni profesional oficial. Banco de ${totalPreguntas} preguntas y ${totalCasos} casos con documentos ficticios.</p>
            </div>
          </div>
        </div>
      </article>

      <div class="no-imprimir grid gap-2 sm:flex">
        <button type="button" data-cert="imprimir" class="${claseBoton.primario} sm:flex-1">
          ${svgIcono('M7 8V3h10v5M7 17H5a2 2 0 01-2-2v-5a2 2 0 012-2h14a2 2 0 012 2v5a2 2 0 01-2 2h-2M7 14h10v7H7z', 'h-4 w-4', 2)} Imprimir o guardar en PDF
        </button>
        <button type="button" data-cert="confeti" class="${claseBoton.secundario}">¡Celebrarlo otra vez!</button>
      </div>

      <section class="no-imprimir" aria-labelledby="cert-siguientes">
        <h2 id="cert-siguientes" class="mb-2 text-sm font-bold">Para tener a mano en tu puesto</h2>
        <div class="grid gap-2 sm:grid-cols-3">${siguientes}</div>
      </section>
    </section>`;
}

// Lluvia de confeti (sin librerías; se omite si el usuario prefiere menos movimiento)
function lanzarConfeti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const capa = document.createElement('div');
  capa.className = 'no-imprimir pointer-events-none fixed inset-0 z-[70] overflow-hidden';
  capa.setAttribute('aria-hidden', 'true');
  capa.dataset.confeti = '';
  const colores = ['#10a37f', '#0f1b2d', '#f59e0b', '#6366f1', '#ec4899', '#38bdf8', '#d1faec'];
  for (let i = 0; i < 90; i += 1) {
    const pieza = document.createElement('span');
    const ancho = 6 + Math.random() * 6;
    pieza.style.cssText = [
      'position:absolute', 'top:-24px', `left:${Math.random() * 100}%`,
      `width:${ancho}px`, `height:${ancho * (Math.random() < 0.3 ? 1 : 0.45)}px`,
      `background:${colores[i % colores.length]}`, `border-radius:${Math.random() < 0.3 ? '50%' : '1px'}`,
      `--deriva:${Math.round((Math.random() - 0.5) * 240)}px`, `--giro:${Math.round(Math.random() * 1080 - 540)}deg`,
      `animation:confeti ${(2.4 + Math.random() * 1.8).toFixed(2)}s cubic-bezier(.2,.6,.4,1) ${(Math.random() * 0.7).toFixed(2)}s forwards`,
    ].join(';');
    capa.appendChild(pieza);
  }
  document.body.appendChild(capa);
  setTimeout(() => capa.remove(), 5500);
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
  try { localStorage.removeItem(CLAVE_CERTIFICADO); } catch (e) { /* sin almacenamiento */ }
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
  const deUrl = leerRuta(location.hash);
  const inicial = (deUrl && !deUrl.certificado ? deUrl : null) || leerRuta(crearRutaGuardada()) || { bloque: 0, pestana: 'teoria' };
  estado.bloque = inicial.bloque;
  estado.pestana = inicial.pestana;
  if (deUrl && deUrl.certificado) {
    estado.vista = 'certificado';
    history.replaceState(null, '', RUTA_CERTIFICADO);
  } else {
    history.replaceState(null, '', crearRuta(inicial.bloque, inicial.pestana));
  }
  renderizar();
}

document.addEventListener('DOMContentLoaded', iniciar);

// Acceso desde la consola del navegador para depurar
window.RepasoPGC = { BLOQUES, CUADRO_PGC, PESTANAS, estado, ui, navegar, marcarBloqueCompletado, reiniciarProgreso, leerImporte, leerNumero, formatoEuros, lanzarConfeti };
