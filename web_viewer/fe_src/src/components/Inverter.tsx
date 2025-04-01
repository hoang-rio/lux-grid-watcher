import { ICProps, IInverterData } from "../Intefaces";

// Extracted helper function for arrow class determination
const getArrowClass = (inverterData: IInverterData, isSocketConnected: boolean) => {
  if (!isSocketConnected) return "none";
  if (inverterData.p_inv > 0) return "right";
  if (inverterData.p_rec > 0) return "left";
  return "none";
};

function Inverter({ inverterData, isSocketConnected }: ICProps) {
  return (
    <div className="inverter flex-1">
      <div className="row align-center">
        <img src="/assets/inverter_off_grid_20231003.png" />
        <div className="flex-1 arrows row justify-flex-end">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`inverter-arrow-${index}`}
              className={`x-arrow ${getArrowClass(inverterData, isSocketConnected)}`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Inverter;

