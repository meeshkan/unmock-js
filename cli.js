const ora = require('ora');
const apifile = process.argv[2];
const api = process.argv[3];

const _exec = require('child_process').exec;
const exec = (cmd, opts) => new Promise((resolve, reject)=>{
    _exec(cmd, opts, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        resolve(true);
      });
}); 


const timeout = ms => new Promise(res => setTimeout(res, ms))

const foo = async () => {
    if (process.argv.length === 3) {
        const child = await exec(`open -a Safari http://localhost:4000/${process.argv[2]}`);
    } else {
        const spinner = ora('Shipping your api to un-production').start();
        await timeout(3500);
        spinner.stop();
        console.log(`🎉 Successfully uploaded ${apifile} for endpoint ${api}.`);
    }
}

foo();