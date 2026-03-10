import React, { useEffect, useState } from "react";
 
export default function QuickCountModal({
  sku,
  onClose,
  onSave,
  initialValues = null
}) {
  const [cajas, setCajas] = useState(0);
  const [mas, setMas] = useState(0);
  const [menos, setMenos] = useState(0);
  const [cantidad, setCantidad] = useState(0);
 
  const esBotella = sku.pack > 1;
 
  useEffect(() => {
    if (!initialValues) {
      setCajas(0);
      setMas(0);
      setMenos(0);
      setCantidad(0);
      return;
    }
 
    if (esBotella) {
      setCajas(initialValues.cajas || 0);
      setMas(initialValues.mas || 0);
      setMenos(initialValues.menos || 0);
      setCantidad(0);
    } else {
      setCantidad(initialValues.cantidad || 0);
      setCajas(0);
      setMas(0);
      setMenos(0);
    }
  }, [initialValues, esBotella, sku.id]);
 
  function guardar() {
    if (esBotella) {
      onSave({
        cajas: Number(cajas) || 0,
        mas: Number(mas) || 0,
        menos: Number(menos) || 0
      });
    } else {
      onSave({
        cantidad: Number(cantidad) || 0
      });
    }
  }
 
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>{sku.nombre}</h3>
 
        {esBotella ? (
          <>
            <label style={labelStyle}>Cajas</label>
            <input
              type="number"
              value={cajas}
              onChange={(e) => setCajas(e.target.value)}
              style={inputStyle}
            />
 
            <label style={labelStyle}>Botellas +</label>
            <input
              type="number"
              value={mas}
              onChange={(e) => setMas(e.target.value)}
              style={inputStyle}
            />
 
            <label style={labelStyle}>Botellas -</label>
            <input
              type="number"
              value={menos}
              onChange={(e) => setMenos(e.target.value)}
              style={inputStyle}
            />
          </>
        ) : (
          <>
            <label style={labelStyle}>Cantidad</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              style={inputStyle}
            />
          </>
        )}
 
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={guardar} style={saveButtonStyle}>
            Guardar
          </button>
 
          <button onClick={onClose} style={cancelButtonStyle}>
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
  width: 340,
  background: "#fffef5",
  borderRadius: 16,
  padding: 20,
  border: "2px solid #f4c542",
  boxShadow: "0 12px 24px rgba(0,0,0,0.2)"
};
 
const labelStyle = {
  display: "block",
  fontWeight: "bold",
  marginBottom: 4,
  fontSize: 16
};
 
const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 10,
  border: "1px solid #ccc",
  fontSize: 16
};
 
const saveButtonStyle = {
  flex: 1,
  background: "#ffd60a",
  border: "none",
  padding: "12px 14px",
  borderRadius: 10,
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer"
};
 
const cancelButtonStyle = {
  flex: 1,
  background: "#eee",
  border: "none",
  padding: "12px 14px",
  borderRadius: 10,
  fontSize: 16,
  cursor: "pointer"
};
