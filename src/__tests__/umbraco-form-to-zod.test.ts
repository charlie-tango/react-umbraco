import { z } from "zod";
import { DefaultFieldType, type FormFieldDto } from "../UmbracoForm/types";
import {
  type MapFormFieldToZodFn,
  mapFieldToZod,
} from "../UmbracoForm/umbraco-form-to-zod";

const defaultFieldTypes = Object.fromEntries(Object.entries(DefaultFieldType));
const defaultFieldKeys = Object.keys(
  defaultFieldTypes,
) as (keyof typeof defaultFieldTypes)[];

describe("mapFieldToZod", () => {
  describe("convert default fields to corresponding ZodType", () => {
    test.each(defaultFieldKeys.filter((key) => key !== "TitleAndDescription"))(
      "should convert %s to ZodType",
      (key) => {
        const zodType = mapFieldToZod({
          type: { id: defaultFieldTypes[key] },
        } as FormFieldDto);
        expect(zodType).toBeInstanceOf(z.ZodType);
      },
    );
  });
  describe("custom fields", () => {
    const customField = {
      type: {
        id: "CustomField",
        name: "CustomField",
      },
    } as FormFieldDto;
    test("should throw if custom mapping function is not provided and field is attempted to be converted", () => {
      expect(() => mapFieldToZod(customField)).toThrowError();
    });
    test("should throw if custom mapping function does not return a zodType", () => {
      const customMappingFunction = (() =>
        undefined) as unknown as MapFormFieldToZodFn;
      expect(() =>
        mapFieldToZod(customField, customMappingFunction),
      ).toThrowError();
    });
    test("should return custom mapping function if provided", () => {
      const customMappingFunction: MapFormFieldToZodFn = (field) => z.string();
      const zodType = mapFieldToZod(customField, customMappingFunction);
      expect(zodType).toBeInstanceOf(z.ZodType);
    });
    test("should be optional if field is not required", () => {
      const customMappingFunction: MapFormFieldToZodFn = (field) => z.string();
      const zodType = mapFieldToZod(
        { ...customField, required: false },
        customMappingFunction,
      );
      expect(zodType).toBeInstanceOf(z.ZodOptional);
    });
  });
});
