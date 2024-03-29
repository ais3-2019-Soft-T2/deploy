#!/usr/bin/env node
const exec = require('child_process').execSync;
const fs   = require('fs');
const crypto = require('crypto');
const dbg = (s) => {
  console.info("[Info]" + s);
};

// configuration
const server_folder = '/vol/server_files';
const tezos_addr = "node2.sg.tezos.org.sg";

if (process.argc < 3) {
    console.error('Too few arguments/');
    console.error('./deploy.js setting.json');
    return -1;
}

const _params = process.argv[2];
const raw = fs.readFileSync(_params);
const params = JSON.parse(raw);

// 1. deploy contract
// generate digital signature
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'sect239k1',
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }

});
dbg(` public key\n${publicKey}`);
dbg(` private key\n${privateKey}`);

const sign = crypto.createSign('SHA256');
sign.write(fs.readFileSync(params.firmware));
sign.end();
const sig = sign.sign(privateKey, 'hex');

const deployNew = (prev) => {
    // deploy a new version
    const contract_name = "contract/firmware.liq";
    if (!prev) prev = params.prevAddr;
    const payload =
         `tezos-client -A ${tezos_addr} ` +
	 `originate contract ${params.firmware_name} ` +
         `for ${params.account} ` +
         `transferring ${params.amount} ` +
         `from ${params.account} ` +
         `running ${contract_name} ` +
         `--init '(Pair "${params.account_addr}" (Pair "${params.version}" (Pair "${prev}" (Pair "${params.url}/${params.firmware_name}_${params.version}/${params.firmware}" "${sig}"))))'`
	console.log(payload);
    exec(payload);
};

// if it's the first version of the firmware. (check by firmware_name, I think it's a unique identity)
if (fs.existsSync(server_folder + '/' +  params.firmware_name)) {
    const root_contract_name = "contract/firmware_root.liq";
    const payload =
         `tezos-client -A ${tezos_addr} ` +
	 `originate contract ${params.firmware_name} ` +
         `for ${params.account} ` +
         `transferring ${params.amount} ` +
         `from ${params.account} ` +
         `running ${root_contract_name} ` +
         `--init '(Pair "${params.account_addr}" (Pair "0.0.0" (Pair "" (Pair "${params.firmware_name}" "${sig}"))))'`;
    exec(payload, () => {
        deployNew();
    });
} else {
    deployNew();
}


// 2. move firmware files to file server folder.
exec(`mv ${params.firmware} ${server_folder}/${params.firmware_name}_${params.version}/`);

