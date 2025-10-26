function autoprefixer() {
  return {
    postcssPlugin: "autoprefixer",
    Once() {},
  };
}

autoprefixer.postcss = true;
module.exports = autoprefixer;
module.exports.default = autoprefixer;
