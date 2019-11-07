import * as forge from "node-forge";
import { createSignedCertificate, loadCa } from "../forge";

const getModulo = (key: forge.pki.PublicKey | forge.pki.PrivateKey) => {
  // @ts-ignore
  return key.n.toString(16);
};

describe("Forge", () => {
  const { caCert, caKey } = loadCa();
  it("should have CA certificate matching private key", () => {
    expect(getModulo(caCert.publicKey)).toEqual(getModulo(caKey));
  });

  it("should create a certificate signed by CA", () => {
    const { signedCrt } = createSignedCertificate("unmock.io");
    const certificate = forge.pki.certificateFromPem(signedCrt);
    expect(caCert.verify(certificate)).toBe(true);
  });

  it("should create a certificate with the same modulus as private key", () => {
    const { signedCrt, privateKey: privateKeyPem } = createSignedCertificate(
      "unmock.io",
    );
    const cert = forge.pki.certificateFromPem(signedCrt);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const publicKeyModulus = getModulo(cert.publicKey);
    const privateKeyModulus = getModulo(privateKey);
    expect(publicKeyModulus).toEqual(privateKeyModulus);
  });
});
