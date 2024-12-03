import{r as s,j as a}from"./index-DUSybahV.js";import{C as b}from"./react-apexcharts.min-DTMUVJ37.js";const r="Solar production";function j({className:x}){const[n,l]=s.useState([]),[p,h]=s.useState(!1),d=s.useRef(!1),g=s.useMemo(()=>{const e=[],o=[],m=[],f=[],u=[],y=[];return n.forEach(t=>{const c=new Date(t[3]).getTime();e.push({x:c,y:t[4]}),o.push({x:c,y:t[5]}),m.push({x:c,y:t[6]}),f.push({x:c,y:t[7]}),u.push({x:c,y:t[8]}),y.push({x:c,y:t[9]})}),[{name:r,data:e},{name:"Battery discharged",data:m},{name:"Battery charged",data:o},{name:"Export to grid",data:u},{name:"Import to user",data:f},{name:"Comsumption",data:y}]},[n]),i=s.useCallback(async()=>{if(d.current)return;d.current=!0;const o=await(await fetch("/daily-chart")).json();l(o),d.current=!1},[l]);return s.useEffect(()=>{i(),document.addEventListener("visibilitychange",()=>{document.hidden||i()})},[i]),s.useEffect(()=>{const e=window.matchMedia("(prefers-color-scheme: dark)");e.matches&&h(!0),e.addEventListener("change",o=>h(o.matches))},[]),a.jsxs("div",{className:`card daily-chart col flex-1 ${x||""}`,children:[a.jsxs("div",{className:"row justify-space-between",children:[a.jsx("div",{className:"daily-chart-title",children:"Daily Chart"}),a.jsx("div",{className:"row",children:a.jsx("button",{onClick:()=>i(),children:"Update"})})]}),a.jsx("div",{className:"daily-chart-content col flex-1",children:n.length?a.jsx(b,{type:"bar",series:g,options:{chart:{toolbar:{show:!1},height:300},colors:["rgb(112, 173, 70)","rgb(90, 155, 213)","rgb(64, 38, 198)","rgb(246, 104, 103)","rgb(153, 107, 31)","rgb(255, 164, 97)"],theme:{mode:p?"dark":"light"},dataLabels:{enabled:!1},xaxis:{type:"datetime",labels:{datetimeUTC:!1,format:"dd/MM/yyyy"}},tooltip:{x:{format:"dd/MM/yyyy"},y:{formatter(e){return`${e} kWh`}}},yaxis:[{seriesName:r,title:{text:"kWh"}},{seriesName:r,show:!1},{seriesName:r,show:!1},{seriesName:r,show:!1},{seriesName:r,show:!1},{seriesName:r,show:!1}]}}):a.jsx("div",{className:"col flex-1 justify-center align-center",children:"Loadding..."})})]})}const C=s.memo(j);export{C as default};
