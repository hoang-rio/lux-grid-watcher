interface IProps {
  label: string;
  pValue: number;
  vValue?: number;
}

function PVPowerValue({ label, pValue, vValue }: IProps) {
  return (
    <div className="power-item">
      <span className="power-title">{label}</span>
      <span className="power-value">
        <strong>{pValue}</strong> W
      </span>
      {vValue !== undefined && (
        <span className="power-value">
          <strong>{vValue}</strong> V
        </span>
      )}
    </div>
  );
}

export default PVPowerValue;
