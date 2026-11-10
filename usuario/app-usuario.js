const SUPABASE_URL = "https://yxcbwlrwmguwcqivujxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4Y2J3bHJ3bWd1d2NxaXZ1anhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDUzNzYsImV4cCI6MjEwNzc4MTM3Nn0.pNpTmIA34R5RkHrGuVTEm5-haFrHW_nH0IrW5LbzRFc";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let presupuestoDepto = null, gastosDepto = [], insumosDepto = [], mermasDepto = [], solicitudesDepto = [];
let vistaActual = "dashboard", usuarioActual = null;
const deptoIdFijo = 2; // Panadería y Repostería

const el = (id) => document.getElementById(id);
const dinero = (n) => "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sumar = (filas) => filas.reduce((total, f) => total + Number(f.monto || f.costo || 0), 0);

function limpiar(texto) {
    const d = document.createElement("div");
    d.textContent = texto ?? "";
    return d.innerHTML;
}

async function iniciar() {
    const correoSesion = localStorage.getItem("usuario_activo");
    if (!correoSesion) {
        window.location.href = "../index.html";
        return;
    }

    const { data: perfil, error } = await db
        .from("perfiles")
        .select("*")
        .eq("correo", correoSesion)
        .maybeSingle();

    if (error || !perfil) {
        window.location.href = "../index.html";
        return;
    }

    usuarioActual = perfil;
    el("nombre-usuario").textContent = perfil.correo;

    await cargarDatosDepartamento();
    configurarNavegacion();
    renderizarVista();
}

async function cargarDatosDepartamento() {
    const [p, g, m, i, s] = await Promise.all([
        db.from("presupuestos").select("*").eq("departamento_id", deptoIdFijo).maybeSingle(),
        db.from("gastos").select("*").eq("departamento_id", deptoIdFijo),
        db.from("mermas").select("*").eq("departamento_id", deptoIdFijo),
        db.from("insumos").select("*").eq("departamento_id", deptoIdFijo),
        db.from("solicitudes").select("*").eq("departamento_id", deptoIdFijo)
    ]);

    presupuestoDepto = p.data || { monto: 45000 };
    gastosDepto = g.data || [];
    mermasDepto = m.data || [];
    insumosDepto = i.data || [];
    solicitudesDepto = s.data || [];
}

function configurarNavegacion() {
    const nav = el("sidebarNavUsuario");
    nav.addEventListener("click", (e) => {
        const enlace = e.target.closest("a[data-vista]");
        if (!enlace) return;
        e.preventDefault();
        nav.querySelectorAll("a").forEach(a => a.classList.remove("activo"));
        enlace.classList.add("activo");
        vistaActual = enlace.dataset.vista;
        renderizarVista();
    });
}

function renderizarVista() {
    const contenedor = el("vista-contenedor");
    const titulo = el("titulo-vista");
    const subtitulo = el("subtitulo-vista");

    switch (vistaActual) {
        case "dashboard":
            titulo.textContent = "Dashboard Operativo"; subtitulo.textContent = "Resumen de Panadería y Repostería";
            contenedor.innerHTML = htmlDashboard(); postRenderDashboard(); break;
        case "gastos":
            titulo.textContent = "Gastos Operativos"; subtitulo.textContent = "Registro y control de gastos del área";
            contenedor.innerHTML = htmlGastos(); postRenderGastosUsr(); break;
        case "insumos":
            titulo.textContent = "Ingreso de Insumos"; subtitulo.textContent = "Recepción de materias primas";
            contenedor.innerHTML = htmlInsumos(); postRenderInsumosUsr(); break;
        case "mermas":
            titulo.textContent = "Control de Mermas"; subtitulo.textContent = "Registro de mermas y caducidades";
            contenedor.innerHTML = htmlMermas(); postRenderMermasUsr(); break;
        case "historial":
            titulo.textContent = "Historial de Movimientos"; subtitulo.textContent = "Consulta con filtros operativos";
            contenedor.innerHTML = htmlHistorial(); postRenderHistorial(); break;
    }
}

function htmlDashboard() {
    const totalP = Number(presupuestoDepto?.monto || 0);
    const totalG = sumar(gastosDepto);
    const totalM = sumar(mermasDepto);
    const disp = totalP - totalG;
    const pctUso = totalP > 0 ? Math.min(100, (totalG / totalP) * 100).toFixed(1) : 0;
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-azul" id="btn-abrir-solicitud-dash">+ Solicitar presupuesto</button>
        </div>
        <section class="tarjetas">
            <article class="tarjeta"><div><p class="tarjeta-titulo">Presupuesto Asignado</p><p class="tarjeta-numero">${dinero(totalP)}</p></div><span class="icono azul"><i class="bi bi-wallet2"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Gastado</p><p class="tarjeta-numero">${dinero(totalG)}</p></div><span class="icono verde"><i class="bi bi-cash-stack"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Disponible</p><p class="tarjeta-numero">${dinero(disp)}</p></div><span class="icono gris"><i class="bi bi-bank"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Merma Total</p><p class="tarjeta-numero">${dinero(totalM)}</p></div><span class="icono rojo"><i class="bi bi-graph-down-arrow"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Uso del Presupuesto</p><p class="tarjeta-numero">${pctUso}%</p></div><span class="icono amarillo"><i class="bi bi-pie-chart"></i></span></article>
        </section>
        <section class="fila-doble">
            <article class="caja">
                <h3>Rendimiento del Presupuesto</h3>
                <div class="departamento">
                    <div class="departamento-info"><span>Progreso de gastos actual</span><span><strong>${pctUso}%</strong></span></div>
                    <div class="barra" style="height: 14px;"><div class="relleno" style="width: ${pctUso}%;"></div></div>
                </div>
            </article>
            <article class="caja">
                <h3>Mis Solicitudes de Presupuesto</h3>
                <div class="tabla-scroll" style="max-height: 200px;">
                    <table>
                        <thead><tr><th>Fecha</th><th>Monto</th><th>Motivo</th><th>Estado</th></tr></thead>
                        <tbody id="tabla-solicitudes-mini"></tbody>
                    </table>
                </div>
            </article>
        </section>`;
}

function postRenderDashboard() {
    const tbody = el("tabla-solicitudes-mini");
    if (tbody) {
        tbody.innerHTML = solicitudesDepto.map(s => `
            <tr>
                <td>${s.fecha || 'Sin fecha'}</td>
                <td>${dinero(s.monto)}</td>
                <td>${limpiar(s.motivo)}</td>
                <td><span class="badge-estado estado-${s.estado || 'pendiente'}">${s.estado || 'pendiente'}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="vacio">No hay solicitudes registradas.</td></tr>';
    }

    el("btn-abrir-solicitud-dash")?.addEventListener("click", () => {
        el("modal-solicitud-usr").showModal();
    });
}

function htmlGastos() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;"><button class="btn-azul" id="btn-abrir-gasto-usr">+ Registrar gasto</button></div>
        <article class="caja"><h3>Registro de Gastos</h3><div class="tabla-scroll"><table><thead><tr><th>Fecha</th><th>Departamento</th><th>Concepto</th><th>Categoría</th><th>Proveedor</th><th>Monto</th><th>Estado</th><th class="derecha">Acciones</th></tr></thead><tbody id="tabla-gastos-usr"></tbody></table></div></article>`;
}

function htmlInsumos() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;"><button class="btn-azul" id="btn-abrir-insumo-usr">+ Registrar insumo</button></div>
        <article class="caja"><h3>Ingreso de Insumos</h3><div class="tabla-scroll"><table><thead><tr><th>Fecha</th><th>Departamento</th><th>Insumo</th><th>Cantidad</th><th>Proveedor</th><th class="derecha">Costo</th></tr></thead><tbody id="tabla-insumos-usr"></tbody></table></div></article>`;
}

function htmlMermas() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;"><button class="btn-azul" id="btn-abrir-merma-usr">+ Registrar merma</button></div>
        <article class="caja"><h3>Registro de Mermas y Pérdidas</h3><div class="tabla-scroll"><table><thead><tr><th>Fecha</th><th>Departamento</th><th>Producto</th><th>Motivo</th><th>Cantidad</th><th class="derecha">Valor</th></tr></thead><tbody id="tabla-mermas-usr"></tbody></table></div></article>`;
}

function htmlHistorial() {
    return `
        <article class="caja"><h3>Historial de Movimientos</h3>
            <div class="filtros-historial" style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button class="filtro-btn activo" data-filtro="todos" style="padding:6px 14px; border-radius:20px; border:1px solid var(--borde); background:white; cursor:pointer;">Todos</button>
                <button class="filtro-btn" data-filtro="gasto" style="padding:6px 14px; border-radius:20px; border:1px solid var(--borde); background:white; cursor:pointer;">Gastos</button>
                <button class="filtro-btn" data-filtro="insumo" style="padding:6px 14px; border-radius:20px; border:1px solid var(--borde); background:white; cursor:pointer;">Insumos</button>
                <button class="filtro-btn" data-filtro="merma" style="padding:6px 14px; border-radius:20px; border:1px solid var(--borde); background:white; cursor:pointer;">Mermas</button>
            </div>
            <div class="tabla-scroll"><table><thead><tr><th>Tipo</th><th>Fecha</th><th>Departamento</th><th>Descripción</th><th class="derecha">Monto</th></tr></thead><tbody id="tabla-historial-usuario"></tbody></table></div>
        </article>`;
}

function postRenderGastosUsr() {
    el("tabla-gastos-usr").innerHTML = gastosDepto.map(g => `
        <tr>
            <td>${g.fecha || '2025-02-01'}</td>
            <td>Panadería y Repostería</td>
            <td>${limpiar(g.descripcion || g.concepto || 'Insumo')}</td>
            <td>Operativo</td>
            <td>${limpiar(g.proveedor || 'Proveedor Local')}</td>
            <td>${dinero(g.monto)}</td>
            <td><span class="badge-estado estado-aprobada">Pagado</span></td>
            <td class="derecha"><button class="btn-rojo" style="padding:4px 10px; font-size:12px;" onclick="eliminarGastoUsr(${g.id})">Eliminar</button></td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="vacio">No hay gastos registrados.</td></tr>';

    el("btn-abrir-gasto-usr")?.addEventListener("click", () => el("modal-gasto-usr").showModal());
}

function postRenderInsumosUsr() {
    el("tabla-insumos-usr").innerHTML = insumosDepto.map(i => `
        <tr>
            <td>${i.fecha}</td>
            <td>Panadería y Repostería</td>
            <td>${limpiar(i.insumo)}</td>
            <td>${i.cantidad}</td>
            <td>${limpiar(i.proveedor)}</td>
            <td class="derecha">${dinero(i.costo)}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="vacio">No hay insumos registrados.</td></tr>';

    el("btn-abrir-insumo-usr")?.addEventListener("click", () => el("modal-insumo-usr").showModal());
}

function postRenderMermasUsr() {
    el("tabla-mermas-usr").innerHTML = mermasDepto.map(m => `
        <tr>
            <td>${m.fecha || '2025-01-15'}</td>
            <td>Panadería y Repostería</td>
            <td>${limpiar(m.producto || m.descripcion || 'Pan')}</td>
            <td>${limpiar(m.motivo || 'Caducidad')}</td>
            <td>${m.cantidad || '1 pza'}</td>
            <td class="derecha">${dinero(m.monto)}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="vacio">No hay mermas registradas.</td></tr>';

    el("btn-abrir-merma-usr")?.addEventListener("click", () => el("modal-merma-usr").showModal());
}

function postRenderHistorial() {
    const renderizarHistorialFiltro = (tipoFiltro = "todos") => {
        const tbody = el("tabla-historial-usuario");
        if (!tbody) return;
        let lista = [
            ...gastosDepto.map(g => ({ tipo: 'gasto', fecha: g.fecha || '2025-02-01', depto: 'Panadería y Repostería', desc: g.descripcion || 'Gasto', monto: g.monto })),
            ...insumosDepto.map(i => ({ tipo: 'insumo', fecha: i.fecha, depto: 'Panadería y Repostería', desc: `${i.insumo} (${i.cantidad})`, monto: i.costo })),
            ...mermasDepto.map(m => ({ tipo: 'merma', fecha: m.fecha || '2025-01-15', depto: 'Panadería y Repostería', desc: m.producto || 'Merma', monto: m.monto }))
        ];
        if (tipoFiltro !== "todos") lista = lista.filter(item => item.tipo.toLowerCase() === tipoFiltro.toLowerCase());
        lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        tbody.innerHTML = lista.map(i => `
            <tr>
                <td><span class="badge-estado ${i.tipo === 'gasto' ? 'estado-aprobada' : i.tipo === 'insumo' ? 'estado-pendiente' : 'estado-rechazada'}">${i.tipo.toUpperCase()}</span></td>
                <td>${i.fecha}</td>
                <td>${i.depto}</td>
                <td>${limpiar(i.desc)}</td>
                <td class="derecha">${dinero(i.monto)}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="vacio">No hay movimientos.</td></tr>';
    };
    renderizarHistorialFiltro();

    document.querySelectorAll(".filtro-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("activo"));
            e.target.classList.add("activo");
            renderizarHistorialFiltro(e.target.dataset.filtro);
        });
    });
}

async function eliminarGastoUsr(id) {
    if (!confirm("¿Deseas eliminar este gasto?")) return;
    await db.from("gastos").delete().eq("id", id);
    await cargarDatosDepartamento();
    renderizarVista();
}

el("form-gasto-usr")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await db.from("gastos").insert({
        fecha: el("gu-fecha").value,
        departamento_id: deptoIdFijo,
        descripcion: el("gu-concepto").value,
        categoria: el("gu-categoria").value,
        proveedor: el("gu-proveedor").value,
        monto: Number(el("gu-monto").value),
        estado_pago: "Pagado"
    });
    el("modal-gasto-usr").close();
    await cargarDatosDepartamento();
    renderizarVista();
});

el("form-merma-usr")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await db.from("mermas").insert({
        fecha: el("mu-fecha").value,
        departamento_id: deptoIdFijo,
        producto: el("mu-producto").value,
        motivo: el("mu-motivo").value,
        cantidad: el("mu-cantidad").value,
        monto: Number(el("mu-monto").value)
    });
    el("modal-merma-usr").close();
    await cargarDatosDepartamento();
    renderizarVista();
});

el("form-insumo-usr")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await db.from("insumos").insert({
        fecha: el("iu-fecha").value,
        departamento_id: deptoIdFijo,
        insumo: el("iu-nombre").value,
        cantidad: el("iu-cantidad").value,
        proveedor: el("iu-proveedor").value,
        costo: Number(el("iu-costo").value)
    });
    el("modal-insumo-usr").close();
    await cargarDatosDepartamento();
    renderizarVista();
});

el("form-solicitud-usr")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await db.from("solicitudes").insert({
        departamento_id: deptoIdFijo,
        solicitante: usuarioActual ? usuarioActual.correo : 'Panadería',
        monto: Number(el("su-monto").value),
        motivo: el("su-motivo").value,
        fecha: el("su-fecha").value,
        estado: 'pendiente'
    });
    el("modal-solicitud-usr").close();
    await cargarDatosDepartamento();
    renderizarVista();
    alert("¡Solicitud enviada correctamente!");
});

el("cerrar-sesion").addEventListener("click", () => {
    localStorage.removeItem("usuario_activo");
    localStorage.removeItem("rol_activo");
    window.location.href = "../index.html";
});

iniciar();