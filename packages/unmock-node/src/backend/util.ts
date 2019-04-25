export const rawHeadersToHeaders = (rawHeaders: string[]) =>
  new Array(rawHeaders.length / 2)
    .fill(null)
    .map((_, i) => ({ [rawHeaders[i * 2]]: rawHeaders[i * 2 + 1] }))
    .reduce((a, b) => ({ ...a, ...b }), {});
