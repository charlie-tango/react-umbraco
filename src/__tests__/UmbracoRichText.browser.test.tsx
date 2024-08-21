import { render, screen } from "@testing-library/react";
import { type RichTextElementModel, UmbracoRichText } from "../UmbracoRichText";
import fixture from "./__fixtures__/UmbracoRichText.fixture.json";

/**
 * Creates nested RichTextElementModel objects with the given tags.
 * @param {...string} tags - The tags to create nested elements with.
 * @returns {RichTextElementModel[]} - The nested RichTextElementModel object.
 */
function nestedElements(...tags: string[]): RichTextElementModel[] {
  return [
    tags.reduceRight<RichTextElementModel>(
      (acc, tag) => {
        return {
          tag,
          attributes: {},
          elements: [acc],
        } as RichTextElementModel;
      },
      { tag: "#text", attributes: {}, text: "text" } as RichTextElementModel,
    ),
  ];
}

it("should not render without #root tag in the root element ", () => {
  const { container } = render(<UmbracoRichText data={{ tag: "div" }} />);
  expect(container.innerHTML).toEqual("");
});

it("should not render if the root element is empty", () => {
  const { container } = render(<UmbracoRichText data={{ tag: "#root" }} />);
  expect(container.innerHTML).toEqual("");
});

it("should render nested elements correctly", () => {
  const { container } = render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: nestedElements("table", "thead", "tr", "th"),
      }}
    />,
  );
  const table = container.firstChild as HTMLTableElement;
  expect(table.tagName).toBe("TABLE");
  const thead = table.firstChild as HTMLTableSectionElement;
  expect(thead.tagName).toBe("THEAD");
  const tr = thead.firstChild as HTMLTableRowElement;
  expect(tr.tagName).toBe("TR");
  const th = tr.firstChild as HTMLTableCellElement;
  expect(th.tagName).toBe("TH");
  expect(th.textContent).toBe("text");
});

it("should decode and render text correctly", () => {
  const { container } = render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "#text",
            text: "&lt; &gt; &quot; &apos; &amp; &#169; &#8710;",
          },
        ],
      }}
    />,
  );
  expect(container).toHaveTextContent("< > \" ' & © ∆");
});

it("should throw an error when rendering a block element without renderBlock prop ", () => {
  // don't log errors to the console when testing for thrown errors
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() =>
    render(
      <UmbracoRichText
        data={{
          tag: "#root",
          elements: [
            {
              tag: "umb-rte-block",
              attributes: { "content-id": "1" },
              elements: [],
            },
          ],
        }}
      />,
    ),
  ).toThrowError();
});

it("should render a block element using the renderBlock prop", () => {
  expect(() =>
    render(
      <UmbracoRichText
        data={{
          tag: "#root",
          blocks: [{ content: { id: "1", properties: {} } }],
          elements: [
            {
              tag: "umb-rte-block",
              attributes: { "content-id": "1" },
              elements: [],
            },
          ],
        }}
        renderBlock={(block) => (
          <div data-testid="umb-rte-block">{block?.content?.id}</div>
        )}
      />,
    ),
  ).not.toThrowError();

  expect(screen.getByTestId("umb-rte-block")).toMatchInlineSnapshot(`
      <div
        data-testid="umb-rte-block"
      >
        1
      </div>
    `);
});

it("should render an inline block element using the renderBlock prop", () => {
  expect(() =>
    render(
      <UmbracoRichText
        data={{
          tag: "#root",
          blocks: [{ content: { id: "1", properties: {} } }],
          elements: [
            {
              tag: "umb-rte-block-inline",
              attributes: { "content-id": "1" },
              elements: [],
            },
          ],
        }}
        renderBlock={(block) => (
          <div data-testid="umb-rte-block-inline">{block?.content?.id}</div>
        )}
      />,
    ),
  ).not.toThrowError();

  expect(screen.getByTestId("umb-rte-block-inline")).toMatchInlineSnapshot(`
      <div
        data-testid="umb-rte-block-inline"
      >
        1
      </div>
    `);
});

it("should handle href attribute on links", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "a",
            attributes: {
              href: "/path",
            },
            elements: [{ tag: "#text", text: "text" }],
          },
        ],
      }}
    />,
  );
  const anchor = screen.getByRole("link");
  expect(anchor).toHaveAttribute("href", "/path");
  expect(anchor).not.toHaveAttribute("route");
});

it("should handle route-specific path attribute for the anchor href", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "a",
            attributes: {
              route: { path: "/path", startItem: { id: "1", path: "/path" } },
            },
            elements: [{ tag: "#text", text: "text" }],
          },
        ],
      }}
    />,
  );
  const anchor = screen.getByRole("link");
  expect(anchor).toHaveAttribute("href", "/path");
  expect(anchor).not.toHaveAttribute("route");
});

it("should correctly map the class attribute to className", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "input",
            attributes: { class: "example-class" },
          },
        ],
      }}
    />,
  );
  const input = screen.getByRole("textbox") as HTMLInputElement;
  expect(input).toHaveClass("example-class");
});

it("should properly convert style string to a CSSProperties object and pass it as the className prop to component", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "input",
            attributes: { style: "color: red; background-color: blue" },
          },
        ],
      }}
    />,
  );
  const input = screen.getByRole("textbox");
  expect(input).toHaveAttribute("style", "color: red; background-color: blue;");
});

it("should override default node rendering with custom renderNode prop", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "div",
            attributes: {},
          },
        ],
      }}
      renderNode={(node) => <div data-testid="custom-node">{node.tag}</div>}
    />,
  );
  const customNode = screen.getByTestId("custom-node") as HTMLElement;
  expect(customNode.tagName).toBe("DIV");
});

it("should not render node if renderNode prop returns null", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "div",
            attributes: {
              "data-testid": "default-rendering",
            },
          },
        ],
      }}
      renderNode={() => null}
    />,
  );
  expect(screen.queryByTestId("default-rendering")).toBeNull();
});

it("should render default node if renderNode prop returns undefined", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "div",
            attributes: {
              "data-testid": "default-rendering",
            },
          },
        ],
      }}
      renderNode={() => undefined}
    />,
  );
  expect(screen.queryByTestId("default-rendering")).not.toBeNull();
});

it("should render fixture content correctly", () => {
  const { container } = render(
    <UmbracoRichText
      // biome-ignore lint/suspicious/noExplicitAny:
      data={fixture as any}
      renderBlock={() => <div data-testid="block" />}
    />,
  );
  expect(container.innerHTML).toMatchSnapshot();
});

it("should handle default attributes for elements", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "h1",
            attributes: {},
            elements: [
              {
                text: "Welcome",
                tag: "#text",
              },
            ],
          },
          {
            tag: "p",
            attributes: {},
            elements: [
              {
                text: "What follows from here is just a bunch of absolute nonsense I've written to dogfood the plugin itself.",
                tag: "#text",
              },
            ],
          },
          {
            tag: "h2",
            attributes: { class: "pre-styled" },
            elements: [
              {
                text: "h2 is already styled",
                tag: "#text",
              },
            ],
          },
        ],
      }}
      htmlAttributes={{
        p: { className: "mb-4" },
        h1: { className: "text-2xl", style: { color: "red" } },
        h2: { className: "text-1xl" },
      }}
    />,
  );

  const headings = screen.getAllByRole("heading");
  expect(headings[0]).toHaveClass("text-2xl");
  expect(headings[0]).toHaveAttribute("style", "color: red;");
  expect(headings[1]).toHaveClass("text-1xl"); //
  expect(headings[1]).toHaveClass("pre-styled"); // `h2` has a class by default. It should be preserved

  const paragraph = screen.getByRole("paragraph");
  expect(paragraph).toHaveClass("mb-4");
});

it("should handle default attributes for with renderNode", () => {
  render(
    <UmbracoRichText
      data={{
        tag: "#root",
        elements: [
          {
            tag: "p",
            attributes: {},
            elements: [
              {
                text: "What follows from here is just a bunch of absolute nonsense I've written to dogfood the plugin itself.",
                tag: "#text",
              },
            ],
          },
        ],
      }}
      htmlAttributes={{
        p: { className: "mb-4" },
        h1: { className: "text-2xl", style: { color: "red" } },
        h2: { className: "text-1xl" },
      }}
      renderNode={(node) => {
        if (node.tag === "p") {
          return (
            <p
              {...node.attributes}
              className={[node.attributes.className, "font-medium"]
                .filter(Boolean)
                .join(" ")}
            >
              {node.children}
            </p>
          );
        }
      }}
    />,
  );

  const paragraph = screen.getByRole("paragraph");
  expect(paragraph).toHaveClass("mb-4");
  expect(paragraph).toHaveClass("mb-4 font-medium");
});
