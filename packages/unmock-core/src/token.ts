import axios from "axios";
import { UnmockOptions } from "./options";
import { makeAuthHeader } from "./util";

export const canPingWithAccessToken = async (
  opts: UnmockOptions,
  accessToken: string,
) => {
  try {
    await axios.get(opts.buildPath("ping"), makeAuthHeader(accessToken));
    return true;
  } catch (e) {
    return false;
  }
};

// tslint:disable-next-line:max-line-length
export const exchangeRefreshTokenForAccessToken = async (
  opts: UnmockOptions,
  refreshToken: string,
) => {
  try {
    const {
      data: { accessToken },
    } = await axios.post(opts.buildPath("token", "access"), {
      refreshToken,
    });
    return accessToken;
  } catch (e) {
    throw new Error(
      "Invalid token, please check your credentials on https://www.unmock.io/app",
    );
  }
};

export default async (opts: UnmockOptions) => {
  const { persistence } = opts;
  let accessToken = persistence.loadAuth();
  if (accessToken) {
    const pingable = await canPingWithAccessToken(opts, accessToken);
    if (!pingable) {
      accessToken = undefined;
    }
  }
  if (!accessToken) {
    // No access token or access token has expired - fetch new one
    const refreshToken = persistence.loadToken();
    if (refreshToken === undefined) {
      // if there is no refresh token, we default to the "y" version of the service
      return;
    }
    accessToken = await exchangeRefreshTokenForAccessToken(opts, refreshToken);
    if (accessToken === undefined) {
      throw new Error("Incorrect server response: did not get accessToken");
    }
    // Verify we can ping
    const pingable = await canPingWithAccessToken(opts, accessToken);
    if (!pingable) {
      throw new Error("Internal authorization error");
    }
    persistence.saveAuth(accessToken);
  }
  return accessToken;
};
