import{r as c,u as f,j as e}from"./index-DtM7oy-u.js";import{G as l}from"./GeneralValue-CCCBHiDb.js";import{C as w}from"./react-apexcharts.min-Bh2XrvoC.js";import{f as x,r as j}from"./utils-bN4E_OZW.js";function k({total:i,ePVDay:s}){const{t:r}=f();return e.jsxs("div",{className:"row justify-space-between align-center",children:[e.jsx("img",{src:"/assets/icon_solor_yielding.png"}),e.jsxs("div",{className:"yield-texts summary-item-content-texts ",children:[e.jsx(l,{value:s,unit:" kWh"}),e.jsx("div",{className:"description",children:r("yield.today")}),i&&e.jsxs(e.Fragment,{children:[e.jsx(l,{value:i.pv.toFixed(1),unit:" kWh"}),e.jsx("div",{className:"description",children:r("yield.total")})]})]})]})}const b=c.memo(k);function C({totalYield:i,charge:s,gridExport:r,label:n}){const{t:a}=f(),[p,m]=c.useState(!1);let t,u,d,o;return i?(t=i-s-r,u=x(t/i*100),d=x(s/i*100),o=x(r/i*100)):(t=0,u=0,d=0,o=0),c.useEffect(()=>{const y=window.matchMedia("(prefers-color-scheme: dark)");y.matches&&m(!0),y.addEventListener("change",h=>m(h.matches))},[]),e.jsxs("div",{className:"yield-chart row flex-1",children:[e.jsxs("div",{className:"texts col flex-1 align-start justify-space-between",children:[e.jsxs("div",{className:"yield-chart-load",children:[a("chart.consumption",{context:n})," ",u,"%"]}),e.jsxs("div",{className:"yield-chart-charge",children:[a("chart.batteryCharged",{context:n})," ",d,"%"]}),e.jsxs("div",{className:"yield-chart-export",children:[a("chart.exportToGrid",{context:n})," ",o,"%"]}),e.jsx("div",{className:"yield-chart-total",children:e.jsxs("strong",{children:[a("chart.total",{context:n})," ",j(i)," kWh"]})})]}),e.jsx("div",{className:"chart row align-center",children:e.jsx(w,{type:"pie",series:[j(t),j(s),j(r)],width:110,options:{colors:["#FF718F","#5CC9A0","#F2A474"],theme:{mode:p?"dark":"light"},labels:[a("chart.consumption",{context:n}),a("chart.batteryCharged",{context:n}),a("chart.exportToGrid",{context:n})],legend:{show:!1}}})})]})}const _=c.memo(C);function F({invertData:i}){const{t:s}=f(),[r,n]=c.useState(!1),[a,p]=c.useState(!1),m=c.useRef(!1),[t,u]=c.useState(),[d,o]=c.useState(0),y=c.useCallback(()=>{switch(d){case 0:o(1);break;case 1:o(2);break;default:o(0);break}},[d]),h=c.useCallback(async()=>{if(!m.current)try{console.log(s("fetchingTotal")),m.current=!0;const N=await(await fetch("/total")).json();u(N)}catch(v){console.error(s("fetchTotalError"),v)}finally{m.current=!1}},[s]),g=c.useCallback(()=>{document.hidden||h()},[h]);return c.useEffect(()=>(h(),document.addEventListener("visibilitychange",g),()=>{document.removeEventListener("visibilitychange",g)}),[h,g]),e.jsxs("div",{className:"summary row",children:[e.jsxs("div",{className:"yield summary-item flex-1 col",onClick:y,children:[e.jsx("div",{className:"summary-item-title",children:s("solarYield")}),e.jsxs("div",{className:"summary-item-content col flex-1",children:[d===0&&e.jsx(b,{total:t,ePVDay:i.e_pv_day}),d===1&&e.jsx(_,{label:"today",totalYield:i.e_pv_day,charge:i.e_chg_day,gridExport:i.e_to_grid_day}),d===2&&e.jsx(_,{label:"total",totalYield:(t==null?void 0:t.pv)||0,charge:(t==null?void 0:t.battery_charged)||0,gridExport:(t==null?void 0:t.grid_export)||0})]})]}),e.jsxs("div",{className:"battery summary-item flex-1",onClick:()=>n(!r),children:[e.jsx("div",{className:"summary-item-title",children:s(r?"batteryCharged":"batteryDischarge")}),e.jsx("div",{className:"summary-item-content",children:e.jsxs("div",{className:"row justify-space-between align-center",children:[e.jsx("img",{src:"/assets/icon_battery_discharging.png"}),e.jsxs("div",{className:"summary-item-content-texts",children:[e.jsx(l,{value:r?i.e_chg_day:i.e_dischg_day,unit:" kWh"}),e.jsx("div",{className:"description",children:s(r?"chargedToday":"dischargedToday")}),t&&e.jsxs(e.Fragment,{children:[e.jsx(l,{value:x(r?t.battery_charged:t.battery_discharged),unit:" kWh"}),e.jsx("div",{className:"description",children:s("total",{context:r?"charged":"discharged"})})]})]})]})})]}),e.jsxs("div",{className:"feed summary-item flex-1",onClick:()=>p(!a),children:[e.jsx("div",{className:"summary-item-title ",children:s(a?"feedInEnergy":"import")}),e.jsx("div",{className:"summary-item-content",children:e.jsxs("div",{className:"row justify-space-between align-center",children:[e.jsx("img",{src:a?"/assets/icon_feed_in_energy.png":"/assets/icon_import.png"}),e.jsx("div",{className:"feed-texts summary-item-content-texts",children:e.jsxs("div",{className:"col",children:[e.jsx(l,{value:a?i.e_to_grid_day:i.e_to_user_day,unit:" kWh"}),e.jsx("div",{className:"description",children:s(a?"todayExport":"todayImport")}),t&&e.jsxs(e.Fragment,{children:[e.jsx(l,{value:x(a?t.grid_export:t.grid_import),unit:" kWh"}),e.jsx("div",{className:"description",children:s("total",{context:a?"export":"import"})})]})]})})]})})]}),e.jsxs("div",{className:"comsumption summary-item flex-1",children:[e.jsx("div",{className:"summary-item-title ",children:s("consumption")}),e.jsx("div",{className:"summary-item-content",children:e.jsxs("div",{className:"row justify-space-between align-center",children:[e.jsx("img",{src:"/assets/icon_consumption.png"}),e.jsxs("div",{className:"feed-texts summary-item-content-texts",children:[e.jsx(l,{value:(i.e_inv_day+i.e_to_user_day+i.e_eps_day-i.e_rec_day).toFixed(1),unit:" kWh"}),e.jsx("div",{className:"description",children:s("todayUsed")}),t&&e.jsxs(e.Fragment,{children:[e.jsx(l,{value:x(t.consumption),unit:" kWh"}),e.jsx("div",{className:"description",children:s("totalUsed")})]})]})]})})]})]})}const I=c.memo(F);export{I as default};
