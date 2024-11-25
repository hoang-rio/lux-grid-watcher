import { ICProps } from "../Intefaces";

function Inverter({ inverterData, isSocketConnected }: ICProps) {
  return (
    <div className="inverter flex-1">
      <div className="row align-center">
        <img src="/assets/inverter_off_grid_20231003.png" />
        <div className="flex-1 arrows row justify-flex-end">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={"inverter-arrow-" + index}
              className={`x-arrow ${
                isSocketConnected
                  ? inverterData.p_inv > 0
                    ? "right"
                    : inverterData.p_rec > 0
                    ? "left"
                    : "none"
                  : "none"
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Inverter;

