import axios from "axios";

const makeHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export default async (
  accessToken: string,
  unmockHost: string,
  unmockPort: string,
) => {
  const { data: { userId } } = await axios.get(
    `https://${unmockHost}:${unmockPort}/user`,
    makeHeader(accessToken),
  );
  return userId;
};
