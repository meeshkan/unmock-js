import axios from "axios";
import { IUnmockInternalOptions } from "./unmock-options";

const makeHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const canPingWithAccessToken = async (accessToken: string, unmockHost: string, unmockPort: string) => {
  try {
    await axios.get(`https://${unmockHost}:${unmockPort}/ping`, makeHeader(accessToken));
    return true;
  } catch (e) {
    require("debug")("unmock-test:error")(`errorMessage on pinging with token ${e.message} ${e.stack}`);
    return false;
  }
};

// tslint:disable-next-line:max-line-length
export const exchangeRefreshTokenForAccessToken = async (refreshToken: string, unmockHost: string, unmockPort: string) => {
  try {
    const { data: { accessToken }} = await axios.post(`https://${unmockHost}:${unmockPort}/token/access`, {
      refreshToken,
    });
    return accessToken;
  } catch (e) {
    require("debug")("unmock-test:error")(`errorMessage on exchanging token ${e.message} ${e.stack}`);
    throw Error("Invalid token, please check your credentials on https://www.unmock.io/app");
  }
};

let pingable = false;
export default async ({persistence, unmockHost, unmockPort}: IUnmockInternalOptions) => {
  let accessToken = persistence.loadAuth();
  if (accessToken) {
    if (!pingable) {
      pingable = await canPingWithAccessToken(accessToken, unmockHost, unmockPort);
      if (!pingable) {
        accessToken = undefined;
      }
    }
  }
  if (!accessToken) {
    const refreshToken = persistence.loadToken();
    if (refreshToken) {
      accessToken = await exchangeRefreshTokenForAccessToken(refreshToken, unmockHost, unmockPort);
      if (accessToken) {
        persistence.saveAuth(accessToken);
      } else {
        throw Error("Incorrect server response: did not get accessToken");
      }
    } else {
      // if there is no refresh token, we default to the "y" version of the service
      return;
    }
  }
  if (!pingable && accessToken) {
    pingable = await canPingWithAccessToken(accessToken, unmockHost, unmockPort);
    if (!pingable) {
      throw Error("Internal authorization error");
    }
  }
  return accessToken;
};
