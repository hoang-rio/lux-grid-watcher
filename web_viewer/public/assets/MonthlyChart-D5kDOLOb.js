import{r as t,j as y,L as S}from"./index-NolOTaoe.js";import{r as n}from"./utils-bN4E_OZW.js";import{B as b}from"./EnergyChart-D4UhhD5r.js";import"./react-apexcharts.min-Cfl3hJIx.js";const v="Solar production",g=t.forwardRef((j,x)=>{const[c,u]=t.useState([]),[E,d]=t.useState(!1),i=t.useRef(!1),C=t.useMemo(()=>{const a=[],r=[],m=[],f=[],p=[],l=[];return c.forEach(e=>{const s=e[3];a.push({x:s,y:n(e[4])}),r.push({x:s,y:n(e[5])}),m.push({x:s,y:n(e[6])}),f.push({x:s,y:n(e[7])}),p.push({x:s,y:n(e[8])}),l.push({x:s,y:n(e[9])})}),[{name:v,data:a},{name:"Battery discharged",data:m},{name:"Battery charged",data:r},{name:"Export to grid",data:p},{name:"Import to user",data:f},{name:"Comsumption",data:l}]},[c]),o=t.useCallback(async()=>{if(i.current)return;i.current=!0;const r=await(await fetch("/monthly-chart")).json();u(r),i.current=!1},[u]);t.useImperativeHandle(x,()=>({fetchChart:o}));const h=t.useCallback(()=>{document.hidden||o()},[o]);return t.useEffect(()=>(o(),document.addEventListener("visibilitychange",h),()=>document.removeEventListener("visibilitychange",h)),[o,h]),t.useEffect(()=>{const a=window.matchMedia("(prefers-color-scheme: dark)");a.matches&&d(!0),a.addEventListener("change",r=>d(r.matches))},[]),c.length?y.jsx(b,{series:C,isDark:E}):y.jsx(S,{})});g.displayName="MonthlyChart";const w=t.memo(g);export{w as default};
