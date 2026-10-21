/* =====================================================================
   REPASO CONTABLE PGC — app.js
   Lógica de navegación (menú lateral / hamburguesa y pestañas) y
   estructura de datos de los 6 bloques temáticos.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. DATOS DE LOS BLOQUES
   ---------------------------------------------------------------------
   Cada bloque guarda su contenido en tres arrays, uno por pestaña.
   De momento están vacíos; se irán rellenando en los próximos pasos.

   Forma prevista de cada elemento:

   teoria: {
     id: 'b1-t1',
     titulo: 'Registro de una factura recibida',
     cuerpo: '<p>HTML con la explicación…</p>',
     cuentas: [{ codigo: '600', nombre: 'Compras de mercaderías' }],
     ejemplo: [{ cuenta: '600', debe: 1000, haber: 0 }, …]   // opcional
   }

   test: {
     id: 'b1-q1',
     pregunta: '¿Qué cuenta recoge el IVA de una factura de compra?',
     opciones: ['472', '477', '4751', '400'],
     correcta: 0,                       // índice de la opción correcta
     explicacion: 'El IVA soportado deducible va a la 472…'
   }

   casos: {
     id: 'b1-c1',
     titulo: 'Factura de un abogado con retención',
     enunciado: 'Recibes la factura de…',
     cuentasDisponibles: ['623', '472', '4751', '410'],
     solucion: [
       { cuenta: '623',  debe: 1000, haber: 0 },
       { cuenta: '472',  debe: 210,  haber: 0 },
       { cuenta: '4751', debe: 0,    haber: 150 },
       { cuenta: '410',  debe: 0,    haber: 1060 }
     ]
   }
--------------------------------------------------------------------- */

const ICONOS = {
  balanza:    'M12 3v18M8 21h8M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z',
  factura:    'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  banco:      'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  impuestos:  'M19 5L5 19M7 9a2 2 0 100-4 2 2 0 000 4zm10 10a2 2 0 100-4 2 2 0 000 4z',
  cierre:     'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 14l2 2 4-4',
  analisis:   'M4 20h16M7 16v-5M12 16V7M17 16v-8',
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
    contenido: { teoria: [], test: [], casos: [] },
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
const CLAVE_RUTA = 'repasoPGC.ruta';
const CLAVE_PROGRESO = 'repasoPGC.progreso';

/* ---------------------------------------------------------------------
   2. ESTADO
--------------------------------------------------------------------- */
const estado = {
  bloque: 0,          // id del bloque activo (0–5)
  pestana: 'teoria',  // 'teoria' | 'test' | 'casos'
  menuAbierto: false, // solo relevante en móvil
};

// Progreso por bloque. Se rellenará cuando existan tests y casos.
// Forma: { 0: { completado: false, aciertosTest: 0, casosResueltos: [] }, … }
let progreso = cargarJSON(CLAVE_PROGRESO, {});

/* ---------------------------------------------------------------------
   3. UTILIDADES
--------------------------------------------------------------------- */
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

function svgIcono(ruta, clases = 'h-5 w-5') {
  return `<svg class="${clases}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${ruta}"/></svg>`;
}

/* ---------------------------------------------------------------------
   4. RUTAS (hash en la URL: #/bloque-1/test)
   Permiten compartir enlaces y que el botón "Atrás" de Android
   devuelva al bloque o pestaña anterior.
--------------------------------------------------------------------- */
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
  if (location.hash === ruta) {
    aplicarRuta({ bloque, pestana });
  } else {
    location.hash = ruta; // dispara 'hashchange' → aplicarRuta
  }
}

function aplicarRuta({ bloque, pestana }) {
  const cambiaBloque = bloque !== estado.bloque;
  estado.bloque = bloque;
  estado.pestana = pestana;
  guardarJSON(CLAVE_RUTA, { bloque, pestana });
  renderizar();
  if (cambiaBloque) window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------------
   5. RENDERIZADO
--------------------------------------------------------------------- */
const CLASES_ENLACE_ACTIVO = ['bg-white/10', 'text-white'];
const CLASES_ENLACE_INACTIVO = ['text-white/70'];
const CLASES_ICONO_ACTIVO = ['bg-acento-500', 'text-tinta-950'];
const CLASES_ICONO_INACTIVO = ['bg-white/5', 'text-white/60'];

function construirMenu() {
  const lista = $('#menu-bloques');
  lista.innerHTML = BLOQUES.map((b) => `
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
          ${svgIcono('M5 12l4 4 10-10', 'h-3 w-3')}
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

  // Progreso general
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
    if (activa) panel.innerHTML = RENDERIZADORES[id](bloque);
    else panel.innerHTML = '';
  });
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
  const bloque = BLOQUES.find((b) => b.id === estado.bloque);
  const pestana = PESTANAS.find((p) => p.id === estado.pestana);

  actualizarMenu();
  actualizarCabecera(bloque);
  actualizarPestanas(bloque);
  actualizarNavegacionInferior();
  document.title = `${bloque.codigo} · ${pestana.nombre} — Repaso Contable PGC`;
}

/* ---------------------------------------------------------------------
   6. RENDERIZADORES DE CADA PESTAÑA
   Por ahora muestran un estado vacío. En los próximos pasos cada uno
   pintará su contenido real (teoría, test interactivo y simulador).
--------------------------------------------------------------------- */
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

function renderizarTeoria(bloque) {
  const temas = bloque.contenido.teoria;
  if (temas.length === 0) return estadoVacio(bloque, 'teoria');
  // TODO (próximo paso): maquetar cada tema con sus cuentas y ejemplos.
  return temas.map((t) => `<article class="mb-6"><h2 class="text-lg font-semibold">${escaparHTML(t.titulo)}</h2>${t.cuerpo || ''}</article>`).join('');
}

function renderizarTest(bloque) {
  const preguntas = bloque.contenido.test;
  if (preguntas.length === 0) return estadoVacio(bloque, 'test');
  // TODO (próximo paso): test interactivo con corrección y explicación.
  return `<p class="text-sm">${preguntas.length} preguntas disponibles.</p>`;
}

function renderizarCasos(bloque) {
  const casos = bloque.contenido.casos;
  if (casos.length === 0) return estadoVacio(bloque, 'casos');
  // TODO (próximo paso): simulador de asientos Debe / Haber.
  return `<p class="text-sm">${casos.length} casos disponibles.</p>`;
}

const RENDERIZADORES = {
  teoria: renderizarTeoria,
  test: renderizarTest,
  casos: renderizarCasos,
};

/* ---------------------------------------------------------------------
   7. MENÚ MÓVIL (hamburguesa)
--------------------------------------------------------------------- */
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

// En móvil el menú cerrado no debe recibir foco; en escritorio siempre está visible.
function ajustarSegunPantalla() {
  const sidebar = $('#sidebar');
  if (esMovil()) {
    if (!estado.menuAbierto) sidebar.setAttribute('inert', '');
  } else {
    cerrarMenu({ devolverFoco: false });
    sidebar.removeAttribute('inert');
  }
}

// Mantiene el foco del teclado dentro del menú mientras está abierto.
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

// Deslizar el dedo hacia la izquierda sobre el menú lo cierra.
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

/* ---------------------------------------------------------------------
   8. EVENTOS
--------------------------------------------------------------------- */
function registrarEventos() {
  // Menú lateral: el enlace cambia el hash; aquí solo cerramos el menú en móvil
  $('#menu-bloques').addEventListener('click', (e) => {
    const enlace = e.target.closest('a[data-bloque]');
    if (!enlace) return;
    const id = Number(enlace.dataset.bloque);
    if (id === estado.bloque) {
      e.preventDefault();          // ya estamos en el bloque: no ensuciar el historial
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

  // Cambios de ruta (incluido el botón "Atrás" del navegador o de Android)
  window.addEventListener('hashchange', () => {
    const ruta = leerRuta(location.hash);
    if (ruta) {
      cerrarMenu({ devolverFoco: false });
      aplicarRuta(ruta);
    }
  });
}

/* ---------------------------------------------------------------------
   9. API PARA PRÓXIMOS PASOS
   Funciones que usarán el Test y los Casos Prácticos para guardar avance.
--------------------------------------------------------------------- */
function marcarBloqueCompletado(idBloque, completado = true) {
  progreso[idBloque] = { ...(progreso[idBloque] || {}), completado };
  guardarJSON(CLAVE_PROGRESO, progreso);
  actualizarMenu();
}

function reiniciarProgreso() {
  progreso = {};
  guardarJSON(CLAVE_PROGRESO, progreso);
  actualizarMenu();
}

/* ---------------------------------------------------------------------
   10. ARRANQUE
--------------------------------------------------------------------- */
function iniciar() {
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

function crearRutaGuardada() {
  const guardada = cargarJSON(CLAVE_RUTA, null);
  return guardada ? crearRuta(guardada.bloque, guardada.pestana) : '';
}

document.addEventListener('DOMContentLoaded', iniciar);

// Acceso desde la consola del navegador para depurar
window.RepasoPGC = { BLOQUES, PESTANAS, estado, navegar, marcarBloqueCompletado, reiniciarProgreso };
