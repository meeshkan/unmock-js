/**
 * Code for generating certificates signed by our hard-coded CA.
 */
import debug from "debug";
import * as fs from "fs";
import * as forge from "node-forge";
import * as path from "path";

const caCrtPath = path.join(__dirname, "..", "certs", "ca.pem");

const caKeyPem = `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----
`;

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
  csr.sign(keys.privateKey, forge.md.sha256.create());
  debugLog("Certification request (CSR) created.");

  // PEM-format keys and csr (for viewing or output as needed)
  const pem = {
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    csr: forge.pki.certificationRequestToPem(csr),
  };

  return { csr, pem };
};

export const loadCa = () => {
  debugLog(`Reading ${caCrtPath}...`);
  const caCertPem = fs.readFileSync(caCrtPath, "utf8");
  const caCert = forge.pki.certificateFromPem(caCertPem);
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);
  return { caCert, caKey };
};

/**
 * Sign certificate signing request with CA key, adding required extensions.
 * @param param0 Certificate signing request and domain
 */
const signWithCA = ({ csr, domain }: { csr: any; domain: string }) => {
  const { caCert, caKey } = loadCa();

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

  cert.sign(caKey, forge.md.sha256.create());
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
export const createSignedCertificate = (domain: string) => {
  const { csr, pem } = createCsr();
  const { cert } = signWithCA({ csr, domain });
  const signedPem = forge.pki.certificateToPem(cert);
  return { privateKey: pem.privateKey, signedCrt: signedPem };
};
