import{r as t,j as l,L as S}from"./index-Ddo0eE_t.js";import{r as n}from"./utils-bN4E_OZW.js";import{B as b}from"./EnergyChart-BxLtUIqp.js";import"./react-apexcharts.min-DR7JV9TT.js";const v="Solar production",y=t.forwardRef((j,g)=>{const[c,x]=t.useState([]),[E,u]=t.useState(!1),i=t.useRef(!1),C=t.useMemo(()=>{const a=[],r=[],d=[],m=[],f=[],p=[];return c.forEach(e=>{const s=e[3];a.push({x:s,y:n(e[4])}),r.push({x:s,y:n(e[5])}),d.push({x:s,y:n(e[6])}),m.push({x:s,y:n(e[7])}),f.push({x:s,y:n(e[8])}),p.push({x:s,y:n(e[9])})}),[{name:v,data:a},{name:"Battery discharged",data:d},{name:"Battery charged",data:r},{name:"Export to grid",data:f},{name:"Import to user",data:m},{name:"Comsumption",data:p}]},[c]),o=t.useCallback(async()=>{if(i.current)return;i.current=!0;const r=await(await fetch("/monthly-chart")).json();x(r),i.current=!1},[]);t.useImperativeHandle(g,()=>({fetchChart:o}));const h=t.useCallback(()=>{document.hidden||o()},[o]);return t.useEffect(()=>(o(),document.addEventListener("visibilitychange",h),()=>document.removeEventListener("visibilitychange",h)),[o,h]),t.useEffect(()=>{const a=window.matchMedia("(prefers-color-scheme: dark)");a.matches&&u(!0),a.addEventListener("change",r=>u(r.matches))},[]),c.length?l.jsx(b,{series:C,isDark:E}):l.jsx(S,{})});y.displayName="MonthlyChart";const w=t.memo(y);export{w as default};
