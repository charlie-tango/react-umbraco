import { areAllRulesFulfilled, isVisibleBasedOnCondition } from "../conditions";
import { getAllFields } from "../field-utils";
import type { FormDto, FormFieldDto } from "../types";
import formDto from "./__fixtures__/UmbracoForm.fixture.json";

const form = formDto as FormDto;
const fields = getAllFields(form);
const fieldWithCondition = fields?.find(
  (field) => field.alias === "moreInfo",
) as FormFieldDto;
const fieldWithoutCondition = fields?.find(
  (field) =>
    (field.condition?.rules && field.condition?.rules?.length > 0) === false,
) as FormFieldDto;

describe("isVisibleBasedOnCondition", () => {
  test("should return true if no rules are defined", () => {
    expect(fieldWithoutCondition).not.toBe(undefined);
    expect(isVisibleBasedOnCondition(fieldWithoutCondition, form, {})).toBe(
      true,
    );
  });

  describe("Show", () => {
    test("should return false if conditions are not fulfilled", () => {
      expect(isVisibleBasedOnCondition(fieldWithCondition, form, {})).toBe(
        false,
      );
    });
    test("should return true if conditions are fulfilled", () => {
      expect(
        isVisibleBasedOnCondition(fieldWithCondition, form, {
          tickToAddMoreInfo: true,
        }),
      );
    });
  });

  describe("Hide", () => {
    const fieldWithHideCondition = {
      ...fieldWithCondition,
      condition: { ...fieldWithCondition.condition, actionType: "Hide" },
    } as FormFieldDto;
    test("should return false is conditions are fulfilled", () => {
      expect(
        isVisibleBasedOnCondition(fieldWithHideCondition, form, {
          tickToAddMoreInfo: true,
        }),
      ).toBe(false);
    });
    test("should return true conditions are not fulfilled", () => {
      expect(isVisibleBasedOnCondition(fieldWithHideCondition, form, {})).toBe(
        true,
      );
    });
  });
});

describe("areAllRulesFulfilled", () => {
  test("should return true if no rules are defined", () => {
    expect(areAllRulesFulfilled(fieldWithoutCondition, form, {})).toBe(true);
  });

  test.fails("should throw if target field does not exists", () => {
    const fieldWithConditionAndMissingTarget = {
      ...fieldWithCondition,
      condition: {
        ...fieldWithCondition.condition,
        rules: [{ field: "non-existant" }],
      },
    };
    areAllRulesFulfilled(fieldWithConditionAndMissingTarget, form, {});
  });
});
