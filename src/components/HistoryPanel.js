import React from "react";
 
export default function DashboardPanel({ datos }) {
 
  return (
    <div style={{marginTop:20}}>
 
      <h2>Ranking Mensual</h2>
 
      {datos.length === 0 && (
        <p>No hay datos aún</p>
      )}
 
      {datos.map((item,index)=>(
        <div key={index} style={{
          border:"1px solid #ccc",
          padding:10,
          marginBottom:5
        }}>
          
          <b>{index+1}. {item.nombre}</b>
 
          <div>Carros contados: {item.carros}</div>
 
          <div>Tiempo promedio: {item.tiempo} min</div>
 
        </div>
      ))}
 
    </div>
  );
 
}
 