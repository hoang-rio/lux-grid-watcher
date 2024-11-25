interface IProps {
  label: string;
  pValue: number;
  vValue?: number;
}

function PVPowerValue({ label, pValue, vValue }: IProps) {
  return (
    <div className="power-item row">
      <div className="power-title flex-1">{label}</div>
      <div className="power-value flex-1">
        <strong>{pValue}</strong> W
      </div>
      {vValue !== undefined ? (
        <div className="power-value flex-1">
          <strong>{vValue}</strong> V
        </div>
      ) : (
        <span className="power-value flex-1"></span>
      )}
    </div>
  );
}

export default PVPowerValue;
