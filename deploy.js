#!/usr/bin/env node
const exec = require('child_process').exec;
const fs   = require('fs');
const crypto = require('crypto');

// configuration
const server_folder = '/var/www/html';
const tezos_addr = "node2.sg.tezos.org.sg";

if (process.argc < 3) {
    console.error('Too few arguments/');
    return -1;
}

const _params = process.argv[2];
const raw = fs.readFileSync(payload);
const params = JSON.parse(payload);

// 1. deploy contract
let payload =
     `tezos-client -A ${tezos_addr}` +
     `for ${params.account}` +
     `tranferring ${params.amount}` +
     `from ${params.account}`;

// generate digital signature
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'sect239k1'
});
const sign = crypto.createSign('SHA256');
sign.write(fs.readFileSync(params.firmware)).end();
const sig = sign.sign(privateKey, 'hex');

// if it's the first version of the firmware. (check by firmware_name, I think it's a unique identity)
if (fs.existsSync(server_folder + params.firmware_name)) {
    // deploy a new root contract
    const root_contract_name = "firmware_root.liq";
    payload +=
         `running ${root_contract_name}` +
         `--init '(${params.account_addr}, "0.0.0", "", ${params.firmware_name}, ${sig})'`
} else {
    // deploy a new version
    const contract_name = "firmware.liq";
    payload +=
         `running ${contract_name}` +
         `--init '(${params.account_addr}, "0.0.0", ${params.prevVer}, ${params.url}, ${sig})'`
}

exec(payload);

// 2. move firmware files to file server folder.
exec(`mv ${params.firmware} ${server_folder}/${params.firmware_name/`);
