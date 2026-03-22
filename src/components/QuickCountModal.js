import React, { useEffect, useState } from "react";
 
export default function QuickCountModal({
  sku,
  onClose,
  onSave,
  initialValues,
  esEnvase
}) {
  const [cajas, setCajas] = useState("");
  const [mas, setMas] = useState("");
  const [menos, setMenos] = useState("");
  const [cantidad, setCantidad] = useState("");
 
  useEffect(() => {
    if (initialValues) {
      if (esEnvase) {
        setCajas(initialValues.cajas || "");
        setMas(String(initialValues.mas ?? ""));
        setMenos(String(initialValues.menos ?? ""));
      } else {
        setCantidad(String(initialValues.cantidad ?? ""));
      }
    } else {
      setCajas("");
      setMas("");
      setMenos("");
      setCantidad("");
    }
  }, [initialValues, esEnvase]);
 
  function handleGuardar() {
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
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0 }}>{sku.nombre}</h2>
 
        {esEnvase ? (
          <>
            <input
              type="tel"
              inputMode="numeric"
              value={cajas}
              onChange={(e) => setCajas(e.target.value)}
              style={inputStyle}
              placeholder=""
            />
 
            <input
              type="tel"
              inputMode="numeric"
              value={mas}
              onChange={(e) => setMas(e.target.value)}
              style={inputStyle}
              placeholder="+"
            />
 
            <input
              type="tel"
              inputMode="numeric"
              value={menos}
              onChange={(e) => setMenos(e.target.value)}
              style={inputStyle}
              placeholder="-"
            />
          </>
        ) : (
          <input
            type="tel"
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            style={inputStyle}
            placeholder=""
          />
        )}
 
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={handleGuardar} style={primaryButtonStyle}>
            Guardar
          </button>
 
          <button onClick={onClose} style={secondaryButtonStyle}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
 
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
  width: 360,
  maxWidth: "92vw",
  borderRadius: 16,
  padding: 20
};
 
const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 16
};
 
const primaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#ffd60a",
  fontWeight: "bold",
  cursor: "pointer"
};
 
const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer"
};