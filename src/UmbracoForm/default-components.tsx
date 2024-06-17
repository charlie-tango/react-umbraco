import { Fragment } from "react";
import { match } from "ts-pattern";
import type { ZodIssue } from "zod";
import { getAttributesForFieldType, getFieldByZodIssue } from "./field-utils";
import type {
  FieldSettings,
  FormDto,
  FormFieldDto,
  FormFieldsetColumnDto,
  FormFieldsetDto,
  FormPageDto,
  UmbracoFormConfig,
} from "./types";
import { DefaultFieldType } from "./types";
import { getIssueId } from "./umbraco-form-to-zod";

export type ContextProps = {
  form: FormDto;
  config: UmbracoFormConfig;
};

export type NavigationProps = {
  currentPage: number;
  totalPages: number;
};

type RenderProps = React.HTMLAttributes<HTMLElement> &
  ContextProps &
  (
    | { page: FormPageDto; condition: boolean }
    | { fieldset: FormFieldsetDto; condition: boolean }
    | { column: FormFieldsetColumnDto }
    | { field: FormFieldDto; condition: boolean }
  );

type FormProps = ContextProps & React.FormHTMLAttributes<HTMLFormElement>;

export function Form({ form, ...rest }: FormProps) {
  return (
    <form
      method="post"
      action={`/umbraco/forms/api/v1/entries/${form.id}`}
      target="_blank"
      {...rest}
      id={`form:${form.id}`}
      name={form.id}
    />
  );
}

type PageProps = React.HTMLAttributes<HTMLElement> &
  RenderProps &
  NavigationProps & {
    page: FormPageDto;
    pageIndex: number;
    condition: boolean;
  };

export function Page({
  page,
  pageIndex,
  children,
  condition,
  currentPage,
  totalPages,
  ...rest
}: PageProps) {
  if (!condition) return null;
  if (currentPage !== pageIndex) return null;

  return (
    <section {...rest}>
      {page.caption ? (
        <header>
          <h2>{page.caption}</h2>
        </header>
      ) : null}
      {children}
    </section>
  );
}

export type FieldsetProps = RenderProps & {
  fieldset: FormFieldsetDto;
  condition: boolean;
};

export function Fieldset({ fieldset, children, condition }: FieldsetProps) {
  if (!condition) return null;
  return (
    <Fragment>
      {fieldset.caption ? <h3>{fieldset.caption}</h3> : null}
      {children}
    </Fragment>
  );
}

export type ColumnProps = RenderProps & {
  column: FormFieldsetColumnDto;
};

export function Column({ column, children }: ColumnProps) {
  return (
    <Fragment>
      {column.caption ? <h4>{column.caption}</h4> : null}
      {children}
    </Fragment>
  );
}

export type FieldProps = RenderProps & {
  field: FormFieldDto;
  condition: boolean;
  issues?: ZodIssue[];
};

/**
 * Determines whether an indicator should be shown for a form field.
 *
 * @param {FormFieldDto} field - The form field to check.
 * @param {FormDto} form - The form to which the field belongs.
 * @returns {boolean} - True if an indicator should be shown, false otherwise.
 */
export function shouldShowIndicator(
  field: FormFieldDto,
  form: FormDto,
): boolean {
  if (form.fieldIndicationType === "NoIndicator") {
    return false;
  }
  if (form.fieldIndicationType === "MarkMandatoryFields") {
    return !!field.required;
  }
  if (form.fieldIndicationType === "MarkOptionalFields") {
    return !field.required;
  }
  return false;
}

export function Field({
  field,
  children,
  form,
  condition,
  issues,
}: FieldProps) {
  if (!condition) return null;
  const hasIssues = issues && issues.length > 0;
  const showValidationErrors = hasIssues && form.hideFieldValidation !== true;
  const indicator = shouldShowIndicator(field, form) ? form.indicator : null;
  const helpTextId = field.helpText ? `helpText:${field.id}` : undefined;
  const helpText = field.helpText ? (
    <span id={helpTextId}>{field.helpText}</span>
  ) : null;
  const validationErrors = showValidationErrors ? (
    <span id={getIssueId(field, issues[0])}>{issues?.[0]?.message}</span>
  ) : null;

  if (field.type?.id === DefaultFieldType.SingleChoice) {
    const radioGroupId = `radiogroup:${field.id}`;
    return (
      <fieldset role="radiogroup" aria-labelledby={radioGroupId}>
        <legend id={radioGroupId}>
          {field.caption} {indicator}
        </legend>
        {helpText}
        {children}
        {validationErrors}
      </fieldset>
    );
  }

  if (field.type?.id === DefaultFieldType.MultipleChoice) {
    const checkboxGroupId = `checkboxgroup:${field.id}`;
    return (
      <fieldset aria-labelledby={checkboxGroupId}>
        <legend id={checkboxGroupId}>
          {field.caption} {indicator}
        </legend>
        {helpText}
        {children}
        {validationErrors}
      </fieldset>
    );
  }

  return (
    <Fragment>
      <label htmlFor={field.id} aria-describedby={helpTextId}>
        {field.caption} {indicator}
      </label>
      {helpText}
      {children}
      {validationErrors}
    </Fragment>
  );
}

export type FieldTypeProps = Omit<FieldProps, "children" | "condition">;

export function FieldType({
  field,
  issues,
  form,
  config,
  ...rest
}: FieldTypeProps): React.ReactNode | undefined {
  const fieldTypeAttributes = getAttributesForFieldType(
    field,
    issues,
    form,
    config,
  );

  const attributes = {
    ...fieldTypeAttributes,
    ...rest,
  };

  return match(field?.type?.id as DefaultFieldType)
    .with(
      DefaultFieldType.ShortAnswer,
      DefaultFieldType.FileUpload,
      DefaultFieldType.SingleChoice,
      DefaultFieldType.HiddenField,
      DefaultFieldType.Date,
      DefaultFieldType.Password,
      () => <input {...attributes} />,
    )
    .with(DefaultFieldType.LongAnswer, DefaultFieldType.RichText, () => (
      <textarea {...attributes} />
    ))
    .with(
      DefaultFieldType.Checkbox,
      DefaultFieldType.DataConsent,
      DefaultFieldType.Recaptcha2,
      DefaultFieldType.RecaptchaV3WithScore,
      () => (
        <input
          {...attributes}
          defaultValue={undefined}
          defaultChecked={!!attributes.defaultValue}
        />
      ),
    )
    .with(DefaultFieldType.MultipleChoice, (uuid) => (
      <Fragment>
        {field?.preValues?.map((preValue) => {
          const settings = field?.settings as FieldSettings[typeof uuid];
          const id = `${preValue.value}:${field.id}`;
          const defaultChecked = Array.isArray(attributes.defaultValue)
            ? attributes.defaultValue.includes(preValue.value)
            : attributes.defaultValue === preValue.value ||
              settings.defaultValue === preValue.value;
          return (
            <Fragment key={id}>
              <label htmlFor={id}>{preValue.caption}</label>
              <input
                defaultChecked={defaultChecked}
                {...attributes}
                defaultValue={preValue.value}
                id={id}
                type={
                  field.type?.id === DefaultFieldType.MultipleChoice
                    ? "checkbox"
                    : "radio"
                }
              />
            </Fragment>
          );
        })}
      </Fragment>
    ))
    .with(DefaultFieldType.DropdownList, () => (
      <select {...attributes}>
        {field?.preValues?.map((preValue) => (
          <option key={`${field.id}.${preValue.value}`} value={preValue.value}>
            {preValue.caption}
          </option>
        ))}
      </select>
    ))
    .with(DefaultFieldType.TitleAndDescription, (uuid) => {
      const settings = field?.settings as FieldSettings[typeof uuid];
      return (
        <div>
          <h2>{settings.caption}</h2>
          <p>{settings.bodyText}</p>
        </div>
      );
    })
    .exhaustive();
}

export function SubmitButton(
  props: React.HTMLAttributes<HTMLButtonElement> &
    ContextProps &
    NavigationProps,
) {
  const { form, totalPages, currentPage, ...rest } = props;
  if (totalPages > 1 && currentPage !== totalPages - 1) return null;
  return (
    <button type="submit" {...rest}>
      {form.submitLabel}
    </button>
  );
}

export function NextButton(
  props: React.HTMLAttributes<HTMLButtonElement> & {
    form: FormDto;
    currentPage: number;
    totalPages: number;
  },
) {
  const { form, currentPage, totalPages, ...rest } = props;
  if (currentPage === totalPages - 1) return null;
  return (
    <button type="submit" {...rest}>
      {form.nextLabel}
    </button>
  );
}

export function PreviousButton(
  props: React.HTMLAttributes<HTMLButtonElement> &
    ContextProps &
    NavigationProps,
) {
  const { form, currentPage, totalPages, ...rest } = props;
  if (currentPage === 0) return null;
  return (
    <button type="button" {...rest}>
      {form.previousLabel}
    </button>
  );
}

export type ValidationSummaryProps = React.HTMLAttributes<HTMLElement> &
  ContextProps & {
    issues: ZodIssue[] | undefined;
  };

export function ValidationSummary(props: ValidationSummaryProps) {
  const { form, issues } = props;
  const hasIssues = issues && issues.length > 0;
  if (!hasIssues) return null;
  return (
    <section role="alert">
      <ol>
        {issues?.map((issue) => {
          const field = getFieldByZodIssue(form, issue);
          const id = getIssueId(field, issue);
          return (
            <li key={id} id={id}>
              {issue.message}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
