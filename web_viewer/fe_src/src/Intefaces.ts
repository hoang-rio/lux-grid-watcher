export interface IInverterData {
  status: number;
  status_text: string;
  v_pv_1: number;
  v_pv_2: number;
  v_pv_3: number;
  v_bat: number;
  soc: number;
  soh: number;
  internal_fault: number;
  p_pv: number;
  p_pv_1: number;
  p_pv_2: number;
  p_pv_3: number;
  p_charge: number;
  p_discharge: number;
  vacr: number;
  vacs: number;
  vact: number;
  fac: number;
  p_inv: number;
  p_rec: number;
  _unknown_i1_51_52: number;
  pf: number;
  v_eps_r: number;
  v_eps_s: number;
  v_eps_t: number;
  f_eps: number;
  p_eps: number;
  s_eps: number;
  p_to_grid: number;
  p_to_user: number;
  e_pv_day: number;
  e_pv_1_day: number;
  e_pv_2_day: number;
  e_pv_3_day: number;
  e_inv_day: number;
  e_rec_day: number;
  e_chg_day: number;
  e_dischg_day: number;
  e_eps_day: number;
  e_to_grid_day: number;
  e_to_user_day: number;
  v_bus_1: number;
  v_bus_2: number;
  deviceTime: string;
}

export interface ICProps {
  inverterData: IInverterData;
  isSocketConnected: boolean;
}

export interface SeriesItem {
  x: number | string;
  y: never | number;
}

export interface IClassNameProps {
  className?: string;
}

export interface IUpdateChart {
  updateItem: (hourlyItem: never[]) => void;
}

export interface ITotal {
  pv: number;
  battery_charged: number;
  battery_discharged: number;
  grid_import: number;
  grid_export: number;
  consumption: number;
}

export interface IFetchChart {
  fetchChart: () => void;
}

export interface INotificationData {
  title: string;
  body: string;
  notified_at: string | number;
}