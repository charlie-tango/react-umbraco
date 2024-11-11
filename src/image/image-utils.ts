/**
 * Umbraco image type, with the attributes we need for rendering images.
 * This is based on the Umbraco Content Delivery API, and should be used to define the shape of the image object.
 */
export interface UmbracoImageType {
  mediaType: string;
  url: string;
  extension?: string;
  width?: number;
  height?: number;
  bytes?: number;
  focalPoint?: {
    left?: number;
    top?: number;
  };
  crops?: Array<{
    alias?: string;
    width?: number;
    height?: number;
    coordinates?: {
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    };
  }>;
}

interface ImageUrlOptions {
  /** Name of the predefined crop to use */
  crop?: string;
  /** Aspect ratio of the image. Should be `width:height` */
  aspectRatio?: `${number}:${number}`;
  /** Quality of the image - 0 to 100 */
  quality?: number;
  /** Image format to use - The ones supported by Umbraco */
  format?: "jpeg" | "png" | "webp";
  /** The base URL for the image - e.g. the Umbraco endpoint */
  baseUrl?: string;
}

const isSvg = (image: UmbracoImageType) => {
  return (
    image &&
    (image.extension === "svg" ||
      image.mediaType === "umbracoMediaVectorGraphics")
  );
};

/**
 * Determine the base URL for the image.
 * @param options
 */
function getBaseUrl(options: ImageUrlOptions): string {
  if (options.baseUrl) return options.baseUrl;
  // @ts-ignore
  const env = typeof process === "undefined" ? import.meta.env : process.env;
  return (
    env.NEXT_PUBLIC_UMBRACO_ENDPOINT ||
    env.VITE_UMBRACO_ENDPOINT ||
    env.PUBLIC_UMBRACO_ENDPOINT
  );
}

/**
 * Get the width, height, and aspect ratio of an image URL.
 * Use this after generating the image URL, to get the actual size of the image, after crops and aspect ratio have been applied.
 */
export const getImageUrlSize = (url: URL) => {
  const urlWidth = url.searchParams.get("width");
  const urlHeight = url.searchParams.get("height");
  const width = urlWidth ? Number.parseInt(urlWidth) : undefined;
  const height = urlHeight ? Number.parseInt(urlHeight) : undefined;

  return {
    width,
    height,
    aspectRatio: height && width ? height / width : undefined,
  };
};

/**
 * Generate an image URL for an Umbraco image.
 * This function will add the necessary query parameters to the image URL, so it can be loaded with the correct size and format.
 */
export const generateUmbracoImageUrl = (
  image: UmbracoImageType,
  options: ImageUrlOptions = {},
): URL => {
  const url = new URL(image.url, getBaseUrl(options));

  if (isSvg(image)) {
    // Don't process SVGs
    return url;
  }

  // If rendering a specific crop, we need to calculate the aspect ratio, and add the crop coordinates to the URL
  if (image.crops?.length && options.crop) {
    const crop = image.crops.find((c) => c.alias === options.crop);
    // Add crop coordinates to the URL, so we can showcase a specific crop
    if (crop?.coordinates) {
      url.searchParams.set(
        "cc",
        `${crop.coordinates.x1},${crop.coordinates.y1},${crop.coordinates.x2},${crop.coordinates.y2}`,
      );
    }
    if (crop?.width && crop.height) {
      // Set the width and height of the crop. This can be overriden be the image loader
      url.searchParams.set("width", crop.width.toString());
      url.searchParams.set("height", crop.height.toString());
    }
  } else if (options.aspectRatio && image.width && image.height) {
    // If an aspect ratio is provided, we can use that to calculate the height of the image
    const [width, height] = options.aspectRatio.split(":").map(Number);
    const aspectRatio = height / width;

    url.searchParams.set("width", image.width.toString());
    url.searchParams.set("height", (image.width * aspectRatio).toString());
  }

  if (image.focalPoint) {
    url.searchParams.set(
      "rxy",
      `${image.focalPoint.left},${image.focalPoint.top}`,
    );
  }
  if (options.quality) {
    url.searchParams.set("quality", options.quality.toString());
  }
  url.searchParams.set("format", options.format || "webp");

  return url;
};

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

/**
 * Generate a data URL for a blurred version of the image.
 * This is an `async` action the fetches a small 16px wide version of the image.
 * The image is then put inside an SVG element with a blur filter, and converted to a base64 data URL.
 * The resulting URL can be used as a placeholder for the image, while the full image is loading.
 *
 * Because this is an async function, you should only use this in a React Server component, so you can generate the blurred image for the client.
 * Make sure to cache the result, so you don't generate the blurred image multiple times.
 *  - https://react.dev/reference/react/cache
 *  - https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 *  - https://nextjs.org/docs/canary/app/api-reference/directives/use-cache
 *
 * Running this on the client would defeat the purpose of the blurred image, as it would be faster to just load the image.
 */
export const generateBlurDataUrl = async (
  image: UmbracoImageType | undefined,
  options: ImageUrlOptions = {},
): Promise<string | undefined> => {
  "use cache"; // Prepare the function for the Next.js `use cache` directive.
  if (!image?.url || isSvg(image)) return undefined;

  const url = generateUmbracoImageUrl(image, options);

  if (url.searchParams.has("height")) {
    // If the image has a height, we need to calculate the aspect ratio
    const height = Number.parseInt(url.searchParams.get("height") || "0");
    const width = Number.parseInt(url.searchParams.get("width") || "0");
    const aspectRatio = height / width;

    // Scale the height of the image, so it maintains the aspect ratio
    url.searchParams.set("height", Math.floor(16 * aspectRatio).toString());
  }

  // The blurred image should be 16px wide
  url.searchParams.set("width", "16");

  const base64str = await fetch(url).then(async (res) =>
    Buffer.from(await res.arrayBuffer()).toString("base64"),
  );

  const blurSvg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'>
      <filter id='b' color-interpolation-filters='sRGB'>
        <feGaussianBlur stdDeviation='1'  />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="1 1"/>
         </feComponentTransfer>
      </filter>

      <image preserveAspectRatio='none' filter='url(#b)' x='0' y='0' height='100%' width='100%' 
      href='data:image/webp;base64,${base64str}' />
    </svg>
  `;

  return `data:image/svg+xml;base64,${toBase64(blurSvg.trim())}`;
};
