import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "./supabaseClient";
import { ENVASES, JABAS, ACTIVOS } from "./dataSkus";
import QuickCountModal from "./components/QuickCountModal";

const TODOS_LOS_SKUS = [...ENVASES, ...JABAS, ...ACTIVOS];
const SKU_MAP = Object.fromEntries(TODOS_LOS_SKUS.map((s) => [s.id, s]));

const ORDEN_RESULTADOS = [
  "330_VERDE",
  "330_AMBAR",
  "330_FLINT",
  "550_VERDE",
  "550_FLINT",
  "550_AMBAR",
  "600_AMBAR",
  "850_VERDE",
  "1000_AMBAR",
  "1000_FLINT",
  "JABA_330",
  "JABA_11",
  "JABA_1000",
  "PALETA_11",
  "PALETA_12",
  "CAJA_BEES"
];

function metaKey(id) {
  return `conteo_ciego_meta_${id}`;
}

const DRAFT_KEY = "conteo_ciego_borrador_v2";

export default function App() {
  const [skuActivo, setSkuActivo] = useState(null);
  const [modalInicial, setModalInicial] = useState(null);

  const [transporte, setTransporte] = useState("");
  const [placa, setPlaca] = useState("");
  const [responsable, setResponsable] = useState("");

  const [tiempo, setTiempo] = useState(0);
  const [cronometroActivo, setCronometroActivo] = useState(false);

  const [detalleConteo, setDetalleConteo] = useState({});
  const [marcadosResultados, setMarcadosResultados] = useState({});

  const [productos, setProductos] = useState([]);
  const [nombreProducto, setNombreProducto] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("");
  const [productoEditando, setProductoEditando] = useState(null);

  const [pfnItems, setPfnItems] = useState([]);
  const [nombrePfn, setNombrePfn] = useState("");
  const [cantidadPfn, setCantidadPfn] = useState("");
  const [pfnEditando, setPfnEditando] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [verHistorial, setVerHistorial] = useState(false);

  const [conteoEditando, setConteoEditando] = useState(null);

  const [detalleModal, setDetalleModal] = useState(false);
  const [detalleItemsHistorial, setDetalleItemsHistorial] = useState([]);
  const [conteoHistorialActual, setConteoHistorialActual] = useState(null);
  const [marcadosHistorial, setMarcadosHistorial] = useState({});

  const exportRef = useRef(null);

  useEffect(() => {
    if (!cronometroActivo) return;

    const intervalo = setInterval(() => {
      setTiempo((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalo);
  }, [cronometroActivo]);

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft);
      setTransporte(parsed.transporte || "");
      setPlaca(parsed.placa || "");
      setResponsable(parsed.responsable || "");
      setTiempo(parsed.tiempo || 0);
      setCronometroActivo(false);
      setDetalleConteo(parsed.detalleConteo || {});
      setProductos(parsed.productos || []);
      setPfnItems(parsed.pfnItems || []);
      setMarcadosResultados(parsed.marcadosResultados || {});
    } catch {
      // ignorar
    }
  }, []);

  useEffect(() => {
    const payload = {
      transporte,
      placa,
      responsable,
      tiempo,
      detalleConteo,
      productos,
      pfnItems,
      marcadosResultados
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [
    transporte,
    placa,
    responsable,
    tiempo,
    detalleConteo,
    productos,
    pfnItems,
    marcadosResultados
  ]);

  function limpiarBackup() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function iniciarCronometroSiEsNuevo() {
    if (!conteoEditando && !cronometroActivo) {
      setCronometroActivo(true);
    }
  }

  function guardarSku(valores) {
    iniciarCronometroSiEsNuevo();

    const sku = skuActivo;
    if (!sku) return;

    const esBotella = ENVASES.some((item) => item.id === sku.id);

    let nuevoDetalle;

    if (esBotella) {
      const cajas = Number(valores.cajas) || 0;
      const mas = Number(valores.mas) || 0;
      const menos = Number(valores.menos) || 0;
      const total = cajas * sku.pack + mas - menos;

      nuevoDetalle = {
        sku_codigo: sku.id,
        descripcion: sku.nombre,
        cajas,
        botellas_mas: mas,
        botellas_menos: menos,
        total_botellas: total
      };
    } else {
      const cantidad = Number(valores.cantidad) || 0;

      nuevoDetalle = {
        sku_codigo: sku.id,
        descripcion: sku.nombre,
        cajas: cantidad,
        botellas_mas: 0,
        botellas_menos: 0,
        total_botellas: cantidad
      };
    }

    setDetalleConteo((prev) => ({
      ...prev,
      [sku.id]: nuevoDetalle
    }));

    setSkuActivo(null);
    setModalInicial(null);
  }

  function abrirEditarSkuActual(idSku) {
    const sku = SKU_MAP[idSku];
    const actual = detalleConteo[idSku];
    if (!sku || !actual) return;

    if (ENVASES.some((e) => e.id === idSku)) {
      setModalInicial({
        cajas: actual.cajas || 0,
        mas: actual.botellas_mas || 0,
        menos: actual.botellas_menos || 0
      });
    } else {
      setModalInicial({
        cantidad: actual.cajas || 0
      });
    }

    setSkuActivo(sku);
  }

  function agregarOActualizarProducto() {
    if (!nombreProducto || !cantidadProducto) return;

    iniciarCronometroSiEsNuevo();

    if (productoEditando !== null) {
      setProductos((prev) =>
        prev.map((p, i) =>
          i === productoEditando
            ? { nombre: nombreProducto, cantidad: Number(cantidadProducto) || 0 }
            : p
        )
      );
      setProductoEditando(null);
    } else {
      setProductos((prev) => [
        ...prev,
        { nombre: nombreProducto, cantidad: Number(cantidadProducto) || 0 }
      ]);
    }

    setNombreProducto("");
    setCantidadProducto("");
  }

  function agregarOActualizarPfn() {
    if (!nombrePfn || !cantidadPfn) return;

    iniciarCronometroSiEsNuevo();

    if (pfnEditando !== null) {
      setPfnItems((prev) =>
        prev.map((p, i) =>
          i === pfnEditando
            ? { nombre: nombrePfn, cantidad: Number(cantidadPfn) || 0 }
            : p
        )
      );
      setPfnEditando(null);
    } else {
      setPfnItems((prev) => [
        ...prev,
        { nombre: nombrePfn, cantidad: Number(cantidadPfn) || 0 }
      ]);
    }

    setNombrePfn("");
    setCantidadPfn("");
  }

  const totalBotellasConteo = useMemo(() => {
    return Object.values(detalleConteo).reduce((acc, item) => {
      if (ENVASES.some((e) => e.id === item.sku_codigo)) {
        return acc + (item.total_botellas || 0);
      }
      return acc;
    }, 0);
  }, [detalleConteo]);

  const itemsOrdenados = useMemo(() => {
    return ORDEN_RESULTADOS.map((id) => detalleConteo[id]).filter((item) => !!item);
  }, [detalleConteo]);

  const envases330 = itemsOrdenados.filter((item) =>
    ["330_VERDE", "330_AMBAR", "330_FLINT"].includes(item.sku_codigo)
  );

  const envases11 = itemsOrdenados.filter((item) =>
    ["550_VERDE", "550_FLINT", "550_AMBAR", "600_AMBAR"].includes(item.sku_codigo)
  );

  const envases1000 = itemsOrdenados.filter((item) =>
    ["850_VERDE", "1000_AMBAR", "1000_FLINT"].includes(item.sku_codigo)
  );

  const jabasVacias = itemsOrdenados.filter((item) =>
    ["JABA_330", "JABA_11", "JABA_1000"].includes(item.sku_codigo)
  );

  const activosResultado = itemsOrdenados.filter((item) =>
    ["PALETA_11", "PALETA_12", "CAJA_BEES"].includes(item.sku_codigo)
  );

  const cajasLlenas330 = envases330.reduce((acc, item) => acc + (item.cajas || 0), 0);
  const cajasLlenas11 = envases11.reduce((acc, item) => acc + (item.cajas || 0), 0);
  const cajasLlenas1000 = envases1000.reduce((acc, item) => acc + (item.cajas || 0), 0);

  const jabas330Vacias = detalleConteo["JABA_330"]?.cajas || 0;
  const jabas11Vacias = detalleConteo["JABA_11"]?.cajas || 0;
  const jabas1000Vacias = detalleConteo["JABA_1000"]?.cajas || 0;

  const totalJabas330 = cajasLlenas330 + jabas330Vacias;
  const totalJabas11 = cajasLlenas11 + jabas11Vacias;
  const totalJabas1000 = cajasLlenas1000 + jabas1000Vacias;

  function marcarResultado(nombre) {
    setMarcadosResultados((prev) => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  }

  function marcarHistorial(nombre) {
    setMarcadosHistorial((prev) => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  }

  function renderLineaResultado(item, unidad, onEdit = null) {
    const valor = unidad === "botellas" ? item.total_botellas : item.cajas;

    return (
      <div
        key={item.sku_codigo}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          padding: 10,
          borderRadius: 10,
          marginBottom: 6,
          background: marcadosResultados[item.descripcion] ? "#b6f5b6" : "#fff"
        }}
      >
        <div
          onClick={() => marcarResultado(item.descripcion)}
          style={{
            flex: 1,
            cursor: "pointer",
            fontSize: 20,
            fontWeight: "bold",
            lineHeight: 1.3
          }}
        >
          {item.descripcion} → {valor} {unidad}
        </div>

        {onEdit && (
          <button onClick={onEdit} style={miniButtonStyle}>
            Editar
          </button>
        )}
      </div>
    );
  }

  function renderLineaSimple(nombre, valor, onEdit = null) {
    return (
      <div
        key={nombre}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          padding: 10,
          borderRadius: 10,
          marginBottom: 6,
          background: marcadosResultados[nombre] ? "#b6f5b6" : "#fff"
        }}
      >
        <div
          onClick={() => marcarResultado(nombre)}
          style={{
            flex: 1,
            cursor: "pointer",
            fontSize: 20,
            fontWeight: "bold",
            lineHeight: 1.3
          }}
        >
          {nombre} → {valor}
        </div>

        {onEdit && (
          <button onClick={onEdit} style={miniButtonStyle}>
            Editar
          </button>
        )}
      </div>
    );
  }

  async function guardarConteo() {
    if (!transporte || !placa || !responsable) {
      alert("Completa transporte, placa y responsable");
      return;
    }

    const confirmado = window.confirm(
      `¿Deseas guardar este conteo?\n\nTransporte: ${transporte}\nPlaca: ${placa}\nResponsable: ${responsable}\nTiempo: ${Math.floor(
        tiempo / 60
      )}m ${tiempo % 60}s`
    );

    if (!confirmado) return;

    const cabecera = {
      usuario: responsable,
      transporte,
      placa,
      responsable,
      fecha: new Date(),
      tiempo_conteo: tiempo,
      total_botellas: totalBotellasConteo,
      estado: "en_proceso"
    };

    const detalleArray = Object.values(detalleConteo).map((item) => ({
      conteo_id: 0,
      sku_codigo: item.sku_codigo,
      descripcion: item.descripcion,
      cajas: item.cajas || 0,
      botellas_mas: item.botellas_mas || 0,
      botellas_menos: item.botellas_menos || 0,
      total_botellas: item.total_botellas || 0
    }));

    if (conteoEditando) {
      const { error: errorUpdate } = await supabase
        .from("conteos")
        .update({
          transporte,
          placa,
          responsable,
          total_botellas: totalBotellasConteo
        })
        .eq("id", conteoEditando);

      if (errorUpdate) {
        console.log(errorUpdate);
        alert("Error actualizando conteo");
        return;
      }

      const { error: errorDelete } = await supabase
        .from("conteos_detalle")
        .delete()
        .eq("conteo_id", conteoEditando);

      if (errorDelete) {
        console.log(errorDelete);
        alert("Error actualizando detalle");
        return;
      }

      if (detalleArray.length > 0) {
        const { error: errorInsertDetalle } = await supabase
          .from("conteos_detalle")
          .insert(detalleArray.map((d) => ({ ...d, conteo_id: conteoEditando })));

        if (errorInsertDetalle) {
          console.log(errorInsertDetalle);
          alert("Error guardando detalle");
          return;
        }
      }

      localStorage.setItem(
        metaKey(conteoEditando),
        JSON.stringify({ productos, pfnItems })
      );

      alert("Conteo actualizado");
      limpiarPantalla();
      return;
    }

    const { data, error } = await supabase
      .from("conteos")
      .insert([cabecera])
      .select();

    if (error) {
      console.log("ERROR SUPABASE:", error);
      alert("Error guardando conteo");
      return;
    }

    const conteoId = data[0].id;

    if (detalleArray.length > 0) {
      const { error: errorDetalle } = await supabase
        .from("conteos_detalle")
        .insert(detalleArray.map((d) => ({ ...d, conteo_id: conteoId })));

      if (errorDetalle) {
        console.log(errorDetalle);
        alert("Error guardando detalle");
        return;
      }
    }

    localStorage.setItem(
      metaKey(conteoId),
      JSON.stringify({ productos, pfnItems })
    );

    alert("Conteo guardado");
    limpiarPantalla();
  }

  function limpiarPantalla() {
    setSkuActivo(null);
    setModalInicial(null);

    setTransporte("");
    setPlaca("");
    setResponsable("");

    setTiempo(0);
    setCronometroActivo(false);

    setDetalleConteo({});
    setMarcadosResultados({});

    setProductos([]);
    setNombreProducto("");
    setCantidadProducto("");
    setProductoEditando(null);

    setPfnItems([]);
    setNombrePfn("");
    setCantidadPfn("");
    setPfnEditando(null);

    setConteoEditando(null);
    limpiarBackup();
  }

  async function cargarHistorial() {
    const { data, error } = await supabase
      .from("conteos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert("Error cargando historial");
      return;
    }

    setHistorial(data || []);

    const resumen = {};
    (data || []).forEach((c) => {
      if (!resumen[c.responsable]) {
        resumen[c.responsable] = {
          nombre: c.responsable,
          conteos: 0,
          tiempoTotal: 0
        };
      }

      resumen[c.responsable].conteos += 1;
      resumen[c.responsable].tiempoTotal += c.tiempo_conteo || 0;
    });

    const rankingFinal = Object.values(resumen)
      .map((r) => ({
        nombre: r.nombre,
        conteos: r.conteos,
        tiempoPromedio: Math.round(r.tiempoTotal / r.conteos)
      }))
      .sort((a, b) => a.tiempoPromedio - b.tiempoPromedio);

    setRanking(rankingFinal);
    setVerHistorial(true);
  }

  async function abrirDetalleHistorial(conteo) {
    const { data, error } = await supabase
      .from("conteos_detalle")
      .select("*")
      .eq("conteo_id", conteo.id);

    if (error) {
      alert("Error cargando detalle");
      return;
    }

    const ordenados = ORDEN_RESULTADOS
      .map((id) => (data || []).find((item) => item.sku_codigo === id))
      .filter((item) => !!item);

    setConteoHistorialActual(conteo);
    setDetalleItemsHistorial(ordenados);
    setDetalleModal(true);
    setMarcadosHistorial({});
  }

  async function editarConteo(conteo) {
    setTransporte(conteo.transporte || "");
    setPlaca(conteo.placa || "");
    setResponsable(conteo.responsable || "");
    setTiempo(conteo.tiempo_conteo || 0);
    setCronometroActivo(false);
    setConteoEditando(conteo.id);

    const { data, error } = await supabase
      .from("conteos_detalle")
      .select("*")
      .eq("conteo_id", conteo.id);

    if (error) {
      alert("Error cargando detalle");
      return;
    }

    const nuevoDetalle = {};
    (data || []).forEach((item) => {
      nuevoDetalle[item.sku_codigo] = {
        sku_codigo: item.sku_codigo,
        descripcion: item.descripcion,
        cajas: item.cajas || 0,
        botellas_mas: item.botellas_mas || 0,
        botellas_menos: item.botellas_menos || 0,
        total_botellas: item.total_botellas || 0
      };
    });

    setDetalleConteo(nuevoDetalle);

    const meta = localStorage.getItem(metaKey(conteo.id));
    if (meta) {
      try {
        const parsed = JSON.parse(meta);
        setProductos(parsed.productos || []);
        setPfnItems(parsed.pfnItems || []);
      } catch {
        setProductos([]);
        setPfnItems([]);
      }
    } else {
      setProductos([]);
      setPfnItems([]);
    }

    setVerHistorial(false);
    setDetalleModal(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function editarSkuDesdeHistorial(item) {
    if (!conteoHistorialActual) return;

    editarConteo(conteoHistorialActual);

    const sku = SKU_MAP[item.sku_codigo];
    if (!sku) return;

    setTimeout(() => {
      if (ENVASES.some((e) => e.id === item.sku_codigo)) {
        setModalInicial({
          cajas: item.cajas || 0,
          mas: item.botellas_mas || 0,
          menos: item.botellas_menos || 0
        });
      } else {
        setModalInicial({
          cantidad: item.cajas || 0
        });
      }

      setSkuActivo(sku);
    }, 180);
  }

  async function generarImagenDesdeHistorial(conteo) {
    const { data, error } = await supabase
      .from("conteos_detalle")
      .select("*")
      .eq("conteo_id", conteo.id);

    if (error) {
      alert("Error generando imagen");
      return;
    }

    const meta = localStorage.getItem(metaKey(conteo.id));
    let productosHist = [];
    let pfnHist = [];

    if (meta) {
      try {
        const parsed = JSON.parse(meta);
        productosHist = parsed.productos || [];
        pfnHist = parsed.pfnItems || [];
      } catch {
        productosHist = [];
        pfnHist = [];
      }
    }

    const contenedor = construirResumenExportable(conteo, data || [], productosHist, pfnHist);
    document.body.appendChild(contenedor);

    const canvas = await html2canvas(contenedor, {
      scale: 2,
      backgroundColor: "#fffef5"
    });

    const link = document.createElement("a");
    link.download = `conteo_${conteo.placa || conteo.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    document.body.removeChild(contenedor);
  }

  async function generarPDFDesdeHistorial(conteo) {
    const { data, error } = await supabase
      .from("conteos_detalle")
      .select("*")
      .eq("conteo_id", conteo.id);

    if (error) {
      alert("Error generando PDF");
      return;
    }

    const meta = localStorage.getItem(metaKey(conteo.id));
    let productosHist = [];
    let pfnHist = [];

    if (meta) {
      try {
        const parsed = JSON.parse(meta);
        productosHist = parsed.productos || [];
        pfnHist = parsed.pfnItems || [];
      } catch {
        productosHist = [];
        pfnHist = [];
      }
    }

    const contenedor = construirResumenExportable(conteo, data || [], productosHist, pfnHist);
    document.body.appendChild(contenedor);

    const canvas = await html2canvas(contenedor, {
      scale: 2,
      backgroundColor: "#fffef5"
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    pdf.setDrawColor(255, 214, 10);
    pdf.setLineWidth(1.2);
    pdf.rect(5, 5, pageWidth - 10, pdf.internal.pageSize.getHeight() - 10);

    pdf.addImage(imgData, "PNG", margin, 12, usableWidth, imgHeight);
    pdf.save(`conteo_${conteo.placa || conteo.id}.pdf`);

    document.body.removeChild(contenedor);
  }

  function construirResumenExportable(conteo, detalleData, productosHist, pfnHist) {
    const ordenados = ORDEN_RESULTADOS
      .map((id) => (detalleData || []).find((item) => item.sku_codigo === id))
      .filter((item) => !!item);

    const env330 = ordenados.filter((item) =>
      ["330_VERDE", "330_AMBAR", "330_FLINT"].includes(item.sku_codigo)
    );
    const env11 = ordenados.filter((item) =>
      ["550_VERDE", "550_FLINT", "550_AMBAR", "600_AMBAR"].includes(item.sku_codigo)
    );
    const env1000 = ordenados.filter((item) =>
      ["850_VERDE", "1000_AMBAR", "1000_FLINT"].includes(item.sku_codigo)
    );
    const jabas = ordenados.filter((item) =>
      ["JABA_330", "JABA_11", "JABA_1000"].includes(item.sku_codigo)
    );
    const activos = ordenados.filter((item) =>
      ["PALETA_11", "PALETA_12", "CAJA_BEES"].includes(item.sku_codigo)
    );

    const cajas330 = env330.reduce((acc, item) => acc + (item.cajas || 0), 0) +
      (ordenados.find((i) => i.sku_codigo === "JABA_330")?.cajas || 0);
    const cajas11 = env11.reduce((acc, item) => acc + (item.cajas || 0), 0) +
      (ordenados.find((i) => i.sku_codigo === "JABA_11")?.cajas || 0);
    const cajas1000 = env1000.reduce((acc, item) => acc + (item.cajas || 0), 0) +
      (ordenados.find((i) => i.sku_codigo === "JABA_1000")?.cajas || 0);

    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.left = "-99999px";
    box.style.top = "0";
    box.style.width = "900px";
    box.style.background = "#fffef5";
    box.style.padding = "24px";
    box.style.fontFamily = "Arial";
    box.style.color = "#111";

    const fecha = conteo.fecha ? new Date(conteo.fecha).toLocaleDateString() : "";

    box.innerHTML = `
      <div style="border:3px solid #ffd60a;border-radius:18px;padding:20px;background:#fffef5;">
        <div style="background:#ffd60a;padding:14px 16px;border-radius:12px;font-size:28px;font-weight:bold;margin-bottom:18px;">
          Conteo Ciego
        </div>

        <div style="font-size:20px;font-weight:bold;line-height:1.8;margin-bottom:16px;">
          <div>Fecha: ${fecha}</div>
          <div>Placa: ${conteo.placa || ""}</div>
          <div>Transporte: ${conteo.transporte || ""}</div>
          <div>Responsable: ${conteo.responsable || ""}</div>
        </div>

        ${bloqueHTML("Envases 330", env330.map(i => `${i.descripcion} → ${i.total_botellas} botellas`))}
        ${bloqueHTML("Envases 550 / 600", env11.map(i => `${i.descripcion} → ${i.total_botellas} botellas`))}
        ${bloqueHTML("Envases 850 / 1000", env1000.map(i => `${i.descripcion} → ${i.total_botellas} botellas`))}
        ${bloqueHTML("Jabas vacías", jabas.map(i => `${i.descripcion} → ${i.cajas} cajas`))}
        ${bloqueHTML("Cajas", [
          cajas330 > 0 ? `Total de Jabas 330 → ${cajas330}` : null,
          cajas11 > 0 ? `Total de Jabas 1/1 → ${cajas11}` : null,
          cajas1000 > 0 ? `Total de Jabas 1000 → ${cajas1000}` : null
        ].filter(Boolean))}
        ${bloqueHTML("Activos", activos.map(i => `${i.descripcion} → ${i.cajas}`))}
        ${bloqueHTML("Producto", productosHist.map(i => `${i.nombre} → ${i.cantidad}`))}
        ${bloqueHTML("PFN", pfnHist.map(i => `${i.nombre} → ${i.cantidad}`))}
      </div>
    `;

    return box;
  }

  function bloqueHTML(titulo, lineas) {
    if (!lineas || lineas.length === 0) return "";
    return `
      <div style="margin-top:16px;">
        <div style="font-size:22px;font-weight:bold;background:#fff3bf;padding:8px 10px;border-radius:10px;margin-bottom:8px;">
          ${titulo}
        </div>
        ${lineas
          .map(
            (l) => `
          <div style="font-size:20px;font-weight:bold;padding:8px 6px;border-bottom:1px solid #eee;">
            ${l}
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Conteo Ciego</h1>
        <div style={{ marginTop: 8, fontWeight: "bold", fontSize: 18 }}>
          Tiempo {Math.floor(tiempo / 60)}m {tiempo % 60}s
          {conteoEditando && <span style={{ marginLeft: 10 }}>· Editando conteo #{conteoEditando}</span>}
        </div>
      </div>

      <section style={cardStyle}>
        <input
          placeholder="Transporte"
          value={transporte}
          onChange={(e) => setTransporte(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Placa"
          value={placa}
          onChange={(e) => setPlaca(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Responsable"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          style={inputStyle}
        />
      </section>
<section style={cardStyle}>
        <h2>Producto</h2>
        <input
          placeholder="Nombre producto"
          value={nombreProducto}
          onChange={(e) => setNombreProducto(e.target.value)}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Cantidad"
          value={cantidadProducto}
          onChange={(e) => setCantidadProducto(e.target.value)}
          style={inputStyle}
        />
        <button onClick={agregarOActualizarProducto} style={primaryButtonStyle}>
          {productoEditando !== null ? "Actualizar" : "Agregar"}
        </button>

        {productos.map((p, i) => (
          <div key={i} style={rowStyle}>
            <span style={{ fontSize: 18, fontWeight: "bold" }}>
              {p.nombre} → {p.cantidad}
            </span>
            <button
              onClick={() => {
                setNombreProducto(p.nombre);
                setCantidadProducto(String(p.cantidad));
                setProductoEditando(i);
              }}
              style={miniButtonStyle}
            >
              Editar
            </button>
          </div>
        ))}
      </section>

      <section style={cardStyle}>
        <h2>PFN</h2>
        <input
          placeholder="Nombre PFN"
          value={nombrePfn}
          onChange={(e) => setNombrePfn(e.target.value)}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Cantidad"
          value={cantidadPfn}
          onChange={(e) => setCantidadPfn(e.target.value)}
          style={inputStyle}
        />
        <button onClick={agregarOActualizarPfn} style={primaryButtonStyle}>
          {pfnEditando !== null ? "Actualizar" : "Agregar"}
        </button>

        {pfnItems.map((p, i) => (
          <div key={i} style={rowStyle}>
            <span style={{ fontSize: 18, fontWeight: "bold" }}>
              {p.nombre} → {p.cantidad}
            </span>
            <button
              onClick={() => {
                setNombrePfn(p.nombre);
                setCantidadPfn(String(p.cantidad));
                setPfnEditando(i);
              }}
              style={miniButtonStyle}
            >
              Editar
            </button>
          </div>
        ))}
      </section>
      <section style={cardStyle}>
        <h2>Envases</h2>
        {ENVASES.map((sku) => (
          <button
            key={sku.id}
            onClick={() => {
              setSkuActivo(sku);
              setModalInicial(null);
            }}
            style={{
              ...chipStyle,
              background: detalleConteo[sku.id] ? "#d9f99d" : "#fff"
            }}
          >
            {sku.nombre}
          </button>
        ))}
      </section>

      <section style={cardStyle}>
        <h2>Jabas vacías</h2>
        {JABAS.map((sku) => (
          <button
            key={sku.id}
            onClick={() => {
              setSkuActivo(sku);
              setModalInicial(null);
            }}
            style={{
              ...chipStyle,
              background: detalleConteo[sku.id] ? "#d9f99d" : "#fff"
            }}
          >
            {sku.nombre}
          </button>
        ))}
      </section>

      <section style={cardStyle}>
        <h2>Activos</h2>
        {ACTIVOS.map((sku) => (
          <button
            key={sku.id}
            onClick={() => {
              setSkuActivo(sku);
              setModalInicial(null);
            }}
            style={{
              ...chipStyle,
              background: detalleConteo[sku.id] ? "#d9f99d" : "#fff"
            }}
          >
            {sku.nombre}
          </button>
        ))}
      </section>

      <section ref={exportRef} style={cardStyle}>
        <h2>Resultados</h2>

        {envases330.length > 0 && (
          <>
            <h3>Envases 330</h3>
            {envases330.map((item) =>
              renderLineaResultado(item, "botellas", () => abrirEditarSkuActual(item.sku_codigo))
            )}
          </>
        )}

        {envases11.length > 0 && (
          <>
            <h3>Envases 550 / 600</h3>
            {envases11.map((item) =>
              renderLineaResultado(item, "botellas", () => abrirEditarSkuActual(item.sku_codigo))
            )}
          </>
        )}

        {envases1000.length > 0 && (
          <>
            <h3>Envases 850 / 1000</h3>
            {envases1000.map((item) =>
              renderLineaResultado(item, "botellas", () => abrirEditarSkuActual(item.sku_codigo))
            )}
          </>
        )}

        {jabasVacias.length > 0 && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Jabas vacías</h3>
            {jabasVacias.map((item) =>
              renderLineaResultado(item, "cajas", () => abrirEditarSkuActual(item.sku_codigo))
            )}
          </>
        )}

        {(totalJabas330 || totalJabas11 || totalJabas1000) && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Cajas</h3>
            {totalJabas330 > 0 && renderLineaSimple("Total de Jabas 330", totalJabas330)}
            {totalJabas11 > 0 && renderLineaSimple("Total de Jabas 1/1", totalJabas11)}
            {totalJabas1000 > 0 && renderLineaSimple("Total de Jabas 1000", totalJabas1000)}
          </>
        )}

        {activosResultado.length > 0 && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Activos</h3>
            {activosResultado.map((item) =>
              renderLineaSimple(item.descripcion, item.cajas, () =>
                abrirEditarSkuActual(item.sku_codigo)
              )
            )}
          </>
        )}

        {productos.length > 0 && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Producto</h3>
            {productos.map((p) => renderLineaSimple(p.nombre, p.cantidad))}
          </>
        )}

        {pfnItems.length > 0 && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>PFN</h3>
            {pfnItems.map((p) => renderLineaSimple(p.nombre, p.cantidad))}
          </>
        )}
      </section>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={guardarConteo} style={primaryButtonStyle}>
          {conteoEditando ? "Guardar cambios" : "Guardar Conteo"}
        </button>

        <button onClick={cargarHistorial} style={secondaryButtonStyle}>
          Ver Historial
        </button>
      </div>

      {verHistorial && (
        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Ranking de Controladores</h2>
          {ranking.map((r, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                borderRadius: 8,
                background: i === 0 ? "#ffe066" : "transparent",
                fontSize: 18,
                fontWeight: "bold"
              }}
            >
              {i + 1}. {r.nombre} — {r.conteos} carros — {Math.floor(r.tiempoPromedio / 60)}m{" "}
              {r.tiempoPromedio % 60}s promedio
            </div>
          ))}

          <h2 style={{ marginTop: 20 }}>Historial de Conteos</h2>
          {historial.map((c) => (
            <div key={c.id} style={historyItemStyle}>
              <div style={{ fontSize: 20, fontWeight: "bold" }}>Conteo #{c.id}</div>
              <div>Transporte: {c.transporte}</div>
              <div>Placa: {c.placa}</div>
              <div>Responsable: {c.responsable}</div>
              <div>Total Botellas: {c.total_botellas}</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button onClick={() => editarConteo(c)} style={miniButtonStyle}>
                  Editar conteo
                </button>
                <button onClick={() => abrirDetalleHistorial(c)} style={miniButtonStyle}>
                  Ver detalle
                </button>
                <button onClick={() => generarPDFDesdeHistorial(c)} style={miniButtonStyle}>
                  Generar PDF
                </button>
                <button onClick={() => generarImagenDesdeHistorial(c)} style={miniButtonStyle}>
                  Generar Imagen
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
{detalleModal && (
  <div style={overlayStyle}>
    <div
      style={{
        ...modalStyle,
        width: 430,
        maxHeight: "85vh",
        padding: 22
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 28 }}>Detalle del Historial</h2>
 
      {(() => {
        const meta = conteoHistorialActual
          ? localStorage.getItem(metaKey(conteoHistorialActual.id))
          : null;
 
        let productosHist = [];
        let pfnHist = [];
 
        if (meta) {
          try {
            const parsed = JSON.parse(meta);
            productosHist = parsed.productos || [];
            pfnHist = parsed.pfnItems || [];
          } catch {
            productosHist = [];
            pfnHist = [];
          }
        }
 
        const envases330Hist = detalleItemsHistorial.filter((d) =>
          ["330_VERDE", "330_AMBAR", "330_FLINT"].includes(d.sku_codigo)
        );
 
        const envases11Hist = detalleItemsHistorial.filter((d) =>
          ["550_VERDE", "550_FLINT", "550_AMBAR", "600_AMBAR"].includes(d.sku_codigo)
        );
 
        const envases1000Hist = detalleItemsHistorial.filter((d) =>
          ["850_VERDE", "1000_AMBAR", "1000_FLINT"].includes(d.sku_codigo)
        );
 
        const jabasHist = detalleItemsHistorial.filter((d) =>
          ["JABA_330", "JABA_11", "JABA_1000"].includes(d.sku_codigo)
        );
 
        const activosHist = detalleItemsHistorial.filter((d) =>
          ["PALETA_11", "PALETA_12", "CAJA_BEES"].includes(d.sku_codigo)
        );
 
        const totalJabas330Hist =
          envases330Hist.reduce((acc, d) => acc + (d.cajas || 0), 0) +
          (jabasHist.find((d) => d.sku_codigo === "JABA_330")?.cajas || 0);
 
        const totalJabas11Hist =
          envases11Hist.reduce((acc, d) => acc + (d.cajas || 0), 0) +
          (jabasHist.find((d) => d.sku_codigo === "JABA_11")?.cajas || 0);
 
        const totalJabas1000Hist =
          envases1000Hist.reduce((acc, d) => acc + (d.cajas || 0), 0) +
          (jabasHist.find((d) => d.sku_codigo === "JABA_1000")?.cajas || 0);
 
        function estiloSeleccionable(key) {
          return {
            fontSize: 22,
            fontWeight: "bold",
            marginBottom: 10,
            padding: 12,
            borderRadius: 12,
            cursor: "pointer",
            background: marcadosHistorial[key] ? "#b6f5b6" : "#fff",
            border: "1px solid #eee",
            lineHeight: 1.35
          };
        }
 
        function renderFilaHistorial(key, texto, onEdit = null) {
          return (
            <div
              key={key}
              onClick={() => marcarHistorial(key)}
              style={estiloSeleccionable(key)}
            >
              <div>{texto}</div>
 
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  style={{
                    ...miniButtonStyle,
                    marginTop: 10,
                    fontSize: 16,
                    padding: "10px 12px"
                  }}
                >
                  Modificar SKU
                </button>
              )}
            </div>
          );
        }
 
        return (
          <>
            {productosHist.length > 0 && (
              <>
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>Producto</h3>
                {productosHist.map((p, i) =>
  renderFilaHistorial(
    `producto_${p.nombre}_${i}`,
    `${p.nombre} → ${p.cantidad}`,
    () => {
      setNombreProducto(p.nombre);
      setCantidadProducto(String(p.cantidad));
      setProductoEditando(i);
      setDetalleModal(false);
    }
  )
)}
              </>
            )}
 
            {pfnHist.length > 0 && (
              <>
                <div style={{ borderTop: "2px solid #eee", margin: "14px 0" }} />
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>PFN</h3>
                {pfnHist.map((p, i) =>
  renderFilaHistorial(
    `pfn_${p.nombre}_${i}`,
    `${p.nombre} → ${p.cantidad}`,
    () => {
      setNombrePfn(p.nombre);
      setCantidadPfn(String(p.cantidad));
      setPfnEditando(i);
      setDetalleModal(false);
    }
  )
)}
              </>
            )}
 
            {(envases330Hist.length > 0 ||
              envases11Hist.length > 0 ||
              envases1000Hist.length > 0 ||
              jabasHist.length > 0) && (
              <>
                <div style={{ borderTop: "2px solid #eee", margin: "14px 0" }} />
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>Envases</h3>
 
                {envases330Hist.map((d) =>
                  renderFilaHistorial(
                    d.descripcion,
                    `${d.descripcion} → ${d.total_botellas} botellas`,
                    () => editarSkuDesdeHistorial(d)
                  )
                )}
 
                {envases11Hist.map((d) =>
                  renderFilaHistorial(
                    d.descripcion,
                    `${d.descripcion} → ${d.total_botellas} botellas`,
                    () => editarSkuDesdeHistorial(d)
                  )
                )}
 
                {envases1000Hist.map((d) =>
                  renderFilaHistorial(
                    d.descripcion,
                    `${d.descripcion} → ${d.total_botellas} botellas`,
                    () => editarSkuDesdeHistorial(d)
                  )
                )}
 
                {jabasHist.map((d) =>
                  renderFilaHistorial(
                    d.descripcion,
                    `${d.descripcion} → ${d.cajas} cajas`,
                    () => editarSkuDesdeHistorial(d)
                  )
                )}
              </>
            )}
 
            {(totalJabas330Hist > 0 || totalJabas11Hist > 0 || totalJabas1000Hist > 0) && (
              <>
                <div style={{ borderTop: "2px solid #eee", margin: "14px 0" }} />
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>Cajas</h3>
 
                {totalJabas330Hist > 0 &&
                  renderFilaHistorial(
                    "total_jabas_330",
                    `Total de Jabas 330 → ${totalJabas330Hist}`
                  )}
 
                {totalJabas11Hist > 0 &&
                  renderFilaHistorial(
                    "total_jabas_11",
                    `Total de Jabas 1/1 → ${totalJabas11Hist}`
                  )}
 
                {totalJabas1000Hist > 0 &&
                  renderFilaHistorial(
                    "total_jabas_1000",
                    `Total de Jabas 1000 → ${totalJabas1000Hist}`
                  )}
              </>
            )}
 
            {activosHist.length > 0 && (
              <>
                <div style={{ borderTop: "2px solid #eee", margin: "14px 0" }} />
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>Activos</h3>
 
                {activosHist.map((d) =>
                  renderFilaHistorial(
                    d.descripcion,
                    `${d.descripcion} → ${d.cajas}`,
                    () => editarSkuDesdeHistorial(d)
                  )
                )}
              </>
            )}
          </>
        );
      })()}
 
      <button
        onClick={() => setDetalleModal(false)}
        style={{
          ...primaryButtonStyle,
          marginTop: 12,
          fontSize: 18,
          padding: "12px 18px"
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}
 
      {skuActivo && (
        <QuickCountModal
          sku={skuActivo}
          onClose={() => {
            setSkuActivo(null);
            setModalInicial(null);
          }}
          onSave={guardarSku}
          initialValues={modalInicial}
        />
      )}
    </div>
  );
}

const pageStyle = {
  padding: 18,
  fontFamily: "Arial",
  background: "#f7f7f2",
  minHeight: "100vh"
};

const headerStyle = {
  background: "#ffd60a",
  padding: 16,
  borderRadius: 16,
  marginBottom: 16
};

const cardStyle = {
  background: "#fffef5",
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  border: "1px solid #f0e2a5"
};

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 16
};

const chipStyle = {
  padding: "12px 14px",
  margin: 4,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: "bold"
};

const primaryButtonStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "#ffd60a",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer"
};

const secondaryButtonStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 16,
  cursor: "pointer"
};

const miniButtonStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 14,
  cursor: "pointer"
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 8,
  borderBottom: "1px solid #eee"
};

const historyItemStyle = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
  background: "#fff",
  fontSize: 16
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalStyle = {
  background: "#fff",
  width: 420,
  maxHeight: "80vh",
  overflow: "auto",
  borderRadius: 16,
  padding: 20
};

const detailRowStyle = {
  borderBottom: "1px solid #eee",
  paddingBottom: 10,
  marginBottom: 10
};
