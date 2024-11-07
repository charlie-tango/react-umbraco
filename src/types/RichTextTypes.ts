import type { Overwrite } from "../utils/helper-types";

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
      tag: "umb-rte-block";
      attributes: {
        "content-id": string;
      };
      elements: RichTextElementModel[];
    }
  | {
      tag: "umb-rte-block-inline";
      attributes: {
        "content-id": string;
      };
      elements: RichTextElementModel[];
    }
  | {
      tag: keyof HTMLElementTagNameMap;
      attributes: Record<string, unknown> & { route?: RouteAttributes };
      elements?: RichTextElementModel[];
    };
