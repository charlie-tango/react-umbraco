import type { RichTextElementModel } from "../RichTextTypes";
import { richTextToPlainText } from "../rich-text-converter";
import fixture from "./__fixtures__/UmbracoRichText.fixture.json";

test("should convert rich text to plain text", () => {
  expect(
    richTextToPlainText(fixture as RichTextElementModel),
  ).toMatchSnapshot();
});

test("should get the first paragraph", () => {
  expect(
    richTextToPlainText(fixture as RichTextElementModel, {
      firstParagraph: true,
    }),
  ).toMatchInlineSnapshot(
    `"What follows from here is just a bunch of absolute nonsense I've written to dogfood the plugin itself. It includes every sensible typographic element I could think of, like bold text, unordered lists, ordered lists, code blocks, block quotes, and even italics."`,
  );
});

test("should truncate text", () => {
  expect(
    richTextToPlainText(fixture as RichTextElementModel, {
      maxLength: 60,
    }),
  ).toMatchInlineSnapshot(
    `"What to expect from here on out What follows from here is..."`,
  );
  expect(
    richTextToPlainText(fixture as RichTextElementModel, {
      maxLength: 290,
    }),
  ).toMatchInlineSnapshot(
    `"What to expect from here on out What follows from here is just a bunch of absolute nonsense I've written to dogfood the plugin itself. It includes every sensible typographic element I could think of, like bold text, unordered lists, ordered lists, code blocks, block quotes, and even..."`,
  );

  // Avoid extra punctuation at the end of the string
  expect(
    richTextToPlainText(fixture as RichTextElementModel, {
      maxLength: 135,
    }),
  ).toMatchInlineSnapshot(
    `"What to expect from here on out What follows from here is just a bunch of absolute nonsense I've written to dogfood the plugin itself..."`,
  );
});

test("should ignore tags", () => {
  expect(
    richTextToPlainText(fixture as RichTextElementModel, {
      maxLength: 290,
      ignoreTags: ["h2", "strong", "em", "ol", "ul", "code", "blockquote"],
    }),
  ).toMatchInlineSnapshot(
    `"What follows from here is just a bunch of absolute nonsense I've written to dogfood the plugin itself. It includes every sensible typographic element I could think of, like, unordered lists, ordered lists, code blocks, block quotes,. It's important to cover all of these use cases for a..."`,
  );
});
