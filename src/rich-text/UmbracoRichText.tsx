import { decode } from "html-entities";
import React from "react";
import {
  type RenderBlockContext,
  type RichTextElementModel,
  type RouteAttributes,
  isHtmlElement,
  isRootElement,
  isTextElement,
  isUmbracoBlock,
} from "./RichTextTypes";
import { parseStyle } from "./parse-style";

interface NodeMeta {
  /** The tag of the parent element */
  ancestor?: string;
  /** The tag of the previous sibling element */
  previous?: string;
  /** The tag of the next sibling element */
  next?: string;
}

/**
 * Props for rendering a single node in the rich text.
 * A node is any HTML element that is part of the rich text.
 */
export type RenderNodeContext = {
  children?: React.ReactNode;
  meta: NodeMeta;
} & (
  | {
      [Tag in keyof React.JSX.IntrinsicElements]: {
        tag: Tag;
        attributes: React.JSX.IntrinsicElements[Tag];
      };
    }[keyof Omit<React.JSX.IntrinsicElements, "a">]
  | {
      tag: "a";
      attributes: React.JSX.IntrinsicElements["a"];
      /** The route attributes for internal Umbraco links */
      route?: RouteAttributes;
    }
);

interface RichTextProps {
  data: RichTextElementModel | undefined;
  renderBlock?: (block: RenderBlockContext) => React.ReactNode;
  /**
   * Render an HTML node with custom logic.
   * @param node
   * @returns A React node, `null` to render nothing, or `undefined` to fallback to the default element
   */
  renderNode?: (node: RenderNodeContext) => React.ReactNode | undefined;
  /** Default attributes for HTML elements, used to add default classes to all `<p>` tags.
   * If the html element contains its own attributes, then they will override the default.
   *
   * ```tsx
   * <RichText
   *    htmlAttributes={{
   *      p: { className: 'text-base' },
   *      h1: { className: 'text-2xl' },
   *    }}
   *  />
   *  */
  htmlAttributes?: Partial<{
    [Tag in keyof React.JSX.IntrinsicElements]: React.JSX.IntrinsicElements[Tag];
  }>;
}

/**
 * Render the individual elements of the rich text
 */
function RichTextElement({
  element,
  blocks,
  renderBlock,
  renderNode,
  htmlAttributes = {},
  meta,
}: {
  element: RichTextElementModel;
  blocks: Array<RenderBlockContext> | undefined;
  meta:
    | {
        ancestor?: string;
        next?: string;
        previous?: string;
      }
    | undefined;
} & Pick<RichTextProps, "renderBlock" | "renderNode" | "htmlAttributes">) {
  if (!element || element.tag === "#comment" || element.tag === "#root")
    return null;

  if (isTextElement(element)) {
    // Decode HTML entities in text nodes
    return decode(element.text);
  }

  // If the tag is a block, skip the normal rendering and render the block
  if (isUmbracoBlock(element)) {
    const block = blocks?.find(
      (block) => block.content?.id === element.attributes?.["content-id"],
    );
    if (renderBlock && block) {
      return renderBlock(block);
    }
    if (typeof renderBlock !== "function") {
      throw new Error(
        "No renderBlock function provided for rich text block. Unable to render block.",
      );
    }

    return null;
  }
  let children: Array<React.ReactNode> | undefined = undefined;
  if (isHtmlElement(element)) {
    children = element.elements?.map((node, index) => (
      <RichTextElement
        key={index}
        element={node}
        blocks={blocks}
        renderBlock={renderBlock}
        renderNode={renderNode}
        meta={{
          ancestor: element.tag,
          previous: element.elements?.[index - 1]?.tag,
          next: element.elements?.[index + 1]?.tag,
        }}
      />
    ));
    if (children?.length === 0) {
      children = undefined;
    }

    const {
      route,
      style,
      class: className,
      ...attributes
    } = element.attributes;
    const defaultAttributes = htmlAttributes[element.tag];
    if (element.tag === "a" && route?.path) {
      attributes.href = route?.path;
    }

    if (className) {
      if (defaultAttributes?.className) {
        // Merge the default class with the class attribute
        attributes.className = `${defaultAttributes.className} ${className}`;
      } else {
        attributes.className = className;
      }
    }

    if (typeof style === "string") {
      attributes.style = parseStyle(style);
    }

    if (renderNode) {
      const output = renderNode({
        // biome-ignore lint/suspicious/noExplicitAny: Avoid complicated TypeScript logic by using any. The type will be corrected in the implementation.
        tag: element.tag as any,
        attributes: {
          ...defaultAttributes,
          ...attributes,
        } as Record<string, unknown>,
        children,
        route,
        meta: meta || {},
      });

      if (output !== undefined) {
        // If we got a valid output from the renderElement function, we return it
        // `null` we will render nothing, but `undefined` fallback to the default element
        return output;
      }
    }

    return React.createElement(
      element.tag,
      htmlAttributes[element.tag]
        ? { ...defaultAttributes, ...attributes }
        : attributes,
      children,
    );
  }
  return undefined;
}

/**
 * Component for rendering a rich text component
 */
export function UmbracoRichText(props: RichTextProps) {
  const rootElement = props.data;
  if (isRootElement(rootElement)) {
    return (
      <>
        {rootElement.elements?.map((element, index) => (
          <RichTextElement
            key={index}
            element={element}
            blocks={rootElement.blocks}
            renderBlock={props.renderBlock}
            renderNode={props.renderNode}
            htmlAttributes={props.htmlAttributes}
            meta={undefined}
          />
        ))}
      </>
    );
  }

  // If the element is not a root element, we return null
  return null;
}
