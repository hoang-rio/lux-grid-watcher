const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/MonthlyChart-2LzxHQgP.js","assets/index-2Fv8VwMK.js","assets/index-DORG5STg.css","assets/react-apexcharts.min-Dwh-0CXz.js","assets/utils-bN4E_OZW.js","assets/YearlyChart-D_atEBNd.js"])))=>i.map(i=>d[i]);
import{r as s,j as e,L as x,_ as C}from"./index-2Fv8VwMK.js";import{C as E}from"./react-apexcharts.min-Dwh-0CXz.js";import{r as h}from"./utils-bN4E_OZW.js";const c="Solar production",w=s.forwardRef((t,a)=>{const[n,r]=s.useState([]),[u,p]=s.useState(!1),y=s.useRef(!1),_=s.useMemo(()=>{const o=[],l=[],g=[],v=[],b=[],j=[];return n.forEach(i=>{const d=new Date(i[3]).getTime();o.push({x:d,y:h(i[4])}),l.push({x:d,y:h(i[5])}),g.push({x:d,y:h(i[6])}),v.push({x:d,y:h(i[7])}),b.push({x:d,y:h(i[8])}),j.push({x:d,y:h(i[9])})}),[{name:c,data:o},{name:"Battery discharged",data:g},{name:"Battery charged",data:l},{name:"Export to grid",data:b},{name:"Import to user",data:v},{name:"Comsumption",data:j}]},[n]),m=s.useCallback(async()=>{if(y.current)return;y.current=!0;const l=await(await fetch("/daily-chart")).json();r(l),y.current=!1},[r]);s.useImperativeHandle(a,()=>({fetchChart:m}));const f=s.useCallback(()=>{document.hidden||m()},[m]);return s.useEffect(()=>(m(),document.addEventListener("visibilitychange",f),()=>document.removeEventListener("visibilitychange",f)),[m,f]),s.useEffect(()=>{const o=window.matchMedia("(prefers-color-scheme: dark)");o.matches&&p(!0),o.addEventListener("change",l=>p(l.matches))},[]),n.length?e.jsx(E,{type:"bar",series:_.reverse(),options:{chart:{toolbar:{show:!1},height:300,zoom:{allowMouseWheelZoom:!1}},colors:["rgb(112, 173, 70)","rgb(90, 155, 213)","rgb(64, 38, 198)","rgb(246, 104, 103)","rgb(153, 107, 31)","rgb(255, 164, 97)"].reverse(),theme:{mode:u?"dark":"light"},dataLabels:{enabled:!1},xaxis:{type:"datetime",labels:{datetimeUTC:!1,format:"dd/MM/yyyy"}},tooltip:{x:{format:"dd/MM/yyyy"},y:{formatter(o){return`${o} kWh`}}},yaxis:[{seriesName:c,title:{text:"Energy (kWh)"}},{seriesName:c,show:!1},{seriesName:c,show:!1},{seriesName:c,show:!1},{seriesName:c,show:!1},{seriesName:c,show:!1}].reverse()}}):e.jsx(x,{})});w.displayName="DailyChart";const k=s.memo(w),D=s.lazy(()=>C(()=>import("./MonthlyChart-2LzxHQgP.js"),__vite__mapDeps([0,1,2,3,4]))),S=s.lazy(()=>C(()=>import("./YearlyChart-D_atEBNd.js"),__vite__mapDeps([5,1,2,3,4])));var N=(t=>(t[t.Daily=0]="Daily",t[t.Monthly=1]="Monthly",t[t.Yearly=2]="Yearly",t))(N||{});function M({className:t}){const[a,n]=s.useState(0),r=s.useRef(null);return e.jsxs("div",{className:`card col energy-chart ${t}`,children:[e.jsxs("div",{className:"row justify-space-between",children:[e.jsxs("div",{className:"energy-chart-title",children:[N[a]," chart"]}),e.jsxs("div",{className:"row energy-chart-buttons",children:[e.jsx("button",{onClick:()=>{var u;return(u=r==null?void 0:r.current)==null?void 0:u.fetchChart()},children:"Update chart"}),e.jsx("div",{children:"Chart type:"}),e.jsxs("div",{className:"row chart-select",children:[e.jsx("button",{className:a===0?"active":void 0,onClick:()=>n(0),children:"Daily"}),e.jsx("button",{className:a===1?"active":void 0,onClick:()=>n(1),children:"Monthly"}),e.jsx("button",{className:a===2?"active":void 0,onClick:()=>n(2),children:"Yearly"})]})]})]}),e.jsxs("div",{className:"energy-chart-content flex-1 col",children:[a===0&&e.jsx(k,{ref:r}),a===1&&e.jsx(s.Suspense,{fallback:e.jsx(x,{}),children:e.jsx(D,{ref:r})}),a===2&&e.jsx(s.Suspense,{fallback:e.jsx(x,{}),children:e.jsx(S,{ref:r})})]})]})}const $=s.memo(M);export{$ as default};
