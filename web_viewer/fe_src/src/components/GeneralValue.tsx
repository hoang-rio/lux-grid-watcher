interface IProps {
  value: number;
  unit: string;
}
function GeneralValue({ value, unit }: IProps) {
  return (
    <div className="general-value">
      <strong>{value}</strong>
      {unit}
    </div>
  );
}
export default GeneralValue;
