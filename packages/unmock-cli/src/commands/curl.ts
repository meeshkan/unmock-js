import axios from "axios";
import { unmock } from "unmock-node";

export const makeHeaders = (headers: string[]) =>
  headers
    .map((h) => ({
      [h.substring(0, h.indexOf(":")).trim()]: h
        .substring(h.indexOf(":") + 1)
        .trim(),
    }))
  .reduce((a, b) => ({ ...a, ...b }), {});

export const curlInternal = async (url: string, options: any) => {
  await unmock({
    ...(options.signature ? { signature: options.signature } : {}),
  });
  const { data } = await axios({
    ...(options.data ? { data: JSON.parse(options.data) } : {}),
    ...(options.headers ? { headers: makeHeaders(options.headers) } : {}),
    method: options.request || "GET",
    url,
  });
  return data;
};

export const curl = async (url: string, options: any) => {
  const data = curlInternal(url, options);
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
};
