import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "./supabaseClient";
import { ENVASES, JABAS, ACTIVOS } from "./dataSkus";
import QuickCountModal from "./components/QuickCountModal";

function calcularExpresion(valor) {
  try {
    const texto = String(valor || "")
      .replace(/\s+/g, "")
      .replace(/[^0-9+]/g, "");
    if (!texto) return 0;

    return texto
      .split("+")
      .filter((n) => n !== "")
      .reduce((acc, num) => acc + Number(num || 0), 0);
  } catch {
    return 0;
  }
}

function normalizarExpresion(valor) {
  return String(valor || "")
    .replace(/\s+/g, "")
    .replace(/[^0-9+]/g, "")
    .replace(/^\++/, "")
    .replace(/\++$/, "")
    .replace(/\+{2,}/g, "+");
}

function formatearTiempo(segundos = 0) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}m ${s}s`;
}

function inicioDelDia(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDelDia(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

function inicioDelMes(fecha = new Date()) {
  const d = new Date(fecha);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDelMes(fecha = new Date()) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

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

const DRAFT_KEY = "conteo_ciego_borrador_v6";

export default function App() {
  const [skuActivo, setSkuActivo] = useState(null);
  const [modalInicial, setModalInicial] = useState(null);

  const [transporte, setTransporte] = useState("");
  const [placa, setPlaca] = useState("");
  const [conductor, setConductor] = useState("");
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
  const [verHistorial, setVerHistorial] = useState(false);

  const [conteoEditando, setConteoEditando] = useState(null);

  const [detalleModal, setDetalleModal] = useState(false);
  const [detalleItemsHistorial, setDetalleItemsHistorial] = useState([]);
  const [conteoHistorialActual, setConteoHistorialActual] = useState(null);

  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalDia: 0,
    totalMes: 0,
    totalMesAnterior: 0,
    ranking: [],
    porHora: [],
    porDiaDelMes: []
  });

  const [appLista, setAppLista] = useState(false);

  const exportRef = useRef(null);

  useEffect(() => {
    if (!cronometroActivo) return;

    const intervalo = setInterval(() => {
      setTiempo((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalo);
  }, [cronometroActivo]);

  useEffect(() => {
    setTimeout(() => {
      const draft = localStorage.getItem(DRAFT_KEY);

      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setTransporte(parsed.transporte || "");
          setPlaca(parsed.placa || "");
          setConductor(parsed.conductor || "");
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
      }

      setAppLista(true);
    }, 80);
  }, []);

  useEffect(() => {
    const payload = {
      transporte,
      placa,
      conductor,
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
    conductor,
    responsable,
    tiempo,
    detalleConteo,
    productos,
    pfnItems,
    marcadosResultados
  ]);

  useEffect(() => {
    cargarDashboard();
  }, []);

  function limpiarBackup() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function iniciarCronometroSiEsNuevo() {
    if (!conteoEditando && !cronometroActivo) {
      setCronometroActivo(true);
    }
  }

  function abrirSkuDesdePrincipal(sku) {
    const actual = detalleConteo[sku.id];

    if (actual) {
      if (ENVASES.some((e) => e.id === sku.id)) {
        setModalInicial({
          cajas: actual.cajas_texto || "",
          mas: actual.botellas_mas || "",
          menos: actual.botellas_menos || ""
        });
      } else {
        setModalInicial({
          cantidad: actual.cajas || ""
        });
      }
    } else {
      setModalInicial(null);
    }

    setSkuActivo(sku);
  }

  function guardarSku(valores) {
    iniciarCronometroSiEsNuevo();

    const sku = skuActivo;
    if (!sku) return;

    const esBotella = ENVASES.some((item) => item.id === sku.id);

    if (esBotella) {
      const expresionFinal = normalizarExpresion(valores.cajas || "");
      const cajas = calcularExpresion(expresionFinal);
      const mas = Number(valores.mas) || 0;
      const menos = Number(valores.menos) || 0;
      const total = cajas * sku.pack + mas - menos;

      const nuevoDetalle = {
        sku_codigo: sku.id,
        descripcion: sku.nombre,
        cajas,
        cajas_texto: expresionFinal,
        botellas_mas: mas,
        botellas_menos: menos,
        total_botellas: total
      };

      setDetalleConteo((prev) => ({
        ...prev,
        [sku.id]: nuevoDetalle
      }));
    } else {
      const cantidad = Number(valores.cantidad) || 0;

      const nuevoDetalle = {
        sku_codigo: sku.id,
        descripcion: sku.nombre,
        cajas: cantidad,
        botellas_mas: 0,
        botellas_menos: 0,
        total_botellas: cantidad
      };

      setDetalleConteo((prev) => ({
        ...prev,
        [sku.id]: nuevoDetalle
      }));
    }

    setSkuActivo(null);
    setModalInicial(null);
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

  const itemsOrdenados = useMemo(() => {
    return ORDEN_RESULTADOS.map((id) => detalleConteo[id]).filter(Boolean);
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

  const totalBotellasConteo = useMemo(() => {
    return Object.values(detalleConteo).reduce((acc, item) => {
      if (ENVASES.some((e) => e.id === item.sku_codigo)) {
        return acc + (item.total_botellas || 0);
      }
      return acc;
    }, 0);
  }, [detalleConteo]);

  function marcarResultado(nombre) {
    setMarcadosResultados((prev) => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  }

  function renderLineaResultado(item, unidad) {
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
      </div>
    );
  }

  function renderLineaSimple(nombre, valor) {
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
      </div>
    );
  }

  function construirMetaPayload() {
    return {
      productos,
      pfnItems,
      detalleTextos: Object.fromEntries(
        Object.values(detalleConteo)
          .filter((item) => item?.cajas_texto)
          .map((item) => [item.sku_codigo, item.cajas_texto])
      )
    };
  }

  async function guardarConteo() {
    if (!transporte || !placa || !conductor || !responsable) {
      alert("Completa transporte, placa, conductor y responsable");
      return;
    }

    const confirmado = window.confirm(
      `¿Deseas guardar este conteo?\n\nTransporte: ${transporte}\nPlaca: ${placa}\nConductor: ${conductor}\nResponsable: ${responsable}\nTiempo: ${formatearTiempo(
        tiempo
      )}`
    );

    if (!confirmado) return;

    const cabecera = {
      usuario: responsable,
      transporte,
      placa,
      conductor,
      responsable,
      fecha: new Date().toISOString(),
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

    const metaPayload = construirMetaPayload();

    if (conteoEditando) {
      const { error: errorUpdate } = await supabase
        .from("conteos")
        .update({
          transporte,
          placa,
          conductor,
          responsable,
          tiempo_conteo: tiempo,
          total_botellas: totalBotellasConteo
        })
        .eq("id", conteoEditando);

      if (errorUpdate) {
        console.log(errorUpdate);
        alert(errorUpdate.message || "Error actualizando conteo");
        return;
      }

      const { error: errorDelete } = await supabase
        .from("conteos_detalle")
        .delete()
        .eq("conteo_id", conteoEditando);

      if (errorDelete) {
        console.log(errorDelete);
        alert(errorDelete.message || "Error actualizando detalle");
        return;
      }

      if (detalleArray.length > 0) {
        const { error: errorInsertDetalle } = await supabase
          .from("conteos_detalle")
          .insert(detalleArray.map((d) => ({ ...d, conteo_id: conteoEditando })));

        if (errorInsertDetalle) {
          console.log(errorInsertDetalle);
          alert(errorInsertDetalle.message || "Error guardando detalle");
          return;
        }
      }

      localStorage.setItem(metaKey(conteoEditando), JSON.stringify(metaPayload));

      alert("Conteo actualizado");
      await cargarDashboard();
      limpiarPantalla();
      return;
    }

    const { data, error } = await supabase.from("conteos").insert([cabecera]).select();

    if (error) {
      console.log(error);
      alert(error.message || "Error guardando conteo");
      return;
    }

    const conteoId = data?.[0]?.id;

    if (detalleArray.length > 0) {
      const { error: errorDetalle } = await supabase
        .from("conteos_detalle")
        .insert(detalleArray.map((d) => ({ ...d, conteo_id: conteoId })));

      if (errorDetalle) {
        console.log(errorDetalle);
        alert(errorDetalle.message || "Error guardando detalle");
        return;
      }
    }

    localStorage.setItem(metaKey(conteoId), JSON.stringify(metaPayload));

    alert("Conteo guardado");
    await cargarDashboard();
    limpiarPantalla();
  }

  function limpiarPantalla() {
    setSkuActivo(null);
    setModalInicial(null);

    setTransporte("");
    setPlaca("");
    setConductor("");
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
      .filter(Boolean);

    setConteoHistorialActual(conteo);
    setDetalleItemsHistorial(ordenados);
    setDetalleModal(true);
  }

  async function editarConteo(conteo) {
    setTransporte(conteo.transporte || "");
    setPlaca(conteo.placa || "");
    setConductor(conteo.conductor || "");
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

    let detalleTextos = {};
    const meta = localStorage.getItem(metaKey(conteo.id));

    if (meta) {
      try {
        const parsed = JSON.parse(meta);
        setProductos(parsed.productos || []);
        setPfnItems(parsed.pfnItems || []);
        detalleTextos = parsed.detalleTextos || {};
      } catch {
        setProductos([]);
        setPfnItems([]);
      }
    } else {
      setProductos([]);
      setPfnItems([]);
    }

    const nuevoDetalle = {};
    (data || []).forEach((item) => {
      nuevoDetalle[item.sku_codigo] = {
        sku_codigo: item.sku_codigo,
        descripcion: item.descripcion,
        cajas: item.cajas || 0,
        cajas_texto: detalleTextos[item.sku_codigo] || "",
        botellas_mas: item.botellas_mas || 0,
        botellas_menos: item.botellas_menos || 0,
        total_botellas: item.total_botellas || 0
      };
    });

    setDetalleConteo(nuevoDetalle);
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
      const actual = detalleConteo[item.sku_codigo];

      if (ENVASES.some((e) => e.id === item.sku_codigo)) {
        setModalInicial({
          cajas: actual?.cajas_texto || "",
          mas: actual?.botellas_mas || "",
          menos: actual?.botellas_menos || ""
        });
      } else {
        setModalInicial({
          cantidad: actual?.cajas || item.cajas || ""
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
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - 16;
    const rawHeight = (canvas.height * usableWidth) / canvas.width;

    let finalWidth = usableWidth;
    let finalHeight = rawHeight;

    if (rawHeight > usableHeight) {
      const ratio = usableHeight / rawHeight;
      finalHeight = usableHeight;
      finalWidth = usableWidth * ratio;
    }

    pdf.setDrawColor(255, 214, 10);
    pdf.setLineWidth(1.2);
    pdf.rect(4, 4, pageWidth - 8, pageHeight - 8);

    const x = (pageWidth - finalWidth) / 2;
    pdf.addImage(imgData, "PNG", x, 8, finalWidth, finalHeight);
    pdf.save(`conteo_${conteo.placa || conteo.id}.pdf`);

    document.body.removeChild(contenedor);
  }

  function construirResumenExportable(conteo, detalleData, productosHist, pfnHist) {
    const ordenados = ORDEN_RESULTADOS
      .map((id) => (detalleData || []).find((item) => item.sku_codigo === id))
      .filter(Boolean);

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

    const cajas330 =
      env330.reduce((acc, item) => acc + (item.cajas || 0), 0) +
      (ordenados.find((i) => i.sku_codigo === "JABA_330")?.cajas || 0);

    const cajas11 =
      env11.reduce((acc, item) => acc + (item.cajas || 0), 0) +
      (ordenados.find((i) => i.sku_codigo === "JABA_11")?.cajas || 0);

    const cajas1000 =
      env1000.reduce((acc, item) => acc + (item.cajas || 0), 0) +
      (ordenados.find((i) => i.sku_codigo === "JABA_1000")?.cajas || 0);

    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.left = "-99999px";
    box.style.top = "0";
    box.style.width = "820px";
    box.style.background = "#fffef5";
    box.style.padding = "16px";
    box.style.fontFamily = "Arial";
    box.style.color = "#111";

    const fecha = conteo.fecha ? new Date(conteo.fecha).toLocaleDateString() : "";

    box.innerHTML = `
      <div style="border:3px solid #ffd60a;border-radius:16px;padding:14px;background:#fffef5;">
        <div style="background:#ffd60a;padding:10px 14px;border-radius:10px;font-size:24px;font-weight:bold;margin-bottom:12px;">
          Conteo Ciego
        </div>

        <div style="font-size:16px;font-weight:bold;line-height:1.55;margin-bottom:10px;">
          <div>Fecha: ${fecha}</div>
          <div>Placa: ${conteo.placa || ""}</div>
          <div>Transporte: ${conteo.transporte || ""}</div>
          <div>Conductor: ${conteo.conductor || ""}</div>
          <div>Responsable: ${conteo.responsable || ""}</div>
        </div>

        ${bloqueHTML("Producto", productosHist.map((i) => `${i.nombre} → ${i.cantidad}`))}
        ${bloqueHTML("PFN", pfnHist.map((i) => `${i.nombre} → ${i.cantidad}`))}
        ${bloqueHTML("Envases 330", env330.map((i) => `${i.descripcion} → ${i.total_botellas} botellas`))}
        ${bloqueHTML("Envases 550 / 600", env11.map((i) => `${i.descripcion} → ${i.total_botellas} botellas`))}
        ${bloqueHTML("Envases 850 / 1000", env1000.map((i) => `${i.descripcion} → ${i.total_botellas} botellas`))}
        ${bloqueHTML("Jabas vacías", jabas.map((i) => `${i.descripcion} → ${i.cajas} cajas`))}
        ${bloqueHTML(
          "Cajas",
          [
            cajas330 > 0 ? `Total de Jabas 330 → ${cajas330}` : null,
            cajas11 > 0 ? `Total de Jabas 1/1 → ${cajas11}` : null,
            cajas1000 > 0 ? `Total de Jabas 1000 → ${cajas1000}` : null
          ].filter(Boolean)
        )}
        ${bloqueHTML("Activos", activos.map((i) => `${i.descripcion} → ${i.cajas}`))}
      </div>
    `;

    return box;
  }

  function bloqueHTML(titulo, lineas) {
    if (!lineas || lineas.length === 0) return "";
    return `
      <div style="margin-top:10px;">
        <div style="font-size:18px;font-weight:bold;background:#fff3bf;padding:6px 8px;border-radius:8px;margin-bottom:6px;">
          ${titulo}
        </div>
        ${lineas
          .map(
            (l) => `
          <div style="font-size:15px;font-weight:bold;padding:6px 4px;border-bottom:1px solid #eee;line-height:1.3;">
            ${l}
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  async function cargarDashboard() {
    const { data, error } = await supabase
      .from("conteos")
      .select("id, responsable, tiempo_conteo, fecha")
      .order("fecha", { ascending: false });

    if (error) {
      console.log("Error cargando dashboard:", error);
      return;
    }

    const lista = (data || []).map((item) => ({
      ...item,
      fechaObj: item.fecha ? new Date(item.fecha) : new Date()
    }));

    const ahora = new Date();
    const inicioDia = inicioDelDia(ahora);
    const finalDia = finDelDia(ahora);
    const inicioMesActual = inicioDelMes(ahora);
    const finalMesActual = finDelMes(ahora);

    const inicioMesAnterior = inicioDelMes(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1));
    const finalMesAnterior = finDelMes(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1));

    const delDia = lista.filter((c) => c.fechaObj >= inicioDia && c.fechaObj <= finalDia);
    const delMes = lista.filter((c) => c.fechaObj >= inicioMesActual && c.fechaObj <= finalMesActual);
    const delMesAnterior = lista.filter(
      (c) => c.fechaObj >= inicioMesAnterior && c.fechaObj <= finalMesAnterior
    );

    const resumen = {};
    delMes.forEach((c) => {
      if (!c.responsable) return;

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

    const ranking = Object.values(resumen)
      .map((r) => {
        const tiempoPromedio = r.conteos ? Math.round(r.tiempoTotal / r.conteos) : 0;
        const horas = r.tiempoTotal / 3600;
        const carrosPorHora = horas > 0 ? Number((r.conteos / horas).toFixed(2)) : r.conteos;

        return {
          nombre: r.nombre,
          conteos: r.conteos,
          tiempoPromedio,
          carrosPorHora
        };
      })
      .sort((a, b) => {
        if (b.conteos !== a.conteos) return b.conteos - a.conteos;
        return a.tiempoPromedio - b.tiempoPromedio;
      });

    const horasMap = {};
    delMes.forEach((c) => {
      const hora = c.fechaObj.getHours();
      if (!horasMap[hora]) horasMap[hora] = 0;
      horasMap[hora] += 1;
    });

    const porHora = Array.from({ length: 24 }, (_, h) => ({
      hora: `${String(h).padStart(2, "0")}:00`,
      total: horasMap[h] || 0
    })).filter((x) => x.total > 0);

    const diasMap = {};
    delMes.forEach((c) => {
      const dia = c.fechaObj.getDate();
      if (!diasMap[dia]) diasMap[dia] = 0;
      diasMap[dia] += 1;
    });

    const porDiaDelMes = Object.keys(diasMap)
      .map((dia) => ({
        dia: Number(dia),
        total: diasMap[dia]
      }))
      .sort((a, b) => a.dia - b.dia);

    setDashboardData({
      totalDia: delDia.length,
      totalMes: delMes.length,
      totalMesAnterior: delMesAnterior.length,
      ranking,
      porHora,
      porDiaDelMes
    });
  }

  if (!appLista) {
    return <div style={{ padding: 20, fontFamily: "Arial" }}>Cargando...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Conteo Ciego</h1>
          <div style={{ marginTop: 8, fontWeight: "bold", fontSize: 18 }}>
            Tiempo {formatearTiempo(tiempo)}
            {conteoEditando && (
              <span style={{ marginLeft: 10 }}>· Editando conteo #{conteoEditando}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setDashboardVisible(true)}
          style={{ ...primaryButtonStyle, minWidth: 160 }}
        >
          Ver Dashboard
        </button>
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
          placeholder="Conductor"
          value={conductor}
          onChange={(e) => setConductor(e.target.value)}
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
            onClick={() => abrirSkuDesdePrincipal(sku)}
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
            onClick={() => abrirSkuDesdePrincipal(sku)}
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
            onClick={() => abrirSkuDesdePrincipal(sku)}
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

        {productos.length > 0 && (
          <>
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

        {(envases330.length > 0 || envases11.length > 0 || envases1000.length > 0) && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Envases</h3>

            {envases330.length > 0 && (
              <>
                <h4>Envases 330</h4>
                {envases330.map((item) => renderLineaResultado(item, "botellas"))}
              </>
            )}

            {envases11.length > 0 && (
              <>
                <h4>Envases 550 / 600</h4>
                {envases11.map((item) => renderLineaResultado(item, "botellas"))}
              </>
            )}

            {envases1000.length > 0 && (
              <>
                <h4>Envases 850 / 1000</h4>
                {envases1000.map((item) => renderLineaResultado(item, "botellas"))}
              </>
            )}
          </>
        )}

        {(jabasVacias.length > 0 || totalJabas330 || totalJabas11 || totalJabas1000) && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Jabas vacías / Cajas</h3>

            {jabasVacias.length > 0 && (
              <>
                <h4>Jabas vacías</h4>
                {jabasVacias.map((item) => renderLineaResultado(item, "cajas"))}
              </>
            )}

            {(totalJabas330 || totalJabas11 || totalJabas1000) && (
              <>
                <h4>Cajas</h4>
                {totalJabas330 > 0 && renderLineaSimple("Total de Jabas 330", totalJabas330)}
                {totalJabas11 > 0 && renderLineaSimple("Total de Jabas 1/1", totalJabas11)}
                {totalJabas1000 > 0 && renderLineaSimple("Total de Jabas 1000", totalJabas1000)}
              </>
            )}
          </>
        )}

        {activosResultado.length > 0 && (
          <>
            <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
            <h3>Activos</h3>
            {activosResultado.map((item) => renderLineaSimple(item.descripcion, item.cajas))}
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
          <h2>Historial de Conteos</h2>

          {historial.map((c) => (
            <div key={c.id} style={historyItemStyle}>
              <div style={{ fontSize: 20, fontWeight: "bold" }}>Conteo #{c.id}</div>
              <div>Transporte: {c.transporte}</div>
              <div>Placa: {c.placa}</div>
              <div>Conductor: {c.conductor}</div>
              <div>Responsable: {c.responsable}</div>

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
              width: "92vw",
              maxWidth: 460,
              maxHeight: "85vh",
              padding: 18
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

              function renderFilaHistorial(key, texto, onEdit = null) {
                const esProducto = key.startsWith("producto_");
                const esPfn = key.startsWith("pfn_");
                const esNormal = esProducto || esPfn;

                const [nombre, valorRaw] = texto.split("→");
                const valor = valorRaw?.trim() || "";

                return (
                  <div
                    key={key}
                    style={{
                      marginBottom: 8,
                      padding: 10,
                      borderRadius: 10,
                      background: "#fff",
                      border: "1px solid #eee"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        {esNormal ? (
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              lineHeight: 1.35,
                              wordBreak: "break-word"
                            }}
                          >
                            {texto}
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: "700",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                            >
                              {nombre}
                            </div>

                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: "900",
                                lineHeight: 1.2
                              }}
                            >
                              {valor}
                            </div>
                          </>
                        )}
                      </div>

                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: 11,
                            borderRadius: 6,
                            border: "1px solid #ccc",
                            background: "#fff",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                          }}
                        >
                          Modificar
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <>
                  {productosHist.length > 0 && (
                    <>
                      <h3 style={{ fontSize: 22, marginBottom: 10 }}>Producto</h3>
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
                      <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
                      <h3 style={{ fontSize: 22, marginBottom: 10 }}>PFN</h3>
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
                    envases1000Hist.length > 0) && (
                    <>
                      <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
                      <h3 style={{ fontSize: 22, marginBottom: 10 }}>Envases</h3>

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
                    </>
                  )}

                  {(jabasHist.length > 0 ||
                    totalJabas330Hist > 0 ||
                    totalJabas11Hist > 0 ||
                    totalJabas1000Hist > 0) && (
                    <>
                      <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
                      <h3 style={{ fontSize: 22, marginBottom: 10 }}>Jabas vacías / Cajas</h3>

                      {jabasHist.map((d) =>
                        renderFilaHistorial(
                          d.descripcion,
                          `${d.descripcion} → ${d.cajas} cajas`,
                          () => editarSkuDesdeHistorial(d)
                        )
                      )}

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
                      <div style={{ borderTop: "2px solid #eee", margin: "12px 0" }} />
                      <h3 style={{ fontSize: 22, marginBottom: 10 }}>Activos</h3>

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
                marginTop: 10,
                fontSize: 16,
                padding: "10px 16px"
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {dashboardVisible && (
        <DashboardModal
          data={dashboardData}
          onClose={() => setDashboardVisible(false)}
        />
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
          esEnvase={ENVASES.some((item) => item.id === skuActivo.id)}
        />
      )}
    </div>
  );
}

function DashboardModal({ data, onClose }) {
  const maxRanking = Math.max(...data.ranking.map((x) => x.conteos), 1);
  const maxHora = Math.max(...data.porHora.map((x) => x.total), 1);
  const maxDia = Math.max(...data.porDiaDelMes.map((x) => x.total), 1);

  return (
    <div style={overlayStyle}>
      <div style={dashboardModalStyle}>
        <div style={dashboardHeaderStyle}>
          <h2 style={{ margin: 0, color: "#fff" }}>Dashboard Conteo Ciego</h2>
          <button onClick={onClose} style={dashboardCloseButtonStyle}>
            Cerrar
          </button>
        </div>

        <div style={dashboardCardsStyle}>
          <div style={dashboardCardStyle}>
            <div style={dashboardCardLabelStyle}>Carros del día</div>
            <div style={dashboardCardValueStyle}>{data.totalDia}</div>
          </div>

          <div style={dashboardCardStyle}>
            <div style={dashboardCardLabelStyle}>Carros del mes</div>
            <div style={dashboardCardValueStyle}>{data.totalMes}</div>
          </div>

          <div style={dashboardCardStyle}>
            <div style={dashboardCardLabelStyle}>Mes anterior</div>
            <div style={dashboardCardValueStyle}>{data.totalMesAnterior}</div>
          </div>
        </div>

        <div style={dashboardBodyStyle}>
          <div style={dashboardLeftStyle}>
            <div style={dashboardPanelStyle}>
              <h3 style={dashboardPanelTitleStyle}>Ranking de controladores</h3>

              {data.ranking.length === 0 ? (
                <div style={{ color: "#fff" }}>Sin datos</div>
              ) : (
                data.ranking.map((item, index) => (
                  <div key={item.nombre} style={rankingRowStyle}>
                    <div style={{ minWidth: 28, color: "#ffd60a", fontWeight: "bold" }}>
                      {index + 1}.
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: "bold" }}>{item.nombre}</div>
                      <div style={{ color: "#ddd", fontSize: 13 }}>
                        {item.conteos} carros · {formatearTiempo(item.tiempoPromedio)} promedio ·{" "}
                        {item.carrosPorHora} carros/hora
                      </div>

                      <div style={barTrackStyle}>
                        <div
                          style={{
                            ...barFillStyle,
                            width: `${(item.conteos / maxRanking) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={dashboardRightStyle}>
            <div style={dashboardPanelStyle}>
              <h3 style={dashboardPanelTitleStyle}>Carros por hora</h3>

              {data.porHora.length === 0 ? (
                <div style={{ color: "#fff" }}>Sin datos</div>
              ) : (
                data.porHora.map((item) => (
                  <div key={item.hora} style={chartRowStyle}>
                    <div style={chartLabelStyle}>{item.hora}</div>
                    <div style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillStyle,
                          width: `${(item.total / maxHora) * 100}%`
                        }}
                      />
                    </div>
                    <div style={chartValueStyle}>{item.total}</div>
                  </div>
                ))
              )}
            </div>

            <div style={dashboardPanelStyle}>
              <h3 style={dashboardPanelTitleStyle}>Carros por día del mes</h3>

              {data.porDiaDelMes.length === 0 ? (
                <div style={{ color: "#fff" }}>Sin datos</div>
              ) : (
                data.porDiaDelMes.map((item) => (
                  <div key={item.dia} style={chartRowStyle}>
                    <div style={chartLabelStyle}>Día {item.dia}</div>
                    <div style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillStyle,
                          width: `${(item.total / maxDia) * 100}%`
                        }}
                      />
                    </div>
                    <div style={chartValueStyle}>{item.total}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
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
  marginBottom: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap"
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

const dashboardModalStyle = {
  width: "95vw",
  maxWidth: 1200,
  maxHeight: "92vh",
  overflow: "auto",
  background: "#0f0f10",
  borderRadius: 18,
  padding: 18,
  border: "2px solid #ffd60a"
};

const dashboardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  gap: 10,
  flexWrap: "wrap"
};

const dashboardCloseButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#ffd60a",
  fontWeight: "bold",
  cursor: "pointer"
};

const dashboardCardsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 16
};

const dashboardCardStyle = {
  background: "#1b1b1d",
  border: "1px solid #333",
  borderRadius: 14,
  padding: 14
};

const dashboardCardLabelStyle = {
  color: "#ffd60a",
  fontSize: 14,
  marginBottom: 6,
  fontWeight: "bold"
};

const dashboardCardValueStyle = {
  color: "#fff",
  fontSize: 28,
  fontWeight: "bold"
};

const dashboardBodyStyle = {
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr",
  gap: 14
};

const dashboardLeftStyle = {
  minWidth: 0
};

const dashboardRightStyle = {
  minWidth: 0,
  display: "grid",
  gap: 14
};

const dashboardPanelStyle = {
  background: "#151517",
  border: "1px solid #333",
  borderRadius: 14,
  padding: 14
};

const dashboardPanelTitleStyle = {
  marginTop: 0,
  marginBottom: 14,
  color: "#ffd60a"
};

const rankingRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 12
};

const chartRowStyle = {
  display: "grid",
  gridTemplateColumns: "80px 1fr 40px",
  gap: 10,
  alignItems: "center",
  marginBottom: 10
};

const chartLabelStyle = {
  color: "#fff",
  fontSize: 13
};

const chartValueStyle = {
  color: "#fff",
  fontWeight: "bold",
  textAlign: "right"
};

const barTrackStyle = {
  width: "100%",
  height: 12,
  borderRadius: 999,
  background: "#2b2b2e",
  overflow: "hidden"
};

const barFillStyle = {
  height: "100%",
  borderRadius: 999,
  background: "#ffd60a"
};
