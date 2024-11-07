# react-umbraco

[![npm version][npm-version-src]][npm-version-href]
[![License][license-src]][license-href]

A collection of React components for working with the Umbraco
[Content Delivery API](https://docs.umbraco.com/umbraco-cms/reference/content-delivery-api).

## Install

Install the `@charlietango/react-umbraco` package with your package manager of
choice.

```sh
npm install @charlietango/react-umbraco
```

### `<UmbracoRichText>`

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz_small.svg)](https://stackblitz.com/github/charlie-tango/react-umbraco/tree/main?file=examples/UmbracoRichText/src/RichText.tsx)

Takes the rich text property from the Umbraco Content Delivery API and renders
it with React.

### Props

- `element`: The rich text property from the Umbraco Content Delivery API.
- `renderBlock`: Render a specific block type.
- `renderNode`: Overwrite the default rendering of a node. Return `undefined` to
  render the default node. Return `null` to skip rendering the node.
- `htmlAttributes`: Default attributes to set on the defined HTML elements.
  These will be used, unless the element already has the attribute set. The only
  exception is the `className` attribute, which will be merged with the default
  value.

When passing the `renderBlock` and `renderNode` props, consider making them
static functions (move them outside the consuming component) to avoid
unnecessary re-renders.

```tsx
import {
  UmbracoRichText,
  RenderBlockContext,
  RenderNodeContext,
} from "@charlietango/react-umbraco";
import Image from "next/image";
import Link from "next/link";

function renderNode({ tag, children, attributes }: RenderNodeContext) {
  switch (tag) {
    case "a":
      return <Link {...attributes}>{children}</Link>;
    case "p":
      return (
        <p className="text-lg" {...attributes}>
          {children}
        </p>
      );
    default:
      // Return `undefined` to render the default HTML node
      return undefined;
  }
}

function renderBlock({ content }: RenderBlockContext) {
  switch (content?.contentType) {
    // Switch over your Umbraco document types that can be rendered in the Rich Text blocks
    case "imageBlock":
      return <Image {...content.properties} />;
    default:
      return null;
  }
}

function RichText({ data }) {
  return (
    <UmbracoRichText
      element={data.richText}
      renderNode={renderNode}
      renderBlock={renderBlock}
      htmlAttributes={{ p: "mb-4" }}
    />
  );
}
```

#### Blocks

You can augment the `renderBlock` method with the generated OpenAPI types from
Umbraco Content Delivery API. That way you can correctly filter the blocks you
are rendering, based on the `contentType`, and get the associated `properties`.
Create `types/react-umbraco.d.ts`, and augment the `UmbracoBlockItemModel`
interface with your applications definition for `ApiBlockItemModel`.

To generate the types, you'll want to use the
[Delivery Api Extensions](https://marketplace.umbraco.com/package/umbraco.community.deliveryapiextensions)
package, alongside a tool to generate the types from the OpenAPI schema, like
[openapi-typescript](https://openapi-ts.pages.dev/).

**types/react-umbraco.d.ts**

```ts
import { components } from "@/openapi/umbraco";

// Define the intermediate interface
type ApiBlockItemModel = components["schemas"]["ApiBlockItemModel"];

declare module "@charlietango/react-umbraco" {
  interface UmbracoBlockItemModel extends ApiBlockItemModel {}
}
```

### `richTextToPlainText`

A useful method to convert the rich text property to plain text. This can be
used to generate meta descriptions or other text-based properties.

```ts
import { richTextToPlainText } from "@charlietango/react-umbraco";

const plainText = richTextToPlainText(richTextData);

// Just the first paragraph
const firstParagraph = richTextToPlainText(richTextData, {
  firstParagraph: true,
});

// Just the first 100 characters, truncated at the nearest word with an ellipsis
const first100Characters = richTextToPlainText(richTextData, {
  maxLength: 100,
});
```

<!-- Badges -->

[npm-version-src]:
  https://img.shields.io/npm/v/@charlietango/react-umbraco?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@charlietango/react-umbraco
[license-src]:
  https://img.shields.io/github/license/charlie-tango/react-umbraco.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/charlie-tango/react-umbraco/blob/main/LICENSE
