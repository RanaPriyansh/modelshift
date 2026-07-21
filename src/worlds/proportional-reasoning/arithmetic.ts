import type { Rational } from "./model";

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer.`);
}

export function greatestCommonDivisor(a: number, b: number): number {
  assertSafeInteger(a, "a");
  assertSafeInteger(b, "b");
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1;
}

export function rational(numerator: number, denominator = 1): Rational {
  assertSafeInteger(numerator, "numerator");
  assertSafeInteger(denominator, "denominator");
  if (denominator === 0) throw new Error("denominator must not be zero.");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return Object.freeze({
    numerator: (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  });
}

export function multiply(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator);
}

export function divide(left: Rational, right: Rational): Rational {
  if (right.numerator === 0) throw new Error("Cannot divide by zero.");
  return rational(left.numerator * right.denominator, left.denominator * right.numerator);
}

export function compareRationals(left: Rational, right: Rational): -1 | 0 | 1 {
  const leftCrossProduct = left.numerator * right.denominator;
  const rightCrossProduct = right.numerator * left.denominator;
  if (!Number.isSafeInteger(leftCrossProduct) || !Number.isSafeInteger(rightCrossProduct)) {
    throw new Error("Comparison exceeds exact safe-integer arithmetic.");
  }
  if (leftCrossProduct < rightCrossProduct) return -1;
  if (leftCrossProduct > rightCrossProduct) return 1;
  return 0;
}

export function equalRationals(left: Rational, right: Rational): boolean {
  return compareRationals(left, right) === 0;
}

export function formatRational(value: Rational): string {
  return value.denominator === 1 ? String(value.numerator) : `${value.numerator}/${value.denominator}`;
}

