import type { Overwrite } from "../utils/helper-types";

export function isRootElement(data: RichTextElementModel | undefined): data is {
  tag: "#root";
  attributes?: Record<string, unknown>;
  elements: RichTextElementModel[];
  blocks?: Array<UmbracoBlockContext>;
} {
  return !!data && data.tag === "#root";
}

export function isTextElement(
  data: RichTextElementModel,
): data is { tag: "#text"; text: string } {
  return data.tag === "#text";
}

export function isCommentElement(
  data: RichTextElementModel,
): data is { tag: "#comment"; text: string } {
  return data.tag === "#comment";
}

export function isUmbracoBlock(data: RichTextElementModel): data is {
  tag: string;
  attributes: {
    "content-id": string;
  };
  elements: RichTextElementModel[];
} {
  return data.tag === "umb-rte-block" || data.tag === "umb-rte-block-inline";
}

export function isHtmlElement(data: RichTextElementModel): data is {
  tag: keyof HTMLElementTagNameMap;
  attributes: Record<string, unknown> & { route?: RouteAttributes };
  elements: RichTextElementModel[];
} {
  return "elements" in data;
}

interface BaseBlockItemModel {
  content?: {
    id: string;
    properties: {
      [key: string]: unknown;
    };
  };
  settings?: {
    id: string;
    properties: {
      [key: string]: unknown;
    };
  };
}

/**
 * Override the block item model with Umbraco specific properties.
 * This way you can get the full type safety of the Umbraco API you are using.
 *
 * **react-umbraco.d.ts**
 * ```ts
 * import { components } from '@/openapi/umbraco';
 *
 * // Define the intermediate interface
 * type ApiBlockItemModel = components['schemas']['ApiBlockItemModel'];
 *
 * declare module '@charlietango/react-umbraco' {
 *   interface UmbracoBlockItemModel extends ApiBlockItemModel {}
 * }
 * ```
 */
export interface UmbracoBlockItemModel {
  _overrideImplementation?: never;
}

export type UmbracoBlockContext = Overwrite<
  BaseBlockItemModel,
  Omit<UmbracoBlockItemModel, "_overrideImplementation">
>;

export interface RouteAttributes {
  path: string;
  startItem: {
    id: string;
    path: string;
  };
}

/**
 * The possible values for the rich text node from Umbraco.
 */
export type RichTextElementModel =
  | {
      tag: "#root";
      attributes?: Record<string, unknown>;
      elements?: RichTextElementModel[];
      blocks?: Array<UmbracoBlockContext>;
    }
  | {
      tag: "#text";
      text: string;
    }
  | {
      tag: "#comment";
      text: string;
    }
  | {
      tag: "umb-rte-block" | "umb-rte-block-inline";
      attributes: {
        "content-id": string;
      };
      elements: RichTextElementModel[];
    }
  | {
      tag: keyof HTMLElementTagNameMap;
      attributes: Record<string, unknown> & { route?: RouteAttributes };
      elements?: RichTextElementModel[];
    }
  | {
      tag: string;
      attributes?: Record<string, unknown> & { route?: RouteAttributes };
      elements?: RichTextElementModel[];
      blocks?: Array<UmbracoBlockContext>;
    };
