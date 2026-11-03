// Share the desktop document generator without using any extension APIs.
globalThis.QinghuaBrowser = {
  runtime: { getURL: path => new URL(path, new URL("./", location.href)).href }
};
