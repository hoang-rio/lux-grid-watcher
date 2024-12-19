import{r as e,j as g,L as C}from"./index-2Fv8VwMK.js";import{C as S}from"./react-apexcharts.min-Dwh-0CXz.js";import{r as n}from"./utils-bN4E_OZW.js";const a="Solar production",x=e.forwardRef((M,b)=>{const[c,d]=e.useState([]),[E,l]=e.useState(!1),h=e.useRef(!1),w=e.useMemo(()=>{const t=[],r=[],u=[],f=[],y=[],p=[];return c.forEach(s=>{const o=s[3];t.push({x:o,y:n(s[4])}),r.push({x:o,y:n(s[5])}),u.push({x:o,y:n(s[6])}),f.push({x:o,y:n(s[7])}),y.push({x:o,y:n(s[8])}),p.push({x:o,y:n(s[9])})}),[{name:a,data:t},{name:"Battery discharged",data:u},{name:"Battery charged",data:r},{name:"Export to grid",data:y},{name:"Import to user",data:f},{name:"Comsumption",data:p}]},[c]),i=e.useCallback(async()=>{if(h.current)return;h.current=!0;const r=await(await fetch("/monthly-chart")).json();d(r),h.current=!1},[d]);e.useImperativeHandle(b,()=>({fetchChart:i}));const m=e.useCallback(()=>{document.hidden||i()},[i]);return e.useEffect(()=>(i(),document.addEventListener("visibilitychange",m),()=>document.removeEventListener("visibilitychange",m)),[i,m]),e.useEffect(()=>{const t=window.matchMedia("(prefers-color-scheme: dark)");t.matches&&l(!0),t.addEventListener("change",r=>l(r.matches))},[]),c.length?g.jsx(S,{type:"bar",series:w,options:{chart:{toolbar:{show:!1},height:300,zoom:{allowMouseWheelZoom:!1}},colors:["rgb(112, 173, 70)","rgb(90, 155, 213)","rgb(64, 38, 198)","rgb(246, 104, 103)","rgb(153, 107, 31)","rgb(255, 164, 97)"],theme:{mode:E?"dark":"light"},dataLabels:{enabled:!1},xaxis:{type:"category"},tooltip:{x:{format:"dd/MM/yyyy"},y:{formatter(t){return`${t} kWh`}}},yaxis:[{seriesName:a,title:{text:"Energy (kWh)"}},{seriesName:a,show:!1},{seriesName:a,show:!1},{seriesName:a,show:!1},{seriesName:a,show:!1},{seriesName:a,show:!1}]}}):g.jsx(C,{})});x.displayName="MonthlyChart";const L=e.memo(x);export{L as default};
