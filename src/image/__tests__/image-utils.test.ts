import { generateBlurDataUrl, generateUmbracoImageUrl } from "../image-utils";
import type { UmbracoImageType } from "../image-utils";

describe("generateImageUrl", () => {
  afterEach(() => {
    delete process.env.PUBLIC_UMBRACO_ENDPOINT;
  });

  it("returns the correct URL for a given image with no options", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "https://example.com/image.jpg",
    };
    const result = generateUmbracoImageUrl(image);
    expect(result.toString()).toBe("https://example.com/image.jpg?format=webp");
  });

  it("use the environment variable for the Umbraco Endpoint", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "/image.jpg",
    };
    process.env.PUBLIC_UMBRACO_ENDPOINT = "https://example.com";
    const result = generateUmbracoImageUrl(image);
    expect(result.toString()).toBe("https://example.com/image.jpg?format=webp");
  });

  it("use the baseUrl over environment variable for the Umbraco Endpoint", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "/image.jpg",
    };
    process.env.PUBLIC_UMBRACO_ENDPOINT = "https://example-env.com";
    const result = generateUmbracoImageUrl(image, {
      baseUrl: "https://example.com",
    });
    expect(result.toString()).toBe("https://example.com/image.jpg?format=webp");
  });

  it("returns the correct URL for an SVG image", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaVectorGraphics",
      url: "https://example.com/image.svg",
    };
    const result = generateUmbracoImageUrl(image);
    expect(result.toString()).toBe("https://example.com/image.svg");
  });

  it("adds crop coordinates to the URL if crop is specified", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "https://example.com/image.jpg",
      crops: [
        { alias: "thumbnail", coordinates: { x1: 0, y1: 0, x2: 100, y2: 100 } },
      ],
    };
    const result = generateUmbracoImageUrl(image, { crop: "thumbnail" });
    expect(result.searchParams.get("cc")).toBe("0,0,100,100");
  });

  it("calculates aspect ratio if provided", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "https://example.com/image.jpg",
      width: 1024,
      height: 1024,
    };
    const result = generateUmbracoImageUrl(image, { aspectRatio: "4:3" });
    expect(result.searchParams.get("width")).toBe("1024");
    expect(result.searchParams.get("height")).toBe("768");
  });

  it("returns the correct URL with focal point", () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "https://example.com/image.jpg",
      focalPoint: { left: 0.5, top: 0.5 },
    };
    const result = generateUmbracoImageUrl(image);
    expect(result.searchParams.get("rxy")).toBe("0.5,0.5");
  });
});

describe("generateBlurDataUrl", () => {
  it("returns undefined for SVG images", async () => {
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaVectorGraphics",
      url: "https://example.com/image.svg",
    };
    const result = await generateBlurDataUrl(image);
    expect(result).toBeUndefined();
  });

  it("returns a blurred data URL for a valid image", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      // Return a fake image buffer
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("test")),
    });
    const image: UmbracoImageType = {
      mediaType: "umbracoMediaJpeg",
      url: "https://example.com/image.jpg",
    };
    const result = await generateBlurDataUrl(image);
    expect(result).toContain("data:image/svg+xml;base64,");
  });

  it("returns undefined if image URL is missing", async () => {
    const result = await generateBlurDataUrl(undefined);
    expect(result).toBeUndefined();
  });
});
