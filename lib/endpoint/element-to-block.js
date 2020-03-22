module.exports = elementToBlock;

const tags = [
  require("./tags/div.alert.product"),
  require("./tags/div.alert.note-or-tip"),
  require("./tags/div.alert.warning"),
  require("./tags/h1-or-h2"),
  require("./tags/h3-or-h4"),
  require("./tags/p"),
  require("./tags/pre"),
  require("./tags/table"),
  require("./tags/ul"),
];

function elementToBlock(el) {
  const blocks = tags.filter((block) => block.is(el));

  if (blocks.length > 2) {
    throw new Error(`More than one block match for ${el}`);
  }

  if (blocks[0]) {
    return blocks[0].parse(el);
  }
}
