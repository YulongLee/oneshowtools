const config = {
  projectName: "oneshowtools-miniprogram",
  date: "2026-08-21",
  designWidth: 750,
  deviceRatio: { 750: 1 },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  cache: { enable: true },
  mini: {
    postcss: { pxtransform: { enable: true }, url: { enable: true, config: { limit: 1024 } }, cssModules: { enable: false } },
  },
};

module.exports = function () { return config; };
