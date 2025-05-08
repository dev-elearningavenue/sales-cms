interface ProgressBarProps {
  value: number;
  colorClass: string;
}

export const ProgressBar = ({ value, colorClass }: ProgressBarProps) => {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div
        className={`${colorClass} h-2.5 rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};
