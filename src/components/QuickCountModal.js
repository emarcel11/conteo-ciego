import React, { useState, useEffect } from "react";
 
export default function QuickCountModal({
  sku,
  onClose,
  onSave,
  initialValues,
  esEnvase
}) {
  // ⚠️ Hooks SIEMPRE arriba (no condicionales)
  const [cajas, setCajas] = useState("");
  const [mas, setMas] = useState("");
  const [menos, setMenos] = useState("");
  const [cantidad, setCantidad] = useState("");
 
  // Cargar valores iniciales
  useEffect(() => {
    if (initialValues) {
      if (esEnvase) {
        setCajas(initialValues.cajas || "");
        setMas(initialValues.mas || "");
        setMenos(initialValues.menos || "");
      } else {
        setCantidad(initialValues.cantidad || "");
      }
    }
  }, [initialValues, esEnvase]);
 
  function handleSave() {
    if (esEnvase) {
      onSave({
        cajas,
        mas,
        menos
      });
    } else {
      onSave({
        cantidad
      });
    }
  }
 
  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>{sku.nombre}</h2>
 
        {esEnvase ? (
          <>
            <input
              placeholder="Cajas (ej: 25+10)"
              value={cajas}
              onChange={(e) => setCajas(e.target.value)}
              style={input}
            />
 
            <input
              placeholder="+"
              value={mas}
              onChange={(e) => setMas(e.target.value)}
              style={input}
            />
 
            <input
              placeholder="-"
              value={menos}
              onChange={(e) => setMenos(e.target.value)}
              style={input}
            />
          </>
        ) : (
          <input
            placeholder="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            style={input}
          />
        )}
 
        <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
          <button onClick={handleSave} style={btnPrimary}>
            Guardar
          </button>
 
          <button onClick={onClose} style={btnSecondary}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
 
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999
};
 
const modal = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  width: 320
};
 
const input = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  borderRadius: 8,
  border: "1px solid #ccc"
};
 
const btnPrimary = {
  flex: 1,
  padding: 10,
  background: "#ffd60a",
  border: "none",
  borderRadius: 8,
  fontWeight: "bold"
};
 
const btnSecondary = {
  flex: 1,
  padding: 10,
  background: "#eee",
  border: "none",
  borderRadius: 8
};