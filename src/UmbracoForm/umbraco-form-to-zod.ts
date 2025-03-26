import { match } from "ts-pattern";
import { z } from "zod";
import { isVisibleBasedOnCondition } from "./conditions";
import {
  filterFieldsByConditions,
  getAllFields,
  getAllFieldsOnPage,
  getFieldByAlias,
  getFieldByZodIssue,
} from "./field-utils";
import {
  DefaultFieldType,
  type FormDto,
  type FormFieldDto,
  type FormPageDto,
  type UmbracoFormSchema,
} from "./types";

/**
 * Defines a function type that maps a FormFieldDto to a zod type.
 *
 * @param field - The FormFieldDto to be mapped to a zod type. Optional.
 * @returns A zod type representing the mapped form field.
 */
export type MapFormFieldToZodFn = (field?: FormFieldDto) => z.ZodTypeAny;

/**
 * Refines the form data for conditional fields based on the provided form, fields, and custom field to Zod type mapping.
 *
 * @param form - The form data object.
 * @param fields - An array of form field objects.
 * @param mapCustomFieldToZodType - Optional. A function to map custom field types to Zod types.
 *
 * @returns A function that refines the form data for conditional fields.
 */
const refineForConditionals =
  (
    form: FormDto,
    fields: FormFieldDto[],
    mapCustomFieldToZodType?: MapFormFieldToZodFn,
  ) =>
  (value: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const dependentFieldAliases = fields
      .filter(
        (field) =>
          field?.condition?.rules && field?.condition?.rules?.length > 0,
      )
      .map((field) => field.alias);

    for (const alias of dependentFieldAliases) {
      if (!alias) continue;
      const field = getFieldByAlias(form, alias) as FormFieldDto;
      const isVisible = isVisibleBasedOnCondition(
        field,
        form,
        value,
        mapCustomFieldToZodType,
      );

      if (field?.required && isVisible) {
        if (!value[alias]) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            path: [alias],
            fatal: true,
            message: field?.requiredErrorMessage,
          } as z.ZodIssue);
        }
      }
    }
  };

/**
 * Maps an array of FormFieldDto objects to a Zod object schema.
 *
 * @param fields - An array of FormFieldDto objects to map to a Zod object schema.
 * @param mapCustomFieldToZodType - Optional function to map custom fields to Zod types.
 *
 * @returns A Zod object schema representing the mapped fields.
 */
function mapFieldsToZodObject(
  fields: FormFieldDto[],
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
) {
  const mappedFields = fields?.reduce<Record<string, z.ZodTypeAny>>(
    (acc, field) => {
      if (field?.alias) {
        acc[field.alias] = mapFieldToZod(field, mapCustomFieldToZodType);
      }
      return acc;
    },
    {},
  );
  return z.object(mappedFields);
}

export function umbracoFormPageToZodSchema(
  form: FormDto,
  page: FormPageDto,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
): UmbracoFormSchema {
  const fields = getAllFieldsOnPage(page).filter(
    (field) => field.id !== DefaultFieldType.TitleAndDescription,
  );
  return mapFieldsToZodObject(fields).superRefine(
    refineForConditionals(form, fields, mapCustomFieldToZodType),
  ) as UmbracoFormSchema;
}

/**
 * Converts Umbraco form pages to an array of Zod schemas.
 *
 * @param form - The Umbraco form object containing pages and fields.
 * @param mapCustomFieldToZodType - Optional function to map custom form fields to Zod types.
 *
 * @returns An array of UmbracoFormSchema objects representing the Zod schemas for each form page.
 */
export function umbracoFormPagesToZodSchemas(
  form: FormDto,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
): UmbracoFormSchema[] {
  const pageSchemas = form?.pages?.map((page) =>
    umbracoFormPageToZodSchema(form, page, mapCustomFieldToZodType),
  );
  return pageSchemas as UmbracoFormSchema[];
}

/** converts an umbraco form definition to a zod schema
 * @see https://docs.umbraco.com/umbraco-forms/developer/ajaxforms#requesting-a-form-definition */
export function umbracoFormToZodSchema(
  form: FormDto,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
): UmbracoFormSchema {
  const fields = getAllFields(form).filter(
    (field) => field.id !== DefaultFieldType.TitleAndDescription,
  );

  const schema = mapFieldsToZodObject(fields).superRefine(
    refineForConditionals(form, fields, mapCustomFieldToZodType),
  );

  return schema as UmbracoFormSchema;
}

/**
 * Maps a FormFieldDto to a zod type..
 *
 * @param field - The FormFieldDto object to map.
 * @param mapCustomFieldToZodType - Optional function to map custom fields to Zod types.
 *
 * @returns A zod type representing the mapped FormFieldDto.
 */
export function mapFieldToZod(
  field: FormFieldDto,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
): z.ZodTypeAny {
  let zodType: z.ZodType | undefined = undefined;

  const hasCondition =
    field?.condition?.rules && field?.condition?.rules.length > 0;

  match(field?.type?.id.toLowerCase())
    .with(
      DefaultFieldType.ShortAnswer,
      DefaultFieldType.LongAnswer,
      DefaultFieldType.FileUpload,
      DefaultFieldType.DropdownList,
      DefaultFieldType.RichText,
      DefaultFieldType.Password,
      DefaultFieldType.HiddenField,
      () => {
        zodType = z.string({
          required_error: field?.requiredErrorMessage,
          coerce: true,
        });
        if (field?.required && !hasCondition) {
          zodType = (zodType as z.ZodString).min(
            1,
            field?.requiredErrorMessage,
          );
        }
        if (field?.settings && "maximumLength" in field.settings) {
          zodType = (zodType as z.ZodString).max(
            Number.parseInt(field?.settings.maximumLength),
            field?.patternInvalidErrorMessage,
          );
        }
        if (field?.pattern) {
          const regex = new RegExp(field.pattern);
          zodType = (zodType as z.ZodString).refine(
            (value) => regex.test(value),
            {
              message: field.patternInvalidErrorMessage,
            },
          );
        }
      },
    )
    .with(DefaultFieldType.MultipleChoice, () => {
      zodType = z.array(z.string());
      if (field?.required) {
        zodType = (zodType as z.ZodArray<z.ZodString>).nonempty();
      }
    })
    .with(DefaultFieldType.Date, () => {
      zodType = z.date({ coerce: true });
    })
    .with(
      DefaultFieldType.Checkbox,
      DefaultFieldType.SingleChoice,
      DefaultFieldType.DataConsent,
      DefaultFieldType.Recaptcha2,
      DefaultFieldType.RecaptchaV3WithScore,
      () => {
        zodType = z.boolean({ coerce: true });
        if (field?.required && !hasCondition) {
          zodType = zodType.refine((value) => value === true, {
            message: field?.requiredErrorMessage,
          });
          return zodType;
        }
      },
    )
    .otherwise(() => {
      if (typeof mapCustomFieldToZodType === "function") {
        try {
          zodType = mapCustomFieldToZodType(field);
        } catch (e) {
          throw new Error(
            `Zod mapping failed for custom field: ${field?.type?.name} (${field?.type?.id})`,
          );
        }
      }
    });

  if (!zodType)
    throw new TypeError(
      `Mapped zod type is undefined for field: ${field?.type?.name} (${field?.type?.id})`,
    );

  if (!field?.required || hasCondition) {
    zodType = (zodType as z.ZodType).optional();
  }

  return zodType;
}

export function getIssueId(
  field: FormFieldDto | undefined,
  issue: z.ZodIssue | undefined,
) {
  return `issue:${issue?.code}:${field?.id}`;
}

/**
 * Sorts an array of Zod issues by the field alias in a given form.
 *
 * @param form - The form object containing all fields.
 * @param issues - An array of Zod issues to be sorted.
 * @returns A sorted array of Zod issues based on the field alias in the form.
 */
export function sortZodIssuesByFieldAlias(form: FormDto, issues: z.ZodIssue[]) {
  const allFields = getAllFields(form);
  const fieldPaths = allFields?.map((field) => field?.alias);

  return issues?.sort((a, b) => {
    if (!a || !b) return 0;
    const aPath = fieldPaths?.indexOf(getFieldByZodIssue(form, a)?.alias);
    const bPath = fieldPaths?.indexOf(getFieldByZodIssue(form, b)?.alias);
    if (aPath === undefined || bPath === undefined) return 0;
    if (aPath === bPath) {
      return a.path.join(".").localeCompare(b.path.join("."));
    }
    return aPath - bPath;
  });
}

/**
 * Omit fields from data based on a condition specified in the form.
 *
 * @param form - The form object containing the conditions for filtering fields.
 * @param data - The data object to filter fields from.
 * @param mapCustomFieldToZodType - Optional mapping function to map custom fields to Zod types.
 *
 * @returns A new object with fields omitted based on the condition specified in the form.
 */
export function omitFieldsBasedOnConditionFromData(
  form: FormDto,
  data: Record<string, unknown>,
  mapCustomFieldToZodType?: MapFormFieldToZodFn,
) {
  const output: Record<string, unknown> = {};
  const visibleFields = filterFieldsByConditions(
    form,
    data,
    mapCustomFieldToZodType,
  );
  for (const field of visibleFields) {
    if (field.alias) {
      output[field.alias] = data[field.alias];
    }
  }
  return output;
}

/**
 * Coerces form data into a structured object based on a given schema.
 *
 * @param formData - The FormData object containing the form data to be coerced.
 * @param schema - The UmbracoFormSchema defining the structure of the form data.
 * @returns A structured object representing the coerced form data.
 */
export function coerceFormData(
  formData: FormData | undefined,
  schema: UmbracoFormSchema,
): Record<string, unknown> {
  const output = {};

  if (!formData) return output;
  const baseDef =
    findBaseDef<z.ZodObject<Record<string, z.ZodTypeAny>>>(schema);

  for (const key of Object.keys(baseDef.shape)) {
    const zodType = baseDef.shape[key];
    parseParams(
      output,
      schema,
      key,
      isZodArrayType(zodType) ? formData.getAll(key) : formData.get(key),
    );
  }

  return output;
}

/**
 * Coerces a field value to match the expected type defined by a Zod schema.
 *
 * @param {z.ZodTypeAny} def - The Zod schema definition for the field
 * @param {unknown} value - The value to be coerced
 * @returns {unknown} - The coerced value
 */
export function coerceFieldValue(def: z.ZodTypeAny, value: unknown): unknown {
  const baseShape = findBaseDef(def);

  if (baseShape instanceof z.ZodBoolean) {
    if (typeof value === "string") {
      switch (value) {
        case "true":
        case "on":
          return true;
        case "false":
        case "off":
          return false;
      }
    }
    return Boolean(value);
  }
  if (baseShape instanceof z.ZodDate) {
    try {
      return new Date(value as string);
    } catch (e) {
      return value;
    }
  }

  return value;
}

/**
 * Coerces a value to match the expected type defined by a Zod schema.
 *
 * @param {z.ZodTypeAny} def - The Zod schema definition to coerce the value to.
 * @param {unknown} value - The value to be coerced.
 * @returns {unknown} - The coerced value that matches the expected type defined by the Zod schema.
 */
export function coerceRuleValue(def: z.ZodTypeAny, value: unknown): unknown {
  const baseShape = findBaseDef(def);

  if (baseShape instanceof z.ZodBoolean) {
    // "on"/"off" should translate to true/false in zod
    if (typeof value === "string") {
      switch (value) {
        case "true":
        case "on":
          return true;
        case "false":
        case "off":
          return false;
      }
    }
    return Boolean(value);
  }
  if (baseShape instanceof z.ZodDate) {
    return new Date(value as string);
  }
  return value;
}

/**
 * Recursively finds the base definition for a given ZodType.
 *
 * @param def - The ZodType for which to find the base definition.
 * @returns The base definition of the given ZodType.
 */
export function findBaseDef<R extends z.ZodTypeAny>(def: z.ZodTypeAny): R {
  if (def instanceof z.ZodOptional || def instanceof z.ZodDefault) {
    return findBaseDef(def._def.innerType);
  }
  if (def instanceof z.ZodArray) {
    return findBaseDef(def.element);
  }
  if (def instanceof z.ZodEffects) {
    return findBaseDef(def._def.schema);
  }
  return def as R;
}

/**
 * Checks if a Zod type definition is an array type.
 *
 * @param def - The Zod type definition to check.
 * @returns A boolean indicating whether the Zod type definition is an array type.
 */
function isZodArrayType(def: z.ZodTypeAny): def is z.ZodArray<z.ZodTypeAny> {
  if (def instanceof z.ZodOptional || def instanceof z.ZodDefault) {
    return isZodArrayType(def._def.innerType);
  }
  if (def instanceof z.ZodArray) {
    return true;
  }
  if (def instanceof z.ZodEffects) {
    return isZodArrayType(def._def.schema);
  }
  return false;
}

/**
 * Process a Zod type definition with a given key and value.
 *
 * @param def - The Zod type definition to process.
 * @param o - The object to process the Zod type definition on.
 * @param key - The key in the object to process the Zod type definition on.
 * @param value - The value to process the Zod type definition with.
 */
function processDef(
  def: z.ZodTypeAny,
  // biome-ignore lint/suspicious/noExplicitAny: allow for loose typing when processing the zod type
  o: any,
  key: string,
  value: string | string[],
) {
  let parsedValue: unknown;
  if (def instanceof z.ZodString || def instanceof z.ZodLiteral) {
    parsedValue = value;
  } else if (def instanceof z.ZodNumber) {
    const num = Number(value);
    parsedValue = Number.isNaN(num) ? value : num;
  } else if (def instanceof z.ZodDate) {
    const date = Date.parse(value?.toString());
    parsedValue = Number.isNaN(date)
      ? value
      : new Date(date)?.toISOString()?.split("T")?.at(0);
  } else if (def instanceof z.ZodBoolean) {
    parsedValue =
      value === "true" ? true : value === "false" ? false : Boolean(value);
  } else if (def instanceof z.ZodNativeEnum || def instanceof z.ZodEnum) {
    parsedValue = value;
  } else if (def instanceof z.ZodOptional || def instanceof z.ZodDefault) {
    // def._def.innerType is the same as ZodOptional's .unwrap(), which unfortunately doesn't exist on ZodDefault
    processDef(def._def.innerType, o, key, value);
    // return here to prevent overwriting the result of the recursive call
    return;
  } else if (def instanceof z.ZodArray) {
    if (o[key] === undefined) {
      o[key] = [];
    }
    processDef(def.element, o, key, value);
    // return here since recursive call will add to array
    return;
  } else if (def instanceof z.ZodEffects) {
    processDef(def._def.schema, o, key, value);
    return;
  } else {
    throw new Error(`Unexpected type ${def._def.typeName} for key ${key}`);
  }

  if (Array.isArray(o[key]) && !Array.isArray(parsedValue)) {
    o[key].push(parsedValue);
  } else {
    o[key] = parsedValue;
  }
}

function parseParams(
  o: Record<string, unknown>,
  // biome-ignore lint/suspicious/noExplicitAny: allow for loose typing when processing the zod type
  schema: any,
  key: string,
  value: string | string[] | FormDataEntryValue | FormDataEntryValue[] | null,
) {
  // find actual shape definition for this key
  let shape = schema;
  while (shape instanceof z.ZodObject || shape instanceof z.ZodEffects) {
    shape =
      shape instanceof z.ZodObject
        ? shape.shape
        : shape instanceof z.ZodEffects
          ? shape._def.schema
          : null;
    if (shape === null) {
      throw new Error(`Could not find shape for key ${key}`);
    }
  }

  if (key.includes(".")) {
    const [parentProp, ...rest] = key.split(".");
    o[parentProp] = o[parentProp] ?? {};
    parseParams(
      o[parentProp] as Record<string, unknown>,
      shape[parentProp],
      rest.join("."),
      value,
    );
    return;
  }
  if (key.includes("[]")) {
    // is array
    const normalizedKey = key.replace("[]", "");
    const def = shape[normalizedKey];
    if (def) {
      processDef(def, o, normalizedKey, value as string[]);
    }
  } else {
    const def = shape[key];
    if (def) {
      processDef(def, o, key, value as string);
    }
  }
}
