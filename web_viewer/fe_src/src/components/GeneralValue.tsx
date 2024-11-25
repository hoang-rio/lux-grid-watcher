import "./GeneralValue.css";
interface IProps {
  value: number | string;
  unit: string;
  className?: string;
}

function GeneralValue({ value, unit, className }: IProps) {
  return (
    <div className={`${className} general-value`}>
      <strong>{value}</strong>
      {unit}
    </div>
  );
}
export default GeneralValue;
