const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/MonthlyChart-CUe6BOAu.js","assets/index-DKB4gB__.js","assets/index-CC--mlv-.css","assets/react-apexcharts.min-ZuF0L6FM.js","assets/utils-bN4E_OZW.js","assets/YearlyChart-SOctz5kx.js"])))=>i.map(i=>d[i]);
import{r as t,j as e,L as p,_ as w}from"./index-DKB4gB__.js";import{C as _}from"./react-apexcharts.min-ZuF0L6FM.js";import{r as d}from"./utils-bN4E_OZW.js";const l="Solar production",C=t.forwardRef((a,r)=>{const[i,n]=t.useState([]),[u,b]=t.useState(!1),x=t.useRef(!1),N=t.useMemo(()=>{const s=[],o=[],f=[],y=[],j=[],v=[];return i.forEach(c=>{const h=new Date(c[3]).getTime();s.push({x:h,y:d(c[4])}),o.push({x:h,y:d(c[5])}),f.push({x:h,y:d(c[6])}),y.push({x:h,y:d(c[7])}),j.push({x:h,y:d(c[8])}),v.push({x:h,y:d(c[9])})}),[{name:l,data:s},{name:"Battery discharged",data:f},{name:"Battery charged",data:o},{name:"Export to grid",data:j},{name:"Import to user",data:y},{name:"Comsumption",data:v}]},[i]),m=t.useCallback(async()=>{if(x.current)return;x.current=!0;const o=await(await fetch("/daily-chart")).json();n(o),x.current=!1},[n]);t.useImperativeHandle(r,()=>({fetchChart:m}));const g=t.useCallback(()=>{document.hidden||m()},[m]);if(t.useEffect(()=>(m(),document.addEventListener("visibilitychange",g),()=>document.removeEventListener("visibilitychange",g)),[m,g]),t.useEffect(()=>{const s=window.matchMedia("(prefers-color-scheme: dark)");s.matches&&b(!0),s.addEventListener("change",o=>b(o.matches))},[]),i.length){const s=new Date,o=new Date(s.getFullYear(),s.getMonth(),1),f=new Date(s.getFullYear(),s.getMonth()+1,0);return e.jsx(_,{type:"bar",height:400,series:N,options:{chart:{toolbar:{show:!1},zoom:{allowMouseWheelZoom:!1}},colors:["rgb(112, 173, 70)","rgb(90, 155, 213)","rgb(64, 38, 198)","rgb(246, 104, 103)","rgb(153, 107, 31)","rgb(255, 164, 97)"],theme:{mode:u?"dark":"light"},dataLabels:{enabled:!1},xaxis:{type:"datetime",labels:{datetimeUTC:!1,format:"dd"},min:o.getTime(),max:f.getTime(),stepSize:1},tooltip:{x:{format:"dd/MM/yyyy"},y:{formatter(y){return`${y} kWh`}}},yaxis:[{seriesName:l,title:{text:"Energy (kWh)"}},{seriesName:l,show:!1},{seriesName:l,show:!1},{seriesName:l,show:!1},{seriesName:l,show:!1},{seriesName:l,show:!1}]}})}return e.jsx(p,{})});C.displayName="DailyChart";const E=t.memo(C),S=t.lazy(()=>w(()=>import("./MonthlyChart-CUe6BOAu.js"),__vite__mapDeps([0,1,2,3,4]))),k=t.lazy(()=>w(()=>import("./YearlyChart-SOctz5kx.js"),__vite__mapDeps([5,1,2,3,4])));var D=(a=>(a[a.Daily=0]="Daily",a[a.Monthly=1]="Monthly",a[a.Yearly=2]="Yearly",a))(D||{});function M({className:a}){const[r,i]=t.useState(0),n=t.useRef(null);return e.jsxs("div",{className:`card col energy-chart ${a}`,children:[e.jsxs("div",{className:"row justify-space-between",children:[e.jsxs("div",{className:"energy-chart-title",children:[D[r]," chart"]}),e.jsxs("div",{className:"row energy-chart-buttons",children:[e.jsx("button",{onClick:()=>{var u;return(u=n==null?void 0:n.current)==null?void 0:u.fetchChart()},children:"Update chart"}),e.jsx("div",{children:"Chart type:"}),e.jsxs("div",{className:"row chart-select",children:[e.jsx("button",{className:r===0?"active":void 0,onClick:()=>i(0),children:"Daily"}),e.jsx("button",{className:r===1?"active":void 0,onClick:()=>i(1),children:"Monthly"}),e.jsx("button",{className:r===2?"active":void 0,onClick:()=>i(2),children:"Yearly"})]})]})]}),e.jsxs("div",{className:"energy-chart-content flex-1 col",children:[r===0&&e.jsx(E,{ref:n}),r===1&&e.jsx(t.Suspense,{fallback:e.jsx(p,{}),children:e.jsx(S,{ref:n})}),r===2&&e.jsx(t.Suspense,{fallback:e.jsx(p,{}),children:e.jsx(k,{ref:n})})]})]})}const Y=t.memo(M);export{Y as default};
