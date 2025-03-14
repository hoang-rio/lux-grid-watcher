import{r as t,u as w,j as g,L as E}from"./index-DtM7oy-u.js";import{r as o}from"./utils-bN4E_OZW.js";import{B as v}from"./BarChart-BpIX1970.js";import"./react-apexcharts.min-Bh2XrvoC.js";const y=t.forwardRef((S,x)=>{const{t:r}=w(),[h,D]=t.useState([]),[C,u]=t.useState(!1),d=t.useRef(!1),b=t.useMemo(()=>{const e=[],a=[],i=[],l=[],f=[],p=[];return h.forEach(s=>{const n=new Date(s[3]).getTime();e.push({x:n,y:o(s[4])}),a.push({x:n,y:o(s[5])}),i.push({x:n,y:o(s[6])}),l.push({x:n,y:o(s[7])}),f.push({x:n,y:o(s[8])}),p.push({x:n,y:o(s[9])})}),[{name:r("chart.solarProduction"),data:e},{name:r("chart.batteryDischarged"),data:i},{name:r("chart.batteryCharged"),data:a},{name:r("chart.exportToGrid"),data:f},{name:r("chart.importToUser"),data:l},{name:r("chart.consumption"),data:p}]},[h,r]),c=t.useCallback(async()=>{if(d.current)return;d.current=!0;const a=await(await fetch("/daily-chart")).json();D(a),d.current=!1},[]);t.useImperativeHandle(x,()=>({fetchChart:c}));const m=t.useCallback(()=>{document.hidden||c()},[c]);if(t.useEffect(()=>(c(),document.addEventListener("visibilitychange",m),()=>document.removeEventListener("visibilitychange",m)),[c,m]),t.useEffect(()=>{const e=window.matchMedia("(prefers-color-scheme: dark)");return e.matches&&u(!0),e.addEventListener("change",a=>u(a.matches)),()=>e.removeEventListener("change",a=>u(a.matches))},[]),h.length){const e=new Date,a=new Date(e.getFullYear(),e.getMonth(),1),i=new Date(e.getFullYear(),e.getMonth()+1,0);return g.jsx(v,{series:b,isDark:C,xaxis:{type:"datetime",labels:{datetimeUTC:!1,format:"d"},min:a.getTime(),max:i.getTime(),stepSize:1}})}return g.jsx(E,{})});y.displayName="DailyChart";const k=t.memo(y);export{k as default};
