# react-umbraco

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

A collection of React components for working with the
Umbraco [Content Delivery API](https://docs.umbraco.com/umbraco-cms/reference/content-delivery-api).

### `<UmbracoRichText>`

Takes the rich text property from the Umbraco Content Delivery API and renders it with React.

### Props

- `element`: The rich text property from the Umbraco Content Delivery API.
- `renderBlock`: Render a specific block type.
- `renderNode`: Overwrite the default rendering of a node. Return `undefined` to render the default node. Return `null` to skip rendering the node.

```tsx
import { UmbracoRichText } from "@charlietango/react-umbraco";
import Image from 'next/image'
import Link from 'next/link'

const MyComponent = ({ data }) => {
    return (
        <UmbracoRichText
            element={data.richText}
            renderNode={({ tag, children, attributes }) => {
                switch (tag) {
                    case "a":
                        return <Link {...attributes}>{children}</Link>;
                    default:
                        return undefined;
                }
            }}
            renderBlock={({ content }) => {
                switch (content?.contentType) {
                    case "imageBlock":
                        return <Image {...content.properties} />;
                    default:
                        return null;
                }
            }}
        />
    );
};
```

#### Blocks

You can augment the `renderBlock` method with the generated OpenAPI types for the Umbraco Content Delivery API.
That way you can correctly filter the blocks you are rendering, based on the `contentType`, and get the
associated `properties`.
Create `types/react-umbraco.d.ts`, and augment the `UmbracoBlockItemModel` interface with your applications definition
for `ApiBlockItemModel`.

**types/react-umbraco.d.ts**

```ts
import {components} from '@/openapi/umbraco';

// Define the intermediate interface
type ApiBlockItemModel = components['schemas']['ApiBlockItemModel'];

declare module '@charlietango/react-umbraco' {
    interface UmbracoBlockItemModel extends ApiBlockItemModel {
    }
}
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/react-umbraco?style=flat&colorA=080f12&colorB=1fa669

[npm-version-href]: https://npmjs.com/package/react-umbraco

[npm-downloads-src]: https://img.shields.io/npm/dm/react-umbraco?style=flat&colorA=080f12&colorB=1fa669

[npm-downloads-href]: https://npmjs.com/package/react-umbraco

[bundle-src]: https://img.shields.io/bundlephobia/minzip/react-umbraco?style=flat&colorA=080f12&colorB=1fa669&label=minzip

[bundle-href]: https://bundlephobia.com/result?p=react-umbraco

[license-src]: https://img.shields.io/github/license/charlietango/react-umbraco.svg?style=flat&colorA=080f12&colorB=1fa669

[license-href]: https://github.com/charlietango/react-umbraco/blob/main/LICENSE
