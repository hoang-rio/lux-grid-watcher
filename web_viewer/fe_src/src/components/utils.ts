export function fixedIfNeed(num: number, fixedNumber = 1) {
  if (num > 0) {
    return num.toFixed(fixedNumber);
  }
  return num;
}

export const roundTo = (num: number, fixedNumber = 1): number => {
  const numToFixed = Math.pow(10, fixedNumber);
  return Math.round(num * numToFixed) / numToFixed;
};