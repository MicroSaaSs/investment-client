import assert from "node:assert/strict";
import {test} from "node:test";
import {normalizeDecimalInput, parseDecimalInput} from "../src/utils/decimalInput.js";

test("accepts dot and comma decimals without rounding small prices", () => {
  for (const [input, expected] of [["1,22", 1.22], ["0,01", 0.01], [",00000001", 0.00000001], ["0.01", 0.01], ["50,5", 50.5], ["-10,25", -10.25], ["1e-8", 1e-8]]) {
    assert.equal(parseDecimalInput(input), expected);
  }
  assert.equal(normalizeDecimalInput("0,"), "0.");
  assert.equal(parseDecimalInput(""), 0);
});

test("rejects malformed and non-finite input instead of silently changing the amount", () => {
  for (const input of ["1,2,3", "1.2.3", "1,234.56", "abc", "Infinity", "0x10", "1e999"]) {
    assert(Number.isNaN(parseDecimalInput(input)), input);
  }
});
