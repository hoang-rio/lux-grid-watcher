const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/DailyChart-Bi5X5ujO.js","assets/index-DtM7oy-u.js","assets/index-CC--mlv-.css","assets/utils-bN4E_OZW.js","assets/BarChart-BpIX1970.js","assets/react-apexcharts.min-Bh2XrvoC.js","assets/MonthlyChart-CdsuN2tv.js","assets/YearlyChart-DJmAm-2B.js"])))=>i.map(i=>d[i]);
import{r as t,u as h,j as e,L as c,_ as i}from"./index-DtM7oy-u.js";const x=t.lazy(()=>i(()=>import("./DailyChart-Bi5X5ujO.js"),__vite__mapDeps([0,1,2,3,4,5]))),u=t.lazy(()=>i(()=>import("./MonthlyChart-CdsuN2tv.js"),__vite__mapDeps([6,1,2,3,4,5]))),y=t.lazy(()=>i(()=>import("./YearlyChart-DJmAm-2B.js"),__vite__mapDeps([7,1,2,3,4,5])));var d=(s=>(s[s.Daily=0]="Daily",s[s.Monthly=1]="Monthly",s[s.Yearly=2]="Yearly",s))(d||{});function j({className:s}){const{t:a}=h(),[r,l]=t.useState(0),n=t.useRef(null);return e.jsxs("div",{className:`card col energy-chart ${s}`,children:[e.jsxs("div",{className:"row justify-space-between",children:[e.jsx("div",{className:"energy-chart-title",children:a("energyChart.title",{context:d[r].toLowerCase()})}),e.jsxs("div",{className:"row energy-chart-buttons",children:[e.jsx("button",{onClick:()=>{var o;return(o=n==null?void 0:n.current)==null?void 0:o.fetchChart()},children:a("energyChart.updateChart")}),e.jsx("div",{children:a("energyChart.chartType")}),e.jsxs("div",{className:"row chart-select",children:[e.jsx("button",{className:r===0?"active":void 0,onClick:()=>l(0),children:a("energyChart.daily")}),e.jsx("button",{className:r===1?"active":void 0,onClick:()=>l(1),children:a("energyChart.monthly")}),e.jsx("button",{className:r===2?"active":void 0,onClick:()=>l(2),children:a("energyChart.yearly")})]})]})]}),e.jsxs("div",{className:"energy-chart-content flex-1 col",children:[r===0&&e.jsx(t.Suspense,{fallback:e.jsx(c,{}),children:e.jsx(x,{ref:n})}),r===1&&e.jsx(t.Suspense,{fallback:e.jsx(c,{}),children:e.jsx(u,{ref:n})}),r===2&&e.jsx(t.Suspense,{fallback:e.jsx(c,{}),children:e.jsx(y,{ref:n})})]})]})}const v=t.memo(j);export{v as default};
