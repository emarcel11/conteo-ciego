import React,{useState} from "react"
 
export default function QuickCountModal({sku,onClose,onSave}){
 
const [cajas,setCajas] = useState(0)
const [mas,setMas] = useState(0)
const [menos,setMenos] = useState(0)
const [cantidad,setCantidad] = useState(0)
 
const esBotella = sku.pack > 1
 
return(
 
<div style={{
position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.4)",
display:"flex",
alignItems:"center",
justifyContent:"center"
}}>
 
<div style={{
background:"#fff",
padding:20,
borderRadius:10,
width:320
}}>
 
<h3>{sku.nombre}</h3>
 
{esBotella ? (
 
<>
 
<label>Cajas</label>
<input
type="number"
value={cajas}
onChange={(e)=>setCajas(Number(e.target.value))}
style={{width:"100%",marginBottom:10}}
/>
 
<label>Botellas +</label>
<input
type="number"
value={mas}
onChange={(e)=>setMas(Number(e.target.value))}
style={{width:"100%",marginBottom:10}}
/>
 
<label>Botellas -</label>
<input
type="number"
value={menos}
onChange={(e)=>setMenos(Number(e.target.value))}
style={{width:"100%",marginBottom:10}}
/>
 
</>
 
) : (
 
<>
 
<label>Cantidad</label>
<input
type="number"
value={cantidad}
onChange={(e)=>setCantidad(Number(e.target.value))}
style={{width:"100%",marginBottom:10}}
/>
 
</>
 
)}
 
<button
onClick={()=>onSave(esBotella ? {cajas,mas,menos}:{cantidad})}
style={{
background:"#FFD600",
border:"none",
padding:"10px 20px",
borderRadius:8,
fontWeight:"bold"
}}
>
Guardar
</button>
 
<button
onClick={onClose}
style={{marginLeft:10}}
>
Cancelar
</button>
 
</div>
 
</div>
 
)
 
}
 
export const ENVASES = [
  { id: "330_VERDE", nombre: "Verde 330", pack: 24 },
  { id: "330_AMBAR", nombre: "Ámbar 330", pack: 24 },
  { id: "330_FLINT", nombre: "Flint 330", pack: 24 },
 
  { id: "550_VERDE", nombre: "Verde 550", pack: 12 },
  { id: "550_FLINT", nombre: "Flint 550", pack: 12 },
  { id: "550_AMBAR", nombre: "Ámbar 550", pack: 12 },
  { id: "600_AMBAR", nombre: "Ámbar 600", pack: 12 },
 
  { id: "850_VERDE", nombre: "Club Verde 850", pack: 12 },
  { id: "1000_AMBAR", nombre: "Ámbar 1000", pack: 12 },
  { id: "1000_FLINT", nombre: "Flint 1000", pack: 12 }
];
 
export const JABAS = [
  { id: "JABA_330", nombre: "Jabas 330 vacías", pack: 1 },
  { id: "JABA_11", nombre: "Jabas 1/1 vacías", pack: 1 },
  { id: "JABA_1000", nombre: "Jabas 1000 vacías", pack: 1 }
];
 
export const ACTIVOS = [
  { id: "PALETA_11", nombre: "Paleta 1/1", pack: 1 },
  { id: "PALETA_12", nombre: "Paleta 1/2", pack: 1 },
  { id: "CAJA_BEES", nombre: "Caja BEES", pack: 1 }
];
 