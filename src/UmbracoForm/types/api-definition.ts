export interface paths {
  "/umbraco/forms/api/v1/definitions/{id}": {
    get: {
      parameters: {
        query?: {
          /** @description The Id of the content page on which the form is hosted. */
          contentId?: string;
          /** @description The culture code for the form's localization context. */
          culture?: string;
        };
        path: {
          /** @description The form's Id. */
          id: string;
        };
      };
      responses: {
        /** @description Success */
        200: {
          content: {
            "application/json": components["schemas"]["FormDto"];
          };
        };
        /** @description Bad Request */
        400: {
          content: {
            "application/json":
              | components["schemas"]["ProblemDetails"]
              | components["schemas"]["HttpValidationProblemDetails"];
          };
        };
        /** @description Not Found */
        404: {
          content: {
            "application/json":
              | components["schemas"]["ProblemDetails"]
              | components["schemas"]["HttpValidationProblemDetails"];
          };
        };
      };
    };
  };
  "/umbraco/forms/api/v1/entries/{id}": {
    post: {
      parameters: {
        path: {
          /** @description The form's Id. */
          id: string;
        };
      };
      requestBody?: {
        content: {
          "application/json": components["schemas"]["FormEntryDto"];
        };
      };
      responses: {
        /** @description Accepted */
        202: {
          content: never;
        };
        /** @description Bad Request */
        400: {
          content: {
            "application/json":
              | components["schemas"]["ProblemDetails"]
              | components["schemas"]["HttpValidationProblemDetails"];
          };
        };
        /** @description Not Found */
        404: {
          content: {
            "application/json":
              | components["schemas"]["ProblemDetails"]
              | components["schemas"]["HttpValidationProblemDetails"];
          };
        };
        /** @description Client Error */
        422: {
          content: {
            "application/json":
              | components["schemas"]["ProblemDetails"]
              | components["schemas"]["HttpValidationProblemDetails"];
          };
        };
      };
    };
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    /** @enum {string} */
    FieldConditionActionType: "Show" | "Hide";
    /** @enum {string} */
    FieldConditionLogicType: "All" | "Any";
    /** @enum {string} */
    FieldConditionRuleOperator:
      | "Is"
      | "IsNot"
      | "GreaterThen"
      | "LessThen"
      | "Contains"
      | "ContainsIgnoreCase"
      | "StartsWith"
      | "StartsWithIgnoreCase"
      | "EndsWith"
      | "EndsWithIgnoreCase"
      | "NotContains"
      | "NotContainsIgnoreCase"
      | "NotStartsWith"
      | "NotStartsWithIgnoreCase"
      | "NotEndsWith"
      | "NotEndsWithIgnoreCase";
    FormConditionDto: {
      actionType?: components["schemas"]["FieldConditionActionType"];
      logicType?: components["schemas"]["FieldConditionLogicType"];
      rules?: components["schemas"]["FormConditionRuleDto"][];
    };
    FormConditionRuleDto: {
      field?: string;
      operator?: components["schemas"]["FieldConditionRuleOperator"];
      value?: string;
    };
    FormDto: {
      /** Format: uuid */
      id?: string;
      name?: string;
      indicator?: string;
      cssClass?: string;
      nextLabel?: string;
      previousLabel?: string;
      submitLabel?: string;
      disableDefaultStylesheet?: boolean;
      fieldIndicationType?: components["schemas"]["FormFieldIndication"];
      hideFieldValidation?: boolean;
      messageOnSubmit?: string;
      messageOnSubmitIsHtml?: boolean;
      showValidationSummary?: boolean;
      /** Format: uuid */
      gotoPageOnSubmit?: string;
      gotoPageOnSubmitRoute?: components["schemas"]["IApiContentRouteModel"];
      pages?: components["schemas"]["FormPageDto"][];
    };
    FormEntryDto: {
      values?: {
        [key: string]: string[];
      };
      contentId?: string;
      culture?: string;
    };
    FormFieldDto: {
      /** Format: uuid */
      id?: string;
      caption?: string;
      helpText?: string;
      placeholder?: string;
      cssClass?: string;
      alias?: string;
      required?: boolean;
      requiredErrorMessage?: string;
      pattern?: string;
      patternInvalidErrorMessage?: string;
      condition?: components["schemas"]["FormConditionDto"];
      fileUploadOptions?: components["schemas"]["FormFileUploadOptionsDto"];
      preValues?: components["schemas"]["FormFieldPrevalueDto"][];
      settings?: {
        [key: string]: string;
      };
      type?: components["schemas"]["FormFieldTypeDto"];
    };
    /** @enum {string} */
    FormFieldIndication:
      | "NoIndicator"
      | "MarkMandatoryFields"
      | "MarkOptionalFields";
    FormFieldPrevalueDto: {
      value?: string;
      caption?: string;
    };
    FormFieldTypeDto: {
      /** Format: uuid */
      id?: string;
      name?: string;
      supportsPreValues?: boolean;
      supportsUploadTypes?: boolean;
      renderInputType?: string;
    };
    FormFieldsetColumnDto: {
      caption?: string;
      /** Format: int32 */
      width?: number;
      fields?: components["schemas"]["FormFieldDto"][];
    };
    FormFieldsetDto: {
      /** Format: uuid */
      id?: string;
      caption?: string;
      condition?: components["schemas"]["FormConditionDto"];
      columns?: components["schemas"]["FormFieldsetColumnDto"][];
    };
    FormFileUploadOptionsDto: {
      allowAllUploadExtensions?: boolean;
      allowedUploadExtensions?: string[];
      allowMultipleFileUploads?: boolean;
    };
    FormPageDto: {
      caption?: string;
      condition?: components["schemas"]["FormConditionDto"];
      fieldsets?: components["schemas"]["FormFieldsetDto"][];
    };
    HttpValidationProblemDetails: {
      errors?: {
        [key: string]: string[];
      };
      [key: string]: unknown;
    } & components["schemas"]["ProblemDetails"];
    IApiContentRouteModel: {
      path: string;
      startItem?: components["schemas"]["IApiContentStartItemModel"];
    };
    IApiContentStartItemModel: {
      /** Format: uuid */
      id: string;
      path: string;
    };
    ProblemDetails: {
      type?: string;
      title?: string;
      /** Format: int32 */
      status?: number;
      detail?: string;
      instance?: string;
      [key: string]: unknown;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

export type external = Record<string, never>;

export type operations = Record<string, never>;
