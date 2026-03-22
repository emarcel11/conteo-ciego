// 🔥 APP.JS FINAL COMPLETO

import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "./supabaseClient";
import { ENVASES, JABAS, ACTIVOS } from "./dataSkus";
import QuickCountModal from "./components/QuickCountModal";

// 🔧 FUNCIONES BASE
function calcularExpresion(valor) {
  try {
    const limpio = valor.replace(/[^0-9+]/g, "");
    return limpio.split("+").reduce((acc, num) => acc + Number(num || 0), 0);
  } catch {
    return 0;
  }
}

function normalizarExpresion(valor) {
  return valor.replace(/[^0-9+]/g, "").replace(/\+\+/g, "+");
}

const TODOS_LOS_SKUS = [...ENVASES, ...JABAS, ...ACTIVOS];
const SKU_MAP = Object.fromEntries(TODOS_LOS_SKUS.map((s) => [s.id, s]));

export default function App() {
  const [skuActivo, setSkuActivo] = useState(null);
  const [modalInicial, setModalInicial] = useState(null);
  const [detalleConteo, setDetalleConteo] = useState({});

  // 🔥 GUARDAR SKU (FIX FINAL)
  function guardarSku(valores) {
    const sku = skuActivo;
    if (!sku) return;

    const esBotella = ENVASES.some((item) => item.id === sku.id);

    if (esBotella) {
      const expresion = normalizarExpresion(valores.cajas || "");
      const cajas = calcularExpresion(expresion);

      const total = cajas * sku.pack;

      setDetalleConteo((prev) => ({
        ...prev,
        [sku.id]: {
          sku_codigo: sku.id,
          descripcion: sku.nombre,
          cajas,
          cajas_texto: expresion,
          total_botellas: total
        }
      }));
    } else {
      const cantidad = Number(valores.cantidad) || 0;

      setDetalleConteo((prev) => ({
        ...prev,
        [sku.id]: {
          sku_codigo: sku.id,
          descripcion: sku.nombre,
          cajas: cantidad,
          total_botellas: cantidad
        }
      }));
    }

    setSkuActivo(null);
    setModalInicial(null);
  }

  // 🔥 ABRIR SKU (FIX CLAVE)
  function abrirSkuDesdePrincipal(sku) {
    const actual = detalleConteo[sku.id];

    if (actual) {
      setModalInicial({
        cajas: actual.cajas_texto || "",
      });
    } else {
      setModalInicial(null);
    }

    setSkuActivo(sku);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Conteo Ciego</h1>

      {/* ENVASES */}
      <h2>Envases</h2>
      {ENVASES.map((sku) => (
        <button
          key={sku.id}
          onClick={() => abrirSkuDesdePrincipal(sku)}
          style={{
            margin: 5,
            padding: 10,
            background: detalleConteo[sku.id] ? "#b6f5b6" : "#fff"
          }}
        >
          {sku.nombre}
        </button>
      ))}

      {/* RESULTADOS */}
      <h2>Resultados</h2>
      {Object.values(detalleConteo).map((item) => (
        <div key={item.sku_codigo}>
          {item.descripcion} → {item.cajas} cajas → {item.total_botellas} botellas
        </div>
      ))}

      {/* MODAL */}
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