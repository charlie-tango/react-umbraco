import { getFieldById } from "./field-utils";
import type {
  DtoWithCondition,
  FieldConditionRuleOperator,
  FormDto,
} from "./types";
import {
  type MapFormFieldToZodFn,
  coerceFieldValue,
  coerceRuleValue,
  mapFieldToZod,
} from "./umbraco-form-to-zod";

/**
 * Checks if the condition specified in the data transfer object is fulfilled based on the form data.
 *
 * @param {DtoWithCondition} dto - The data transfer object containing the condition to check.
 * @param {FormDto} form - The form which includes the form structure and values.
 * @param {Record<string, unknown>} data - The data record containing field values.
 * @param {MapFormFieldToZodFn} [mapCustomFieldToZodType] - Optional function to map custom fields to Zod types.
 * @returns {boolean} - Returns `true` if the condition is fulfilled, otherwise `false`.
 */
export function isVisibleBasedOnCondition(
  dto: DtoWithCondition,
  form: FormDto,
  data: Record<string, unknown>,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
): boolean {
  if (!dto?.condition) return true;
  const isFulfilled = areAllRulesFulfilled(
    dto,
    form,
    data,
    mapCustomFieldToZodType,
  );

  if (dto?.condition?.actionType === "Show") {
    return isFulfilled;
  }

  if (dto?.condition?.actionType === "Hide") {
    return !isFulfilled;
  }

  return true;
}

/**
 * Checks if all the rules in a data transfer object's condition are fulfilled based on the provided form and data.
 *
 * @param {DtoWithCondition} dto - The data transfer object containing the condition to check.
 * @param {FormDto} form - The form which includes the fields to be checked against the rules.
 * @param {Record<string, unknown>} data - The data object containing field values to be validated.
 * @param {MapFormFieldToZodFn} [mapCustomFieldToZodType] - Optional function to map custom fields to Zod types.
 * @returns {boolean} - Returns true if all the rules are fulfilled, otherwise false.
 * @throws {TypeError} - Throws an error if a rule field is undefined.
 * @throws {Error} - Throws an error if a rule target field cannot be found in the form definition.
 */
export function areAllRulesFulfilled(
  dto: DtoWithCondition,
  form: FormDto,
  data: Record<string, unknown>,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
): boolean {
  const rules = dto?.condition?.rules;
  if (!rules || rules.length === 0) return true;

  const appliedRules = rules.map((rule): boolean => {
    if (rule?.field === undefined) {
      throw new TypeError("Rule field is undefined");
    }
    const operator = rule?.operator as FieldConditionRuleOperator;
    const targetField = getFieldById(form, rule.field);
    if (targetField === undefined || targetField.alias === undefined) {
      throw new Error(
        `Rule target for field id: "${rule.field}" could not be found in the form definition`,
      );
    }
    const fieldZodType = mapFieldToZod(targetField, mapCustomFieldToZodType);

    // coerce values based on filed zod type to ensure proper comparisons
    const fieldValue = coerceFieldValue(fieldZodType, data[targetField.alias]);
    const ruleValue = coerceRuleValue(fieldZodType, rule.value);

    return FIELD_CONDITION_OPERATOR_FUNCTIONS[operator](fieldValue, ruleValue);
  });

  if (dto.condition?.logicType === "All") {
    return appliedRules.every((rule) => rule === true);
  }

  if (dto.condition?.logicType === "Any") {
    return appliedRules.some((rule) => rule === true);
  }

  return true;
}

export const FIELD_CONDITION_OPERATOR_FUNCTIONS: {
  [K in FieldConditionRuleOperator]: (
    fieldValue: unknown,
    ruleValue: unknown,
  ) => boolean;
} = {
  Is: is,
  IsNot: not(is),
  GreaterThen: greaterThan,
  LessThen: lessThan,
  Contains: contains,
  ContainsIgnoreCase: ignoreCase(contains),
  StartsWith: startsWith,
  StartsWithIgnoreCase: ignoreCase(startsWith),
  EndsWith: endsWith,
  EndsWithIgnoreCase: ignoreCase(endsWith),
  NotContains: not(contains),
  NotContainsIgnoreCase: not(ignoreCase(contains)),
  NotStartsWith: not(startsWith),
  NotStartsWithIgnoreCase: not(ignoreCase(startsWith)),
  NotEndsWith: not(endsWith),
  NotEndsWithIgnoreCase: not(ignoreCase(endsWith)),
} as const;

function not(fn: (value: unknown, rule: unknown) => boolean) {
  return (value: unknown, rule: unknown) => !fn(value, rule);
}

function ignoreCase(fn: (value: unknown, rule: unknown) => boolean) {
  return (value: unknown, rule: unknown) =>
    fn(value?.toString()?.toLowerCase(), rule?.toString()?.toLowerCase());
}

function greaterThan(value: unknown, rule: unknown) {
  return value && rule ? value > rule : false;
}

function lessThan(value: unknown, rule: unknown) {
  return value && rule ? value < rule : false;
}

export function is(value: unknown, rule: unknown) {
  return value === rule;
}

function contains(value: unknown, rule: unknown) {
  return rule ? (value?.toString().includes(rule?.toString()) ?? false) : false;
}

function startsWith(value: unknown, rule: unknown) {
  return rule
    ? (value?.toString().startsWith(rule?.toString()) ?? false)
    : false;
}

function endsWith(value: unknown, rule: unknown) {
  return rule ? (value?.toString().endsWith(rule?.toString()) ?? false) : false;
}
