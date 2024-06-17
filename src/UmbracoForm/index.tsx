import {
  Fragment,
  useCallback,
  useDeferredValue,
  useState,
  useTransition,
} from "react";
import type { ZodIssue } from "zod";
import { isVisibleBasedOnCondition } from "./conditions";
import * as defaultComponents from "./default-components";
import {
  filterFieldsByConditions,
  getAllFieldsOnPage,
  getFieldByZodIssue,
} from "./field-utils";
import type { DtoWithCondition, FormDto, UmbracoFormConfig } from "./types";
import {
  coerceFormData,
  sortZodIssuesByFieldAlias,
  umbracoFormPagesToZodArray,
  umbracoFormToZod,
} from "./umbraco-form-to-zod";

// biome-ignore lint/suspicious/noExplicitAny: allow for any type
type RenderFn<T extends React.JSXElementConstructor<any>> = (
  props: React.ComponentProps<T>,
) => React.ReactNode;

export interface UmbracoFormProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit?: (
    e: React.FormEvent<HTMLFormElement>,
    data?: Record<string, unknown>,
  ) => void;
  form: FormDto;
  config?: Partial<UmbracoFormConfig>;
  renderForm?: RenderFn<typeof defaultComponents.Form>;
  renderPage?: RenderFn<typeof defaultComponents.Page>;
  renderFieldset?: RenderFn<typeof defaultComponents.Fieldset>;
  renderColumn?: RenderFn<typeof defaultComponents.Column>;
  renderField?: RenderFn<typeof defaultComponents.Field>;
  renderFieldType?: RenderFn<typeof defaultComponents.FieldType>;
  renderValidationSummary?: RenderFn<
    typeof defaultComponents.ValidationSummary
  >;
  renderSubmitButton?: RenderFn<typeof defaultComponents.SubmitButton>;
  renderNextButton?: RenderFn<typeof defaultComponents.NextButton>;
  renderPreviousButton?: RenderFn<typeof defaultComponents.PreviousButton>;
}

function UmbracoForm(props: UmbracoFormProps) {
  const [, startValidationTransition] = useTransition();
  const {
    form,
    config: configOverride = {},
    renderForm: Form = defaultComponents.Form,
    renderPage: Page = defaultComponents.Page,
    renderFieldset: Fieldset = defaultComponents.Fieldset,
    renderColumn: Column = defaultComponents.Column,
    renderField: Field = defaultComponents.Field,
    renderFieldType: FieldType = defaultComponents.FieldType,
    renderSubmitButton: SubmitButton = defaultComponents.SubmitButton,
    renderNextButton: NextButton = defaultComponents.NextButton,
    renderPreviousButton: PreviousButton = defaultComponents.PreviousButton,
    renderValidationSummary:
      ValidationSummary = defaultComponents.ValidationSummary,
    children,
    onChange,
    onSubmit,
    onBlur,
    ...rest
  } = props;

  const config = {
    schema: configOverride?.schema ?? umbracoFormToZod(form),
    shouldValidate: false,
    shouldUseNativeValidation: false,
    validateMode: "onSubmit",
    reValidateMode: "onBlur",
    ...configOverride,
  } as UmbracoFormConfig;

  const [internalData, setInternalData] = useState<Record<string, unknown>>({});
  const deferredInternalData = useDeferredValue(internalData);

  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [formIssues, setFormIssues] = useState<ZodIssue[]>([]);
  const [summaryIssues, setSummaryIssues] = useState<ZodIssue[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const activePage = form?.pages?.[currentPageIndex];

  const checkCondition = (dto: DtoWithCondition) =>
    isVisibleBasedOnCondition(
      dto,
      form,
      deferredInternalData,
      config?.mapCustomFieldToZodType,
    );

  const totalPages = form?.pages?.filter(checkCondition).length ?? 1;

  const validateFormData = useCallback(
    (coercedData: Record<string, unknown>, fieldName?: string) => {
      const parsedForm = config?.schema?.safeParse(coercedData);
      if (parsedForm?.success) {
        setFormIssues([]);
      } else if (parsedForm?.error?.issues) {
        setFormIssues((prev) =>
          sortZodIssuesByFieldAlias(
            form,
            fieldName
              ? [
                  ...prev.filter((issue) => issue.path.join(".") !== fieldName),
                  ...parsedForm.error.issues.filter(
                    (issue) => issue.path.join(".") === fieldName,
                  ),
                ]
              : parsedForm.error.issues,
          ),
        );
      }
      return parsedForm;
    },
    [form, config.schema],
  );

  const isCurrentPageValid = useCallback(() => {
    // dont validate fields that are not visible to the user
    const fieldsWithConditionsMet = filterFieldsByConditions(
      form,
      deferredInternalData,
      config.mapCustomFieldToZodType,
    ).map((field) => field.alias);

    // get all fields with issues and filter out fields with conditions that are not met
    const allFieldIssues = validateFormData(
      deferredInternalData,
    ).error?.issues?.filter((issue) =>
      fieldsWithConditionsMet.includes(getFieldByZodIssue(form, issue)?.alias),
    );

    // get all aliases for fields with issues
    const fieldAliasesWithIssues = allFieldIssues?.map(
      (issue) => getFieldByZodIssue(form, issue)?.alias,
    );

    // get all fields on the current page and filter out fields with conditions that are not met
    // so that they wont block the user from going to the next page
    const fieldsOnPage = getAllFieldsOnPage(activePage)?.filter((field) =>
      fieldsWithConditionsMet.includes(field?.alias),
    );

    const aliasesOnPage = fieldsOnPage?.map((field) => field?.alias) ?? [];

    const pageIssues =
      allFieldIssues?.filter((issue) =>
        aliasesOnPage?.includes(getFieldByZodIssue(form, issue)?.alias),
      ) ?? [];

    if (
      fieldsOnPage?.some(
        (field) => field && fieldAliasesWithIssues?.includes(field.alias),
      )
    ) {
      // prevent user from going to next page if there are fields with issues on the current page

      setAttemptCount((prev) => prev + 1);
      if (form.showValidationSummary) {
        setSummaryIssues(pageIssues);
      }
      return false;
    }
    return true;
  }, [config, form, activePage, validateFormData, deferredInternalData]);

  const handleOnChange = useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      const field = e.target;
      const formData = new FormData(e.currentTarget);
      const fieldsOnPage = getAllFieldsOnPage(activePage);
      // omit fields that are not on the current page
      const coercedData = Object.fromEntries(
        Object.entries(coerceFormData(formData, config.schema)).filter(
          ([key]) => fieldsOnPage?.some((field) => field?.alias === key),
        ),
      );
      setInternalData((prev) => {
        // merge data with previous data (from prior pages)
        return !prev ? coercedData : { ...prev, ...coercedData };
      });

      if (config.shouldValidate) {
        const validateOnChange =
          config.validateMode === "onChange" ||
          config.validateMode === "all" ||
          (attemptCount > 0 && config.reValidateMode === "onChange");

        if (validateOnChange) {
          startValidationTransition(() => {
            if (validateFormData(coercedData, field.name).success === false) {
              return;
            }
            if (typeof onChange === "function") {
              onChange(e);
            }
          });
        }
      } else if (typeof onChange === "function") {
        onChange(e);
      }
    },
    [config, attemptCount, activePage, validateFormData, onChange],
  );

  const handleOnBlur = useCallback(
    (e: React.FocusEvent<HTMLFormElement, HTMLElement>) => {
      const field = e.target;
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const coercedData = coerceFormData(formData, config.schema);

      if (config.shouldValidate) {
        const validateOnBlur =
          config.validateMode === "onBlur" ||
          config.validateMode === "all" ||
          (attemptCount > 0 && config.reValidateMode === "onBlur");

        if (validateOnBlur) {
          startValidationTransition(() => {
            validateFormData(coercedData, field.name);
            if (form.pages && form.pages?.length > 1) {
              isCurrentPageValid();
            }
          });
        }
      }

      if (typeof onBlur === "function") {
        onBlur(e);
      }
    },
    [onBlur, validateFormData, form, isCurrentPageValid, attemptCount, config],
  );

  const scrollToTopOfForm = useCallback(() => {
    const formElement = document.querySelector(`[name="${form.id}"]`);
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [form]);

  const focusFirstInvalidField = useCallback(() => {
    const fieldWithIssues = formIssues?.find((issue) => issue.path.length > 0);
    if (fieldWithIssues) {
      const fieldId = fieldWithIssues.path.join(".");
      if (fieldId) {
        const fieldElement = document.querySelector(
          `[name="${fieldId}"]`,
        ) as HTMLInputElement;
        if (fieldElement) {
          fieldElement.focus();
        }
      }
    }
  }, [formIssues]);

  const handleNextPage = useCallback(() => {
    if (config.shouldValidate && config.shouldUseNativeValidation === false) {
      startValidationTransition(() => {
        if (isCurrentPageValid() === false) {
          scrollToTopOfForm();
          focusFirstInvalidField();
          setAttemptCount((prev) => prev + 1);
          return;
        }
        setCurrentPageIndex((prev) => prev + 1);
        setAttemptCount(0);
      });
    } else {
      setCurrentPageIndex((prev) => prev + 1);
    }
  }, [config, isCurrentPageValid, focusFirstInvalidField, scrollToTopOfForm]);

  const handlePreviousPage = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setCurrentPageIndex((prev) => (prev === 0 ? prev : prev - 1));
      scrollToTopOfForm();
    },
    [scrollToTopOfForm],
  );

  const handleOnSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (config.shouldValidate) {
        e.preventDefault();
        if (totalPages > 1 && currentPageIndex !== totalPages - 1) {
          return handleNextPage();
        }
        startValidationTransition(() => {
          setAttemptCount((prev) => prev + 1);
          const validationResult = validateFormData(internalData);

          if (validationResult.success === false) {
            focusFirstInvalidField();
            if (form.showValidationSummary) {
              setSummaryIssues(validationResult.error.issues);
            }
            return;
          }
          setSummaryIssues([]);
          if (typeof onSubmit === "function") {
            onSubmit(e, internalData);
          }
        });
      } else {
        if (typeof onSubmit === "function") {
          onSubmit(e, internalData);
        }
      }
    },
    [
      totalPages,
      currentPageIndex,
      focusFirstInvalidField,
      config,
      onSubmit,
      internalData,
      form.showValidationSummary,
      handleNextPage,
      validateFormData,
    ],
  );

  const context = {
    form,
    config,
  };

  return (
    <Fragment>
      {form.showValidationSummary && attemptCount > 0 ? (
        <ValidationSummary {...context} issues={summaryIssues} />
      ) : null}
      <Form
        {...rest}
        onChange={handleOnChange}
        onSubmit={handleOnSubmit}
        onBlur={handleOnBlur}
        {...context}
      >
        {form?.pages?.map((page, index) => (
          <Page
            key={`page.${index}`}
            page={page}
            pageIndex={index}
            condition={checkCondition(page)}
            currentPage={currentPageIndex}
            totalPages={totalPages}
            {...context}
          >
            {page?.fieldsets?.map((fieldset, index) => (
              <Fieldset
                key={`fieldset.${index}`}
                fieldset={fieldset}
                condition={checkCondition(fieldset)}
                {...context}
              >
                {fieldset?.columns?.map((column, index) => (
                  <Column key={`column.${index}`} column={column} {...context}>
                    {column?.fields?.map((field) => {
                      const issues = formIssues?.filter(
                        (issue) => issue.path.join(".") === field.alias,
                      );
                      const defaultValue = field?.alias
                        ? (deferredInternalData[field.alias] as string)
                        : undefined;
                      const fieldTypeProps = {
                        field,
                        issues,
                        defaultValue,
                        ...context,
                      };
                      return (
                        <Field
                          key={`field.${field?.id}`}
                          field={field}
                          condition={checkCondition(field)}
                          issues={issues}
                          {...context}
                        >
                          {
                            // fallback to default component if custom component returns undefined
                            FieldType(fieldTypeProps) ??
                              defaultComponents.FieldType(fieldTypeProps)
                          }
                        </Field>
                      );
                    })}
                  </Column>
                ))}
              </Fieldset>
            ))}
          </Page>
        ))}
        {children}
        {totalPages > 1 ? (
          <Fragment>
            <PreviousButton
              onClick={handlePreviousPage}
              currentPage={currentPageIndex}
              totalPages={totalPages}
              {...context}
            />
            <NextButton
              currentPage={currentPageIndex}
              totalPages={totalPages}
              {...context}
            />
          </Fragment>
        ) : null}
        <SubmitButton
          currentPage={currentPageIndex}
          totalPages={totalPages}
          {...context}
        />
      </Form>
    </Fragment>
  );
}

UmbracoForm.FieldType = defaultComponents.FieldType;
UmbracoForm.Page = defaultComponents.Page;
UmbracoForm.Fieldset = defaultComponents.Fieldset;
UmbracoForm.Column = defaultComponents.Column;
UmbracoForm.Field = defaultComponents.Field;
UmbracoForm.SubmitButton = defaultComponents.SubmitButton;
UmbracoForm.ValidationSummary = defaultComponents.ValidationSummary;

export {
  umbracoFormToZod,
  umbracoFormPagesToZodArray,
  coerceFormData,
  UmbracoForm,
};
export type * from "./types";
export default UmbracoForm;
