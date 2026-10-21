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
      { codigo: '17', nombre: 'Deudas a largo plazo por préstamos recibidos', cuentas: [['170', 'Deudas a largo plazo con entidades de crédito']] },
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
      { codigo: '21', nombre: 'Inmovilizaciones materiales', cuentas: [['211', 'Construcciones'], ['216', 'Mobiliario'], ['217', 'Equipos para procesos de información'], ['218', 'Elementos de transporte']] },
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
      { codigo: '40', nombre: 'Proveedores', clave: true, cuentas: [['400', 'Proveedores'], ['401', 'Proveedores, efectos comerciales a pagar']] },
      { codigo: '41', nombre: 'Acreedores varios', clave: true, cuentas: [['410', 'Acreedores por prestaciones de servicios']] },
      { codigo: '43', nombre: 'Clientes', clave: true, cuentas: [['430', 'Clientes'], ['436', 'Clientes de dudoso cobro']] },
      { codigo: '46', nombre: 'Personal', cuentas: [['460', 'Anticipos de remuneraciones'], ['465', 'Remuneraciones pendientes de pago']] },
      { codigo: '47', nombre: 'Administraciones Públicas', clave: true, cuentas: [['472', 'Hacienda Pública, IVA soportado'], ['477', 'Hacienda Pública, IVA repercutido'], ['4751', 'Hacienda Pública, acreedora por retenciones practicadas'], ['476', 'Organismos de la Seguridad Social, acreedores']] },
      { codigo: '48', nombre: 'Ajustes por periodificación', cuentas: [['480', 'Gastos anticipados'], ['485', 'Ingresos anticipados']] },
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
      { codigo: '52', nombre: 'Deudas a corto plazo por préstamos recibidos y otros conceptos', cuentas: [['520', 'Deudas a corto plazo con entidades de crédito'], ['523', 'Proveedores de inmovilizado a corto plazo']] },
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
      { codigo: '60', nombre: 'Compras', cuentas: [['600', 'Compras de mercaderías'], ['602', 'Compras de otros aprovisionamientos'], ['607', 'Trabajos realizados por otras empresas']] },
      { codigo: '62', nombre: 'Servicios exteriores', clave: true, cuentas: [['621', 'Arrendamientos y cánones'], ['622', 'Reparaciones y conservación'], ['623', 'Servicios de profesionales independientes'], ['625', 'Primas de seguros'], ['626', 'Servicios bancarios y similares'], ['628', 'Suministros'], ['629', 'Otros servicios']] },
      { codigo: '63', nombre: 'Tributos', cuentas: [['631', 'Otros tributos']] },
      { codigo: '64', nombre: 'Gastos de personal', cuentas: [['640', 'Sueldos y salarios'], ['642', 'Seguridad Social a cargo de la empresa']] },
      { codigo: '66', nombre: 'Gastos financieros', cuentas: [['662', 'Intereses de deudas']] },
      { codigo: '68', nombre: 'Dotaciones para amortizaciones', cuentas: [['681', 'Amortización del inmovilizado material']] },
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
      { codigo: '70', nombre: 'Ventas de mercaderías, de producción propia, de servicios, etc.', cuentas: [['700', 'Ventas de mercaderías'], ['705', 'Prestaciones de servicios'], ['708', 'Devoluciones de ventas y operaciones similares']] },
      { codigo: '75', nombre: 'Otros ingresos de gestión', cuentas: [['752', 'Ingresos por arrendamientos'], ['759', 'Ingresos por servicios diversos']] },
      { codigo: '76', nombre: 'Ingresos financieros', cuentas: [['769', 'Otros ingresos financieros']] },
    ],
  },
];

const CUENTAS = {};
CUADRO_PGC.forEach((g) => g.subgrupos.forEach((s) => s.cuentas.forEach(([codigo, nombre]) => { CUENTAS[codigo] = nombre; })));

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
   test:   { id, pregunta, opciones: [A, B, C], correcta, explicacion }
   casos:  { id, tipo: 'asiento', titulo, enunciado, cuentasDisponibles,
             solucion: [{ cuenta, debe | haber }], pista, explicacion }
           { id, tipo: 'clasificar', titulo, enunciado,
             cuentas: [{ codigo, grupo, pista, explicacion }] }
   ===================================================================== */
const ICONOS = {
  balanza: 'M12 3v18M8 21h8M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z',
  factura: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
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

  test: [
    {
      id: 'b0-q1',
      pregunta: 'Revisas el extracto del banco: la cuenta corriente de la empresa tiene 8.500 €. ¿En qué masa patrimonial está ese saldo?',
      opciones: ['Activo corriente', 'Activo no corriente', 'Patrimonio neto'],
      correcta: 0,
      explicacion: 'La 572 Bancos es tesorería: dinero disponible de inmediato. Por eso es activo corriente. El activo no corriente es para bienes que se usan más de un año, como un ordenador o un vehículo.',
    },
    {
      id: 'b0-q2',
      pregunta: 'Contabilizas la factura de un proveedor de mercaderías que pagarás a 60 días. Para la empresa, ¿qué es el saldo de la cuenta 400 Proveedores?',
      opciones: ['Un activo, porque la mercancía ya está en el almacén', 'Un pasivo corriente', 'Un gasto del grupo 6'],
      correcta: 1,
      explicacion: 'La 400 recoge lo que debes al proveedor: es una deuda y vence en menos de un año, así que es pasivo corriente. La mercancía comprada va a la 600 Compras de mercaderías (gasto), no a la 400.',
    },
    {
      id: 'b0-q3',
      pregunta: 'Pagas por transferencia una factura de proveedor de 1.200 € que ya estaba contabilizada. ¿Cuál es el asiento del pago?',
      opciones: ['572 Bancos al Debe · 400 Proveedores al Haber', '600 Compras al Debe · 572 Bancos al Haber', '400 Proveedores al Debe · 572 Bancos al Haber'],
      correcta: 2,
      explicacion: 'Al pagar, la deuda con el proveedor desaparece (un pasivo baja por el Debe) y sale dinero del banco (un activo baja por el Haber). La opción con la 600 duplicaría el gasto, que ya se registró al contabilizar la factura.',
    },
    {
      id: 'b0-q4',
      pregunta: 'Te piden registrar el alquiler mensual de la oficina. ¿En qué grupo del PGC buscas la cuenta del gasto?',
      opciones: ['Grupo 2 · Activo no corriente', 'Grupo 6 · Compras y gastos', 'Grupo 4 · Acreedores y deudores'],
      correcta: 1,
      explicacion: 'El alquiler es un gasto: va a la 621 Arrendamientos y cánones (subgrupo 62, Servicios exteriores). En el grupo 4 estaría la deuda con el arrendador (410) si no lo pagas al momento, pero no el gasto.',
    },
    {
      id: 'b0-q5',
      pregunta: 'Los socios amplían capital ingresando 3.000 € en el banco. ¿Qué efecto tiene en la ecuación del balance?',
      opciones: ['Sube el activo y sube el pasivo', 'Sube el activo y baja el patrimonio neto', 'Sube el activo y sube el patrimonio neto'],
      correcta: 2,
      explicacion: 'Aumenta el banco (activo) y aumenta el capital social (100), que es patrimonio neto. El capital no es una deuda con terceros, por eso no es pasivo. Activo = Pasivo + PN sigue cuadrando: +3.000 a cada lado.',
    },
  ],

  casos: [
    {
      id: 'b0-c1',
      tipo: 'asiento',
      titulo: 'Aportación del capital inicial',
      enunciado: 'Se constituye <strong>Distribuciones Levante, S.L.</strong> Los dos socios ingresan <strong>3.000 € cada uno</strong> en la cuenta de la empresa en el banco. El capital social total es de 6.000 €. Registra el asiento.',
      cuentasDisponibles: ['572', '570', '100', '551', '129', '400'],
      solucion: [{ cuenta: '572', debe: 6000 }, { cuenta: '100', haber: 6000 }],
      pista: 'Piensa qué aumenta en la empresa (¿dónde está ahora el dinero?) y de dónde procede.',
      explicacion: 'El banco (activo) aumenta: se carga la 572 por 6.000 €. El capital social (patrimonio neto) aumenta: se abona la 100 por 6.000 €. Puedes registrarlo en dos líneas de 3.000 € por socio o en una sola: el resultado es el mismo.',
    },
    {
      id: 'b0-c2',
      tipo: 'asiento',
      titulo: 'Traspaso del banco a la caja',
      enunciado: 'Sacas <strong>300 €</strong> del cajero con la tarjeta de la empresa para reponer el fondo de caja de la oficina (mensajería, pequeños gastos…). Registra el asiento.',
      cuentasDisponibles: ['570', '572', '629', '626', '551', '100'],
      solucion: [{ cuenta: '570', debe: 300 }, { cuenta: '572', haber: 300 }],
      pista: 'No se ha gastado nada todavía: el dinero solo cambia de sitio.',
      explicacion: 'La caja (570, activo) aumenta y se carga; el banco (572, activo) disminuye y se abona. No es un gasto (629) ni una comisión (626): el gasto se registrará cuando pagues algo con ese efectivo y tengas el ticket o la factura.',
    },
    {
      id: 'b0-c3',
      tipo: 'clasificar',
      titulo: 'Clasifica cada cuenta en su grupo',
      enunciado: 'Te pasan el listado de saldos de un cliente nuevo. Toca el número del grupo del PGC al que pertenece cada cuenta.',
      cuentas: [
        { codigo: '623', grupo: 6, pista: 'Es lo que pagas a un asesor o a un abogado. ¿Algo que tienes, que debes o que consumes?', explicacion: 'Gasto (servicios exteriores): va a Pérdidas y Ganancias.' },
        { codigo: '572', grupo: 5, pista: 'Es el dinero de la cuenta corriente.', explicacion: 'Tesorería: activo corriente.' },
        { codigo: '100', grupo: 1, pista: 'Es lo que aportaron los socios al crear la empresa.', explicacion: 'Financiación básica: patrimonio neto.' },
        { codigo: '472', grupo: 4, pista: 'Recoge el IVA de tus compras. Está en el mismo grupo que proveedores y clientes.', explicacion: 'Administraciones Públicas: activo corriente (crédito con Hacienda).' },
        { codigo: '705', grupo: 7, pista: 'Es lo que facturas a tus clientes por los servicios prestados.', explicacion: 'Ingreso: va a Pérdidas y Ganancias.' },
        { codigo: '217', grupo: 2, pista: 'Ordenadores que la empresa usará durante varios años.', explicacion: 'Inmovilizado material: activo no corriente.' },
        { codigo: '400', grupo: 4, pista: 'Lo que debes a quien te vende la mercancía.', explicacion: 'Deuda comercial: pasivo corriente.' },
        { codigo: '300', grupo: 3, pista: 'Mercancía que queda en el almacén al cierre.', explicacion: 'Existencias: activo corriente.' },
      ],
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
    descripcion: 'El núcleo del puesto: registrar facturas recibidas, separar proveedores de acreedores, aplicar el IVA soportado, las retenciones de IRPF a profesionales y tratar correctamente los suplidos.',
    distintivo: 'Núcleo',
    icono: ICONOS.factura,
    temas: ['Factura recibida (6xx / 472 / 400)', 'Proveedores (400) vs Acreedores (410)', 'Retenciones IRPF (4751)', 'Suplidos', 'Devoluciones y rappels (608 / 609)'],
    contenido: { teoria: [], test: [], casos: [] },
  },
  {
    id: 2,
    codigo: 'B2',
    titulo: 'Tesorería y Bancos',
    tituloLargo: 'Tesorería y Conciliación Bancaria',
    descripcion: 'El día a día con el banco: puntear el extracto contra la contabilidad, registrar comisiones y gastos bancarios, y contabilizar cobros de clientes y pagos a proveedores.',
    distintivo: null,
    icono: ICONOS.banco,
    temas: ['Bancos (572)', 'Punteo de extractos', 'Conciliación bancaria', 'Comisiones (626)', 'Cobros (430) y pagos (400/410)'],
    contenido: { teoria: [], test: [], casos: [] },
  },
  {
    id: 3,
    codigo: 'B3',
    titulo: 'Impuestos y Liquidaciones',
    tituloLargo: 'Ciclo de Impuestos y Liquidaciones',
    descripcion: 'Qué se declara en cada modelo, de dónde salen las cifras y cómo se contabiliza la liquidación: IVA trimestral, retenciones de trabajo y profesionales, y retenciones de alquileres.',
    distintivo: null,
    icono: ICONOS.impuestos,
    temas: ['Modelo 303 (IVA)', 'Modelo 111 (retenciones)', 'Modelo 115 (alquileres)', 'Asiento de liquidación (472 / 477 / 4750 / 4700)', 'Calendario trimestral'],
    contenido: { teoria: [], test: [], casos: [] },
  },
  {
    id: 4,
    codigo: 'B4',
    titulo: 'Cierre y Periodificación',
    tituloLargo: 'Operaciones de Cierre y Periodificación',
    descripcion: 'El soporte al cierre: amortizar el inmovilizado, imputar cada gasto e ingreso a su ejercicio y reconocer el riesgo de los clientes morosos.',
    distintivo: null,
    icono: ICONOS.cierre,
    temas: ['Amortizaciones (681 / 281)', 'Gastos anticipados (480)', 'Ingresos anticipados (485)', 'Clientes dudoso cobro (436)', 'Deterioro de créditos (694 / 490)'],
    contenido: { teoria: [], test: [], casos: [] },
  },
  {
    id: 5,
    codigo: 'B5',
    titulo: 'Análisis y Visión Senior',
    tituloLargo: 'Análisis Financiero y Visión Senior',
    descripcion: 'Leer lo que cuentan los números: interpretar el Balance y la Cuenta de Pérdidas y Ganancias, detectar descuadres y entender la salud financiera de la empresa.',
    distintivo: null,
    icono: ICONOS.analisis,
    temas: ['Balance de situación', 'Cuenta de Pérdidas y Ganancias', 'Fondo de maniobra', 'Ratios de liquidez', 'Endeudamiento'],
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
const PORCENTAJE_APROBADO = 0.8; // 4 de 5 en el test

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
// { 0: { mejorTest: 4, casosResueltos: ['b0-c1'], completado: false } }
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
  if (!progreso[idBloque]) progreso[idBloque] = { mejorTest: 0, casosResueltos: [], completado: false };
  return progreso[idBloque];
}

// Recalcula si el bloque está completado: test aprobado + todos los casos resueltos
function evaluarProgreso(bloque) {
  const p = progresoDe(bloque.id);
  const nTest = bloque.contenido.test.length;
  const nCasos = bloque.contenido.casos.length;
  if (nTest + nCasos === 0) return;
  const testOk = nTest === 0 || p.mejorTest >= Math.ceil(nTest * PORCENTAJE_APROBADO);
  const casosOk = bloque.contenido.casos.every((c) => p.casosResueltos.includes(c.id));
  const antes = p.completado;
  p.completado = testOk && casosOk;
  guardarJSON(CLAVE_PROGRESO, progreso);
  actualizarMenu();
  actualizarProgresoBloque(bloque);
  if (!antes && p.completado) mostrarAviso(`¡${bloque.codigo} completado! Test aprobado y todos los casos resueltos.`);
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
  const aprobado = p.mejorTest >= Math.ceil(nTest * PORCENTAJE_APROBADO);
  const resueltos = bloque.contenido.casos.filter((c) => p.casosResueltos.includes(c.id)).length;
  const chip = (ok, texto) => `
    <span class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${ok ? 'bg-acento-50 text-acento-700' : 'bg-tinta-900/5 text-tinta-700/70'}">
      ${ok ? svgIcono(ICONO_OK, 'h-3.5 w-3.5', 2.5) : '<span class="h-1.5 w-1.5 rounded-full bg-current opacity-50"></span>'}${texto}
    </span>`;
  caja.classList.remove('hidden');
  caja.classList.add('flex');
  caja.innerHTML = `
    <span class="text-xs font-medium text-tinta-700/60">Tu avance:</span>
    ${chip(aprobado, `Test ${p.mejorTest}/${nTest}`)}
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
    const n = bloque.contenido[id].length;
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
   6. TEORÍA
   ===================================================================== */
function estadoTeoria(idBloque) {
  if (!ui.teoria[idBloque]) ui.teoria[idBloque] = { grupo: 1, paso: 0 };
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
function estadoTest(idBloque) {
  if (!ui.test[idBloque]) ui.test[idBloque] = { indice: 0, respuestas: [], terminado: false };
  return ui.test[idBloque];
}

function renderizarTest(bloque) {
  const preguntas = bloque.contenido.test;
  if (preguntas.length === 0) return estadoVacio(bloque, 'test');
  const st = estadoTest(bloque.id);
  return st.terminado ? htmlResultadoTest(bloque, preguntas, st) : htmlPreguntaTest(preguntas, st);
}

function puntosProgresoTest(preguntas, st) {
  return preguntas.map((q, i) => {
    const r = st.respuestas[i];
    let color = 'bg-tinta-900/10';
    if (r !== undefined) color = r === q.correcta ? 'bg-acento-500' : 'bg-rose-500';
    else if (i === st.indice) color = 'bg-tinta-900';
    return `<span class="h-1.5 flex-1 rounded-full ${color} transition-colors"></span>`;
  }).join('');
}

function htmlPreguntaTest(preguntas, st) {
  const q = preguntas[st.indice];
  const respuesta = st.respuestas[st.indice];
  const respondida = respuesta !== undefined;
  const acierto = respuesta === q.correcta;
  const ultima = st.indice === preguntas.length - 1;

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
        acierto ? '¡Correcto!' : `No es correcto. La respuesta es la ${LETRAS[q.correcta]}.`,
        escaparHTML(q.explicacion))
    : '';

  return `
    <div id="tarjeta-test" class="scroll-mt-40 lg:scroll-mt-24 rounded-2xl border border-tinta-900/10 bg-white p-4 shadow-sm sm:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="font-mono text-xs font-semibold uppercase tracking-wider text-tinta-700/60">Pregunta ${st.indice + 1} de ${preguntas.length}</p>
        <p class="text-xs font-semibold text-tinta-700/60">${st.respuestas.filter((r, i) => r === preguntas[i].correcta).length} aciertos</p>
      </div>
      <div class="mb-5 flex gap-1.5" aria-hidden="true">${puntosProgresoTest(preguntas, st)}</div>
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

function htmlResultadoTest(bloque, preguntas, st) {
  const aciertos = st.respuestas.filter((r, i) => r === preguntas[i].correcta).length;
  const total = preguntas.length;
  const aprobado = aciertos >= Math.ceil(total * PORCENTAJE_APROBADO);
  const mejor = progresoDe(bloque.id).mejorTest;
  const mensaje = aciertos === total
    ? '¡Pleno! Tienes los fundamentos muy claros.'
    : aprobado
      ? 'Muy bien. Repasa la explicación de la pregunta fallada y pasa a los casos prácticos.'
      : 'Conviene repasar la teoría del bloque antes de seguir. Revisa las explicaciones de abajo.';

  return `
    <div id="tarjeta-test" class="${ui.animar ? 'animate-aparecer' : ''} scroll-mt-40 lg:scroll-mt-24 overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm">
      <div class="p-6 text-center ${aprobado ? 'bg-acento-50' : 'bg-amber-50'}">
        <p class="font-mono text-xs font-semibold uppercase tracking-wider text-tinta-700/60">Resultado del test</p>
        <p class="mt-2 font-mono text-5xl font-bold ${aprobado ? 'text-acento-700' : 'text-amber-700'}">${aciertos}<span class="text-2xl text-tinta-700/40">/${total}</span></p>
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
                <p class="font-semibold">${escaparHTML(q.pregunta)}</p>
                <p class="mt-1 text-tinta-700/80"><span class="font-semibold">${LETRAS[q.correcta]}) ${escaparHTML(q.opciones[q.correcta])}</span>${ok ? '' : ` · tu respuesta: ${LETRAS[st.respuestas[i]]}`}</p>
                ${ok ? '' : `<p class="mt-1 text-tinta-700/70">${escaparHTML(q.explicacion)}</p>`}
              </div>
            </li>`;
        }).join('')}
      </ol>
      <div class="flex flex-col gap-2 border-t border-tinta-900/10 p-4 sm:flex-row">
        <button type="button" data-accion="test-repetir" data-foco="test-rep" class="${claseBoton.secundario}">Repetir el test</button>
        <button type="button" data-accion="ir-pestana" data-pestana="casos" class="${claseBoton.acento}">Ir a los casos prácticos ${svgIcono('M9 6l6 6-6 6', 'h-4 w-4', 2.5)}</button>
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

  const selector = `
    <div class="mb-5 grid gap-2 ${casos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}" role="group" aria-label="Elige un caso">
      ${casos.map((c, i) => {
        const activo = i === sc.activo;
        const hecho = resueltos.includes(c.id);
        return `
          <button type="button" data-accion="caso-elegir" data-caso="${i}" data-foco="caso-${i}" aria-pressed="${activo}"
                  class="flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-xl border-2 px-3 py-2 text-left transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${activo ? 'border-tinta-900 bg-tinta-900 text-white' : 'border-tinta-900/10 bg-white hover:border-tinta-900/25'}">
            <span class="flex w-full items-center justify-between gap-1">
              <span class="font-mono text-[11px] font-bold uppercase tracking-wider ${activo ? 'text-white/60' : 'text-tinta-700/50'}">Caso ${i + 1}</span>
              ${hecho ? `<span class="flex h-5 w-5 items-center justify-center rounded-full bg-acento-500 text-white">${svgIcono(ICONO_OK, 'h-3 w-3', 3)}</span>` : ''}
            </span>
            <span class="line-clamp-2 text-xs font-semibold leading-tight">${escaparHTML(c.titulo)}</span>
          </button>`;
      }).join('')}
    </div>`;

  const cuerpo = caso.tipo === 'asiento' ? htmlCasoAsiento(caso, bloque) : htmlCasoClasificar(caso, bloque);
  const siguiente = casos[sc.activo + 1];
  const resuelto = resueltos.includes(caso.id);

  return `
    ${selector}
    <div id="tarjeta-caso" class="scroll-mt-40 lg:scroll-mt-24">${cuerpo}</div>
    ${resuelto && siguiente ? `
      <div class="mt-4">
        <button type="button" data-accion="caso-elegir" data-caso="${sc.activo + 1}" class="${claseBoton.primario} w-full sm:w-auto">
          Siguiente caso: ${escaparHTML(siguiente.titulo)} ${svgIcono('M9 6l6 6-6 6', 'h-4 w-4', 2.5)}
        </button>
      </div>` : ''}`;
}

function cabeceraCaso(caso, numero) {
  return `
    <header class="border-b border-tinta-900/10 p-4 sm:p-5">
      <p class="font-mono text-[11px] font-bold uppercase tracking-wider text-acento-700">Caso ${numero} · ${caso.tipo === 'asiento' ? 'Registra el asiento' : 'Clasifica'}</p>
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

function corregirAsiento(caso, lineas) {
  const usuario = agruparLineas(lineas);
  const solucion = agruparLineas(caso.solucion);
  const mensajes = [];
  const estadoLinea = {}; // clave cuenta|lado → true/false

  const totalD = lineas.reduce((s, l) => s + centimos(l.debe || 0), 0);
  const totalH = lineas.reduce((s, l) => s + centimos(l.haber || 0), 0);
  if (totalD !== totalH) mensajes.push(`El asiento no cuadra: el Debe suma ${formatoEuros(totalD / 100)} y el Haber ${formatoEuros(totalH / 100)}.`);

  const cuentasSolucion = new Set(caso.solucion.map((l) => l.cuenta));
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
      <p class="mb-3 text-sm font-bold">Añadir una línea al asiento</p>
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
      ${cabeceraCaso(caso, numero)}
      <div class="space-y-4 p-4 sm:p-5">
        <details class="group rounded-xl bg-amber-50/70 text-sm text-amber-950">
          <summary class="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-3.5 font-semibold [&::-webkit-details-marker]:hidden">
            <span class="text-amber-600">${svgIcono(ICONO_BOMBILLA, 'h-4 w-4')}</span> ¿Necesitas una pista?
            <span class="ml-auto text-amber-600 transition group-open:rotate-180">${svgIcono('M6 9l6 6 6-6', 'h-4 w-4', 2.5)}</span>
          </summary>
          <p class="px-3.5 pb-3.5 leading-relaxed">${escaparHTML(caso.pista)}</p>
        </details>
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
function htmlCasoClasificar(caso, bloque) {
  const st = estadoCaso(caso);
  const numero = bloque.contenido.casos.indexOf(caso) + 1;
  const hechas = caso.cuentas.filter((c) => st.respuestas[c.codigo]).length;
  const total = caso.cuentas.length;
  const terminado = hechas === total;

  const tarjetas = caso.cuentas.map((c) => {
    const acertada = st.respuestas[c.codigo];
    const fallos = st.fallos[c.codigo] || [];
    const g = grupoPGC(c.grupo);
    if (acertada) {
      return `
        <li class="${ui.sacudir === 'ok-' + c.codigo ? 'animate-aparecer' : ''} rounded-xl border-2 border-acento-500/40 bg-acento-50 p-3">
          <div class="flex items-center gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acento-500 text-white">${svgIcono(ICONO_OK, 'h-4 w-4', 3)}</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold leading-snug"><span class="font-mono">${c.codigo}</span> · ${escaparHTML(nombreCuenta(c.codigo))}</span>
              <span class="block text-[13px] leading-snug text-acento-800">Grupo ${g.grupo} · ${escaparHTML(g.nombreCorto)} — ${escaparHTML(c.explicacion)}</span>
            </span>
          </div>
        </li>`;
    }
    return `
      <li class="rounded-xl border-2 ${fallos.length ? 'border-rose-200' : 'border-tinta-900/10'} bg-white p-3">
        <p class="text-sm font-semibold leading-snug"><span class="mr-1 rounded-md bg-tinta-900/[0.06] px-1.5 py-0.5 font-mono">${c.codigo}</span> ${escaparHTML(nombreCuenta(c.codigo))}</p>
        <div class="mt-3 grid grid-cols-7 gap-1" role="group" aria-label="Grupo de la cuenta ${c.codigo}">
          ${[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const fallado = fallos.includes(n);
            const sacude = ui.sacudir === `${c.codigo}-${n}`;
            return `
              <button type="button" data-accion="clasif-grupo" data-cuenta="${c.codigo}" data-grupo="${n}" data-foco="cl-${c.codigo}-${n}"
                      aria-label="Grupo ${n}" ${fallado ? 'disabled' : ''}
                      class="h-12 rounded-lg border-2 font-mono text-base font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento-500 ${fallado ? 'border-rose-300 bg-rose-50 text-rose-400 line-through' : 'border-tinta-900/10 bg-white hover:border-tinta-900/30 active:bg-tinta-900/5'} ${sacude ? 'animate-sacudir' : ''}">
                ${n}
              </button>`;
          }).join('')}
        </div>
        ${fallos.length ? `<p class="${ui.animar ? 'animate-aparecer' : ''} mt-2 flex gap-1.5 text-[13px] leading-snug text-rose-700"><span class="mt-px shrink-0">${svgIcono(ICONO_BOMBILLA, 'h-4 w-4')}</span><span><strong>Pista:</strong> ${escaparHTML(c.pista)}</span></p>` : ''}
      </li>`;
  }).join('');

  const resumen = terminado
    ? htmlFeedback(st.errores === 0, st.errores === 0 ? '¡Perfecto! Todas a la primera.' : 'Caso completado',
        st.errores === 0
          ? 'Dominas el primer dígito del PGC: es lo que más vas a usar para orientarte en un listado de saldos.'
          : `Has clasificado las ${total} cuentas con ${st.errores} ${st.errores === 1 ? 'fallo' : 'fallos'}. Repasa en la teoría el explorador del cuadro de cuentas y vuelve a intentarlo.`)
    : '';

  return `
    <article class="overflow-hidden rounded-2xl border border-tinta-900/10 bg-white shadow-sm">
      ${cabeceraCaso(caso, numero)}
      <div class="space-y-4 p-4 sm:p-5">
        <div>
          <div class="mb-1.5 flex justify-between text-xs font-semibold text-tinta-700/70">
            <span>${hechas} de ${total} clasificadas</span><span>${st.errores} ${st.errores === 1 ? 'fallo' : 'fallos'}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-tinta-900/10">
            <div class="h-full rounded-full bg-acento-500 transition-all duration-500" style="width:${(hechas / total) * 100}%"></div>
          </div>
        </div>
        <ol class="space-y-2.5">${tarjetas}</ol>
        <div aria-live="polite">${resumen}</div>
        ${hechas > 0 ? `<button type="button" data-accion="clasif-reiniciar" class="${claseBoton.secundario} w-full sm:w-auto">Empezar de nuevo</button>` : ''}
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

  /* --- Test --- */
  'test-responder': (el) => {
    const bloque = bloqueActivo();
    const st = estadoTest(bloque.id);
    if (st.respuestas[st.indice] !== undefined) return false;
    const opcion = Number(el.dataset.opcion);
    st.respuestas[st.indice] = opcion;
    ui.animar = true;
    if (opcion !== bloque.contenido.test[st.indice].correcta) {
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
    const preguntas = bloque.contenido.test;
    if (st.indice < preguntas.length - 1) {
      st.indice += 1;
    } else {
      st.terminado = true;
      ui.animar = true;
      const aciertos = st.respuestas.filter((r, i) => r === preguntas[i].correcta).length;
      const p = progresoDe(bloque.id);
      p.mejorTest = Math.max(p.mejorTest, aciertos);
      evaluarProgreso(bloque);
    }
    return () => {
      asegurarVisible($('#tarjeta-test'));
      const primera = $('[data-accion="test-responder"]');
      if (primera) primera.focus({ preventScroll: true }); // útil con teclado; sin efecto visual al tocar
    };
  },
  'test-repetir': () => {
    ui.test[estado.bloque] = { indice: 0, respuestas: [], terminado: false };
    return () => asegurarVisible($('#tarjeta-test'));
  },
  'ir-pestana': (el) => { navegar(estado.bloque, el.dataset.pestana); return false; },

  /* --- Casos: selector --- */
  'caso-elegir': (el) => {
    estadoCasos(estado.bloque).activo = Number(el.dataset.caso);
    return () => asegurarVisible($('#tarjeta-caso'));
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
    delete ui.caso[casoActual().id];
    return () => asegurarVisible($('#tarjeta-caso'));
  },

  /* --- Casos: clasificar --- */
  'clasif-grupo': (el) => {
    const caso = casoActual();
    const st = estadoCaso(caso);
    const codigo = el.dataset.cuenta;
    const elegido = Number(el.dataset.grupo);
    const cuenta = caso.cuentas.find((c) => c.codigo === codigo);
    if (!cuenta || st.respuestas[codigo]) return false;

    if (elegido === cuenta.grupo) {
      st.respuestas[codigo] = elegido;
      ui.sacudir = `ok-${codigo}`;
      vibrar(25);
      if (caso.cuentas.every((c) => st.respuestas[c.codigo])) {
        ui.animar = true;
        marcarCasoResuelto(caso);
      }
    } else {
      st.fallos[codigo] = [...(st.fallos[codigo] || []), elegido];
      st.errores += 1;
      ui.sacudir = `${codigo}-${elegido}`;
      ui.animar = true;
      vibrar([40, 60, 40]);
    }
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
    if (e.target.dataset.entrada !== 'importe') return;
    const caso = casoActual();
    if (caso) estadoCaso(caso).borrador.importe = e.target.value;
  });
  $('#contenido').addEventListener('keydown', (e) => {
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

function crearRutaGuardada() {
  const guardada = cargarJSON(CLAVE_RUTA, null);
  return guardada ? crearRuta(guardada.bloque, guardada.pestana) : '';
}

function iniciar() {
  // Normaliza progreso guardado con versiones anteriores
  Object.keys(progreso).forEach((k) => {
    const p = progreso[k] || {};
    progreso[k] = { mejorTest: p.mejorTest || 0, casosResueltos: Array.isArray(p.casosResueltos) ? p.casosResueltos : [], completado: Boolean(p.completado) };
  });

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
