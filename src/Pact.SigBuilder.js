import { ContactsOutlined } from '@material-ui/icons';
import Pact from 'pact-lang-api';

// DELTE ME BEFORE MERGE TO pact-lang-api
var enforceType = function(val, type, msg) {
    if (typeof val !== type) {
      throw new TypeError(
        msg + " must be a " + type + ": " + JSON.stringify(val)
      );
    }
  };

// DELTE ME BEFORE MERGE TO pact-lang-api
var enforceArray = function(val, msg) {
    if (!Array.isArray(val)) {
        throw new TypeError(msg + " must be an array: " + JSON.stringify(val));
    }
};

/**
 * DELTE ME BEFORE MERGE TO pact-lang-api
 * Prepare a chainweb-style public meta payload.
 * @param sender {string} gas account
 * @param chainId {string} chain identifier
 * @param gasPrice {number} desired gas price
 * @param gasLimit {number} desired gas limit
 * @param creationTime {number} desired tx's time created in UNIX epoch time as seconds
 * @param ttl {number} desired tx's time to live as seconds
 * @return {object} of arguments, type-checked and properly named.
 */
 var mkMeta = function(sender, chainId, gasPrice, gasLimit, creationTime, ttl) {
    enforceType(sender, "string", "sender");
    enforceType(chainId, "string", "chainId");
    enforceType(gasPrice, "number", "gasPrice");
    enforceType(gasLimit, "number", "gasLimit");
    enforceType(creationTime, "number", "creationTime");
    enforceType(ttl,  "number", "ttl");
    return {
      creationTime: creationTime,
      ttl: ttl,
      gasLimit: gasLimit,
      chainId: chainId,
      gasPrice: gasPrice,
      sender: sender
    };
  };

var debugMode = false;

const debug = (...args) => {
  if (debugMode && args.length) {
    console.debug("[Pact.SigBuilder]", ...args);
  };
};

const toggleDebug = () => {
  debugMode = !debugMode;
  console.log("[Pact.SigBuilder] debugMode set to", debugMode);
};

/**
 * Prepares a capability object for use in mkSignerCList.
 * @param {string} name of pact capability to be signed
 * @param {array} args - array of arguments used in pact capability, default to empty array.
 * @return {object} A properly formatted cap object required in SigBuilder
 */
const mkCap = (name, args=[]) => {
  enforceType(name,"string","mkCap's name");
  enforceArray(args,"mkCap's args");
  return {
      name: name,
      args: args
  };
};

/**
 * Standard gas cap, created by mkCap, for use in mkGasSigner or mkSignerCList
 * @return {array} A properly formatted element for the `signers` array field in SigBuilder
 */
const gasCap = mkCap("coin.GAS", []);

/**
 * Convinence function to make the gas cap "signer" element
 * @param {string} publicKey a ED25519 public key for the caps argument
 * @return {array} A properly formatted element for the `signers` array field in SigBuilder
 */
const mkSignerGas = (publicKey) => {
    enforceType(publicKey,"string","mkSignerGas' publicKey");
    return mkSignerCList(publicKey, [gasCap]);
};

/**
 * Make a Capabilites "signer" array for inclusion in a SigBuilder.
 * @param {string} publicKey a ED25519 public key for the caps argument
 * @param {array} caps an array of caps created with SigBuilder.mkCap
 * @return {array} A properly formatted element for the `signers` array field in SigBuilder
 */
const mkSignerCList = (publicKey, caps) => {
    enforceType(publicKey,"string","mkSignerCList's publicKey");
    enforceArray(caps,"mkSignerCList's caps");
    return [{
      clist: caps,
      pubKey: publicKey
    }]
};

/**
 * Make an ED25519 (aka unrestricted) "signer" array for inclusion in SigBuilder.
 * @param {string} publicKey a ED25519 public key for the caps argument
 * @return {array} A properly formatted `signers` array field in SigBuilder
 */
const mkSignerUnrestricted = (publicKey) => {
    enforceType(publicKey,"string","mkSignerUnrestricted's publicKey");
    return [{
      pubKey: publicKey
    }]
};

/**
 * Combine multiple signer arrays created by mkSigner* functions 
 * @param  {array} arrayOfSigners of pact capability to be signed
 * @return {object} A properly formatted cap object required in SigBuilder
 */
const mergeSigners = (arrayOfSigners) => {
    enforceArray(arrayOfSigners, "mergeSigners's arrayOfSigners");
    return arrayOfSigners.flat();
};

/**
 * Convinence function to get a creation time set to system's local time
 * @return {number} seconds since epoch
 */
const autoCreationTime = () => Math.round(new Date().getTime() / 1000) - 15;

/**
 * Convinence function to get a nonce for use in Payload
 * @return {string} the string "SigBuilder:".concat(Date.toISOString) 
 */
const autoNonce = () => JSON.stringify(new Date().toISOString());

/**
 * @typedef {object} SigDataOptArgs - optional arguments for SigData construction
 * @property {string} nonce for the tx (default: `autoNonce()`)
 * @property {object} data environmental data of the executing pact cont (defaults: `{}`)
 * @property {string} proof for use in `verify`
 * @property {boolean} rollback is the pact cont rolling back (`false` if empty)
 */


/**
 * Generates a correctly formatted `cmd` core for use in mk[Exec|Cont]Payload
 * FYI SigData is compatible with:
 *  - `pact -u` on the command line
 *  - SigBuilder in Chainweaver
 * @param {array} signers the output of mkSigner-class functions
 * @param {string} networkId
 * @param {object} meta output of mkMeta
 * @param {SigDataOptArgs} optArgs `{nonce}`
 * @return {object} cmdJSON object for an exec tx
 */
 const mkCmdTemplate = (
  signers,
  networkId,
  meta,
  {nonce}
) => {
  enforceArray(signers, "mkCmdTemplate's signers");
  enforceType(networkId, "string", "mkCmdTemplate's networkId");
  enforceType(meta, "object", "mkCmdTemplate's");
  if (nonce) {enforceType(nonce, "string", "mkCmdTemplate's nonce");}
    
  const corePayload = {
    networkId: networkId,
    signers: signers,
    meta,
    nonce: nonce || autoNonce()
  };
  debug('corePayload', corePayload);
  return corePayload;
};

/**
 * Generates a correctly formatted exec `cmd` field for use in the SigData type
 * FYI SigData is compatible with:
 *  - `pact -u` on the command line
 *  - SigBuilder in Chainweaver
 * @param {string} pactCode the pact code of the command
 * @param {array} signers the output of mkSigner-class functions
 * @param {string} networkId
 * @param {object} meta output of mkMeta
 * @param {SigDataOptArgs} optArgs `{data, nonce}`
 * @return {object} cmdJSON object for an exec tx
 */
const mkExecPayload = (
  pactCode, 
  signers,
  networkId,
  meta,
  {data,nonce}
) => {
  enforceType(pactCode, "string", "mkExecPayload's pactCode");
  enforceArray(signers, "mkExecPayload's signers");
  enforceType(networkId, "string", "mkExecPayload's networkId");
  enforceType(meta, "object", "mkExecPayload's");
  if (data) {enforceType(data, "object", "mkExecPayload's envData");}
  if (nonce) {enforceType(nonce, "string", "mkExecPayload's nonce");}
  
  var cmdJSON = mkCmdTemplate(signers,networkId,meta,{nonce});
  cmdJSON["payload"] = {
      exec: {
        data: data || {},
        code: pactCode
      }
  };
  debug('execPayload', cmdJSON);
  return cmdJSON;
};

/**
 * Generates a correctly formatted cont `cmd` field for use in the SigData type
 * FYI SigData is compatible with:
 *  - `pact -u` on the command line
 *  - SigBuilder in Chainweaver
 * @param {string} pactId of the cont
 * @param {integer} step of the pact to be continued
 * @param {array} signers the output of mkSigner-class functions
 * @param {string} networkId
 * @param {object} meta output of mkMeta
 * @param {SigDataOptArgs} optArgs `{nonce,data,proof,rollback}`
 * @return {object} cmdJSON object for a cont tx
 */
const mkContPayload = (
  pactId,
  step,
  signers,
  networkId,
  meta,
  {nonce,data,proof,rollback}
) => {
  enforceType(pactId, "string", "mkContPayload's pactId");
  enforceType(step, "number", "mkContPayload's pactId");
  enforceArray(signers, "mkContPayload's signers");
  enforceType(networkId, "string", "mkContPayload's networkId");
  enforceType(meta, "object", "mkContPayload's meta");
  if (nonce) {enforceType(nonce, "string", "mkContPayload's nonce");};
  if (proof) {enforceType(proof, "string", "mkContPayload's proof");};
  if (data) {enforceType(data, "object", "mkContPayload's data");} else {data = null;};
  if (rollback) {enforceType(rollback, "boolean", "mkContPayload's rollback");} else {rollback = false;};
  
  var cmdJSON = mkCmdTemplate(signers,networkId,meta,{nonce});
  cmdJSON["payload"] = {
      cont: {
        pactId,
        step,
        rollback,
        data
      }
  };
  if (proof) {
    cmdJSON.payload.cont["proof"] = proof;
  }
  debug('contPayload', cmdJSON);
  return cmdJSON;
};

/**
 * Get the pubKeys from a signers field
 * @param {array} signers the signers field from cmdJSON
 * @return {array} signer keys used in tx
 */
const pubKeysFromSigners = (signers) => {
  enforceArray(signers, "pubKeysFromSigners' signers must be an array");
  return signers.map(v=>v.pubKey);
};

/**
 * Create the SigData Object for txs
 * @param {object} cmdJSON returned from mkExecPayload or mkContPayload
 * @param {array} signers is an optional array of pubKeys, overrides those found in signers's caps
 * @return {object} the SigData object for use in SigBuilder 
 */
const mkSigData = (cmdJSON, signers=[]) => {
  var unsignedSigs = {};
  if (signers.length) {
    signers.map(pubKey => {
        unsignedSigs[pubKey] = null;
        return null;
    });
  } else {
    pubKeysFromSigners(cmdJSON.signers).map(pubKey => {
        unsignedSigs[pubKey] = null;
        return null;
    });
  }
  const cmdJSONasString = JSON.stringify(cmdJSON);
  const sigDataExec = {hash: Pact.crypto.hash(cmdJSONasString), cmd: cmdJSONasString, sigs: unsignedSigs};
  debug("mkSigData", sigDataExec);
  return sigDataExec;
};

const execCmdExample1 = ({
  user, 
  signingPubKey, 
  networkId,
  gasPrice,
  gasLimit
}) => {
  //creates transaction to send to wallet
  const caps = mkSignerGas(signingPubKey);
  const ms = {
      sender: user,
      chainId: "0",
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      creationTime: autoCreationTime(),
      ttl: 28800};
  const meta = Pact.lang.mkMeta(ms.sender, ms.chainId, ms.gasPrice, ms.gasLimit, ms.creationTime, ms.ttl);

  debug("caps", caps);
  const cs = {
      pactCode: "(+ 1 1)",
      data: {foo: "bar"},
      signers: caps,
      networkId: networkId,
      meta: meta
  };
  const cmdJSON = mkExecPayload(
    cs.pactCode, 
    cs.signers,
    cs.networkId,
    cs.meta,
    {data: cs.data} 
    );
  const execSigData = mkSigData(cmdJSON);
  return execSigData;
};

const contCmdExample1 = ({
  user, 
  signingPubKey, 
  networkId,
  gasPrice,
  gasLimit
}) => {
  //creates transaction to send to wallet
  const caps = mkSignerGas(signingPubKey);
  const ms = {
      sender: user,
      chainId: "4",
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      creationTime: autoCreationTime(),
      ttl: 28800};
  const meta = Pact.lang.mkMeta(ms.sender, ms.chainId, ms.gasPrice, ms.gasLimit, ms.creationTime, ms.ttl);

  debug("caps", caps);
  const cs = {
      "proof": "eyJjaGFpbiI6NCwib2JqZWN0IjoiQUFBQUVBQUFBQUFBQUFBQkFOQ1lzbnNjV2VWcHRtNWd6eXl2YzZxRTAxX195QzV3LUx5R3p4SWNOc0ZOQUxLY19UeVd6YlphVjA1TjBtMFdVQjVxTFVoY2FSUDd2NHpEbkJhY21ORExBZWhPUk94V0FyQmJ1emV2dktNR1BlMHVGVV9QTzJ6MzdULS1jS2F0NnV3ekFWWU5Fdzk1S1prckdRMF93ZXZFVkdsaFkyTEwycUxHZXF2NnJ4UFBMMHFrQUFlVmRSanRvYU4xSHNhSF9xek1LUjRnZ29acGZoSVVVMEJSSG0yWmh0emVBY0pjV0w1ejlzZlU4ZFdVUlFTMF9rUmR3ajZaeGFRQ2FicTdYcl9aeEQ1UUFBWUdoZHBWX3V1b3FxOXVaYkdON1N0LVNqYXp3cTFRLTdxdWIzSHhHV0tkQU1iX3E5T2k5YXRjVXYydERaQUpCVHJiV1pZM2s4VTc4YTlMX1pWc0pXRDVBY212eUJvTFViNHhKY1FiWldoRG85eDZGQ19uaU5mOXFkMVVZRWtySFZXN0FOU3pwNm5pNHJvZUprSGxZal9vVnZuN1lxdXRGZE41TlVzc09jd1ZyMmRUQU11dnQ1aWVVdGVFc3hRQ1VOeEp5SXN3WUFDUGxTUzdMWkZPUy1HM2NGOThBTVhlRnJ4NFFLVUludVVfYlFyclR0UEdCc2dKWGxib0hrMHlCamNaRWNhT0FBNHVRcDhYbENBYnFGclFCTWRISFJic3dtT05RcEtUN210SnZEQUpCNzZqQVdFb0E5V1paVG9UWHZKcGlESDcySFFTdFRwNTdrRDZlUEFoTXkzUFA0NFZBQ1I5MEFHdVVWeHlwd3VCMEVHM1NOOGJLSG9QUW9ab1pVRDNScDkzX05DdEFNRktXb3FZZFRITXpGcHJSM2R1Q2d3bzhVbnpRZ29Ta1dnc2U2UEU5S3FxIiwic3ViamVjdCI6eyJpbnB1dCI6IkFCUjdJbWRoY3lJNk5qQXdMQ0p5WlhOMWJIUWlPbnNpYzNSaGRIVnpJam9pWm1GcGJIVnlaU0lzSW1WeWNtOXlJanA3SW1OaGJHeFRkR0ZqYXlJNlcxMHNJblI1Y0dVaU9pSkZkbUZzUlhKeWIzSWlMQ0p0WlhOellXZGxJam9pVkhsd1pTQmxjbkp2Y2pvZ1pYaHdaV04wWldRZ1pHVmphVzFoYkN3Z1ptOTFibVFnYVc1MFpXZGxjaUlzSW1sdVptOGlPaUk4YVc1MFpYSmhZM1JwZG1VLU9qQTZNVFF4TlRRaWZYMHNJbkpsY1V0bGVTSTZJblJ4TVVoNFVtMVplRkZHYXkwdFpHNUVRbEJXYzBod1RteGpRbXhQUlhKT05FOTNSVmhTYVdOR1FXY2lMQ0pzYjJkeklqb2laSEJEVEZGblVtTnVZbTlZYjBNNVpVaExObU5OYzBWNU1HUXpVRUZ1TTFGTmNFOXFNMUUyVkZCSFNTSXNJbVYyWlc1MGN5STZXM3NpY0dGeVlXMXpJanBiSW1KbE1qSTVaalJoT1RjMVpUUTBNV1JqTmprMFpHVmtNR1U1TWpZd1pEazVNekkzTURFeU9EY3dNbVptTldFMVlXWTNZbVZrTW1VME1tTTVOV05sTURraUxDSmtZamMzTmpjNU0ySmxNR1pqWmpobE56WmpOelZpWkdJek5XRXpObVUyTjJZeU9UZ3hNVEZrWXpZeE5EVmpOalkyT1ROaU1ERXpNekU1TW1VeU5qRTJJaXcyTGpCbExUWmRMQ0p1WVcxbElqb2lWRkpCVGxOR1JWSWlMQ0p0YjJSMWJHVWlPbnNpYm1GdFpYTndZV05sSWpwdWRXeHNMQ0p1WVcxbElqb2lZMjlwYmlKOUxDSnRiMlIxYkdWSVlYTm9Jam9pTVc5elgzTk1RVlZaZGtKNmMzQnVOV3BxWVhkMFVuQktWMmxJTVZkUVptaDVUbkpoWlZaMlUwbDNWU0o5WFN3aWJXVjBZVVJoZEdFaU9tNTFiR3dzSW1OdmJuUnBiblZoZEdsdmJpSTZiblZzYkN3aWRIaEpaQ0k2Ym5Wc2JIMCJ9LCJhbGdvcml0aG0iOiJTSEE1MTJ0XzI1NiJ9",
      "pactId": "tq1HxRmYxQFk--dnDBPVsHpNlcBlOErN4OwEXRicFAg",
      "step": 1,
      signers: caps,
      networkId: networkId,
      meta: meta
  };
  const cmdJSON = mkContPayload(
    cs.pactId,
    cs.step, 
    cs.signers,
    cs.networkId,
    cs.meta,
    {proof: cs.proof}
    );
  const execSigData = mkSigData(cmdJSON);
  return execSigData;
};

export const SigData = {
                mkMeta,
                mkCap,
                mkSignerGas,
                mkSignerCList,
                mkSignerUnrestricted,
                mkExecPayload,
                mkContPayload,
                util: {
                  gasCap,
                  mergeSigners,
                  autoCreationTime,
                  autoNonce,
                  pubKeysFromSigners
                },
                ex: {
                  execCmdExample1,
                  contCmdExample1
                },
                debug: {
                  toggleDebug
                }

    };