interface IProps {
  value: number;
  unit: string;
}
function GeneralValue({ value, unit }: IProps) {
  return (
    <div className="battery-value">
      <strong>{value}</strong>
      {unit}
    </div>
  );
}
export default GeneralValue;
