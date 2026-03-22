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
      onSave({ cajas, mas, menos });
    } else {
      onSave({ cantidad });
    }
  }
 
  if (!sku) return null;
 
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>{sku.nombre}</h2>
 
        {esEnvase ? (
          <>
            <label>Cajas</label>
            <input value={cajas} onChange={(e) => setCajas(e.target.value)} />
 
            <label>+</label>
            <input value={mas} onChange={(e) => setMas(e.target.value)} />
 
            <label>-</label>
            <input value={menos} onChange={(e) => setMenos(e.target.value)} />
          </>
        ) : (
          <>
            <label>Cantidad</label>
            <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </>
        )}
 
        <button onClick={handleGuardar}>Guardar</button>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
 
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};
 
const modalStyle = {
  background: "#fff",
  padding: 20,
  borderRadius: 10
};