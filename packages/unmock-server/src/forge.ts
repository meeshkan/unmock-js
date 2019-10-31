/**
 * Code for generating certificates signed by our hard-coded CA.
 */
import debug from "debug";
import * as fs from "fs";
import * as forge from "node-forge";
import * as path from "path";

const caCrtPath = path.join(__dirname, "..", "certs", "ca.pem");
const caKeyPath = path.join(__dirname, "..", "certs", "ca.key.pem");

const debugLog = debug("unmock-server:forge");

/**
 * Create certificate signing request.
 * This essentially defines the subject for the certificate.
 */
const createCsr = () => {
  debugLog("Generating 2048-bit key-pair...");
  const keys = forge.pki.rsa.generateKeyPair(2048);
  debugLog("Key-pair created.");

  // Note: Could skip creating a CSR here as we're the one generating the keys
  debugLog("Creating certification request (CSR) ...");
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([
    {
      name: "commonName",
      value: "unmock.server",
    },
    {
      name: "countryName",
      value: "FI",
    },
    {
      shortName: "ST",
      value: "Helsinki",
    },
    {
      name: "localityName",
      value: "Helsinki",
    },
    {
      name: "organizationName",
      value: "Unmock",
    },
    {
      shortName: "OU",
      value: "Unmock",
    },
  ]);

  // sign certification request
  csr.sign(keys.privateKey);
  debugLog("Certification request (CSR) created.");

  // PEM-format keys and csr (for viewing or output as needed)
  const pem = {
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    csr: forge.pki.certificationRequestToPem(csr),
  };

  return { csr, pem };
};

/**
 * Sign certificate signing request with CA key, adding required extensions.
 * @param param0
 */
const signWithCA = ({ csr, domain }: { csr: any; domain: string }) => {
  debugLog(`Reading ${caCrtPath}...`);
  const caCertPem = fs.readFileSync(caCrtPath, "utf8");
  debugLog(`Reading ${caKeyPath}...`);
  const caKeyPem = fs.readFileSync(caKeyPath, "utf8");
  const caCert = forge.pki.certificateFromPem(caCertPem);
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);

  debugLog("Creating certificate...");
  const cert = forge.pki.createCertificate();
  // -set_serial 01
  cert.serialNumber = "01";
  // -days 365
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  // subject from CSR
  cert.setSubject(csr.subject.attributes);
  // issuer from CA
  cert.setIssuer(caCert.subject.attributes);
  // set appropriate extensions here (some examples below)
  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: false,
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      digitalSignature: true,
    },
    {
      name: "subjectAltName",
      altNames: [
        {
          type: 2, // DNS
          value: domain,
        },
      ],
    },
  ]);
  cert.publicKey = csr.publicKey;

  cert.sign(caKey);
  debugLog("Certificate created.");
  const pem = {
    publicKey: forge.pki.publicKeyToPem(cert.publicKey),
  };
  return { cert, pem };
};

/**
 * Create a self-signed certificate for given domain.
 * Certificate is signed with the CA key included in the repository,
 * so the client must trust that as CA authority.
 * @param domain Domain name. For example, "api.github.com".
 */
export const create = (domain: string) => {
  const { csr, pem } = createCsr();
  const { cert } = signWithCA({ csr, domain });
  const signedPem = forge.pki.certificateToPem(cert);
  return { privateKey: pem.privateKey, signedCrt: signedPem };
};
