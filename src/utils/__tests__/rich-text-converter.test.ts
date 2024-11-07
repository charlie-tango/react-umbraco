import fixture from "../../__tests__/__fixtures__/UmbracoRichText.fixture.json";
import type { RichTextElementModel } from "../../types/RichTextTypes";
import { richTextToPlainText } from "../rich-text-converter";

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